import * as XLSX from "xlsx";
import * as mammoth from "mammoth";

export type ParsedTable = {
  headers: string[];
  rows: string[][];
  suggestedMapping: ColumnMapping;
};

export type ColumnMapping = {
  nameIdx: number;
  countryIdx: number;
  federationIdx: number;
  emailIdx: number;
  phoneIdx: number;
};

const ARAB_COUNTRIES = new Set([
  "مصر", "الاردن", "الأردن", "السعودية", "المملكة العربية السعودية",
  "الإمارات", "الامارات", "الكويت", "البحرين", "قطر", "عمان", "سلطنة عمان",
  "اليمن", "العراق", "سوريا", "لبنان", "فلسطين", "السودان", "ليبيا",
  "تونس", "الجزائر", "المغرب", "موريتانيا", "الصومال", "جيبوتي", "جزر القمر",
  "egypt", "jordan", "saudi", "ksa", "uae", "iraq", "syria", "lebanon", "palestine"
]);

export async function parseFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();

  // Excel / CSV / TSV / OpenDocument
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    name.endsWith(".tsv") ||
    name.endsWith(".csx") ||
    name.endsWith(".ods")
  ) {
    const arrayBuffer = await file.arrayBuffer();
    return parseSpreadsheetBuffer(arrayBuffer);
  }

  // Word documents (.docx)
  if (name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    return parseDocxBuffer(arrayBuffer);
  }

  // Binary Word documents (.doc) or fallback
  if (name.endsWith(".doc")) {
    const arrayBuffer = await file.arrayBuffer();
    try {
      return await parseDocxBuffer(arrayBuffer);
    } catch {
      const text = await file.text();
      return parseTextOrCsv(text);
    }
  }

  // Plain text, TSV, CSV fallback (.txt, etc.)
  const text = await file.text();
  return parseTextOrCsv(text);
}

export function parseSpreadsheetBuffer(buffer: ArrayBuffer | ArrayBufferView): ParsedTable {
  const u8 = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);

  const wb = XLSX.read(u8, { type: "array", raw: false });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("لم يتم العثور على أي أوراق عمل داخل ملف الإكسيل.");
  }

  const ws = wb.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const stringRows: string[][] = rawRows.map((row) =>
    (Array.isArray(row) ? row : []).map((cell) => (cell === null || cell === undefined ? "" : String(cell).trim()))
  );

  return analyzeTableRows(stringRows);
}

export async function parseDocxBuffer(buffer: ArrayBuffer | ArrayBufferView): Promise<ParsedTable> {
  const u8 = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);

  // 1. Try extracting HTML tables from Word
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer: u8.buffer as ArrayBuffer });
    const html = htmlResult.value;

    const tableMatches = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/gi) || [];
    if (tableMatches.length > 0) {
      const tableRows: string[][] = [];
      for (const tbl of tableMatches) {
        const trMatches = tbl.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
        for (const tr of trMatches) {
          const tdMatches = tr.match(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
          const rowCells = tdMatches.map((td) => {
            return td.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
          });
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

  // 2. Fallback to raw text extraction
  const textResult = await mammoth.extractRawText({ arrayBuffer: u8.buffer as ArrayBuffer });
  return parseTextOrCsv(textResult.value);
}

export function parseTextOrCsv(rawText: string): ParsedTable {
  const clean = rawText.replace(/^\uFEFF/, "").trim();
  if (!clean) {
    return {
      headers: ["الاسم", "الدولة", "الاتحاد", "البريد الإلكتروني", "رقم الهاتف"],
      rows: [],
      suggestedMapping: { nameIdx: 0, countryIdx: 1, federationIdx: 2, emailIdx: 3, phoneIdx: 4 },
    };
  }

  const rawLines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rawLines.length === 0) {
    return {
      headers: ["الاسم", "الدولة"],
      rows: [],
      suggestedMapping: { nameIdx: 0, countryIdx: 1, federationIdx: -1, emailIdx: -1, phoneIdx: -1 },
    };
  }

  // Detect delimiter (tab, comma, semicolon, pipe)
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
    const allRows = rawLines.map((line) => parseCsvLine(line, delimiter!));
    return analyzeTableRows(allRows);
  }

  // Plain text lines without standard delimiters (e.g. "1- محمد أحمد - مصر")
  const parsedRows: string[][] = [];
  for (const line of rawLines) {
    const parsed = parseTextListItem(line);
    if (parsed) {
      parsedRows.push(parsed);
    }
  }

  const headers = ["الاسم", "الدولة", "الاتحاد", "البريد الإلكتروني", "رقم الهاتف"];
  return {
    headers,
    rows: parsedRows,
    suggestedMapping: {
      nameIdx: 0,
      countryIdx: 1,
      federationIdx: 2,
      emailIdx: 3,
      phoneIdx: 4,
    },
  };
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
  let clean = line.replace(/^\(?\s*\d+\s*[\.\-\)\:]\s*/, "").trim();
  if (!clean) return null;

  let email = "";
  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
    clean = clean.replace(email, " ").trim();
  }

  let phone = "";
  const phoneMatch = clean.match(/(\+?\d[\d\s\-]{7,}\d)/);
  if (phoneMatch) {
    phone = phoneMatch[0].trim();
    clean = clean.replace(phone, " ").trim();
  }

  let parts: string[] = [];
  if (clean.includes(" - ")) {
    parts = clean.split(" - ");
  } else if (clean.includes(" – ")) {
    parts = clean.split(" – ");
  } else if (clean.includes(" | ")) {
    parts = clean.split(" | ");
  } else if (clean.includes(" / ")) {
    parts = clean.split(" / ");
  } else if (clean.includes("(") && clean.includes(")")) {
    const m = clean.match(/^(.*?)\s*\((.*?)\)\s*$/);
    if (m) parts = [m[1], m[2]];
  }

  if (parts.length === 0) {
    return [clean, "", "", email, phone];
  }

  const name = parts[0]?.trim() || "";
  const country = parts[1]?.trim() || "";
  const federation = parts[2]?.trim() || country;

  return [name, country, federation, email, phone];
}

export function analyzeTableRows(rawRows: string[][]): ParsedTable {
  const cleanRows = rawRows.filter((r) => r.some((c) => c !== ""));

  if (cleanRows.length === 0) {
    return {
      headers: ["الاسم", "الدولة", "الاتحاد", "البريد الإلكتروني", "رقم الهاتف"],
      rows: [],
      suggestedMapping: { nameIdx: 0, countryIdx: 1, federationIdx: 2, emailIdx: 3, phoneIdx: 4 },
    };
  }

  // Identify true table header row (skipping titles, course names, etc.)
  let bestHeaderIdx = -1;
  let highestScore = 0;

  const headerKeywords = [
    "اسم", "name", "مشارك", "طالب", "لاعب", "مدرب",
    "دولة", "بلد", "جنسية", "country", "nationality",
    "اتحاد", "federation", "نادي", "club", "جهة", "منظمة", "org",
    "بريد", "إيميل", "email", "mail",
    "هاتف", "جوال", "موبايل", "phone", "mobile", "tel",
    "رقم", "م", "ت", "مسلسل", "#", "no", "id"
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
      if (/^\+?\d{8,15}$/.test(lower.replace(/[\s\-]/g, ""))) score -= 15;

      for (const kw of headerKeywords) {
        if (lower === kw || lower.startsWith(kw + " ") || lower.endsWith(" " + kw) || lower.includes(kw)) {
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
    headers = Array.from({ length: dataRows[0]?.length || 0 }, (_, i) => `العمود ${i + 1}`);
  }

  // Filter out empty rows or repeated headers
  dataRows = dataRows.filter((r) => {
    const joined = r.join(" ").trim();
    if (!joined) return false;
    if (r.some((c) => c === "الاسم" || c === "اسم المشارك")) return false;
    if (joined.startsWith("المجموع") || joined.startsWith("الإجمالي") || joined.startsWith("Total")) return false;
    return true;
  });

  const mapping = guessColumnMapping(headers, dataRows);

  return {
    headers,
    rows: dataRows,
    suggestedMapping: mapping,
  };
}

export function guessColumnMapping(headers: string[], dataRows: string[][] = []): ColumnMapping {
  let nameIdx = -1;
  let countryIdx = -1;
  let federationIdx = -1;
  let emailIdx = -1;
  let phoneIdx = -1;

  // Phase 1: Header name matching
  headers.forEach((h, i) => {
    const clean = h.toLowerCase().trim();
    if (!clean) return;

    if (nameIdx === -1 && (clean.includes("اسم") || clean.includes("name") || clean.includes("مشارك") || clean.includes("طالب") || clean.includes("لاعب") || clean.includes("مدرب"))) {
      nameIdx = i;
    } else if (countryIdx === -1 && (clean.includes("دولة") || clean.includes("بلد") || clean.includes("جنسية") || clean.includes("country") || clean.includes("nationality"))) {
      countryIdx = i;
    } else if (federationIdx === -1 && (clean.includes("اتحاد") || clean.includes("جهة") || clean.includes("نادي") || clean.includes("هيئة") || clean.includes("federation") || clean.includes("club") || clean.includes("org"))) {
      federationIdx = i;
    } else if (emailIdx === -1 && (clean.includes("بريد") || clean.includes("إيميل") || clean.includes("ايميل") || clean.includes("email") || clean.includes("mail"))) {
      emailIdx = i;
    } else if (phoneIdx === -1 && (clean.includes("هاتف") || clean.includes("جوال") || clean.includes("موبايل") || clean.includes("phone") || clean.includes("mobile") || clean.includes("tel"))) {
      phoneIdx = i;
    }
  });

  // Phase 2: Content-based deduction from data rows
  const sampleRows = dataRows.slice(0, 30);
  const numCols = Math.max(headers.length, ...sampleRows.map((r) => r.length), 0);

  for (let col = 0; col < numCols; col++) {
    const colValues = sampleRows.map((r) => (r[col] ?? "").trim()).filter(Boolean);
    if (colValues.length === 0) continue;

    if (emailIdx === -1) {
      const emailCount = colValues.filter((v) => v.includes("@") && v.includes(".")).length;
      if (emailCount >= Math.max(1, colValues.length * 0.3)) {
        emailIdx = col;
        continue;
      }
    }

    if (phoneIdx === -1) {
      const phoneCount = colValues.filter((v) => /^(\+?\d[\d\s\-]{6,}\d)$/.test(v)).length;
      if (phoneCount >= Math.max(1, colValues.length * 0.3)) {
        phoneIdx = col;
        continue;
      }
    }

    if (countryIdx === -1) {
      const countryCount = colValues.filter((v) => {
        const norm = v.replace(/[أإآ]/g, "ا").toLowerCase();
        return ARAB_COUNTRIES.has(v) || ARAB_COUNTRIES.has(norm);
      }).length;
      if (countryCount >= Math.max(1, colValues.length * 0.25)) {
        countryIdx = col;
        continue;
      }
    }

    const isSeqCol = colValues.every((v) => /^\d{1,4}$/.test(v));
    if (isSeqCol) continue;

    if (nameIdx === -1) {
      const isLikelyName = colValues.every((v) => !v.includes("@") && !/^\+?\d+$/.test(v) && v.split(/\s+/).length >= 2);
      if (isLikelyName) {
        nameIdx = col;
        continue;
      }
    }
  }

  // Fallback: If nameIdx is still -1 or points to numbers
  if (nameIdx === -1 || sampleRows.every((r) => /^\d+$/.test((r[nameIdx] ?? "").trim()))) {
    for (let c = 0; c < numCols; c++) {
      if (c === countryIdx || c === federationIdx || c === emailIdx || c === phoneIdx) continue;
      const colValues = sampleRows.map((r) => (r[c] ?? "").trim()).filter(Boolean);
      const isNumbers = colValues.every((v) => /^\d+$/.test(v));
      if (!isNumbers && colValues.length > 0) {
        nameIdx = c;
        break;
      }
    }
  }

  if (nameIdx === -1 && headers.length > 0) nameIdx = 0;

  return { nameIdx, countryIdx, federationIdx, emailIdx, phoneIdx };
}
