import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveStudyStatus,
  describeSchedule,
  scheduleHint,
  validateDateRange,
  countByEffectiveStatus,
  normalizeStoredStatus,
} from "./studySchedule";
import { filterAndSortStudies } from "./rosterEngine";
import {
  addDaysIso,
  daysBetween,
  rangeLengthDays,
  formatDateRange,
  formatDays,
} from "@/lib/content";
import type { StudyWithCount } from "@/lib/types";

const study = (over: Partial<StudyWithCount> = {}): StudyWithCount => ({
  id: 1,
  title: "دراسة",
  year: "2026-01-01",
  endDate: "2026-01-10",
  description: null,
  status: "active",
  titleEn: null,
  descriptionEn: null,
  participantCount: 0,
  createdAt: new Date("2025-12-01"),
  ...over,
});

describe("Domain Layer: study schedule (from – to)", () => {
  describe("resolveStudyStatus", () => {
    it("is upcoming before the start, active inside the period and completed after the end", () => {
      const s = study({ year: "2026-01-01", endDate: "2026-01-10" });
      assert.equal(resolveStudyStatus(s, "2025-12-31"), "upcoming");
      assert.equal(resolveStudyStatus(s, "2026-01-01"), "active"); // first day
      assert.equal(resolveStudyStatus(s, "2026-01-05"), "active");
      assert.equal(resolveStudyStatus(s, "2026-01-10"), "active"); // last day still active
      assert.equal(resolveStudyStatus(s, "2026-01-11"), "closed"); // day after → completed
    });

    it("stays active for open-ended studies (no end date)", () => {
      const s = study({ endDate: null });
      assert.equal(resolveStudyStatus(s, "2030-06-15"), "active");
      assert.equal(resolveStudyStatus(s, "2025-01-01"), "upcoming");
    });

    it("manual draft / closed always win over the schedule", () => {
      assert.equal(resolveStudyStatus(study({ status: "draft" }), "2026-01-05"), "draft");
      assert.equal(resolveStudyStatus(study({ status: "closed" }), "2026-01-05"), "closed");
      assert.equal(resolveStudyStatus(study({ status: "closed", endDate: null }), "2030-01-01"), "closed");
    });

    it("falls back to the stored status when today is unknown (server render)", () => {
      assert.equal(resolveStudyStatus(study(), ""), "active");
      assert.equal(resolveStudyStatus(study(), null), "active");
      assert.equal(resolveStudyStatus(study({ status: "draft" }), undefined), "draft");
    });

    it("understands legacy bare-year start dates", () => {
      const s = study({ year: "2026", endDate: null });
      assert.equal(resolveStudyStatus(s, "2025-12-31"), "upcoming");
      assert.equal(resolveStudyStatus(s, "2026-01-01"), "active");
    });

    it("normalises unknown stored statuses to active", () => {
      assert.equal(normalizeStoredStatus("weird"), "active");
      assert.equal(normalizeStoredStatus(null), "active");
      assert.equal(normalizeStoredStatus("closed"), "closed");
    });
  });

  describe("describeSchedule / scheduleHint", () => {
    it("reports day number, progress and days left while active", () => {
      const info = describeSchedule(study(), "2026-01-03");
      assert.equal(info.status, "active");
      assert.equal(info.totalDays, 10);
      assert.equal(info.dayNumber, 3);
      assert.equal(info.days, 7);
      assert.ok(info.progress !== null && Math.abs(info.progress - 0.3) < 1e-9);
      assert.equal(scheduleHint(study(), "2026-01-03", "ar"), "متبقٍ 7 أيام");
      assert.equal(scheduleHint(study(), "2026-01-03", "en"), "7 days left");
    });

    it("counts down to the start for upcoming studies", () => {
      assert.equal(scheduleHint(study(), "2025-12-29", "ar"), "تبدأ بعد 3 أيام");
      assert.equal(scheduleHint(study(), "2025-12-31", "ar"), "تبدأ غداً");
      assert.equal(scheduleHint(study(), "2026-01-01", "ar"), "متبقٍ 9 أيام");
    });

    it("says when a study ended", () => {
      assert.equal(scheduleHint(study(), "2026-01-11", "ar"), "انتهت أمس");
      assert.equal(scheduleHint(study(), "2026-01-15", "en"), "Ended 5 days ago");
      assert.equal(scheduleHint(study(), "2026-01-10", "ar"), "تنتهي اليوم");
    });

    it("stays quiet for drafts and manually closed studies", () => {
      assert.equal(scheduleHint(study({ status: "draft" }), "2026-01-05"), "");
      assert.equal(scheduleHint(study({ status: "closed" }), "2026-01-05"), "");
    });

    it("labels open-ended studies", () => {
      assert.equal(scheduleHint(study({ endDate: null }), "2026-01-05", "ar"), "بدون تاريخ انتهاء");
    });
  });

  describe("validateDateRange", () => {
    it("requires a start and rejects an end before the start", () => {
      assert.equal(validateDateRange("", ""), "missingStart");
      assert.equal(validateDateRange("nonsense", ""), "invalidStart");
      assert.equal(validateDateRange("2026-01-10", "2026-01-01"), "endBeforeStart");
      assert.equal(validateDateRange("2026-01-01", "abc"), "invalidEnd");
    });

    it("accepts open-ended and same-day ranges", () => {
      assert.equal(validateDateRange("2026-01-01", ""), null);
      assert.equal(validateDateRange("2026-01-01", "2026-01-01"), null);
      assert.equal(validateDateRange("2026-01-01", "2026-01-10"), null);
    });
  });

  describe("date helpers", () => {
    it("adds days and measures ranges inclusively", () => {
      assert.equal(addDaysIso("2026-01-01", 9), "2026-01-10");
      assert.equal(addDaysIso("2026-01-30", 3), "2026-02-02");
      assert.equal(daysBetween("2026-01-01", "2026-01-10"), 9);
      assert.equal(daysBetween("2026-01-10", "2026-01-01"), -9);
      assert.equal(rangeLengthDays("2026-01-01", "2026-01-10"), 10);
      assert.equal(rangeLengthDays("2026-01-01", null), null);
      assert.equal(rangeLengthDays("2026-01-10", "2026-01-01"), null);
    });

    it("formats compact ranges in both languages", () => {
      assert.equal(formatDateRange("2026-01-01", "2026-01-10", "ar"), "1 – 10 يناير 2026");
      assert.equal(formatDateRange("2026-01-01", "2026-01-10", "en"), "1 – 10 Jan 2026");
      assert.equal(formatDateRange("2026-01-25", "2026-02-03", "en"), "25 Jan – 3 Feb 2026");
      assert.equal(formatDateRange("2025-12-25", "2026-01-03", "ar"), "25 ديسمبر 2025 – 3 يناير 2026");
      assert.equal(formatDateRange("2026-01-01", null, "ar"), "1 يناير 2026");
      assert.equal(formatDateRange("2026-01-01", "2026-01-01", "en"), "1 Jan 2026");
    });

    it("pluralises days in Arabic", () => {
      assert.equal(formatDays(1), "يوم واحد");
      assert.equal(formatDays(2), "يومان");
      assert.equal(formatDays(5), "5 أيام");
      assert.equal(formatDays(12), "12 يوماً");
      assert.equal(formatDays(1, "en"), "1 day");
      assert.equal(formatDays(3, "en"), "3 days");
    });
  });

  describe("dashboard integration", () => {
    const list = [
      study({ id: 1, year: "2026-01-01", endDate: "2026-01-10" }), // ended
      study({ id: 2, year: "2026-02-01", endDate: "2026-02-05" }), // running
      study({ id: 3, year: "2026-03-01", endDate: null }), // upcoming
      study({ id: 4, status: "draft" }),
      study({ id: 5, status: "closed", year: "2026-02-01", endDate: "2026-02-20" }), // manual close
    ];
    const today = "2026-02-03";

    it("counts studies per effective status", () => {
      assert.deepEqual(countByEffectiveStatus(list, today), {
        all: 5,
        active: 1,
        upcoming: 1,
        closed: 2,
        draft: 1,
      });
    });

    it("filters the dashboard by effective status, not the stored one", () => {
      assert.deepEqual(
        filterAndSortStudies(list, { status: "closed", today }).map((s) => s.id).sort(),
        [1, 5],
      );
      assert.deepEqual(
        filterAndSortStudies(list, { status: "active", today }).map((s) => s.id),
        [2],
      );
      assert.deepEqual(
        filterAndSortStudies(list, { status: "upcoming", today }).map((s) => s.id),
        [3],
      );
    });

    it("sorts by start date with the latest first", () => {
      const ids = filterAndSortStudies(list, { sort: "date", today }).map((s) => s.id);
      assert.deepEqual(ids, [3, 5, 2, 4, 1]);
    });
  });
});
