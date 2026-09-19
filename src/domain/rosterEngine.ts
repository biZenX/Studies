/**
 * Pure domain rules for roster and study calculations.
 *
 * Clean Architecture Domain Layer:
 * - 100% pure functions (no DOM, no window, no localStorage, no React dependencies).
 * - Deterministic, easily unit-testable in any environment.
 * - Single Responsibility Principle for filters, sorting, and aggregations.
 */

import type { Participant, StudyWithCount, Stats } from "@/lib/types";
import { resolveStudyStatus } from "./studySchedule";
import { toDateInputValue } from "@/lib/content";

/**
 * Normalizes Arabic text for consistent searching and matching.
 * Handles Alef variations, Taa Marbuta, Yaa/Alef Maksura, and diacritics (Tashkeel).
 */
export function normalizeArabicText(text: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove Tashkeel
    .replace(/[إأآٱ]/g, "ا") // normalize Alef
    .replace(/ة/g, "ه") // normalize Taa Marbuta
    .replace(/ى/g, "ي") // normalize Alef Maksura
    .replace(/[\u200B-\u200D\uFEFF]/g, ""); // remove zero-width chars
}

/**
 * Calculates summary stats across all participants in a study.
 */
export function computeStudyStats(participants: readonly Participant[]): {
  participants: number;
  countries: number;
  withEmail: number;
  withPhone: number;
  withFederation: number;
} {
  const uniqueCountries = new Set<string>();
  let withEmail = 0;
  let withPhone = 0;
  let withFederation = 0;

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const country = (p.country ?? "").trim();
    if (country) uniqueCountries.add(country);

    if (p.email && p.email.trim() && p.email.includes("@")) {
      withEmail++;
    }
    if (p.phone && p.phone.trim()) {
      withPhone++;
    }
    if (p.federation && p.federation.trim()) {
      withFederation++;
    }
  }

  return {
    participants: participants.length,
    countries: uniqueCountries.size,
    withEmail,
    withPhone,
    withFederation,
  };
}

/**
 * Aggregates frequency count for a participant string attribute (e.g. country or federation).
 * Returns array of [value, count] tuples sorted descending by count, then alphabetically.
 */
export function aggregateAttributeCounts(
  participants: readonly Participant[],
  attribute: "country" | "federation",
): Array<[string, number]> {
  const map = new Map<string, number>();

  for (let i = 0; i < participants.length; i++) {
    const val = (participants[i][attribute] ?? "").trim();
    if (!val) continue;
    map.set(val, (map.get(val) ?? 0) + 1);
  }

  return Array.from(map.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar"),
  );
}

export type ParticipantFilterCriteria = {
  search?: string;
  country?: string;
  federation?: string;
  hasEmailOnly?: boolean;
};

/**
 * Pure predicate to filter participants by search string, country, and federation.
 */
export function filterParticipants(
  participants: readonly Participant[],
  criteria: ParticipantFilterCriteria,
  translateCountryFn?: (country: string | null | undefined, targetLang: "ar" | "en") => string,
): Participant[] {
  const query = normalizeArabicText(criteria.search ?? "");
  const countryFilter = (criteria.country ?? "all").trim();
  const federationFilter = (criteria.federation ?? "all").trim();
  const hasEmailOnly = Boolean(criteria.hasEmailOnly);

  return participants.filter((p) => {
    // Country filter
    if (countryFilter !== "all" && (p.country ?? "").trim() !== countryFilter) {
      return false;
    }

    // Federation filter
    if (federationFilter !== "all" && (p.federation ?? "").trim() !== federationFilter) {
      return false;
    }

    // Email only
    if (hasEmailOnly && (!p.email || !p.email.includes("@"))) {
      return false;
    }

    // Search query matching
    if (!query) return true;

    const enCountry = translateCountryFn ? translateCountryFn(p.country, "en") : "";
    const enFed = translateCountryFn ? translateCountryFn(p.federation, "en") : "";

    const searchableTokens = [
      p.name,
      p.country ?? "",
      enCountry,
      p.federation ?? "",
      enFed,
      p.email ?? "",
      p.phone ?? "",
      p.code ?? "",
    ];

    for (let i = 0; i < searchableTokens.length; i++) {
      if (normalizeArabicText(searchableTokens[i]).includes(query)) {
        return true;
      }
    }

    return false;
  });
}

export type ParticipantSortOrder = "original" | "name" | "country" | "newest";

/**
 * Pure function to sort participants.
 */
export function sortParticipants(
  participants: readonly Participant[],
  sortOrder: ParticipantSortOrder,
  lang: "ar" | "en" = "ar",
): Participant[] {
  const result = [...participants];

  switch (sortOrder) {
    case "name":
      result.sort((a, b) => a.name.localeCompare(b.name, lang === "en" ? "en" : "ar"));
      break;

    case "country":
      result.sort(
        (a, b) =>
          (a.country ?? "").localeCompare(b.country ?? "", "ar") ||
          a.name.localeCompare(b.name, "ar"),
      );
      break;

    case "newest":
      result.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
      break;

    case "original":
    default:
      // Preserves original array order
      break;
  }

  return result;
}

export type StudySortOrder = "newest" | "title" | "participants" | "date";

/**
 * Pure function to filter and sort studies list on the dashboard.
 *
 * The status filter works on the *effective* status (schedule-aware): a study
 * whose end date has passed shows up under "completed" even though its stored
 * status is still "active". Pass `today` (ISO date) to enable that; without it
 * the stored status is used.
 */
export function filterAndSortStudies(
  studies: readonly StudyWithCount[],
  options: {
    search?: string;
    status?: string;
    sort?: StudySortOrder;
    lang?: "ar" | "en";
    today?: string | null;
  },
): StudyWithCount[] {
  const query = (options.search ?? "").trim().toLowerCase();
  const statusFilter = options.status ?? "all";
  const sort = options.sort ?? "newest";
  const lang = options.lang ?? "ar";
  const today = options.today ?? null;

  const filtered = studies.filter((s) => {
    // Status (schedule-aware)
    if (statusFilter !== "all" && resolveStudyStatus(s, today) !== statusFilter) {
      return false;
    }

    // Search query
    if (!query) return true;

    const titleAr = (s.title ?? "").toLowerCase();
    const titleEn = (s.titleEn ?? "").toLowerCase();
    const descAr = (s.description ?? "").toLowerCase();
    const descEn = (s.descriptionEn ?? "").toLowerCase();
    const year = String(s.year ?? "").toLowerCase();

    return (
      titleAr.includes(query) ||
      titleEn.includes(query) ||
      descAr.includes(query) ||
      descEn.includes(query) ||
      year.includes(query)
    );
  });

  const sorted = [...filtered];

  switch (sort) {
    case "title":
      sorted.sort((a, b) => {
        const titleA = lang === "en" && a.titleEn ? a.titleEn : a.title;
        const titleB = lang === "en" && b.titleEn ? b.titleEn : b.title;
        return titleA.localeCompare(titleB, lang);
      });
      break;

    case "participants":
      sorted.sort((a, b) => b.participantCount - a.participantCount);
      break;

    case "date":
      // Latest start date first; undated records sink to the bottom.
      sorted.sort((a, b) => {
        const da = toDateInputValue(a.year);
        const db = toDateInputValue(b.year);
        if (da === db) return b.id - a.id;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
      });
      break;

    case "newest":
    default:
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
      break;
  }

  return sorted;
}

/**
 * Calculates overall application stats across studies and participants.
 */
export function computeGlobalStats(
  studies: readonly StudyWithCount[],
  allParticipants: readonly Participant[],
): Stats {
  const uniqueCountries = new Set<string>();
  let withEmail = 0;

  for (let i = 0; i < allParticipants.length; i++) {
    const p = allParticipants[i];
    if (p.country && p.country.trim()) uniqueCountries.add(p.country.trim());
    if (p.email && p.email.includes("@")) withEmail++;
  }

  return {
    studies: studies.length,
    participants: allParticipants.length,
    countries: uniqueCountries.size,
    withEmail,
  };
}
