import type { Participant, Study } from "./types";

export function generateStudyHtmlReport(
  study?: Pick<Study, "title" | "year" | "description"> | null,
  participants: Participant[] = []
): string {
  const safeStudy = {
    title: study?.title || "كشف المشاركين",
    year: study?.year || String(new Date().getFullYear()),
    description: study?.description || "",
  };
  const safeParticipants = Array.isArray(participants) ? participants : [];

  const rowsHtml = safeParticipants
    .map((p, idx) => {
      const federationText = p?.federation ? escapeHtml(p.federation) : (p?.country ? escapeHtml(p.country) : "—");
      const nameText = escapeHtml(p?.name || "بدون اسم");

      return `
          <tr>
            <td class="num text-center">${idx + 1}</td>
            <td class="name-cell">${nameText}</td>
            <td class="federation-cell">${federationText}</td>
          </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(safeStudy.title)} — كشف المشاركين</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');

    :root {
      --primary: #059669;
      --primary-dark: #047857;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg: #f8fafc;
      --card: #ffffff;
      --row-alt: #fcfdfe;
      --row-hover: #f1f5f9;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'IBM Plex Sans Arabic', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;
      background-color: var(--bg);
      color: var(--text-main);
      line-height: 1.6;
      padding: 32px 16px;
      direction: rtl;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      padding: 32px;
    }

    .header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .meta-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .badge-year {
      display: inline-block;
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 20px;
    }

    .badge-count {
      display: inline-block;
      background: #ecfdf5;
      color: var(--primary-dark);
      font-weight: 700;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 20px;
    }

    h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 8px;
    }

    .description {
      font-size: 14px;
      color: var(--text-muted);
      margin-top: 6px;
      line-height: 1.6;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      min-width: 240px;
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      font-family: inherit;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: var(--primary);
    }

    .table-container {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      text-align: right;
    }

    thead th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      padding: 14px 16px;
      border-bottom: 2px solid var(--border);
      white-space: nowrap;
    }

    thead th.text-center {
      text-align: center;
    }

    tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background-color 0.15s;
    }

    tbody tr:nth-child(even) {
      background-color: var(--row-alt);
    }

    tbody tr:hover {
      background-color: var(--row-hover);
    }

    tbody tr:last-child {
      border-bottom: none;
    }

    td {
      padding: 12px 16px;
      vertical-align: middle;
    }

    .num {
      width: 60px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .text-center {
      text-align: center;
    }

    .name-cell {
      font-weight: 600;
      color: var(--text-main);
    }

    .federation-cell {
      color: #334155;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;
      color: var(--text-muted);
      font-size: 14px;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .toolbar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="meta-badges">
        <span class="badge-year">السنة: ${escapeHtml(safeStudy.year)}</span>
        <span class="badge-count" id="countBadge">${safeParticipants.length} مشارك</span>
      </div>
      <h1>${escapeHtml(safeStudy.title)}</h1>
      ${safeStudy.description ? `<p class="description">${escapeHtml(safeStudy.description)}</p>` : ""}
    </header>

    <div class="toolbar">
      <div class="search-box">
        <input type="text" id="searchInput" class="search-input" placeholder="بحث باسم المشارك أو الاتحاد..." oninput="filterTable()">
      </div>
    </div>

    <div class="table-container">
      <table id="participantsTable">
        <thead>
          <tr>
            <th class="text-center" style="width: 60px;">م</th>
            <th>اسم المشارك</th>
            <th>الاتحاد / الجهة</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          ${rowsHtml || `<tr><td colspan="3" class="empty-state">لا يوجد مشاركون مسجلون في هذه الدراسة</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function filterTable() {
      var query = (document.getElementById('searchInput') ? document.getElementById('searchInput').value : '').trim().toLowerCase();
      var rows = document.querySelectorAll('#tableBody tr');
      var visibleCount = 0;

      rows.forEach(function(row) {
        var nameEl = row.querySelector('.name-cell');
        var fedEl = row.querySelector('.federation-cell');
        if (!nameEl && !fedEl) return;

        var name = (nameEl ? nameEl.textContent : '').toLowerCase();
        var fed = (fedEl ? fedEl.textContent : '').toLowerCase();

        if (name.includes(query) || fed.includes(query)) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      var badge = document.getElementById('countBadge');
      if (badge) {
        badge.textContent = query ? (visibleCount + ' مشارك مطابق') : ('${safeParticipants.length} مشارك');
      }
    }
  </script>
</body>
</html>`;
}

export function downloadStudyReport(
  study?: Pick<Study, "title" | "year" | "description"> | null,
  participants: Participant[] = []
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const htmlContent = generateStudyHtmlReport(study, participants);
    const cleanTitle = (study?.title || "كشف_المشاركين")
      .replace(/[^\w\u0600-\u06FF\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "كشف";
    const year = study?.year || new Date().getFullYear();
    const fileName = `كشف_مشاركين_${cleanTitle}_${year}.html`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 250);
    return true;
  } catch (err) {
    console.error("Export download failed:", err);
    return false;
  }
}

// Aliases for compatibility
export const generateLecturerHtmlReport = generateStudyHtmlReport;
export const downloadLecturerReport = downloadStudyReport;

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
