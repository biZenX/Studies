/**
 * Study schedule rules — pure domain logic, no React / DOM.
 *
 * A study has a period: it runs *from* a start date (`year`, kept under its
 * historical column name) *to* an optional end date (`endDate`).
 *
 * The stored `status` is the owner's intent:
 *   - "active"  → follow the schedule automatically
 *   - "draft"   → not published yet, never auto-activated
 *   - "closed"  → completed by hand, regardless of the dates
 *
 * The *effective* status is what every screen displays and filters on:
 *   - before the start date → "upcoming"
 *   - between start and end → "active"
 *   - after the end date    → "closed" (completed)
 *   - no end date           → "active" until closed manually
 */

import {
  daysBetween,
  formatDays,
  rangeLengthDays,
  toDateInputValue,
} from "@/lib/content";
import type { Lang } from "@/lib/i18n";

export type StoredStatus = "active" | "draft" | "closed";
export type EffectiveStatus = "draft" | "upcoming" | "active" | "closed";

export const STORED_STATUSES: readonly StoredStatus[] = ["active", "draft", "closed"];
export const EFFECTIVE_STATUSES: readonly EffectiveStatus[] = [
  "active",
  "upcoming",
  "closed",
  "draft",
];

export type ScheduledStudy = {
  status: string;
  /** Start date (ISO, or a legacy bare year). */
  year?: string | null;
  /** End date (ISO) — null/empty means open-ended. */
  endDate?: string | null;
};

export function normalizeStoredStatus(value: string | null | undefined): StoredStatus {
  return value === "draft" || value === "closed" ? value : "active";
}

/**
 * Effective status for a given day. `today` is an ISO date; when it is empty
 * (server render, before the browser clock is known) the stored status is
 * returned untouched so server and client markup match.
 */
export function resolveStudyStatus(
  study: ScheduledStudy,
  today: string | null | undefined,
): EffectiveStatus {
  const stored = normalizeStoredStatus(study.status);
  if (stored !== "active") return stored;
  if (!today) return "active";

  const start = toDateInputValue(study.year);
  const end = toDateInputValue(study.endDate);

  if (end && today > end) return "closed";
  if (start && today < start) return "upcoming";
  return "active";
}

/** Effective status when `today` is missing → the study's stored status. */
export function isEffectivelyActive(study: ScheduledStudy, today: string | null | undefined) {
  return resolveStudyStatus(study, today) === "active";
}

export type ScheduleInfo = {
  status: EffectiveStatus;
  /** Inclusive length of the period in days, null when open-ended. */
  totalDays: number | null;
  /** Days until the start (upcoming), days left until the end (active) or days since the end (closed). */
  days: number | null;
  /** 0‒1 share of the period that has elapsed (only meaningful while active with an end date). */
  progress: number | null;
  /** Elapsed day number inside the period, 1-based (only while active with an end date). */
  dayNumber: number | null;
};

/** Numbers behind the "متبقٍ 5 أيام" / "starts in 3 days" hints. */
export function describeSchedule(
  study: ScheduledStudy,
  today: string | null | undefined,
): ScheduleInfo {
  const status = resolveStudyStatus(study, today);
  const start = toDateInputValue(study.year);
  const end = toDateInputValue(study.endDate);
  const totalDays = rangeLengthDays(start, end);

  const info: ScheduleInfo = {
    status,
    totalDays,
    days: null,
    progress: null,
    dayNumber: null,
  };

  if (!today) return info;

  if (status === "upcoming" && start) {
    info.days = daysBetween(today, start);
    return info;
  }

  if (status === "active" && end) {
    info.days = daysBetween(today, end);
    if (start && totalDays) {
      const elapsed = (daysBetween(start, today) ?? 0) + 1;
      info.dayNumber = Math.min(Math.max(elapsed, 1), totalDays);
      info.progress = Math.min(Math.max(info.dayNumber / totalDays, 0), 1);
    }
    return info;
  }

  if (status === "closed" && end && normalizeStoredStatus(study.status) === "active") {
    info.days = daysBetween(end, today);
  }

  return info;
}

/**
 * One short, human sentence about where the study is in its schedule.
 * Empty string when there is nothing useful to say (drafts, no dates…).
 */
export function scheduleHint(
  study: ScheduledStudy,
  today: string | null | undefined,
  lang: Lang = "ar",
): string {
  const info = describeSchedule(study, today);
  const en = lang === "en";

  switch (info.status) {
    case "upcoming": {
      if (info.days === null) return "";
      if (info.days === 0) return en ? "Starts today" : "تبدأ اليوم";
      if (info.days === 1) return en ? "Starts tomorrow" : "تبدأ غداً";
      return en ? `Starts in ${formatDays(info.days, "en")}` : `تبدأ بعد ${formatDays(info.days)}`;
    }
    case "active": {
      if (info.days === null) {
        return toDateInputValue(study.endDate)
          ? ""
          : en
            ? "No end date"
            : "بدون تاريخ انتهاء";
      }
      if (info.days === 0) return en ? "Ends today" : "تنتهي اليوم";
      if (info.days === 1) return en ? "Ends tomorrow" : "تنتهي غداً";
      return en ? `${formatDays(info.days, "en")} left` : `متبقٍ ${formatDays(info.days)}`;
    }
    case "closed": {
      if (info.days === null) return "";
      if (info.days === 0) return en ? "Ended today" : "انتهت اليوم";
      if (info.days === 1) return en ? "Ended yesterday" : "انتهت أمس";
      return en ? `Ended ${formatDays(info.days, "en")} ago` : `انتهت منذ ${formatDays(info.days)}`;
    }
    default:
      return "";
  }
}

export type DateRangeError = "missingStart" | "invalidStart" | "invalidEnd" | "endBeforeStart";

/** Validation used by every study form (modal and page). */
export function validateDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): DateRangeError | null {
  const rawStart = (start ?? "").trim();
  const rawEnd = (end ?? "").trim();
  if (!rawStart) return "missingStart";

  const s = toDateInputValue(rawStart);
  if (!s) return "invalidStart";

  if (!rawEnd) return null;
  const e = toDateInputValue(rawEnd);
  if (!e) return "invalidEnd";
  if (e < s) return "endBeforeStart";
  return null;
}

/** Count studies per effective status — powers the dashboard filter tabs. */
export function countByEffectiveStatus<T extends ScheduledStudy>(
  studies: readonly T[],
  today: string | null | undefined,
): Record<EffectiveStatus | "all", number> {
  const counts: Record<EffectiveStatus | "all", number> = {
    all: studies.length,
    active: 0,
    upcoming: 0,
    closed: 0,
    draft: 0,
  };
  for (let i = 0; i < studies.length; i++) {
    counts[resolveStudyStatus(studies[i], today)] += 1;
  }
  return counts;
}
