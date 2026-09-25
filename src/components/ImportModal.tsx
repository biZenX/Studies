"use client";

import { useMemo, useRef, useState } from "react";
import {
  Modal,
  AppSelect,
  Spinner,
  IconUpload,
  IconCheck,
  IconFileText,
  IconTrash,
  IconAlert,
} from "./ui";
import { useLang } from "./lang";
import type { ParsedTable } from "@/lib/parsers";
import { bulkAddLocalParticipants } from "@/lib/storage";
import { normalizeAr } from "@/lib/content";

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
  const options = [
    { value: "-1", label: ignoreLabel },
    ...headers.map((h, i) => ({
      value: String(i),
      label: h || `عمود ${i + 1}`,
    })),
  ];
  return (
    <AppSelect
      label={`${label}${required ? " *" : ""}`}
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      options={options}
    />
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

          // الكود / رقم الملف لا يُستورد ولا يظهر في الاستخراج
          toImport.push({ name, country, federation, email, phone, code: null });
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
                    جارٍ قراءة الملف...
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

          </div>
        ) : (
          <div className="space-y-4">
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

            <section className="rounded-2xl border border-[var(--border)] p-3.5">
              <h4 className="mb-3 text-xs font-extrabold text-[var(--text)]">
                مطابقة الأعمدة
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
                      <th className="px-3 py-2 text-start">{t("email")}</th>
                      <th className="px-3 py-2 text-start">{t("phone")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 200).map((row, idx) => {
                      const selected = selectedRows.has(idx);
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-[var(--border)] last:border-0 ${
                            selected ? "bg-emerald-50/40" : "hover:bg-[var(--bg)]/50"
                          }`}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleRow(idx)}
                              className="h-4 w-4 rounded border-[var(--border)] text-emerald-600"
                            />
                          </td>
                          <td className="px-3 py-2 font-bold text-[var(--text)]">
                            {(nameCol !== -1 && row[nameCol]) || "—"}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">
                            {(countryCol !== -1 && row[countryCol]) || "—"}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">
                            {(federationCol !== -1 && row[federationCol]) || "—"}
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
