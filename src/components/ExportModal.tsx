"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, IconDownload, IconPrinter, Spinner, IconCheckCircle } from "./ui";
import { useLang } from "./lang";
import { useToast } from "./toast";
import {
  DEFAULT_EXPORT_OPTIONS,
  buildExportFileName,
  downloadStudyReport,
  generateStudyHtmlReport,
  openStudyReport,
  printStudyReport,
  type ExportOptions,
  type ExportTheme,
} from "@/lib/exporter";
import { localizeStudy } from "@/lib/content";
import type { Participant, Study } from "@/lib/types";

type StudyShape = Pick<
  Study,
  "title" | "year" | "description" | "titleEn" | "descriptionEn"
>;

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-start text-xs font-bold transition ${
        checked
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-slate-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="min-w-0 truncate">{label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ insetInlineStart: checked ? 18 : 2 }}
        />
      </span>
    </button>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-[var(--text-tertiary)]">{label}</span>
      <select
        className="input !py-1.5 !text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ExportModal({
  open,
  study,
  participants,
  totalCount,
  onClose,
}: {
  open: boolean;
  study?: StudyShape | null;
  /** Rows that will actually end up in the file (may already be filtered). */
  participants: Participant[];
  /** Full roster size, used to point out that a filter is narrowing the export. */
  totalCount?: number;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const { success, error: errorToast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [langOverride, setLangOverride] = useState<"ar" | "en" | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);

  // Reset the "downloaded" badge whenever the dialog is re-opened. Adjusting
  // state during render keeps this out of an effect.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setDone(false);
  }

  // The exported document follows the UI language unless one is picked here.
  const effectiveOptions = useMemo<ExportOptions>(
    () => ({ ...options, lang: langOverride ?? lang }),
    [options, langOverride, lang],
  );

  const localized = useMemo(
    () => (study ? localizeStudy(study as StudyShape, effectiveOptions.lang) : null),
    [study, effectiveOptions.lang],
  );

  const effectiveStudy = useMemo<StudyShape | null>(() => {
    if (!study) return null;
    return {
      ...study,
      title: localized?.title ?? study.title,
      description: localized?.description ?? study.description,
    };
  }, [study, localized]);

  /** Debounced live preview so dragging toggles stays smooth. */
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      try {
        setPreviewHtml(generateStudyHtmlReport(effectiveStudy, participants, effectiveOptions));
      } catch (err) {
        console.error("Preview generation failed:", err);
      }
    }, 120);
    return () => clearTimeout(handle);
  }, [open, effectiveStudy, participants, effectiveOptions]);

  const fileName = useMemo(
    () => buildExportFileName(effectiveStudy, effectiveOptions),
    [effectiveStudy, effectiveOptions],
  );

  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setDone(false);
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const setColumn = (key: keyof ExportOptions["columns"], value: boolean) => {
    setDone(false);
    setOptions((prev) => ({ ...prev, columns: { ...prev.columns, [key]: value } }));
  };

  const handleDownload = () => {
    setBusy(true);
    // Let the spinner paint first — generation is synchronous but fast.
    requestAnimationFrame(() => {
      const ok = downloadStudyReport(effectiveStudy, participants, effectiveOptions);
      setBusy(false);
      if (ok) {
        setDone(true);
        success(`${t("exportSuccess")} — ${fileName}`);
      } else {
        errorToast(t("exportFailed"));
      }
    });
  };

  const handlePrint = () => {
    const ok = printStudyReport(effectiveStudy, participants, effectiveOptions);
    if (!ok) errorToast(t("exportFailed"));
  };

  const handleOpenTab = () => {
    const ok = openStudyReport(effectiveStudy, participants, effectiveOptions);
    if (!ok) errorToast(t("exportFailed"));
  };

  const themeOptions: Array<{ value: ExportTheme; label: string; swatch: string }> = [
    { value: "navy", label: t("themeNavy"), swatch: "#0b2545" },
    { value: "emerald", label: t("themeEmerald"), swatch: "#064e3b" },
    { value: "slate", label: t("themeSlate"), swatch: "#1e293b" },
    { value: "burgundy", label: t("themeBurgundy"), swatch: "#4c0519" },
  ];

  const col = options.columns;

  /** How many rows actually carry each optional value. */
  const counts = useMemo(
    () => ({
      code: participants.filter((p) => (p.code ?? "").trim()).length,
      email: participants.filter((p) => (p.email ?? "").trim()).length,
      phone: participants.filter((p) => (p.phone ?? "").trim()).length,
    }),
    [participants],
  );

  return (
    <Modal open={open} onClose={onClose} title={t("exportTitle")} wide testId="export-modal">
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{t("exportSub")}</p>

        {typeof totalCount === "number" && totalCount !== participants.length && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-800">
            <span className="num">
              {participants.length} / {totalCount}
            </span>
            <span>
              {lang === "en"
                ? "Only the rows matching the active filters will be exported."
                : "سيتم تصدير الصفوف المطابقة للفلاتر النشطة فقط."}
            </span>
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          {/* ------------------------- Options ------------------------- */}
          <div className="space-y-4 lg:max-h-[62vh] lg:overflow-y-auto lg:ps-1">
            <section className="rounded-2xl border border-[var(--border)] p-3">
              <h4 className="mb-2.5 text-xs font-extrabold text-[var(--text)]">
                {t("exportColumns")}
              </h4>
              <div className="grid gap-1.5">
                <Toggle
                  label={`# — ${t("serial")}`}
                  checked={col.serial}
                  onChange={(v) => setColumn("serial", v)}
                />
                <Toggle
                  label={t("name")}
                  checked={col.name}
                  onChange={(v) => setColumn("name", v)}
                />
                <Toggle
                  label={t("federation")}
                  checked={col.federation}
                  onChange={(v) => setColumn("federation", v)}
                />
                <Toggle
                  label={t("country")}
                  checked={col.country}
                  onChange={(v) => setColumn("country", v)}
                />
                <Toggle
                  label={`${t("code")} (${counts.code})`}
                  checked={col.code}
                  onChange={(v) => setColumn("code", v)}
                />
                <Toggle
                  label={`${t("email")} (${counts.email})`}
                  checked={col.email}
                  onChange={(v) => setColumn("email", v)}
                />
                <Toggle
                  label={`${t("phone")} (${counts.phone})`}
                  checked={col.phone}
                  onChange={(v) => setColumn("phone", v)}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border)] p-3">
              <h4 className="mb-2.5 text-xs font-extrabold text-[var(--text)]">
                {t("exportLayout")}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  label={t("date")}
                  value={options.dateMode}
                  onChange={(v) => set("dateMode", v)}
                  options={[
                    { value: "date" as const, label: t("date") },
                    { value: "year" as const, label: t("yearOnly") },
                    { value: "hidden" as const, label: t("noneOption") },
                  ]}
                />
                <Select
                  label={t("sortBy")}
                  value={options.sortBy}
                  onChange={(v) => set("sortBy", v)}
                  options={[
                    { value: "original" as const, label: t("sortOriginal") },
                    { value: "name" as const, label: t("sortName") },
                    { value: "country" as const, label: t("sortCountry") },
                    { value: "federation" as const, label: t("federation") },
                  ]}
                />
                <Select
                  label={t("paper")}
                  value={options.pageSize}
                  onChange={(v) => set("pageSize", v)}
                  options={[
                    { value: "a4" as const, label: "A4" },
                    { value: "letter" as const, label: "Letter" },
                    { value: "auto" as const, label: t("auto") },
                  ]}
                />
                <Select
                  label={t("orientationLabel")}
                  value={options.orientation}
                  onChange={(v) => set("orientation", v)}
                  options={[
                    { value: "portrait" as const, label: t("portrait") },
                    { value: "landscape" as const, label: t("landscape") },
                  ]}
                />
                <Select
                  label={t("density")}
                  value={options.density}
                  onChange={(v) => set("density", v)}
                  options={[
                    { value: "comfortable" as const, label: t("comfortable") },
                    { value: "compact" as const, label: t("compact") },
                  ]}
                />
                <Select
                  label={t("language")}
                  value={effectiveOptions.lang}
                  onChange={(v) => setLangOverride(v)}
                  options={[
                    { value: "ar" as const, label: "العربية" },
                    { value: "en" as const, label: "English" },
                  ]}
                />
              </div>

              <div className="mt-3">
                <span className="mb-1.5 block text-[11px] font-bold text-[var(--text-tertiary)]">
                  {t("exportTheme")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {themeOptions.map((th) => (
                    <button
                      key={th.value}
                      type="button"
                      onClick={() => set("theme", th.value)}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                        options.theme === th.value
                          ? "border-slate-800 bg-slate-800 text-white"
                          : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-slate-300"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: th.swatch }}
                      />
                      {th.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border)] p-3">
              <h4 className="mb-2.5 text-xs font-extrabold text-[var(--text)]">
                {t("exportExtras")}
              </h4>
              <div className="grid gap-1.5">
                <Toggle
                  label={t("statsSummary")}
                  checked={options.showStats}
                  onChange={(v) => set("showStats", v)}
                />
                <Toggle
                  label={t("countryBreakdown")}
                  checked={options.showCountryBreakdown}
                  onChange={(v) => set("showCountryBreakdown", v)}
                />
                <Toggle
                  label={t("groupRows")}
                  checked={options.groupByCountry}
                  onChange={(v) => set("groupByCountry", v)}
                />
                <Toggle
                  label={t("searchInFile")}
                  checked={options.showSearch}
                  onChange={(v) => set("showSearch", v)}
                />
                <Toggle
                  label={t("printInFile")}
                  checked={options.showPrint}
                  onChange={(v) => set("showPrint", v)}
                />
                <Toggle
                  label={t("renumberRows")}
                  checked={options.renumberOnFilter}
                  onChange={(v) => set("renumberOnFilter", v)}
                />
                <Toggle
                  label={t("zebraRows")}
                  checked={options.zebra}
                  onChange={(v) => set("zebra", v)}
                />
                <Toggle
                  label={t("footerLine")}
                  checked={options.showFooterNote}
                  onChange={(v) => set("showFooterNote", v)}
                />
              </div>

              {options.showFooterNote && (
                <input
                  className="input mt-2 !py-1.5 !text-xs"
                  value={options.footerNote}
                  onChange={(e) => set("footerNote", e.target.value)}
                  placeholder={t("footerNotePh")}
                />
              )}

              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-bold text-[var(--text-tertiary)]">
                  {t("exportFileName")}
                </span>
                <input
                  className="input !py-1.5 !text-xs"
                  dir="ltr"
                  value={options.fileName ?? ""}
                  onChange={(e) => set("fileName", e.target.value)}
                  placeholder={fileName}
                />
                <span className="mt-1 block text-[11px] text-[var(--text-tertiary)] num" dir="ltr">
                  {options.fileName?.trim() ? options.fileName.trim() : fileName}
                </span>
              </label>
            </section>
          </div>

          {/* ------------------------- Preview ------------------------- */}
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[var(--text)]">
                {t("livePreview")}
              </span>
              <span className="num text-[11px] font-bold text-[var(--text-tertiary)]">
                {typeof totalCount === "number" && totalCount !== participants.length ? (
                  <>
                    {participants.length} / {totalCount} {t("participants")}
                  </>
                ) : (
                  <>
                    {participants.length} {t("participants")}
                  </>
                )}
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-100">
              <iframe
                ref={iframeRef}
                title="Export preview"
                srcDoc={open ? previewHtml : ""}
                sandbox="allow-scripts"
                className="h-[46vh] w-full bg-white sm:h-[52vh] lg:h-[62vh]"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={busy}
                className="btn-primary flex items-center gap-2 !px-5 !py-2.5 text-xs font-extrabold"
                data-testid="export-download"
              >
                {busy ? <Spinner size={15} /> : done ? <IconCheckCircle size={15} /> : <IconDownload size={15} />}
                <span>
                  {busy ? t("downloading") : done ? t("exportSuccess") : t("download")}
                </span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2.5 text-xs font-bold"
              >
                <IconPrinter size={14} />
                {t("print")}
              </button>
              <button
                type="button"
                onClick={handleOpenTab}
                className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2.5 text-xs font-bold"
              >
                {t("openInNewTab")}
              </button>
            </div>

            {done && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <IconCheckCircle size={13} />
                <span className="num" dir="ltr">
                  {fileName}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
