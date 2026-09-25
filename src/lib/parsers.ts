import { normalizeAr } from "./content";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type ColumnKind =
  | "serial"
  | "id"
  | "name"
  | "country"
  | "federation"
  | "email"
  | "phone"
  | "date"
  | "text"
  | "mixed"
  | "empty";

export type ColumnInsight = {
  index: number;
  header: string;
  kind: ColumnKind;
  /** 0..1 — how sure the analyser is about `kind`. */
  confidence: number;
  samples: string[];
  filled: number;
  total: number;
  unique: boolean;
  /** True when the column is a plain 1,2,3… row counter. */
  sequential: boolean;
  /** Human readable explanation (Arabic). */
  note: string;
};

export type ColumnMapping = {
  nameIdx: number;
  countryIdx: number;
  federationIdx: number;
  emailIdx: number;
  phoneIdx: number;
  /** Real identifier column (file / membership number), -1 when absent. */
  codeIdx: number;
};

export type ParsedTable = {
  headers: string[];
  rows: string[][];
  suggestedMapping: ColumnMapping;
  /** Per-column smart analysis used by the import dialog. */
  analysis: ColumnInsight[];
  warnings: string[];
};

const EMPTY_MAPPING: ColumnMapping = {
  nameIdx: -1,
  countryIdx: -1,
  federationIdx: -1,
  emailIdx: -1,
  phoneIdx: -1,
  codeIdx: -1,
};

const FALLBACK_HEADERS = [
  "الاسم",
  "الدولة",
  "الاتحاد",
  "البريد الإلكتروني",
  "رقم الهاتف",
];

// NOTE: Full file restored via local blob; if truncated, re-push from /tmp/parsers_fixed.ts
export async function parseFile(file: File): Promise<ParsedTable> {
  throw new Error("parsers.ts incomplete — re-push required");
}
