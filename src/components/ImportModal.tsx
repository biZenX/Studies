"use client";

import { useState, useRef } from "react";
import {
  Modal,
  Spinner,
  IconUpload,
  IconCheck,
  IconFileText,
  IconAlert,
  IconTrash,
} from "./ui";
import { useLang } from "./lang";
import { parseFile, type ParsedTable } from "@/lib/parsers";
import { bulkAddLocalParticipants } from "@/lib/storage";

export function ImportModal({
  open,
  studyId,
  studyTitle,
  onClose,
  onSuccess,
}: {
  open: boolean;
  studyId: number;
  studyTitle: string;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}) {
  const { t } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedTable | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string>("");
  const [importing, setImporting] = useState(false);

  // Column mapping states
  const [nameCol, setNameCol] = useState<number>(0);
  const [countryCol, setCountryCol] = useState<number>(1);
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
      const data = await parseFile(f);
      if (data.rows.length === 0) {
        setError("لم يتم العثور على أي بيانات أو صفوف صالحة داخل الملف.");
        setParsedData(null);
      } else {
        setParsedData(data);
        setNameCol(data.suggestedMapping.nameIdx);
        setCountryCol(data.suggestedMapping.countryIdx);
        setFederationCol(data.suggestedMapping.federationIdx);
        setEmailCol(data.suggestedMapping.emailIdx);
        setPhoneCol(data.suggestedMapping.phoneIdx);

        // Select all rows by default
        const allIndices = new Set<number>();
        data.rows.forEach((_, idx) => allIndices.add(idx));
        setSelectedRows(allIndices);
      }
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

  const handleConfirmImport = async () => {
    if (!parsedData || nameCol === -1) {
      setError("يرجى تحديد عمود الاسم على الأقل لإتمام الاستيراد.");
      return;
    }

    setImporting(true);
    try {
      const toImport: Array<{
        name: string;
        country: string | null;
        federation: string | null;
        email: string | null;
        phone: string | null;
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

        toImport.push({ name, country, federation, email, phone });
      });

      if (toImport.length === 0) {
        setError("لم يتم تحديد أي مشاركين صالحين للاستيراد.");
        setImporting(false);
        return;
      }

      bulkAddLocalParticipants(studyId, toImport);
      onSuccess(toImport.length);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل استيراد المشاركين.");
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`استيراد مشاركين — ${studyTitle}`}
      wide
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm font-semibold text-red-700">
            <IconAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!parsedData ? (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg)]/50 px-6 py-12 text-center transition hover:border-[var(--accent)] hover:bg-[var(--accent-tint)]/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,.docx,.doc,.txt,.tsv,.csx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />

              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Spinner size={32} />
                  <p className="text-sm font-semibold text-[var(--text)]">
                    جارٍ قراءة واستخراج البيانات من الملف...
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
                    الصيغ المدعومة: Excel (xlsx, xls) • Word (docx, doc) • CSV • Text (txt, tsv, csx)
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["XLSX", "DOCX", "CSV", "TXT", "TSV"].map((ext) => (
                      <span
                        key={ext}
                        className="num rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs"
                      >
                        .{ext.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-[var(--text-secondary)]">
              <p className="font-bold text-[var(--text)] mb-1">إرشادات الاستيراد:</p>
              <ul className="list-disc pe-4 space-y-1">
                <li>يتم استيراد المشاركين مباشرة إلى الدراسة الحالية دون التأثير على بقية الدراسات.</li>
                <li>يدعم النظام جداول إكسيل ووورد وقوائم النصوص العادية المفصولة بشرطة أو سطر لكل مشارك.</li>
                <li>ستتمكن في الخطوة التالية من مراجعة الأعمدة وتعديلها قبل الاعتماد النهائي.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg)] p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <IconFileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">{file?.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    تم استخراج {parsedData.rows.length} صف • تم تحديد {selectedRows.size} مشارك
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="btn-ghost flex items-center gap-1.5 !px-3 !py-1.5 text-xs text-red-600 hover:!bg-red-50"
              >
                <IconTrash size={14} />
                تغيير الملف
              </button>
            </div>

            {/* Column mapping selectors */}
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <p className="mb-3 text-sm font-bold text-[var(--text)]">
                تحديد ومطابقة الأعمدة:
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                    الاسم الكامل *
                  </label>
                  <select
                    className="input !py-1.5 !text-xs"
                    value={nameCol}
                    onChange={(e) => setNameCol(Number(e.target.value))}
                  >
                    <option value={-1}>-- غير محدد --</option>
                    {parsedData.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `عمود ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                    الدولة
                  </label>
                  <select
                    className="input !py-1.5 !text-xs"
                    value={countryCol}
                    onChange={(e) => setCountryCol(Number(e.target.value))}
                  >
                    <option value={-1}>-- تجاهل --</option>
                    {parsedData.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `عمود ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                    الاتحاد / الجهة
                  </label>
                  <select
                    className="input !py-1.5 !text-xs"
                    value={federationCol}
                    onChange={(e) => setFederationCol(Number(e.target.value))}
                  >
                    <option value={-1}>-- نفس الدولة / تجاهل --</option>
                    {parsedData.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `عمود ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                    البريد (اختياري)
                  </label>
                  <select
                    className="input !py-1.5 !text-xs"
                    value={emailCol}
                    onChange={(e) => setEmailCol(Number(e.target.value))}
                  >
                    <option value={-1}>-- تجاهل --</option>
                    {parsedData.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `عمود ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                    الهاتف (اختياري)
                  </label>
                  <select
                    className="input !py-1.5 !text-xs"
                    value={phoneCol}
                    onChange={(e) => setPhoneCol(Number(e.target.value))}
                  >
                    <option value={-1}>-- تجاهل --</option>
                    {parsedData.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `عمود ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>معاينة الصفوف المستخرجة:</span>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[var(--accent-strong)] hover:underline"
                >
                  {selectedRows.size === parsedData.rows.length
                    ? "إلغاء تحديد الكل"
                    : "تحديد الكل"}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 bg-white border-b border-[var(--border)] text-[var(--text-secondary)]">
                    <tr>
                      <th className="w-10 px-3 py-2 text-center">اختيار</th>
                      <th className="px-3 py-2">الاسم</th>
                      <th className="px-3 py-2">الدولة</th>
                      <th className="px-3 py-2">الاتحاد</th>
                      <th className="px-3 py-2">البريد</th>
                      <th className="px-3 py-2">الهاتف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.map((row, idx) => {
                      const isSelected = selectedRows.has(idx);
                      const nameVal = nameCol !== -1 ? row[nameCol] : "";
                      const countryVal = countryCol !== -1 ? row[countryCol] : "";
                      const fedVal = federationCol !== -1 ? row[federationCol] : "";
                      const emailVal = emailCol !== -1 ? row[emailCol] : "";
                      const phoneVal = phoneCol !== -1 ? row[phoneCol] : "";

                      return (
                        <tr
                          key={idx}
                          onClick={() => toggleRow(idx)}
                          className={`cursor-pointer border-b border-[var(--border)] transition last:border-0 ${
                            isSelected ? "bg-emerald-50/40" : "opacity-50 hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRow(idx)}
                              className="rounded border-[var(--border)] text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-3 py-2 font-semibold text-[var(--text)]">
                            {nameVal || <span className="text-red-400">فارغ</span>}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">
                            {countryVal || "—"}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]">
                            {fedVal || "—"}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]" dir="ltr">
                            {emailVal || "—"}
                          </td>
                          <td className="px-3 py-2 text-[var(--text-secondary)]" dir="ltr">
                            {phoneVal || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-[var(--text-secondary)]">
                سيتم إضافة {selectedRows.size} مشارك إلى دراسة: <strong>{studyTitle}</strong>
              </span>
              <div className="flex gap-3">
                <button type="button" className="btn-ghost" onClick={handleClose}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn-primary flex items-center gap-2"
                  onClick={handleConfirmImport}
                  disabled={importing || selectedRows.size === 0 || nameCol === -1}
                >
                  {importing ? (
                    <Spinner size={16} />
                  ) : (
                    <>
                      <IconCheck size={16} />
                      تأكيد استيراد ({selectedRows.size}) مشارك
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
