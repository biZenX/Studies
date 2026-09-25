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
  confidence: number;
  samples: string[];
  filled: number;
  total: number;
  unique: boolean;
  sequential: boolean;
  note: string;
};

export type ColumnMapping = {
  nameIdx: number;
  countryIdx: number;
  federationIdx: number;
  emailIdx: number;
  phoneIdx: number;
  codeIdx: number;
};

export type ParsedTable = {
  headers: string[];
  rows: string[][];
  suggestedMapping: ColumnMapping;
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

const ARAB_COUNTRIES = new Set([
  "مصر", "الاردن", "الأردن", "السعودية", "المملكة العربية السعودية",
  "الإمارات", "الامارات", "الكويت", "البحرين", "قطر", "عمان", "سلطنة عمان",
  "اليمن", "العراق", "سوريا", "لبنان", "فلسطين", "السودان", "ليبيا",
  "تونس", "الجزائر", "المغرب", "موريتانيا", "الصومال", "جيبوتي", "جزر القمر",
  "egypt", "jordan", "saudi", "saudi arabia", "ksa", "uae", "united arab emirates",
  "kuwait", "bahrain", "qatar", "oman", "yemen", "iraq", "syria", "lebanon",
  "palestine", "sudan", "libya", "tunisia", "algeria", "morocco", "mauritania",
  "somalia", "djibouti", "comoros",
]);

const NORMALIZED_COUNTRIES = new Set(
  [...ARAB_COUNTRIES].map((c) => normalizeAr(c)),
);

export { ARAB_COUNTRIES };

export async function parseFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
    const arrayBuffer = await file.arrayBuffer();
    return await parseSpreadsheetBuffer(arrayBuffer);
  }

  if (
    name.endsWith(".csv") ||
    name.endsWith(".tsv") ||
    name.endsWith(".csx") ||
    name.endsWith(".txt")
  ) {
    return parseTextOrCsv(await decodeTextFile(file));
  }

  if (name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    return await parseDocxBuffer(arrayBuffer);
  }

  if (name.endsWith(".doc")) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      return await parseDocxBuffer(arrayBuffer);
    } catch {
      const text = await file.text();
      return parseTextOrCsv(text);
    }
  }

  const text = await file.text();
  return parseTextOrCsv(text);
}

export async function decodeTextFile(file: File): Promise<string> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return file.text();
  }

  const utf8 = decodeWith("utf-8", buffer) ?? "";
  if (!needsFallbackDecoding(utf8)) return utf8;

  for (const encoding of ["windows-1256", "iso-8859-6", "windows-1252"]) {
    const candidate = decodeWith(encoding, buffer);
    if (candidate && /[\u0600-\u06FF]/.test(candidate)) return candidate;
  }
  return utf8;
}

function decodeWith(encoding: string, buffer: ArrayBuffer): string | null {
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return null;
  }
}

function needsFallbackDecoding(text: string): boolean {
  if (text.includes("\uFFFD")) return true;
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (hasArabic) return false;
  const latin1Supplement = (text.match(/[\u00C0-\u00FF]/g) || []).length;
  return latin1Supplement > 4;
}

export async function parseSpreadsheetBuffer(
  buffer: ArrayBuffer | ArrayBufferView,
): Promise<ParsedTable> {
  const XLSX = await import("xlsx");
  const u8 = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);

  const wb = XLSX.read(u8, { type: "array", raw: false });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("لم يتم العثور على أي أوراق عمل داخل ملف الإكسيل.");
  }

  const ws = wb.Sheets[firstSheetName];
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const stringRows: string[][] = rawRows.map((row) =>
    (Array.isArray(row) ? row : []).map((cell) =>
      cell === null || cell === undefined ? "" : String(cell).trim(),
    ),
  );

  return analyzeTableRows(stringRows);
}

export async function parseDocxBuffer(
  buffer: ArrayBuffer | ArrayBufferView,
): Promise<ParsedTable> {
  const mammoth = await import("mammoth");
  const u8 = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);

  try {
    const htmlResult = await mammoth.convertToHtml({
      arrayBuffer: u8.buffer as ArrayBuffer,
    });
    const html = htmlResult.value;

    const tableMatches = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) || [];
    if (tableMatches.length > 0) {
      const tableRows: string[][] = [];
      for (const tbl of tableMatches) {
        const trMatches = tbl.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
        for (const tr of trMatches) {
          const tdMatches = tr.match(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
          const rowCells = tdMatches.map((td) =>
            td.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim(),
          );
          if (rowCells.some((c) => c !== "")) {
            tableRows.push(rowCells);
          }
        }
      }

      if (tableRows.length > 0) {
        return analyzeTableRows(tableRows);
      }
    }
  } catch (err) {
    console.warn("Mammoth HTML conversion fallback:", err);
  }

  const textResult = await mammoth.extractRawText({
    arrayBuffer: u8.buffer as ArrayBuffer,
  });
  return parseTextOrCsv(textResult.value);
}

export function parseTextOrCsv(rawText: string): ParsedTable {
  const clean = rawText.replace(/^\uFEFF/, "").trim();
  if (!clean) return finalizeTable(FALLBACK_HEADERS, []);

  const rawLines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) return finalizeTable(FALLBACK_HEADERS, []);

  const sample = rawLines.slice(0, 10).join("\n");
  const commaCount = (sample.match(/,/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;
  const pipeCount = (sample.match(/\|/g) || []).length;

  let delimiter: string | null = null;
  if (tabCount >= rawLines.length) delimiter = "\t";
  else if (commaCount >= rawLines.length) delimiter = ",";
  else if (semiCount >= rawLines.length) delimiter = ";";
  else if (pipeCount >= rawLines.length) delimiter = "|";

  if (delimiter) {
    const allRows = rawLines.map((line) => parseCsvLine(line, delimiter as string));
    return analyzeTableRows(allRows);
  }

  const parsedRows: string[][] = [];
  for (const line of rawLines) {
    const parsed = parseTextListItem(line);
    if (parsed) parsedRows.push(parsed);
  }

  return finalizeTable(FALLBACK_HEADERS, parsedRows);
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseTextListItem(line: string): string[] | null {
  const clean = line.replace(/^\(?\s*\d+\s*[.\-):]\s*/, "").trim();
  if (!clean) return null;

  let rest = clean;
  let email = "";
  const emailMatch = rest.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
    rest = rest.replace(email, " ").trim();
  }

  let phone = "";
  const phoneMatch = rest.match(/(\+?\d[\d\s-]{7,}\d)/);
  if (phoneMatch) {
    phone = phoneMatch[0].trim();
    rest = rest.replace(phone, " ").trim();
  }

  let parts: string[] = [];
  if (rest.includes(" - ")) parts = rest.split(" - ");
  else if (rest.includes(" – ")) parts = rest.split(" – ");
  else if (rest.includes(" | ")) parts = rest.split(" | ");
  else if (rest.includes(" / ")) parts = rest.split(" / ");
  else if (rest.includes("(") && rest.includes(")")) {
    const m = rest.match(/^(.*?)\s*\((.*?)\)\s*$/);
    if (m) parts = [m[1], m[2]];
  }

  if (parts.length === 0) return [rest, "", "", email, phone];

  const name = parts[0]?.trim() || "";
  const country = parts[1]?.trim() || "";
  const federation = parts[2]?.trim() || country;

  return [name, country, federation, email, phone];
}

export function analyzeTableRows(rawRows: string[][]): ParsedTable {
  const cleanRows = (rawRows ?? []).filter((r) => Array.isArray(r) && r.some((c) => c !== ""));
  if (cleanRows.length === 0) return finalizeTable(FALLBACK_HEADERS, []);

  let bestHeaderIdx = -1;
  let highestScore = 0;

  const headerKeywords = [
    "اسم", "name", "مشارك", "طالب", "لاعب", "مدرب",
    "دولة", "بلد", "جنسية", "country", "nationality",
    "اتحاد", "federation", "نادي", "club", "جهة", "منظمة", "org",
    "بريد", "إيميل", "email", "mail",
    "هاتف", "جوال", "موبايل", "phone", "mobile", "tel",
    "رقم", "م", "ت", "مسلسل", "#", "no", "id", "code", "ملف",
  ];

  const maxScan = Math.min(15, cleanRows.length);
  for (let i = 0; i < maxScan; i++) {
    const row = cleanRows[i];
    let score = 0;
    const nonEmptyCells = row.filter(Boolean);
    if (nonEmptyCells.length < 2) continue;

    for (const cell of row) {
      const lower = String(cell).toLowerCase().trim();
      if (!lower) continue;

      if (lower.includes("@") && lower.includes(".")) score -= 15;
      if (/^\+?\d{8,15}$/.test(lower.replace(/[\s-]/g, ""))) score -= 15;
      if (lower.length > 60) score -= 10;

      for (const kw of headerKeywords) {
        if (lower.includes(kw)) {
          score += 10;
          break;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestHeaderIdx = i;
    }
  }

  let headers: string[] = [];
  let dataRows: string[][] = [];

  if (bestHeaderIdx !== -1 && highestScore >= 10) {
    headers = cleanRows[bestHeaderIdx].map((c) => String(c).trim());
    dataRows = cleanRows.slice(bestHeaderIdx + 1).map((r) => r.map((c) => String(c).trim()));
  } else {
    dataRows = cleanRows.map((r) => r.map((c) => String(c).trim()));
    const width = dataRows.reduce((max, r) => Math.max(max, r.length), 0);
    headers = Array.from({ length: width }, (_, i) => `العمود ${i + 1}`);
  }

  dataRows = dataRows.filter((r) => {
    const joined = r.join(" ").trim();
    if (!joined) return false;
    if (r.some((c) => c === "الاسم" || c === "اسم المشارك" || c.toLowerCase() === "name")) return false;
    if (/^(المجموع|الإجمالي|الاجمالي|total)\b/i.test(joined)) return false;
    return true;
  });

  return finalizeTable(headers, dataRows);
}

export function finalizeTable(headers: string[], rows: string[][]): ParsedTable {
  const width = Math.max(headers.length, ...rows.map((r) => r.length), 0);
  const normalizedHeaders = Array.from({ length: width }, (_, i) =>
    (headers[i] ?? "").trim() || `العمود ${i + 1}`,
  );

  const analysis = analyzeColumns(normalizedHeaders, rows);
  const mapping = mappingFromAnalysis(analysis, rows);
  const warnings = buildWarnings(analysis, mapping, rows);

  return {
    headers: normalizedHeaders,
    rows,
    suggestedMapping: mapping,
    analysis,
    warnings,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d][\d\s().-]{6,}\d$/;
const PLAIN_INT_RE = /^\d{1,7}$/;
const DATE_RE =
  /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}\s(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s\d{2,4})$/;
const CODE_RE = /^[#]?\d{2,}[-/][\w\u0600-\u06FF]+|^[A-Za-z]{2,4}[-/]?\d{2,}$/;

function digitsOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function isLikelyCountry(value: string): boolean {
  const norm = normalizeAr(value);
  return NORMALIZED_COUNTRIES.has(norm) || ARAB_COUNTRIES.has(value.trim().toLowerCase());
}

function isLikelyFederation(value: string): boolean {
  const v = normalizeAr(value);
  return (
    v.includes("اتحاد") ||
    v.includes("نادي") ||
    v.includes("فدرالي") ||
    v.includes("هيئه") ||
    v.includes("لجنه") ||
    v.includes("federation") ||
    v.includes("club") ||
    v.includes("association") ||
    v.includes("union")
  );
}

function detectSequence(values: string[]): {
  sequential: boolean;
  startOffset: number;
} {
  const nums = values.map((v) => Number(String(v).replace(/[^\d-]/g, "")));
  if (nums.length < 2 || nums.some((n) => !Number.isFinite(n))) {
    return { sequential: false, startOffset: 0 };
  }

  const starts = [nums[0], nums[0] - 1];
  for (const start of starts) {
    let matched = 0;
    for (let i = 0; i < nums.length; i++) {
      if (nums[i] === start + i) matched++;
    }
    if (matched / nums.length >= 0.85) {
      return { sequential: true, startOffset: nums[0] };
    }
  }

  let increasing = 0;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] > nums[i - 1]) increasing++;
  }
  if (nums.length > 3 && increasing / (nums.length - 1) >= 0.95) {
    const maxGap = Math.max(
      ...nums.slice(1).map((n, i) => Math.abs(n - nums[i])),
    );
    if (maxGap <= 3) return { sequential: true, startOffset: nums[0] };
  }

  return { sequential: false, startOffset: 0 };
}

export function analyzeColumns(headers: string[], rows: string[][]): ColumnInsight[] {
  // Simplified stub - full implementation in complete file
  // This partial push will be replaced immediately with full content
  return [];
}

function mappingFromAnalysis(analysis: ColumnInsight[], rows: string[][]): ColumnMapping {
  return { ...EMPTY_MAPPING };
}

function buildWarnings(
  analysis: ColumnInsight[],
  mapping: ColumnMapping,
  rows: string[][],
): string[] {
  const warnings: string[] = [];
  if (mapping.nameIdx === -1) {
    warnings.push("لم يتم التعرف على عمود الأسماء تلقائياً — يرجى تحديده يدوياً.");
  }
  if (rows.length === 0) {
    warnings.push("الملف لا يحتوي على صفوف بيانات صالحة.");
  }
  return warnings;
}
