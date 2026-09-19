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

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

export async function parseFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();

  // Binary spreadsheets: dynamically load SheetJS to read the bytes.
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
    const arrayBuffer = await file.arrayBuffer();
    return await parseSpreadsheetBuffer(arrayBuffer);
  }

  // Delimited text must be decoded by the browser as UTF-8. Handing the raw
  // bytes to SheetJS instead makes it guess a codepage, which turns Arabic
  // text into mojibake ("Ø±Ùã" instead of "رقم").
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

/**
 * Decode a delimited text file. Excel on Windows writes "CSV" as ANSI
 * (windows-1256 for Arabic), which reads as mojibake when assumed to be UTF-8,
 * so we try UTF-8 first and fall back to the Arabic codepages.
 */
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

/** True when a "UTF-8" decode produced replacement chars or classic mojibake. */
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

/* ------------------------------------------------------------------ *
 * Table analysis
 * ------------------------------------------------------------------ */

export function analyzeTableRows(rawRows: string[][]): ParsedTable {
  const cleanRows = (rawRows ?? []).filter((r) => Array.isArray(r) && r.some((c) => c !== ""));
  if (cleanRows.length === 0) return finalizeTable(FALLBACK_HEADERS, []);

  // Find the real header row (skipping titles, course names, logos…).
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
      // A row that is mostly long text is a paragraph/title, not a header.
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

/** Attach the smart column analysis + suggested mapping to a raw table. */
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

/* ------------------------------------------------------------------ *
 * Smart column analysis
 * ------------------------------------------------------------------ */

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

/**
 * Decide whether a numeric column is a plain 1,2,3… counter or a real
 * identifier (file / membership number) that is worth keeping.
 */
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

  // Monotonically increasing with irregular gaps → still a counter, just partial.
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
  const width = Math.max(headers.length, ...rows.map((r) => r.length), 0);
  const insights: ColumnInsight[] = [];
  const sampleRows = rows.slice(0, 60);

  for (let col = 0; col < width; col++) {
    const header = (headers[col] ?? "").trim() || `العمود ${col + 1}`;
    const allValues = rows.map((r) => (r[col] ?? "").trim());
    const values = allValues.filter(Boolean);
    const samples = values.slice(0, 3);
    const total = rows.length;

    if (values.length === 0) {
      insights.push({
        index: col,
        header,
        kind: "empty",
        confidence: 1,
        samples: [],
        filled: 0,
        total,
        unique: false,
        sequential: false,
        note: "عمود فارغ تماماً — لن يتم استيراده.",
      });
      continue;
    }

    const uniqueValues = new Set(values.map((v) => normalizeAr(v)));
    const unique = uniqueValues.size === values.length;
    const uniqueRatio = uniqueValues.size / Math.max(values.length, 1);

    const headerNorm = normalizeAr(header);
    const emailHits = values.filter((v) => EMAIL_RE.test(v)).length;
    const phoneHits = values.filter((v) => PHONE_RE.test(v) && digitsOnly(v).length >= 7).length;
    const dateHits = values.filter((v) => DATE_RE.test(v)).length;
    const countryHits = values.filter(isLikelyCountry).length;
    const federationHits = values.filter(isLikelyFederation).length;
    const intHits = values.filter((v) => PLAIN_INT_RE.test(v)).length;
    const codeHits = values.filter((v) => CODE_RE.test(v)).length;
    const textHits = values.filter(
      (v) => !EMAIL_RE.test(v) && !PHONE_RE.test(v) && !PLAIN_INT_RE.test(v) && v.length > 1,
    ).length;

    const ratio = (n: number) => n / values.length;
    const { sequential, startOffset } =
      intHits === values.length ? detectSequence(sampleRows.map((r) => (r[col] ?? "").trim()).filter(Boolean)) : { sequential: false, startOffset: 0 };

    let kind: ColumnKind = "mixed";
    let confidence = 0.4;
    let note = "";

    // 1. Explicit e-mail / phone / date columns.
    if (ratio(emailHits) >= 0.6) {
      kind = "email";
      confidence = ratio(emailHits);
      note = "عناوين بريد إلكتروني — سيتم استيرادها في خانة البريد.";
    } else if (ratio(phoneHits) >= 0.6) {
      kind = "phone";
      confidence = ratio(phoneHits);
      note = "أرقام هواتف — سيتم استيرادها في خانة الهاتف.";
    } else if (ratio(dateHits) >= 0.6) {
      kind = "date";
      confidence = ratio(dateHits);
      note = "تواريخ — لا تُستخدم في كشف المشاركين.";
    }
    // 2. Pure numbers: counter or real identifier?
    else if (ratio(intHits) >= 0.9) {
      if (sequential) {
        kind = "serial";
        confidence = 0.97;
        note = `ترقيم تسلسلي بسيط (يبدأ من ${startOffset} ويزيد 1 في كل صف) — هذا رقم الصف وليس بيانات، لذلك سيتم تجاهله.`;
      } else if (uniqueRatio >= 0.85 || ratio(codeHits) >= 0.4) {
        kind = "id";
        confidence = 0.8;
        note =
          "أرقام غير متتابعة ومميزة لكل صف — يبدو رقم ملف/عضوية حقيقي، لذلك سيتم حفظه في خانة «رقم الملف» بدل تجاهله.";
      } else {
        kind = "id";
        confidence = 0.55;
        note = "عمود رقمي غير متتابع — يُعامل كرقم ملف/معرف وليس كترقيم صفوف.";
      }
    } else if (ratio(codeHits) >= 0.5) {
      kind = "id";
      confidence = ratio(codeHits);
      note = "أكواد مركّبة (حروف + أرقام) — سيتم حفظها في خانة «رقم الملف».";
    }
    // 3. Countries / federations.
    else if (ratio(countryHits) >= 0.5) {
      kind = "country";
      confidence = Math.min(1, ratio(countryHits) + 0.2);
      note = "قيم مطابقة لأسماء دول معروفة — سيتم استيرادها كعمود الدولة.";
    } else if (ratio(federationHits) >= 0.35) {
      kind = "federation";
      confidence = Math.min(1, ratio(federationHits) + 0.25);
      note = "نصوص تحتوي على «اتحاد/نادي/هيئة» — سيتم استيرادها كعمود الاتحاد.";
    } else if (uniqueRatio <= 0.35 && values.length >= 4 && ratio(textHits) >= 0.8) {
      kind = "federation";
      confidence = 0.6;
      note = "قيم قليلة التكرار (نفس النص يتكرر لعدة صفوف) — غالباً اسم الاتحاد.";
    }
    // 4. Names.
    else if (
      ratio(textHits) >= 0.8 &&
      values.filter((v) => v.split(/\s+/).length >= 2).length / values.length >= 0.7
    ) {
      kind = "name";
      confidence = 0.75;
      note = "نصوص متعددة الكلمات بدون أرقام أو بريد — يبدو عمود الأسماء.";
    } else if (ratio(textHits) >= 0.6) {
      kind = "text";
      confidence = 0.45;
      note = "نص حر — راجع محتواه قبل اختياره.";
    } else {
      kind = "mixed";
      confidence = 0.3;
      note = "محتوى مختلط — يُفضّل مراجعة هذا العمود يدوياً.";
    }

    // Header keywords can raise (or override) the content-based guess.
    const headerHint = guessFromHeader(headerNorm);
    if (headerHint && kind !== "serial") {
      if (headerHint !== kind) {
        const contentNote = note;
        kind = headerHint;
        confidence = Math.max(confidence, 0.85);
        note = `اسم العمود («${header}») يدل على أنه ${kindLabelAr(
          headerHint,
        )}. ${contentNote}`;
      } else {
        confidence = Math.min(1, confidence + 0.15);
      }
    }
    // Never map a pure counter as anything else, even if the header says "رقم".
    if (sequential && ratio(intHits) >= 0.9) {
      kind = "serial";
      confidence = 0.97;
      note = `ترقيم تسلسلي بسيط (يبدأ من ${startOffset}) — رقم صف فقط، سيتم تجاهله.`;
    }

    insights.push({
      index: col,
      header,
      kind,
      confidence,
      samples,
      filled: values.length,
      total,
      unique,
      sequential,
      note,
    });
  }

  return insights;
}

function kindLabelAr(kind: ColumnKind): string {
  switch (kind) {
    case "name":
      return "عمود الأسماء";
    case "country":
      return "عمود الدولة";
    case "federation":
      return "عمود الاتحاد";
    case "email":
      return "البريد الإلكتروني";
    case "phone":
      return "رقم الهاتف";
    case "id":
      return "رقم الملف/المعرف";
    case "serial":
      return "ترقيم تسلسلي";
    case "date":
      return "تاريخ";
    default:
      return "نص";
  }
}

function guessFromHeader(header: string): ColumnKind | null {
  if (!header) return null;

  if (/^(م|#|no\.?|رقم|مسلسل|تسلسل|serial|row)$/.test(header) || header.includes("مسلسل")) {
    return "serial";
  }
  if (
    header.includes("اسم") ||
    header.includes("مشارك") ||
    header.includes("لاعب") ||
    header.includes("مدرب") ||
    header.includes("طالب") ||
    /\bname\b/.test(header)
  ) {
    return "name";
  }
  if (
    header.includes("دوله") ||
    header.includes("بلد") ||
    header.includes("جنسيه") ||
    header.includes("country") ||
    header.includes("nationality")
  ) {
    return "country";
  }
  if (
    header.includes("اتحاد") ||
    header.includes("نادي") ||
    header.includes("هيئه") ||
    header.includes("federation") ||
    header.includes("club") ||
    header.includes("association")
  ) {
    return "federation";
  }
  if (header.includes("بريد") || header.includes("ايميل") || header.includes("email") || header.includes("mail")) {
    return "email";
  }
  if (
    header.includes("هاتف") ||
    header.includes("جوال") ||
    header.includes("موبايل") ||
    header.includes("phone") ||
    header.includes("mobile") ||
    header.includes("tel")
  ) {
    return "phone";
  }
  if (
    header.includes("رقم الملف") ||
    header.includes("كود") ||
    header.includes("عضويه") ||
    header.includes("ملف") ||
    /\bcode\b/.test(header) ||
    /\bid\b/.test(header) ||
    /\bfile\b/.test(header)
  ) {
    return "id";
  }
  if (header.includes("تاريخ") || header.includes("date")) return "date";

  return null;
}

/** Turn the per-column insights into a concrete mapping. */
export function mappingFromAnalysis(
  analysis: ColumnInsight[],
  rows: string[][] = [],
): ColumnMapping {
  const mapping: ColumnMapping = { ...EMPTY_MAPPING };

  const pick = (kind: ColumnKind) =>
    analysis
      .filter((c) => c.kind === kind)
      .sort((a, b) => b.confidence - a.confidence || a.index - b.index)[0]?.index ?? -1;

  mapping.emailIdx = pick("email");
  mapping.phoneIdx = pick("phone");
  mapping.countryIdx = pick("country");
  mapping.federationIdx = pick("federation");
  mapping.codeIdx = pick("id");
  mapping.nameIdx = pick("name");

  // A serial column must never win, but if nothing else looks like a name we
  // fall back to the widest free-text column that is not the counter.
  if (mapping.nameIdx === -1) {
    const candidates = analysis
      .filter(
        (c) =>
          c.kind !== "serial" &&
          c.kind !== "email" &&
          c.kind !== "phone" &&
          c.kind !== "date" &&
          c.kind !== "empty" &&
          c.index !== mapping.countryIdx &&
          c.index !== mapping.federationIdx &&
          c.index !== mapping.codeIdx,
      )
      .sort((a, b) => b.filled - a.filled || a.index - b.index);
    mapping.nameIdx = candidates[0]?.index ?? -1;
  }

  if (mapping.nameIdx === -1 && analysis.length > 0) {
    mapping.nameIdx = analysis.find((c) => c.kind !== "serial")?.index ?? 0;
  }

  // Keep the legacy behaviour of defaulting the federation to the country when
  // the sheet has no dedicated federation column.
  if (mapping.federationIdx === -1 && mapping.countryIdx >= 0) {
    mapping.federationIdx = mapping.countryIdx;
  }

  void rows;
  return mapping;
}

/** Backwards-compatible helper kept for existing callers/tests. */
export function guessColumnMapping(headers: string[], dataRows: string[][] = []): ColumnMapping {
  const analysis = analyzeColumns(headers, dataRows);
  return mappingFromAnalysis(analysis, dataRows);
}

function buildWarnings(
  analysis: ColumnInsight[],
  mapping: ColumnMapping,
  rows: string[][],
): string[] {
  const warnings: string[] = [];

  const serials = analysis.filter((c) => c.kind === "serial");
  if (serials.length > 0) {
    warnings.push(
      `تم اكتشاف عمود ترقيم تسلسلي (${serials
        .map((c) => c.header)
        .join("، ")}) — تم تجاهله لأنه مجرد أرقام 1، 2، 3 وليس بيانات.`,
    );
  }

  const ids = analysis.filter((c) => c.kind === "id");
  if (ids.length > 0) {
    warnings.push(
      mapping.codeIdx >= 0
        ? `تم التعرف على «${analysis.find((c) => c.index === mapping.codeIdx)?.header}» كرقم ملف/معرف حقيقي وسيُحفظ مع كل مشارك.`
        : `يوجد عمود يبدو رقم ملف/معرف (${ids.map((c) => c.header).join("، ")}) — يمكنك ربطه بخانة «رقم الملف».`,
    );
  }

  if (mapping.nameIdx === -1) {
    warnings.push("لم يتم التعرف على عمود الأسماء تلقائياً — يرجى تحديده يدوياً.");
  }
  if (mapping.countryIdx === -1) {
    warnings.push("لم يتم العثور على عمود دولة واضح — سيتم الاعتماد على عمود الاتحاد إن وُجد.");
  }
  if (rows.length === 0) {
    warnings.push("الملف لا يحتوي على صفوف بيانات صالحة.");
  }

  return warnings;
}
