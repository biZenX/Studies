import type { Participant, Study } from "./types";

export function generateLecturerHtmlReport(
  study?: Pick<Study, "title" | "year" | "description"> | null,
  participants: Participant[] = []
): string {
  const safeStudy = {
    title: study?.title || "كشف المشاركين",
    year: study?.year || String(new Date().getFullYear()),
    description: study?.description || "",
  };
  const safeParticipants = Array.isArray(participants) ? participants : [];

  const generatedDate = new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
  }).format(new Date());

  const rowsHtml = safeParticipants
    .map((p, idx) => {
      const countryText = p?.country ? escapeHtml(p.country) : "—";
      const federationText = p?.federation ? escapeHtml(p.federation) : "—";
      const nameText = escapeHtml(p?.name || "بدون اسم");

      return `
      <tr>
        <td class="num text-center">${idx + 1}</td>
        <td class="name-cell">${nameText}</td>
        <td class="text-center country-cell">${countryText}</td>
        <td class="text-center federation-cell">${federationText}</td>
        <td class="attendance-cell">
          <div class="checkbox-box"></div>
        </td>
        <td class="notes-cell"></td>
        <td class="signature-cell"></td>
      </tr>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>كشف المحاضرين — ${escapeHtml(safeStudy.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');

    :root {
      --primary: #059669;
      --primary-dark: #047857;
      --primary-light: #ecfdf5;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --border-dark: #cbd5e1;
      --bg: #f8fafc;
      --card: #ffffff;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .container {
      max-width: 1040px;
      margin: 0 auto;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      padding: 36px 40px;
    }

    /* Action bar on top (hidden on print) */
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }

    .btn-print {
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #0f172a;
      border-radius: 6px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s ease;
      font-family: inherit;
    }

    .btn-print:hover {
      background: #1e293b;
    }

    /* Official Academic Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }

    .org-sub {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .header-title-box h1 {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 4px;
    }

    .header-title-box .study-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--primary-dark);
      margin-bottom: 4px;
    }

    .header-title-box .study-meta {
      font-size: 13px;
      color: var(--text);
    }

    .header-badge-box {
      text-align: left;
      flex-shrink: 0;
    }

    .report-date {
      font-size: 12px;
      color: var(--text-muted);
      direction: rtl;
    }

    /* Table styles */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
      font-size: 13px;
    }

    thead th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      padding: 11px 12px;
      border-top: 1px solid var(--border-dark);
      border-bottom: 2px solid var(--border-dark);
      text-align: right;
      white-space: nowrap;
    }

    thead th.text-center {
      text-align: center;
    }

    tbody td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
      color: #1e293b;
    }

    tbody tr:nth-child(even) {
      background: #fafafa;
    }

    .num {
      font-family: 'Inter', -apple-system, sans-serif;
      font-weight: 600;
      color: var(--text-muted);
      width: 42px;
    }

    .name-cell {
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
      min-width: 180px;
    }

    .country-cell {
      font-weight: 600;
      color: #334155;
      font-size: 13px;
    }

    .federation-cell {
      font-size: 12px;
      color: var(--text-muted);
    }

    .attendance-cell {
      width: 80px;
      text-align: center;
    }

    .checkbox-box {
      width: 18px;
      height: 18px;
      border: 1.5px solid #94a3b8;
      border-radius: 4px;
      margin: 0 auto;
      background: #fff;
    }

    .notes-cell {
      width: 180px;
      border-bottom: 1px dashed var(--border);
    }

    .signature-cell {
      width: 110px;
      border-bottom: 1px dashed var(--border);
    }

    .text-center {
      text-align: center;
    }

    /* Sign-off Section */
    .signoff-section {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      page-break-inside: avoid;
    }

    .signoff-box {
      width: 260px;
      text-align: center;
    }

    .signoff-title {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 50px;
      color: #334155;
    }

    .signoff-line {
      border-bottom: 1.5px dashed #94a3b8;
      margin-bottom: 8px;
    }

    .signoff-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Print styling rules */
    @media print {
      body {
        padding: 0;
        background: #fff;
      }

      .container {
        border: none;
        box-shadow: none;
        padding: 10mm 12mm;
        max-width: 100%;
      }

      .action-bar {
        display: none;
      }

      thead {
        display: table-header-group;
      }

      tr {
        page-break-inside: avoid;
      }

      @page {
        size: A4 portrait;
        margin: 10mm;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="action-bar">
      <span style="font-size: 13px; color: var(--text-muted);">
        نسخة مخصصة للسادة المحاضرين — لا تحتوي على البريد أو الهاتف
      </span>
      <button class="btn-print" onclick="window.print()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        طباعة الكشف
      </button>
    </div>

    <header class="header">
      <div class="header-title-box">
        <p class="org-sub">الأكاديمية العربية للتدريب والتطوير (AADC Cairo)</p>
        <h1>كشف المشاركين المعتمد — خاص بالسادة المحاضرين</h1>
        <p class="study-title">${escapeHtml(safeStudy.title)}</p>
        <p class="study-meta">الدورة التدريبية لعام ${escapeHtml(safeStudy.year)} &bull; إجمالي عدد المشاركين: <strong>${safeParticipants.length}</strong> مشارك</p>
      </div>
      <div class="header-badge-box">
        <div class="report-date">تاريخ الاستخراج: ${generatedDate}</div>
      </div>
    </header>

    <table>
      <thead>
        <tr>
          <th class="text-center">#</th>
          <th>اسم المشارك</th>
          <th class="text-center">الدولة</th>
          <th class="text-center">الاتحاد / الجهة</th>
          <th class="text-center">حضور اليوم</th>
          <th>ملاحظات المحاضر والتقييم</th>
          <th>توقيع المحاضر</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <footer class="signoff-section">
      <div class="signoff-box">
        <p class="signoff-title">المحاضر المسؤول عن الدورة</p>
        <div class="signoff-line"></div>
        <p class="signoff-hint">الاسم والتوقيع</p>
      </div>

      <div class="signoff-box">
        <p class="signoff-title">اعتماد إدارة التدريب والتطوير</p>
        <div class="signoff-line"></div>
        <p class="signoff-hint">الختم الرسمي والتاريخ</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

export function downloadLecturerReport(
  study?: Pick<Study, "title" | "year" | "description"> | null,
  participants: Participant[] = []
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const htmlContent = generateLecturerHtmlReport(study, participants);
    const cleanTitle = (study?.title || "كشف_المشاركين")
      .replace(/[^\w\u0600-\u06FF\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "كشف";
    const year = study?.year || new Date().getFullYear();
    const fileName = `كشف_محاضرين_${cleanTitle}_${year}.html`;

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

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
