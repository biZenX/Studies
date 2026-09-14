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

export async function parseFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const arrayBuffer = await file.arrayBuffer();
    return parseXlsxBuffer(arrayBuffer);
  }

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const arrayBuffer = await file.arrayBuffer();
    return parseDocxBuffer(arrayBuffer);
  }

  // Text, CSV, TSV, CSX, etc.
  const text = await file.text();
  return parseTextOrCsv(text);
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

  // Check if it has table delimiters
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
    if (allRows.length > 0) {
      const firstRow = allRows[0];
      const hasHeader = detectHasHeader(firstRow);
      const headers = hasHeader ? firstRow : firstRow.map((_, i) => `العمود ${i + 1}`);
      const dataRows = hasHeader ? allRows.slice(1) : allRows;
      const mapping = guessColumnMapping(headers);
      return { headers, rows: dataRows, suggestedMapping: mapping };
    }
  }

  // Plain text list without standard table delimiters (e.g. "1- محمد أحمد - مصر")
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
  // Strip leading numbering: "1-", "1.", "1)", "(1)"
  let clean = line.replace(/^\(?\s*\d+\s*[\.\-\)\:]\s*/, "").trim();
  if (!clean) return null;

  // Check for email inside the line
  let email = "";
  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    email = emailMatch[0];
    clean = clean.replace(email, " ").trim();
  }

  // Check for phone number inside the line
  let phone = "";
  const phoneMatch = clean.match(/(\+?\d[\d\s\-]{7,}\d)/);
  if (phoneMatch) {
    phone = phoneMatch[0].trim();
    clean = clean.replace(phone, " ").trim();
  }

  // Check delimiters like dash, slash, or parentheses
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
    if (m) {
      parts = [m[1], m[2]];
    }
  }

  if (parts.length === 0) {
    // Single name or no standard separator
    return [clean, "", "", email, phone];
  }

  const name = parts[0]?.trim() || "";
  const country = parts[1]?.trim() || "";
  const federation = parts[2]?.trim() || country;

  return [name, country, federation, email, phone];
}

// ---------------- ZIP / XLSX / DOCX PARSER ----------------

async function parseZipArchive(buffer: ArrayBuffer | ArrayBufferView): Promise<Record<string, string>> {
  const u8 = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

  let eocdOffset = -1;
  for (let i = u8.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("الملف المضغوط غير صالح أو تالف.");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const entries: Record<string, string> = {};
  let cdPos = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (cdPos + 46 > u8.length) break;
    if (view.getUint32(cdPos, true) !== 0x02014b50) break;

    const method = view.getUint16(cdPos + 10, true);
    const compSize = view.getUint32(cdPos + 20, true);
    const nameLen = view.getUint16(cdPos + 28, true);
    const extraLen = view.getUint16(cdPos + 30, true);
    const commentLen = view.getUint16(cdPos + 32, true);
    const localHeaderOffset = view.getUint32(cdPos + 42, true);

    const nameBytes = u8.slice(cdPos + 46, cdPos + 46 + nameLen);
    const fileName = new TextDecoder("utf-8").decode(nameBytes);

    if (localHeaderOffset + 30 <= u8.length) {
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compData = u8.slice(dataStart, dataStart + compSize);

      try {
        if (method === 0) {
          entries[fileName] = new TextDecoder("utf-8").decode(compData);
        } else if (method === 8) {
          const ds = new DecompressionStream("deflate-raw");
          const w = ds.writable.getWriter();
          w.write(compData);
          w.close();
          const r = ds.readable.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { value, done } = await r.read();
            if (done) break;
            chunks.push(value);
          }
          const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
          const merged = new Uint8Array(totalLen);
          let o = 0;
          for (const c of chunks) {
            merged.set(c, o);
            o += c.length;
          }
          entries[fileName] = new TextDecoder("utf-8").decode(merged);
        }
      } catch {
        // Skip unreadable entry
      }
    }

    cdPos += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}

export async function parseXlsxBuffer(buffer: ArrayBuffer | ArrayBufferView): Promise<ParsedTable> {
  const entries = await parseZipArchive(buffer);

  // 1. Parse shared strings if present
  const sharedStrings: string[] = [];
  const sstXml = entries["xl/sharedStrings.xml"] || entries["xl/SharedStrings.xml"];
  if (sstXml) {
    const siMatches = sstXml.match(/<si\b[^>]*>[\s\S]*?<\/si>/gi) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/gi) || [];
      const textVal = tMatches
        .map((t) => t.replace(/<\/?t\b[^>]*>/gi, ""))
        .join("");
      sharedStrings.push(decodeXmlEntities(textVal));
    }
  }

  // 2. Find sheet1.xml (or first worksheet)
  let sheetXml = entries["xl/worksheets/sheet1.xml"] || entries["xl/worksheets/Sheet1.xml"];
  if (!sheetXml) {
    for (const key of Object.keys(entries)) {
      if (key.startsWith("xl/worksheets/") && key.endsWith(".xml")) {
        sheetXml = entries[key];
        break;
      }
    }
  }

  if (!sheetXml) {
    throw new Error("لم يتم العثور على أوراق عمل داخل ملف الإكسيل.");
  }

  const rowMatches = sheetXml.match(/<row\b[^>]*>[\s\S]*?<\/row>/gi) || [];
  const parsedRows: string[][] = [];

  for (const rowTag of rowMatches) {
    const cellMatches = rowTag.match(/<c\b[^>]*>[\s\S]*?<\/c>|<c\b[^>]*\/>/gi) || [];
    const rowData: string[] = [];

    for (const cellTag of cellMatches) {
      const typeMatch = cellTag.match(/t="([a-z]+)"/i);
      const cellType = typeMatch ? typeMatch[1] : "";

      let val = "";
      const valMatch = cellTag.match(/<v>([\s\S]*?)<\/v>/i);
      if (valMatch) {
        val = valMatch[1];
      } else {
        const isMatch = cellTag.match(/<is>[\s\S]*?<t>([\s\S]*?)<\/t>[\s\S]*?<\/is>/i);
        if (isMatch) val = isMatch[1];
      }

      if (cellType === "s") {
        const idx = parseInt(val, 10);
        val = !isNaN(idx) && sharedStrings[idx] ? sharedStrings[idx] : "";
      }

      rowData.push(decodeXmlEntities(val.trim()));
    }

    if (rowData.some((c) => c !== "")) {
      parsedRows.push(rowData);
    }
  }

  if (parsedRows.length === 0) {
    return {
      headers: ["الاسم", "الدولة"],
      rows: [],
      suggestedMapping: { nameIdx: 0, countryIdx: 1, federationIdx: -1, emailIdx: -1, phoneIdx: -1 },
    };
  }

  const firstRow = parsedRows[0];
  const hasHeader = detectHasHeader(firstRow);
  const headers = hasHeader ? firstRow : firstRow.map((_, i) => `العمود ${i + 1}`);
  const dataRows = hasHeader ? parsedRows.slice(1) : parsedRows;
  const mapping = guessColumnMapping(headers);

  return { headers, rows: dataRows, suggestedMapping: mapping };
}

export async function parseDocxBuffer(buffer: ArrayBuffer | ArrayBufferView): Promise<ParsedTable> {
  const entries = await parseZipArchive(buffer);
  const docXml = entries["word/document.xml"];
  if (!docXml) {
    throw new Error("لم يتم العثور على محتوى المستند داخل ملف الوورد (DOCX).");
  }

  // 1. Check if Word document contains tables (<w:tbl>)
  const tableMatches = docXml.match(/<w:tbl\b[^>]*>[\s\S]*?<\/w:tbl>/gi) || [];
  if (tableMatches.length > 0) {
    const tableRows: string[][] = [];
    for (const tbl of tableMatches) {
      const trMatches = tbl.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gi) || [];
      for (const tr of trMatches) {
        const tcMatches = tr.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gi) || [];
        const rowCells: string[] = [];
        for (const tc of tcMatches) {
          const tMatches = tc.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
          const cellText = tMatches
            .map((t) => t.replace(/<\/?w:t\b[^>]*>/gi, ""))
            .join("");
          rowCells.push(decodeXmlEntities(cellText.trim()));
        }
        if (rowCells.some((c) => c !== "")) {
          tableRows.push(rowCells);
        }
      }
    }

    if (tableRows.length > 0) {
      const firstRow = tableRows[0];
      const hasHeader = detectHasHeader(firstRow);
      const headers = hasHeader ? firstRow : firstRow.map((_, i) => `العمود ${i + 1}`);
      const dataRows = hasHeader ? tableRows.slice(1) : tableRows;
      const mapping = guessColumnMapping(headers);
      return { headers, rows: dataRows, suggestedMapping: mapping };
    }
  }

  // 2. If no tables, extract paragraphs (<w:p>)
  const pMatches = docXml.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi) || [];
  const lines: string[] = [];
  for (const p of pMatches) {
    const tMatches = p.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
    const pText = tMatches
      .map((t) => t.replace(/<\/?w:t\b[^>]*>/gi, ""))
      .join("");
    const trimmed = decodeXmlEntities(pText.trim());
    if (trimmed) lines.push(trimmed);
  }

  return parseTextOrCsv(lines.join("\n"));
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function detectHasHeader(row: string[]): boolean {
  const headerKeywords = [
    "اسم", "name", "دولة", "بلد", "جنسية", "country", "اتحاد",
    "federation", "بريد", "email", "هاتف", "phone", "م", "ت", "#", "no"
  ];
  let matches = 0;
  for (const cell of row) {
    const lower = cell.toLowerCase().trim();
    if (headerKeywords.some((k) => lower.includes(k))) {
      matches++;
    }
  }
  return matches >= 1;
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  let nameIdx = -1;
  let countryIdx = -1;
  let federationIdx = -1;
  let emailIdx = -1;
  let phoneIdx = -1;

  headers.forEach((h, i) => {
    const clean = h.toLowerCase().trim();
    if (nameIdx === -1 && (clean.includes("اسم") || clean.includes("name") || clean.includes("مشارك"))) {
      nameIdx = i;
    } else if (countryIdx === -1 && (clean.includes("دولة") || clean.includes("بلد") || clean.includes("جنسية") || clean.includes("country") || clean.includes("nationality"))) {
      countryIdx = i;
    } else if (federationIdx === -1 && (clean.includes("اتحاد") || clean.includes("نادي") || clean.includes("جهة") || clean.includes("federation") || clean.includes("club") || clean.includes("org"))) {
      federationIdx = i;
    } else if (emailIdx === -1 && (clean.includes("بريد") || clean.includes("إيميل") || clean.includes("email") || clean.includes("mail"))) {
      emailIdx = i;
    } else if (phoneIdx === -1 && (clean.includes("هاتف") || clean.includes("جوال") || clean.includes("محمول") || clean.includes("phone") || clean.includes("mobile") || clean.includes("tel"))) {
      phoneIdx = i;
    }
  });

  // Fallbacks if not detected by keywords
  if (nameIdx === -1 && headers.length > 0) nameIdx = 0;
  if (countryIdx === -1 && headers.length > 1) countryIdx = 1;
  if (federationIdx === -1 && headers.length > 2) federationIdx = 2;

  return { nameIdx, countryIdx, federationIdx, emailIdx, phoneIdx };
}
