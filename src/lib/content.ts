import type { Lang } from "./i18n";

/* ------------------------------------------------------------------ *
 * Content localisation
 * ------------------------------------------------------------------ *
 * Participant names and study titles are user data, so they cannot live
 * in the static i18n dictionary. This module resolves the display text
 * for the current language using (in order):
 *   1. an explicit English field stored on the record (titleEn / descriptionEn)
 *   2. a built-in lookup for the seeded/known values (countries, default study)
 *   3. the original Arabic text
 * ------------------------------------------------------------------ */

/** Strip Arabic diacritics and unify letter variants so lookups are forgiving. */
export function normalizeAr(value: string): string {
  return String(value ?? "")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .trim()
    .toLowerCase();
}

const COUNTRY_EN: Record<string, string> = {
  مصر: "Egypt",
  الاردن: "Jordan",
  السعودية: "Saudi Arabia",
  "المملكة العربية السعودية": "Saudi Arabia",
  الامارات: "United Arab Emirates",
  الكويت: "Kuwait",
  البحرين: "Bahrain",
  قطر: "Qatar",
  عمان: "Oman",
  "سلطنة عمان": "Oman",
  اليمن: "Yemen",
  العراق: "Iraq",
  سوريا: "Syria",
  لبنان: "Lebanon",
  فلسطين: "Palestine",
  السودان: "Sudan",
  ليبيا: "Libya",
  تونس: "Tunisia",
  الجزائر: "Algeria",
  المغرب: "Morocco",
  موريتانيا: "Mauritania",
  الصومال: "Somalia",
  جيبوتي: "Djibouti",
  "جزر القمر": "Comoros",
};

const COUNTRY_AR: Record<string, string> = Object.entries(COUNTRY_EN).reduce(
  (acc, [ar, en]) => {
    acc[normalizeAr(en)] = ar.startsWith("ا") ? ar : `ال${ar}`;
    return acc;
  },
  {} as Record<string, string>,
);

/** Country lookups keyed by normalised Arabic. */
const COUNTRY_EN_NORMALIZED: Record<string, string> = Object.entries(COUNTRY_EN).reduce(
  (acc, [ar, en]) => {
    acc[normalizeAr(ar)] = en;
    return acc;
  },
  {} as Record<string, string>,
);

export function translateCountry(value: string | null | undefined, lang: Lang): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (lang === "en") return COUNTRY_EN_NORMALIZED[normalizeAr(raw)] ?? raw;
  return COUNTRY_AR[normalizeAr(raw)] ?? raw;
}

/** Known study texts (seeded records) mapped to English. */
const STUDY_TEXT_EN: Record<string, string> = {
  [normalizeAr("خصائص وتحديات تدريب لاعبات المساقات")]:
    "Characteristics and Challenges of Training Female Distance Athletes",
  [normalizeAr("خصائص وتحديات تدريب لاعبات المسافات")]:
    "Characteristics and Challenges of Training Female Distance Athletes",
  [normalizeAr("خصائص وتحديات تدريب لاعبات المسافات الطويلة")]:
    "Characteristics and Challenges of Training Female Long-Distance Athletes",
  [normalizeAr(
    "دراسة تدريبية إقليمية تستهدف تأهيل لاعبات المساقات وتطوير مهاراتهن الفنية والبدنية والذهنية.",
  )]:
    "A regional training study aimed at qualifying female distance athletes and developing their technical, physical and mental skills.",
};

export function localizeText(
  value: string | null | undefined,
  lang: Lang,
  fallbackEn?: string | null,
): string {
  const raw = (value ?? "").trim();
  if (lang !== "en") return raw;
  if (fallbackEn && fallbackEn.trim()) return fallbackEn.trim();
  if (!raw) return raw;

  const normalized = normalizeAr(raw);
  const exact = STUDY_TEXT_EN[normalized];
  if (exact) return exact;

  // Fall back to a prefix match so lightly edited copies of a known text (a
  // shortened description, a trailing full stop, …) still translate.
  const prefix = normalized.slice(0, 24);
  if (prefix.length >= 12) {
    const hit = Object.keys(STUDY_TEXT_EN).find(
      (key) => key.startsWith(prefix) || normalized.startsWith(key.slice(0, 24)),
    );
    if (hit) return STUDY_TEXT_EN[hit];
  }

  return raw;
}

export type LocalizableStudy = {
  title: string;
  description?: string | null;
  titleEn?: string | null;
  descriptionEn?: string | null;
};

/** Resolve the title/description that should be rendered for the active language. */
export function localizeStudy<T extends LocalizableStudy>(study: T, lang: Lang): T {
  if (lang !== "en") return study;
  return {
    ...study,
    title: localizeText(study.title, lang, study.titleEn) || study.title,
    description: study.description
      ? localizeText(study.description, lang, study.descriptionEn) || study.description
      : study.description,
  };
}

/* ------------------------------------------------------------------ *
 * Date handling — the field used to be a plain year, it is now a date
 * ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): boolean {
  return ISO_DATE.test((value ?? "").trim());
}

/**
 * Convert a stored value ("2026", "2026-01-01", "1/1/2026", Date) into the
 * `YYYY-MM-DD` shape an `<input type="date">` expects. Returns "" when the
 * value cannot be understood.
 */
export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value).trim();
  if (!raw) return "";
  if (ISO_DATE.test(raw)) return raw;
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    const [, a, b, y] = slash;
    return `${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Human friendly date: `2026-01-01` → `1 يناير 2026` / `1 Jan 2026`. */
export function formatDate(value: string | Date | null | undefined, lang: Lang = "ar"): string {
  const iso = toDateInputValue(value);
  if (!iso) return String(value ?? "").trim();

  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return String(value ?? "").trim();

  // A bare year that was upgraded to YYYY-01-01 still reads better as a year.
  const sourceWasYearOnly = /^\d{4}$/.test(String(value ?? "").trim());
  if (sourceWasYearOnly) return String(y);

  return lang === "en"
    ? `${d} ${EN_MONTHS[m - 1]} ${y}`
    : `${d} ${AR_MONTHS[m - 1]} ${y}`;
}

/** Today as YYYY-MM-DD (local time, not UTC). */
export function todayIso(): string {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ *
 * Date ranges — a study runs "from" a start date "to" an end date
 * ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

/** Parse an ISO date as a UTC timestamp (no DST surprises when counting days). */
function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** `2026-01-01` + 9 → `2026-01-10`. Returns "" for unreadable input. */
export function addDaysIso(value: string | null | undefined, days: number): string {
  const iso = toDateInputValue(value);
  if (!iso) return "";
  return new Date(isoToUtc(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Signed number of calendar days from `from` to `to` (`to - from`).
 * `daysBetween("2026-01-01", "2026-01-10")` → 9. Returns null when either date
 * cannot be understood.
 */
export function daysBetween(
  from: string | null | undefined,
  to: string | null | undefined,
): number | null {
  const a = toDateInputValue(from);
  const b = toDateInputValue(to);
  if (!a || !b) return null;
  return Math.round((isoToUtc(b) - isoToUtc(a)) / DAY_MS);
}

/**
 * Inclusive length of a range in days: 1 → 10 January is 10 days.
 * Returns null for open-ended or invalid ranges.
 */
export function rangeLengthDays(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  const diff = daysBetween(start, end);
  if (diff === null || diff < 0) return null;
  return diff + 1;
}

/**
 * Arabic has real plural forms for days; English just needs an "s".
 *   1 → يوم واحد · 2 → يومان · 3–10 → ٣ أيام · 11+ → ١١ يوماً
 */
export function formatDays(n: number, lang: Lang = "ar"): string {
  const abs = Math.abs(Math.round(n));
  if (lang === "en") return abs === 1 ? "1 day" : `${abs} days`;
  if (abs === 0) return "0 يوم";
  if (abs === 1) return "يوم واحد";
  if (abs === 2) return "يومان";
  if (abs <= 10) return `${abs} أيام`;
  return `${abs} يوماً`;
}

/**
 * Human friendly range that avoids repeating the month/year when it can:
 *   1 – 10 يناير 2026 · 25 ديسمبر 2025 – 3 يناير 2026 · 1 Jan – 10 Jan 2026
 * Falls back to the single start date when there is no end.
 */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  lang: Lang = "ar",
): string {
  const a = toDateInputValue(start);
  const b = toDateInputValue(end);
  if (!a) return b ? formatDate(b, lang) : "";
  if (!b || b === a) return formatDate(start, lang);

  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const months = lang === "en" ? EN_MONTHS : AR_MONTHS;
  const dash = " – ";

  if (ay === by && am === bm) {
    return lang === "en"
      ? `${ad}${dash}${bd} ${months[bm - 1]} ${by}`
      : `${ad}${dash}${bd} ${months[bm - 1]} ${by}`;
  }
  if (ay === by) {
    return `${ad} ${months[am - 1]}${dash}${bd} ${months[bm - 1]} ${by}`;
  }
  return `${formatDate(a, lang)}${dash}${formatDate(b, lang)}`;
}
