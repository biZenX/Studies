"use client";

import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Spinner,
  IconUpload,
  IconCheck,
  IconFileText,
  IconAlert,
  IconTrash,
  IconCheckCircle,
} from "./ui";
import { useLang } from "./lang";
import type { ColumnInsight, ColumnKind, ParsedTable } from "@/lib/parsers";
import { bulkAddLocalParticipants } from "@/lib/storage";
import { normalizeAr } from "@/lib/content";

const KIND_LABEL_KEY: Record<ColumnKind, string> = {
  serial: "colKindSerial",
  id: "colKindId",
  name: "colKindName",
  country: "colKindCountry",
  federation: "colKindFederation",
  email: "colKindEmail",
  phone: "colKindPhone",
  date: "colKindDate",
  text: "colKindText",
  mixed: "colKindMixed",
  empty: "colKindEmpty",
};

const KIND_STYLE: Record<ColumnKind, { bg: string; color: string }> = {
  serial: { bg: "#f1f5f9", color: "#64748b" },
  id: { bg: "#eef2ff", color: "#3730a3" },
  name: { bg: "#ecfdf5", color: "#047857" },
  country: { bg: "#eff6ff", color: "#1d4ed8" },
  federation: { bg: "#fef3c7", color: "#92400e" },
  email: { bg: "#fff7ed", color: "#c2410c" },
  phone: { bg: "#fdf2f8", color: "#9d174d" },
  date: { bg: "#f0fdfa", color: "#0f766e" },
  text: { bg: "#f8fafc", color: "#475569" },
  mixed: { bg: "#fffbeb", color: "#b45309" },
  empty: { bg: "#fafafa", color: "#a3a3a3" },
};

function ColumnOption({
  headers,
  value,
  onChange,
  label,
  required,
  ignoreLabel,
}: {
  headers: string[];
  value: number;
  onChange: (v: number) => void;
  label: string;
  required?: boolean;
  ignoreLabel: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </span>
      <select
        className="input !py-2 !text-xs"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value={-1}>{ignoreLabel}</option>
        {headers.map((h, i) => (
          <option key={i} value={i}>
            {h || `عمود ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ImportModal({
  open,
  studyId,
  studyTitle,
  existingNames = [],
  onClose,
  onSuccess,
}: {
  open: boolean;
  studyId: number;
  studyTitle: string;
  /** Names already in the roster — used to offer duplicate skipping. */
  existingNames?: string[];
  onClose: () => void;
  onSuccess: (importedCount: number, skipped?: number) => void;
}) {
  const { t } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTable | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const [nameCol, setNameCol] = useState<number>(-1);
  const [countryCol, setCountryCol] = useState<number>(-1);
  const [federationCol, setFederationCol] = useState<number>(-1);
  const [emailCol, setEmailCol] = useState<number>(-1);
  const [phoneCol, setPhoneCol] = useState<number>(-1);
  const [codeCol, setCodeCol] = useState<number>(-1);

  const reset = () => {
    setFile(null);
    setParsedData(null);
    setSelectedRows(new Set());
    setError("");
    setParsing(false);
    setImporting(false);
    setNameCol(-1);
    setCountryCol(-1);
    setFederationCol(-1);
    setEmailCol(-1);
    setPhoneCol(-1);
    setCodeCol(-1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setParsing(true);
    setError("");

    try {
      // xlsx + mammoth are heavy (~1 MB). Loading them on demand keeps them out
      // of the initial bundle so the app stays usable on phones and slower
      // laptops — a big bundle was making clicks feel dead.
      const { parseFile } = await import("@/lib/parsers");
      const data = await parseFile(f);
      if (!data.rows || data.rows.length === 0) {
        setError("لم يتم العثور على أي بيانات أو صفوف صالحة داخل الملف.");
        setParsedData(null);
        return;
      }
      setParsedData(data);

      const m = data.suggestedMapping;
      setNameCol(m.nameIdx);
      setCountryCol(m.countryIdx);
      setFederationCol(m.federationIdx);
      setEmailCol(m.emailIdx);
      setPhoneCol(m.phoneIdx);
      setCodeCol(m.codeIdx);

      const all = new Set<number>();
      data.rows.forEach((_, idx) => all.add(idx));
      setSelectedRows(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء قراءة الملف.");
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const toggleRow = (idx: number) => {
    const next = new Set(selectedRows);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedRows(next);
  };

  const toggleSelectAll = () => {
    if (!parsedData) return;
    if (selectedRows.size === parsedData.rows.length) {
      setSelectedRows(new Set());
    } else {
      const all = new Set<number>();
      parsedData.rows.forEach((_, i) => all.add(i));
      setSelectedRows(all);
    }
  };

  const existingKeySet = useMemo(
    () => new Set(existingNames.map((n) => normalizeAr(n).replace(/\s+/g, " "))),
    [existingNames],
  );

  const duplicateCount = useMemo(() => {
    if (!parsedData || nameCol < 0) return 0;
    let n = 0;
    parsedData.rows.forEach((row, idx) => {
      if (!selectedRows.has(idx)) return;
      const name = normalizeAr(row[nameCol] ?? "").replace(/\s+/g, " ").trim();
      if (name && existingKeySet.has(name)) n++;
    });
    return n;
  }, [parsedData, nameCol, selectedRows, existingKeySet]);

  const handleConfirmImport = () => {
    if (!parsedData || nameCol === -1) {
      setError("يرجى تحديد عمود الاسم على الأقل لإتمام الاستيراد.");
      return;
    }

    setImporting(true);
    // Let the spinner render before the (synchronous) bulk insert.
    requestAnimationFrame(() => {
      try {
        const toImport: Array<{
          name: string;
          country: string | null;
          federation: string | null;
          email: string | null;
          phone: string | null;
          code: string | null;
        }> = [];

        parsedData.rows.forEach((row, idx) => {
          if (!selectedRows.has(idx)) return;
          const name = (row[nameCol] ?? "").trim();
          if (!name) return;

          const country = countryCol !== -1 && row[countryCol] ? row[countryCol].trim() : null;
          const federation =
            federationCol !== -1 && row[federationCol] ? row[federationCol].trim() : country;
          const email = emailCol !== -1 && row[emailCol] ? row[emailCol].trim() : null;
          const phone = phoneCol !== -1 && row[phoneCol] ? row[phoneCol].trim() : null;
          const code = codeCol !== -1 && row[codeCol] ? row[codeCol].trim() : null;

          toImport.push({ name, country, federation, email, phone, code });
        });

        if (toImport.length === 0) {
          setError("لم يتم تحديد أي مشاركين صالحين للاستيراد.");
          setImporting(false);
          return;
        }

        const created = bulkAddLocalParticipants(studyId, toImport, {
          skipDuplicates: skipDuplicates && existingNames.length > 0,
        });

        const skipped = toImport.length - created.length;
        onSuccess(created.length, skipped);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل استيراد المشاركين.");
        setImporting(false);
      }
    });
  };

  const analysis: ColumnInsight[] = parsedData?.analysis ?? [];

  return (
    <Modal open={open} onClose={handleClose} title={t("importParticipants")} wide testId="import-modal">
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3.5 text-sm font-semibold text-red-700">
            <IconAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!parsedData ? (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)]/60 px-6 py-12 text-center transition hover:border-[var(--accent)] hover:bg-[var(--accent-tint)]/30"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.docx,.doc,.txt,.tsv,.csx,.ods"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
                }}
                data-testid="import-file-input"
              />

              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Spinner size={32} />
                  <p className="text-sm font-semibold text-[var(--text)]">
                    جارٍ قراءة الملف وتحليل أعمدته...
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--accent-strong)] shadow-sm">
                    <IconUpload size={28} />
                  </div>
                  <p className="text-base font-bold text-[var(--text)]">
                    اضغط لاختيار ملف المشاركين أو اسحبه إلى هنا
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                    الصيغ المدعومة: Excel (xlsx, xls) • Word (docx, doc) • CSV • Text (txt, tsv)
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["xlsx", "xls", "docx", "csv", "txt", "tsv"].map((ext) => (
                      <span
                        key={ext}
                        className="num rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs"
                      >
                        .{ext}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
              <p className="mb-1 font-bold text-[var(--text)]">{t("smartAnalysis")}:</p>
              <ul className="list-disc space-y-1 pe-4">
                <li>{t("smartAnalysisSub")}</li>
                <li>أعمدة الترقيم التسلسلي (1، 2، 3) تُستبعد تلقائياً حتى لا تدخل كش بيانات.</li>
                <li>أي رقم ملف/عضوية حقيقي يُحفظ في خانة «{t("code")}».</li>
                <li>يمكنك مراجعة كل عمود وتعديله قبل الاعتماد النهائي.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg)] p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <IconFileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text)]">{file?.name}</p>
                  <p className="num text-xs text-[var(--text-secondary)]">
                    تم استخراج {parsedData.rows.length} صف • تم تحديد {selectedRows.size}
                    {duplicateCount > 0 && skipDuplicates && ` • ${duplicateCount} مكرر`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={reset}
                className="btn-ghost flex items-center gap-1.5 !px-3 !py-1.5 text-xs text-red-600 hover:!bg-red-50"
              >
                <IconTrash size={14} />
                تغيير الملف
              </button>
            </div>

            {/* Warnings */}
            {parsedData.warnings.length > 0 && (
              <div className="space-y-1.5">
                {parsedData.warnings.map((w, i) => (
                  <p
                    key={i}
                    className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800"
                  >
                    <IconAlert size={14} className="mt-0.5 shrink-0" />
                    <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Smart analysis */}
            <section className="rounded-2xl border border-[var(--border)] p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <IconCheckCircle size={16} className="text-[var(--accent-strong)]" />
                <h4 className="text-xs font-extrabold text-[var(--text)]">{t("smartAnalysis")}</h4>
              </div>
              <p className="mb-3 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {t("smartAnalysisSub")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {analysis.map((col) => {
                  const tone = KIND_STYLE[col.kind] ?? KIND_STYLE.text;
                  const used = [nameCol, countryCol, federationCol, emailCol, phoneCol, codeCol]
                    .filter((v) => v >= 0)
                    .includes(col.index);
                  return (
                    <div
                      key={col.index}
                      className={`rounded-xl border p-2.5 transition ${
                        col.kind === "serial"
                          ? "border-dashed border-slate-300 bg-slate-50 opacity-80"
                          : used
                            ? "border-emerald-300 bg-emerald-50/40"
                            : "border-[var(--border)] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[var(--text)]">
                            <span className="num text-[var(--text-tertiary)]">
                              {String.fromCharCode(65 + col.index)}
                            </span>
                            {" · "}
                            {col.header}
                          </p>
                          <p className="num mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                            {col.filled}/{col.total} خانة مملوءة
                            {col.unique ? " • قيم فريدة" : ""}
                            {col.sequential ? " • متتابعة" : ""}
                          </p>
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                          style={{ background: tone.bg, color: tone.color }}
                        >
                          {t(KIND_LABEL_KEY[col.kind] ?? "colKindText")}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                        {col.note}
                      </p>
                      {col.samples.length > 0 && (
                        <p className="num mt-1 truncate text-[10px] text-[var(--text-tertiary)]" dir="auto">
                          أمثلة: {col.samples.join(" | ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Column mapping */}
            <section className="rounded-2xl border border-[var(--border)] p-3.5">
              <h4 className="mb-3 text-xs font-extrabold text-[var(--text)]">
                تحديد ومطابقة الأعمدة
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ColumnOption
                  headers={parsedData.headers}
                  value={nameCol}
                  onChange={setNameCol}
                  label={t("name")}
                  required
                  ignoreLabel="-- غير محدد --"
                />
                <ColumnOption
                  headers={parsedData.headers}
                  value={countryCol}
                  onChange={setCountryCol}
                  label={t("country")}
                  ignoreLabel="-- تجاهل --"
                />
                <ColumnOption
                  headers={parsedData.headers}
                  value={federationCol}
                  onChange={setFederationCol}
                  label={t("federation")}
                  ignoreLabel="-- نفس الدولة --"
                />
                <ColumnOption
                  headers={parsedData.headers}
                  value={codeCol}
                  onChange={setCodeCol}
                  label={t("code")}
                  ignoreLabel="-- تجاهل --"
                />
                <ColumnOption
                  headers={parsedData.headers}
                  value={emailCol}
                  onChange={setEmailCol}
                  label={t("email")}
                  ignoreLabel="-- تجاهل --"
                />
                <ColumnOption
                  headers={parsedData.headers}
                  value={phoneCol}
                  onChange={setPhoneCol}
                  label={t("phone")}
                  ignoreLabel="-- تجاهل --"
                />
              </div>

              {existingNames.length > 0 && (
                <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--bg)] px-3 py-2.5 text-xs font-bold text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] text-emerald-600 focus:ring-emerald-500"
                  />
                  {t("importDuplicates")}
                  {duplicateCount > 0 && (
                    <span className="num text-amber-700">({duplicateCount} اسم مكرر)</span>
                  )}
                </label>
              )}
            </section>

            {/* Row preview */}
            <section className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>معاينة الصفوف المستخرجة</span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="font-bold text-[var(--accent-strong)] hover:underline"
                >
                  {selectedRows.size === parsedData.rows.length
                    ? "إلغاء تحديد الكل"
                    : "تحديد الكل"}
                </button>
              </div>

              <div className="max-h-64 overflow-auto">
                <table className="w-full min-w-[560px] text-start text-xs">
                  <thead className="sticky top-0 border-b border-[var(--border)] bg-white text-[var(--text-secondary)]">
                    <tr>
                      <th className="w-12 px-3 py-2 text-center">✓</th>
                      <th className="px-3 py-2 text-start">{t("name")}</th>
                      <th className="px-3 py-2 text-start">{t("country")}</th>
                      <th className="px-3 py-2 text-start">{t("federation")}</th>
                      <th className="px-3 py-2 text-start">{t("code")}</th>
                      <th className="px-3 py-2 text-start">{t("email")}</th>
                      <th className="px-3 py-2 text-start">{t("phone")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 200).map((row, idx) => {
                      const isSelected = selectedRows.has(idx);
                      const nameVal = nameCol !== -1 ? row[nameCol] : "";
                      const isDup =
                        nameVal && existingKeySet.has(normalizeAr(nameVal).replace(/\s+/g, " "));

                      return (
                        <tr
                          key={idx}
                          onClick={() => toggleRow(idx)}
                          className={`cursor-pointer border-b border-[var(--border)] transition last:border-0 ${
                            isSelected ? "bg-emerald-50/40" : "opacity-45 hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(idx)}
                              className="h-4 w-4 rounded border-[var(--border)] text-emerald-600 focus:ring-emerald-500"
                              aria-label={`select row ${idx + 1}`}
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold text-[var(--text)]">
                            {nameVal || <span className="text-red-400">فارغ</span>}
                            {isDup && skipDuplicates && (
                              <span className="ms-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                مكرر
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">
                            {(countryCol !== -1 && row[countryCol]) || "—"}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">
                            {(federationCol !== -1 && row[federationCol]) || "—"}
                          </td>
                          <td className="num px-3 py-2 text-[var(--text-secondary)]">
                            {(codeCol !== -1 && row[codeCol]) || "—"}
                          </td>
                          <td className="num px-3 py-2 text-[var(--text-secondary)]" dir="ltr">
                            {(emailCol !== -1 && row[emailCol]) || "—"}
                          </td>
                          <td className="num px-3 py-2 text-[var(--text-secondary)]" dir="ltr">
                            {(phoneCol !== -1 && row[phoneCol]) || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedData.rows.length > 200 && (
                <p className="num bg-slate-50 px-4 py-2 text-[11px] text-[var(--text-tertiary)]">
                  يتم عرض أول 200 صف من أصل {parsedData.rows.length} — كل الصفوف المحددة سيتم استيرادها.
                </p>
              )}
            </section>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs text-[var(--text-secondary)]">
                سيتم إضافة <b className="num">{selectedRows.size}</b> مشارك إلى{" "}
                <b>{studyTitle}</b>
              </span>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost !px-4 !py-2 text-xs" onClick={handleClose}>
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-2 !px-5 !py-2 text-xs font-bold"
                  onClick={handleConfirmImport}
                  disabled={importing || selectedRows.size === 0 || nameCol === -1}
                  data-testid="confirm-import"
                >
                  {importing ? (
                    <Spinner size={16} />
                  ) : (
                    <>
                      <IconCheck size={16} />
                      تأكيد الاستيراد ({selectedRows.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
