import type { Participant, Study } from "./types";
import { formatDate, formatDateRange, translateCountry, toDateInputValue } from "./content";

/* ------------------------------------------------------------------ *
 * Export options — everything the export dialog can control
 * ------------------------------------------------------------------ */

export type ExportTheme = "navy" | "emerald" | "slate" | "burgundy";
export type PageSize = "a4" | "letter" | "auto";
export type Orientation = "portrait" | "landscape";
export type Density = "comfortable" | "compact";
export type ExportSort = "original" | "name" | "country" | "federation";

export type ExportColumns = {
  serial: boolean;
  name: boolean;
  federation: boolean;
  country: boolean;
  code: boolean;
  email: boolean;
  phone: boolean;
};

export type ExportOptions = {
  /** Document language — also flips the direction of the generated file. */
  lang: "ar" | "en";
  /** Optional title/description override (already localised by the caller). */
  title?: string;
  description?: string;
  /** "date" renders a full date, "year" only the year, "hidden" removes the badge. */
  dateMode: "date" | "year" | "hidden";
  columns: ExportColumns;
  sortBy: ExportSort;
  groupByCountry: boolean;
  showStats: boolean;
  showSearch: boolean;
  showCountryBreakdown: boolean;
  showFooterNote: boolean;
  footerNote: string;
  /** Keep row numbers consecutive after the built-in search filters rows. */
  renumberOnFilter: boolean;
  pageSize: PageSize;
  orientation: Orientation;
  density: Density;
  zebra: boolean;
  theme: ExportTheme;
  fileName?: string;
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  lang: "ar",
  dateMode: "date",
  columns: {
    serial: true,
    name: true,
    federation: true,
    country: true,
    code: false,
    email: false,
    phone: false,
  },
  sortBy: "original",
  groupByCountry: false,
  showStats: true,
  showSearch: true,
  showCountryBreakdown: false,
  showFooterNote: true,
  footerNote: "",
  renumberOnFilter: true,
  pageSize: "a4",
  orientation: "portrait",
  density: "comfortable",
  zebra: true,
  theme: "navy",
};

export function mergeExportOptions(partial?: Partial<ExportOptions> | null): ExportOptions {
  const base = { ...DEFAULT_EXPORT_OPTIONS, ...(partial ?? {}) };
  base.columns = { ...DEFAULT_EXPORT_OPTIONS.columns, ...(partial?.columns ?? {}) };
  return base;
}

const THEMES: Record<
  ExportTheme,
  { navy: string; accent: string; accentSoft: string; ink: string }
> = {
  navy: { navy: "#0b2545", accent: "#059669", accentSoft: "#ecfdf5", ink: "#0f172a" },
  emerald: { navy: "#064e3b", accent: "#10b981", accentSoft: "#ecfdf5", ink: "#0f172a" },
  slate: { navy: "#1e293b", accent: "#475569", accentSoft: "#f1f5f9", ink: "#0f172a" },
  burgundy: { navy: "#4c0519", accent: "#be123c", accentSoft: "#fff1f2", ink: "#0f172a" },
};

type Labels = {
  dir: "rtl" | "ltr";
  roster: string;
  serial: string;
  name: string;
  federation: string;
  country: string;
  code: string;
  email: string;
  phone: string;
  date: string;
  year: string;
  period: string;
  participants: string;
  countries: string;
  federations: string;
  withEmail: string;
  searchPh: string;
  empty: string;
  matching: string;
  breakdown: string;
  generatedAt: string;
  defaultTitle: string;
  defaultNote: string;
};

function labelsFor(lang: "ar" | "en"): Labels {
  if (lang === "en") {
    return {
      dir: "ltr",
      roster: "Participant roster",
      serial: "#",
      name: "Name",
      federation: "Federation",
      country: "Country",
      code: "File no.",
      email: "Email",
      phone: "Phone",
      date: "Date",
      year: "Year",
      period: "Period",
      participants: "participants",
      countries: "countries",
      federations: "federations",
      withEmail: "with email",
      searchPh: "Search by name, federation or country...",
      empty: "No participants registered for this study",
      matching: "matching participants",
      breakdown: "Country breakdown",
      generatedAt: "Generated on",
      defaultTitle: "Participant roster",
      defaultNote: "This file is self-contained (HTML + inline CSS) and works offline.",
    };
  }
  return {
    dir: "rtl",
    roster: "كشف المشاركين",
    serial: "م",
    name: "اسم المشارك",
    federation: "الاتحاد",
    country: "الدولة",
    code: "رقم الملف",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    date: "التاريخ",
    year: "السنة",
    period: "المدة",
    participants: "مشارك",
    countries: "دولة",
    federations: "اتحاد",
    withEmail: "لهم بريد إلكتروني",
    searchPh: "بحث بالاسم أو الاتحاد أو الدولة...",
    empty: "لا يوجد مشاركون مسجلون في هذه الدراسة",
    matching: "مشارك مطابق",
    breakdown: "توزيع المشاركين حسب الدولة",
    generatedAt: "تم إنشاء الملف في",
    defaultTitle: "كشف المشاركين",
    defaultNote: "هذا الملف مستقل (HTML مع CSS مدمج) ويعمل بدون إنترنت.",
  };
}

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type ExportRow = {
  serial: number;
  name: string;
  federation: string;
  country: string;
  code: string;
  email: string;
  phone: string;
};

function sortRows(rows: ExportRow[], sortBy: ExportSort, locale = "ar"): ExportRow[] {
  const copy = [...rows];
  switch (sortBy) {
    case "name":
      copy.sort((a, b) => a.name.localeCompare(b.name, locale));
      break;
    case "country":
      copy.sort(
        (a, b) =>
          a.country.localeCompare(b.country, locale) || a.name.localeCompare(b.name, locale),
      );
      break;
    case "federation":
      copy.sort(
        (a, b) =>
          a.federation.localeCompare(b.federation, locale) ||
          a.name.localeCompare(b.name, locale),
      );
      break;
    default:
      break;
  }
  return copy;
}

function buildRows(
  participants: Participant[],
  options: ExportOptions,
): ExportRow[] {
  const safe = Array.isArray(participants) ? participants : [];
  const rows = safe.map((p, idx) => ({
    serial: idx + 1,
    name: (p?.name ?? "").trim() || "—",
    federation: (p?.federation ?? "").trim(),
    country: (p?.country ?? "").trim(),
    code: (p?.code ?? "").trim(),
    email: (p?.email ?? "").trim(),
    phone: (p?.phone ?? "").trim(),
  }));

  const sorted = sortRows(rows, options.sortBy, options.lang === "en" ? "en" : "ar");

  // Localise the country text (and fall back to the federation when a sheet
  // only carried one of the two).
  return sorted.map((r, i) => ({
    ...r,
    serial: i + 1,
    country: translateCountry(r.country || r.federation, options.lang),
    federation: options.lang === "en" ? translateCountry(r.federation, "en") : r.federation,
  }));
}

function cellCount(options: ExportOptions): number {
  const c = options.columns;
  return (
    Number(c.serial) +
    Number(c.name) +
    Number(c.federation) +
    Number(c.country) +
    Number(c.code) +
    Number(c.email) +
    Number(c.phone)
  );
}

/**
 * Build the standalone HTML report. Kept side-effect free so it can be used
 * both for the live preview iframe and for the actual download.
 */
/** The slice of a study the exporter needs; `endDate` is optional for callers that predate the period feature. */
export type ExportStudy = Pick<Study, "title" | "year" | "description"> & Partial<Pick<Study, "endDate">>;

export function generateStudyHtmlReport(
  study?: ExportStudy | null,
  participants: Participant[] = [],
  partialOptions?: Partial<ExportOptions> | null,
): string {
  const options = mergeExportOptions(partialOptions);
  const L = labelsFor(options.lang);
  const theme = THEMES[options.theme] ?? THEMES.navy;

  const title = (options.title ?? study?.title ?? "").trim() || L.defaultTitle;
  const description = (options.description ?? study?.description ?? "").trim();

  const rawDate = study?.year ?? "";
  const rawEnd = study?.endDate ?? "";
  // "date" shows the whole period (from – to) when an end date exists,
  // "year" keeps the legacy single year, "hidden" removes the badge.
  const dateText =
    options.dateMode === "hidden"
      ? ""
      : options.dateMode === "year"
        ? (toDateInputValue(rawDate) || "").slice(0, 4) || formatDate(rawDate, options.lang)
        : rawEnd
          ? formatDateRange(rawDate, rawEnd, options.lang)
          : formatDate(rawDate, options.lang);
  const dateLabel = options.dateMode === "year" ? L.year : rawEnd ? L.period : L.date;

  const rows = buildRows(participants, options);
  const cols = cellCount(options);
  const c = options.columns;

  const countries = new Set(rows.map((r) => r.country).filter(Boolean));
  const federations = new Set(rows.map((r) => r.federation).filter(Boolean));
  const withEmail = rows.filter((r) => r.email).length;

  const headCells = [
    c.serial ? `<th class="c-serial text-center">${L.serial}</th>` : "",
    c.name ? `<th class="c-name">${L.name}</th>` : "",
    c.federation ? `<th class="c-fed">${L.federation}</th>` : "",
    c.country ? `<th class="c-country">${L.country}</th>` : "",
    c.code ? `<th class="c-code text-center">${L.code}</th>` : "",
    c.email ? `<th class="c-email">${L.email}</th>` : "",
    c.phone ? `<th class="c-phone">${L.phone}</th>` : "",
  ]
    .filter(Boolean)
    .join("");

  const rowHtml = (r: ExportRow) => {
    const cells = [
      c.serial ? `<td class="num text-center serial-cell">${r.serial}</td>` : "",
      c.name ? `<td class="name-cell">${escapeHtml(r.name)}</td>` : "",
      c.federation
        ? `<td class="federation-cell">${escapeHtml(r.federation) || "—"}</td>`
        : "",
      c.country
        ? `<td class="country-cell">${
            r.country
              ? `<span class="pill">${escapeHtml(r.country)}</span>`
              : "—"
          }</td>`
        : "",
      c.code
        ? `<td class="num text-center code-cell">${escapeHtml(r.code) || "—"}</td>`
        : "",
      c.email
        ? `<td class="num email-cell" dir="ltr">${escapeHtml(r.email) || "—"}</td>`
        : "",
      c.phone
        ? `<td class="num phone-cell" dir="ltr">${escapeHtml(r.phone) || "—"}</td>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    return `<tr data-country="${escapeHtml(r.country)}">${cells}</tr>`;
  };

  let bodyHtml: string;
  if (rows.length === 0) {
    bodyHtml = `<tr class="empty-row"><td colspan="${Math.max(cols, 1)}" class="empty-state">${L.empty}</td></tr>`;
  } else if (options.groupByCountry) {
    const groups = new Map<string, ExportRow[]>();
    for (const r of rows) {
      const key = r.country || "—";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    bodyHtml = [...groups.entries()]
      .map(([group, groupRows]) => {
        const inner = groupRows.map(rowHtml).join("");
        return `<tr class="group-row"><td colspan="${cols}">${escapeHtml(
          group,
        )} <span class="group-count">(${groupRows.length})</span></td></tr>${inner}`;
      })
      .join("");
  } else {
    bodyHtml = rows.map(rowHtml).join("");
  }

  const breakdownHtml =
    options.showCountryBreakdown && rows.length > 0
      ? (() => {
          const counts = new Map<string, number>();
          for (const r of rows) {
            const key = r.country || "—";
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
          const max = Math.max(...counts.values());
          const items = [...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, n]) => {
              const pct = max > 0 ? Math.round((n / max) * 100) : 0;
              return `<li>
                <span class="bd-name">${escapeHtml(name)}</span>
                <span class="bd-bar"><span style="width:${pct}%"></span></span>
                <span class="bd-num num">${n}</span>
              </li>`;
            })
            .join("");
          return `<section class="breakdown">
            <h2>${L.breakdown}</h2>
            <ul>${items}</ul>
          </section>`;
        })()
      : "";

  const statsHtml = options.showStats
    ? `<div class="stats">
        <div class="stat"><b class="num">${rows.length}</b><span>${L.participants}</span></div>
        <div class="stat"><b class="num">${countries.size}</b><span>${L.countries}</span></div>
        <div class="stat"><b class="num">${federations.size}</b><span>${L.federations}</span></div>
        ${
          c.email
            ? `<div class="stat"><b class="num">${withEmail}</b><span>${L.withEmail}</span></div>`
            : ""
        }
      </div>`
    : "";

  const toolbarHtml = options.showSearch
    ? `<div class="toolbar">
        <div class="search-box">
          <input type="search" id="searchInput" class="search-input" placeholder="${L.searchPh}" autocomplete="off">
        </div>
      </div>`
    : "";

  const footerNote = options.showFooterNote
    ? options.footerNote.trim() || L.defaultNote
    : "";

  const scriptConfig = JSON.stringify({
    renumber: options.renumberOnFilter,
    total: rows.length,
    totalLabel: L.participants,
    matchingLabel: L.matching,
  });

  return `<!DOCTYPE html>
<html lang="${options.lang}" dir="${L.dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — ${L.roster}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --navy: ${theme.navy};
      --navy-soft: ${theme.navy}14;
      --accent: ${theme.accent};
      --accent-soft: ${theme.accentSoft};
      --ink: ${theme.ink};
      --muted: #64748b;
      --border: #e2e8f0;
      --bg: #f6f8fb;
      --card: #ffffff;
      --row-alt: #fbfcfe;
      --row-hover: #f1f5f9;
      --pad-y: ${options.density === "compact" ? "7px" : "12px"};
      --pad-x: ${options.density === "compact" ? "10px" : "16px"};
      --font-size: ${options.density === "compact" ? "13px" : "14.5px"};
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html { -webkit-text-size-adjust: 100%; }

    body {
      font-family: 'IBM Plex Sans Arabic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.7;
      padding: 28px 14px 48px;
      direction: ${L.dir};
      overflow-y: auto;
    }

    .sheet {
      max-width: ${options.orientation === "landscape" ? "1180px" : "940px"};
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      box-shadow: 0 10px 30px -18px rgba(15, 23, 42, 0.35);
      padding: 30px 26px 26px;
    }

    /* ---------- Document header (centred, navy, display font) ---------- */
    .doc-head { text-align: center; padding-bottom: 20px; border-bottom: 2px solid var(--border); }

    .meta-badges {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; flex-wrap: wrap; margin-bottom: 14px;
    }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: #f1f5f9; color: #334155;
      font-weight: 700; font-size: 12.5px; padding: 5px 14px; border-radius: 999px;
    }
    .badge.accent { background: var(--accent-soft); color: var(--accent); }
    .badge.navy { background: var(--navy-soft); color: var(--navy); }

    h1 {
      font-family: 'Cairo', 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
      font-size: clamp(24px, 3.6vw, 36px);
      font-weight: 800;
      line-height: 1.45;
      color: var(--navy);
      text-align: center;
      margin: 0 auto 10px;
      max-width: 92%;
      letter-spacing: 0;
    }

    .title-rule {
      width: 96px; height: 4px; border-radius: 999px; margin: 0 auto 14px;
      background: linear-gradient(90deg, var(--accent), var(--navy));
    }

    .description {
      font-size: 14px; color: var(--muted);
      max-width: 760px; margin: 0 auto; text-align: center; line-height: 1.9;
    }

    .stats {
      display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 18px;
    }
    .stat {
      display: flex; align-items: baseline; gap: 7px;
      border: 1px solid var(--border); border-radius: 999px;
      padding: 6px 16px; background: #fff;
    }
    .stat b { font-size: 16px; color: var(--navy); }
    .stat span { font-size: 12px; color: var(--muted); font-weight: 600; }

    /* ---------- Toolbar ---------- */
    .toolbar { display: flex; align-items: center; gap: 12px; margin: 22px 0 14px; flex-wrap: wrap; }
    .search-box { flex: 1; min-width: 220px; }
    .search-input {
      width: 100%; padding: 10px 14px; border: 1.5px solid var(--border);
      border-radius: 12px; font-family: inherit; font-size: 14px; outline: none;
      background: #fff; color: var(--ink); transition: border-color .18s, box-shadow .18s;
    }
    .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 4px ${theme.accent}1f; }
    /* ---------- Table ---------- */
    .table-wrap { overflow: auto; border: 1px solid var(--border); border-radius: 14px; max-height: none; }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size); text-align: ${L.dir === "rtl" ? "right" : "left"}; }
    thead th {
      position: sticky; top: 0; z-index: 2;
      background: var(--navy); color: #fff; font-weight: 700; font-size: 13px;
      padding: 12px var(--pad-x); white-space: nowrap; text-align: ${L.dir === "rtl" ? "right" : "left"};
    }
    thead th.text-center { text-align: center; }
    tbody tr { border-bottom: 1px solid var(--border); }
    tbody tr:last-child { border-bottom: none; }
    ${options.zebra ? "tbody tr.data-row:nth-child(even), tbody tr:nth-of-type(even) { background: var(--row-alt); }" : ""}
    tbody tr:hover { background: var(--row-hover); }
    td { padding: var(--pad-y) var(--pad-x); vertical-align: middle; }
    .num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
    .text-center { text-align: center; }
    .name-cell { font-weight: 700; color: var(--ink); }
    .federation-cell, .country-cell { color: #334155; font-weight: 500; }
    .serial-cell { color: var(--muted); font-weight: 700; width: 56px; }
    .c-serial { width: 56px; text-align: center; }
    .code-cell { color: var(--navy); font-weight: 700; }
    .email-cell, .phone-cell { color: var(--muted); font-size: 12.5px; }
    .pill {
      display: inline-block; background: var(--accent-soft); color: var(--accent);
      border-radius: 999px; padding: 3px 12px; font-size: 12px; font-weight: 700; white-space: nowrap;
    }
    .group-row td {
      background: #f8fafc; color: var(--navy); font-weight: 800; font-size: 13px;
      padding: 9px var(--pad-x); border-bottom: 1px solid var(--border);
    }
    .group-count { color: var(--muted); font-weight: 600; }
    .empty-state { text-align: center; padding: 34px 16px; color: var(--muted); font-size: 14px; }

    /* ---------- Country breakdown ---------- */
    .breakdown { margin-top: 22px; border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
    .breakdown h2 { font-size: 14px; color: var(--navy); margin-bottom: 12px; font-weight: 800; }
    .breakdown ul { list-style: none; display: grid; gap: 8px; }
    .breakdown li { display: grid; grid-template-columns: minmax(90px, 160px) 1fr 42px; align-items: center; gap: 10px; }
    .bd-name { font-size: 12.5px; font-weight: 700; color: #334155; }
    .bd-bar { display: block; height: 8px; background: #eef2f7; border-radius: 999px; overflow: hidden; }
    .bd-bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--navy)); border-radius: 999px; }
    .bd-num { font-size: 12.5px; font-weight: 800; color: var(--navy); text-align: ${L.dir === "rtl" ? "left" : "right"}; }

    .doc-footer {
      margin-top: 20px; padding-top: 14px; border-top: 1px dashed var(--border);
      display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between;
      font-size: 11.5px; color: var(--muted);
    }

    @media (max-width: 640px) {
      body { padding: 14px 8px 32px; }
      .sheet { padding: 20px 12px 18px; border-radius: 14px; }
      h1 { font-size: 22px; max-width: 100%; }
      .breakdown li { grid-template-columns: minmax(70px, 110px) 1fr 34px; }
    }

    @page { size: ${options.pageSize === "auto" ? "auto" : `${options.pageSize} ${options.orientation}`}; margin: 12mm; }

    @media print {
      body { background: #fff; padding: 0; }
      .sheet { border: none; box-shadow: none; padding: 0; max-width: 100%; border-radius: 0; }
      .no-print { display: none !important; }
      thead th { position: static; }
      tbody tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="doc-head">
      <div class="meta-badges">
        ${dateText ? `<span class="badge navy">${dateLabel}: <b class="num">${escapeHtml(dateText)}</b></span>` : ""}
        <span class="badge accent" id="countBadge"><b class="num">${rows.length}</b> ${L.participants}</span>
        ${countries.size ? `<span class="badge"><b class="num">${countries.size}</b> ${L.countries}</span>` : ""}
      </div>

      <h1>${escapeHtml(title)}</h1>
      <div class="title-rule"></div>
      ${description ? `<p class="description">${escapeHtml(description)}</p>` : ""}

      ${statsHtml}
    </header>

    ${toolbarHtml}

    <div class="table-wrap">
      <table id="participantsTable">
        <thead><tr>${headCells}</tr></thead>
        <tbody id="tableBody">${bodyHtml}</tbody>
      </table>
    </div>

    ${breakdownHtml}

    ${
      footerNote
        ? `<footer class="doc-footer"><span>${escapeHtml(footerNote)}</span><span>${
            L.generatedAt
          } ${escapeHtml(new Date().toLocaleDateString(options.lang === "en" ? "en-GB" : "ar-EG"))}</span></footer>`
        : ""
    }
  </div>

  <script>
    (function () {
      var CFG = ${scriptConfig};
      var input = document.getElementById('searchInput');
      var badge = document.getElementById('countBadge');
      if (!input) return;

      function apply() {
        var q = (input.value || '').trim().toLowerCase();
        var rows = Array.prototype.slice.call(document.querySelectorAll('#tableBody tr'));
        var visible = 0;

        rows.forEach(function (row) {
          if (row.classList.contains('group-row') || row.classList.contains('empty-row')) return;
          var text = (row.textContent || '').toLowerCase();
          var country = (row.getAttribute('data-country') || '').toLowerCase();
          var hit = !q || text.indexOf(q) !== -1 || country.indexOf(q) !== -1;
          row.style.display = hit ? '' : 'none';
          if (hit) {
            visible++;
            if (CFG.renumber) {
              var cell = row.querySelector('.serial-cell');
              if (cell) cell.textContent = visible;
            }
          }
        });

        if (badge) {
          badge.innerHTML = q
            ? '<b class="num">' + visible + '</b> ' + CFG.matchingLabel
            : '<b class="num">' + CFG.total + '</b> ' + CFG.totalLabel;
        }
      }

      input.addEventListener('input', apply);
    })();
  </script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ *
 * Download helpers
 * ------------------------------------------------------------------ */

export function buildExportFileName(
  study?: Pick<Study, "title" | "year"> | null,
  options?: Partial<ExportOptions> | null,
): string {
  const opts = mergeExportOptions(options);
  const custom = (opts.fileName ?? "").trim();
  const base =
    custom ||
    (study?.title || (opts.lang === "en" ? "participants" : "كشف_المشاركين"))
      .replace(/[^\w\u0600-\u06FF\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_");

  const stamp = toDateInputValue(study?.year ?? "") || todayStamp();
  const safeBase = (base || "roster").slice(0, 80);
  return `${safeBase}_${stamp}.html`;
}

function todayStamp(): string {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/**
 * Trigger a real browser download. Deliberately defensive: object URLs are
 * released late (some browsers abort the transfer when the URL dies too soon)
 * and every failure path returns false so callers can show feedback.
 */
export function downloadStudyReport(
  study?: ExportStudy | null,
  participants: Participant[] = [],
  partialOptions?: Partial<ExportOptions> | null,
): boolean {
  if (typeof window === "undefined") return false;

  const options = mergeExportOptions(partialOptions);

  try {
    const htmlContent = generateStudyHtmlReport(study, participants, options);
    const fileName = buildExportFileName(study, options);

    // iOS Safari ignores `download` on blob URLs inside iframes but works from
    // the top-level document, so always create the anchor on document.body.
    const blob = new Blob(["\uFEFF", htmlContent], { type: "text/html;charset=utf-8" });

    if (typeof URL === "undefined" || !URL.createObjectURL) {
      return openDataUrl(htmlContent);
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    a.target = "_self";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();

    window.setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 0);
    // Keep the URL alive long enough for slow downloads to start.
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* noop */
      }
    }, 30_000);

    return true;
  } catch (err) {
    console.error("Export download failed:", err);
    return false;
  }
}

function openDataUrl(html: string): boolean {
  try {
    const win = window.open();
    if (!win) return false;
    win.document.open();
    win.document.write(html);
    win.document.close();
    return true;
  } catch {
    return false;
  }
}

/** Open the generated report in a new tab (fallback when downloads are blocked). */
export function openStudyReport(
  study?: ExportStudy | null,
  participants: Participant[] = [],
  partialOptions?: Partial<ExportOptions> | null,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const html = generateStudyHtmlReport(study, participants, partialOptions);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return Boolean(win);
  } catch (err) {
    console.error("Open report failed:", err);
    return false;
  }
}

// Aliases kept for backwards compatibility with existing imports.
export const generateLecturerHtmlReport = generateStudyHtmlReport;
export const downloadLecturerReport = downloadStudyReport;
