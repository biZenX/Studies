"use client";

import { useState, type ReactNode } from "react";
import { useLang } from "./lang";
import {
  Field,
  FormSection,
  SegmentedControl,
  StatusBadge,
  IconCalendar,
  IconClock,
  IconFileText,
  IconGlobe,
  IconArrowEnd,
} from "./ui";
import { useToday } from "./useMediaQuery";
import {
  addDaysIso,
  formatDate,
  formatDateRange,
  formatDays,
  isIsoDate,
  rangeLengthDays,
  toDateInputValue,
  todayIso,
} from "@/lib/content";
import {
  normalizeStoredStatus,
  resolveStudyStatus,
  scheduleHint,
  validateDateRange,
  type StoredStatus,
} from "@/domain/studySchedule";
import type { Study } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Form model
 * ------------------------------------------------------------------ */

export type StudyFormData = {
  id?: number;
  title: string;
  titleEn: string;
  /** Start date — ISO (YYYY-MM-DD); legacy records may still hold a bare year. */
  year: string;
  /** End date — ISO, or "" for an open-ended study. */
  endDate: string;
  description: string;
  descriptionEn: string;
  status: StoredStatus;
};

export type StudyFormErrors = Partial<Record<"title" | "year" | "endDate", string>>;

export function emptyStudyForm(): StudyFormData {
  return {
    title: "",
    titleEn: "",
    year: todayIso(),
    endDate: "",
    description: "",
    descriptionEn: "",
    status: "active",
  };
}

/** Map a stored record onto the form shape. */
export function studyToForm(
  study: Pick<Study, "id" | "title" | "year" | "status"> &
    Partial<Pick<Study, "endDate" | "description" | "titleEn" | "descriptionEn">>,
): StudyFormData {
  return {
    id: study.id,
    title: study.title ?? "",
    titleEn: study.titleEn ?? "",
    year: study.year ?? "",
    endDate: study.endDate ?? "",
    description: study.description ?? "",
    descriptionEn: study.descriptionEn ?? "",
    status: normalizeStoredStatus(study.status),
  };
}

export function validateStudyForm(
  form: StudyFormData,
  t: (key: string) => string,
): StudyFormErrors {
  const errors: StudyFormErrors = {};
  if (!form.title.trim()) errors.title = t("titleRequired");

  const rangeError = validateDateRange(form.year, form.endDate);
  if (rangeError === "missingStart") errors.year = t("pickStartDate");
  else if (rangeError === "invalidStart") errors.year = t("invalidDate");
  else if (rangeError === "invalidEnd") errors.endDate = t("invalidDate");
  else if (rangeError === "endBeforeStart") errors.endDate = t("endBeforeStart");

  return errors;
}

/** Trimmed, normalised payload ready for the store / API. */
export function normalizeStudyForm(form: StudyFormData) {
  return {
    id: form.id,
    title: form.title.trim(),
    year: toDateInputValue(form.year) || form.year.trim(),
    endDate: toDateInputValue(form.endDate) || null,
    description: form.description.trim() || null,
    status: normalizeStoredStatus(form.status),
    titleEn: form.titleEn.trim() || null,
    descriptionEn: form.descriptionEn.trim() || null,
  };
}

const COMPARED_KEYS: (keyof StudyFormData)[] = [
  "title",
  "titleEn",
  "year",
  "endDate",
  "description",
  "descriptionEn",
  "status",
];

export function isStudyFormDirty(a: StudyFormData, b: StudyFormData): boolean {
  return COMPARED_KEYS.some((k) => String(a[k] ?? "") !== String(b[k] ?? ""));
}

/** Focus the first control that carries a validation error. */
export function focusFirstError(errors: StudyFormErrors, idPrefix: string) {
  if (typeof document === "undefined") return;
  const order: (keyof StudyFormErrors)[] = ["title", "year", "endDate"];
  const key = order.find((k) => errors[k]);
  if (!key) return;
  const el = document.getElementById(`${idPrefix}-${key}`);
  el?.focus();
  el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
}

/* ------------------------------------------------------------------ *
 * Fields
 * ------------------------------------------------------------------ */

const QUICK_DURATIONS: { days: number; key: string }[] = [
  { days: 1, key: "oneDay" },
  { days: 3, key: "threeDays" },
  { days: 7, key: "oneWeek" },
  { days: 14, key: "twoWeeks" },
  { days: 30, key: "oneMonth" },
];

export function StudyFormFields({
  form,
  errors,
  onChange,
  idPrefix = "study",
  autoFocusTitle = true,
}: {
  form: StudyFormData;
  errors: StudyFormErrors;
  onChange: (patch: Partial<StudyFormData>) => void;
  /** Keeps element ids unique when the form is rendered more than once. */
  idPrefix?: string;
  autoFocusTitle?: boolean;
}) {
  const { t, lang } = useLang();
  const today = useToday();
  const [showEn, setShowEn] = useState<boolean>(
    () => Boolean(form.titleEn.trim() || form.descriptionEn.trim()),
  );

  const startIso = toDateInputValue(form.year);
  const endIso = toDateInputValue(form.endDate);
  const legacyYear = Boolean(form.year) && !isIsoDate(form.year);
  const totalDays = rangeLengthDays(startIso, endIso);

  const effective = resolveStudyStatus(
    { status: form.status, year: startIso, endDate: endIso },
    today,
  );
  const hint = scheduleHint({ status: form.status, year: startIso, endDate: endIso }, today, lang);

  const applyDuration = (days: number) => {
    const base = startIso || todayIso();
    onChange({ year: base, endDate: addDaysIso(base, days - 1) });
  };

  const statusHintKey =
    form.status === "draft"
      ? "statusDraftHint"
      : form.status === "closed"
        ? "statusClosedHint"
        : "statusAutoHint";

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ basic details */}
      <FormSection title={t("basicInfo")} icon={<IconFileText size={16} />}>
        <Field label={t("studyTitle")} required error={errors.title}>
          <input
            id={`${idPrefix}-title`}
            className="input"
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t("studyTitlePh")}
            aria-invalid={errors.title ? true : undefined}
            data-testid="study-title-input"
            data-autofocus={autoFocusTitle ? "" : undefined}
            autoComplete="off"
          />
        </Field>

        <Field label={t("description")} optional={t("optional")}>
          <textarea
            id={`${idPrefix}-description`}
            className="input min-h-[96px] resize-y"
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder={t("descriptionPh")}
            data-testid="study-description-input"
          />
        </Field>
      </FormSection>

      {/* ------------------------------------------------ english version */}
      <FormSection
        title={t("englishVersion")}
        hint={t("englishVersionHint")}
        icon={<IconGlobe size={16} />}
        action={
          <button
            type="button"
            className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-[11px] font-bold text-[var(--text-secondary)] transition hover:border-slate-300 hover:text-[var(--text)]"
            onClick={() => setShowEn((v) => !v)}
            aria-expanded={showEn}
            data-testid="toggle-english-fields"
          >
            {showEn ? t("hideEnglishFields") : t("showEnglishFields")}
          </button>
        }
      >
        {showEn && (
          <div className="space-y-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg)]/60 p-3">
            <Field label={t("studyTitleEn")}>
              <input
                id={`${idPrefix}-titleEn`}
                className="input"
                dir="ltr"
                value={form.titleEn}
                onChange={(e) => onChange({ titleEn: e.target.value })}
                placeholder="Study title in English"
                data-testid="study-title-en-input"
                autoComplete="off"
              />
            </Field>
            <Field label={t("descriptionEn")}>
              <textarea
                id={`${idPrefix}-descriptionEn`}
                className="input min-h-[72px] resize-y"
                dir="ltr"
                value={form.descriptionEn}
                onChange={(e) => onChange({ descriptionEn: e.target.value })}
                placeholder="Optional English description"
                data-testid="study-description-en-input"
              />
            </Field>
          </div>
        )}
      </FormSection>

      {/* ------------------------------------------------ period: from → to */}
      <FormSection title={t("period")} hint={t("periodHint")} icon={<IconCalendar size={16} />}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <Field label={t("startDate")} required error={errors.year}>
            <input
              id={`${idPrefix}-year`}
              type="date"
              className="input num"
              value={startIso}
              onChange={(e) => onChange({ year: e.target.value })}
              aria-invalid={errors.year ? true : undefined}
              data-testid="study-date-input"
            />
            {startIso && !errors.year && (
              <span className="mt-1.5 block text-[11px] font-semibold text-[var(--text-tertiary)]">
                {formatDate(startIso, lang)}
              </span>
            )}
            {legacyYear && (
              <span className="mt-1 block text-[11px] font-semibold text-amber-600">
                {lang === "en"
                  ? `Saved value “${form.year}” — pick a full date to update it.`
                  : `القيمة المحفوظة «${form.year}» — اختر التاريخ الكامل لتحديثها.`}
              </span>
            )}
          </Field>

          <div
            className="hidden h-11 items-center justify-center text-[var(--text-tertiary)] sm:mt-[26px] sm:flex"
            aria-hidden="true"
          >
            <IconArrowEnd size={18} />
          </div>

          <Field
            label={t("endDate")}
            optional={t("endDateOptional")}
            error={errors.endDate}
            hint={!endIso ? t("openEndedHint") : undefined}
          >
            <div className="relative">
              <input
                id={`${idPrefix}-endDate`}
                type="date"
                className={`input num ${endIso ? "!pe-16" : ""}`}
                value={endIso}
                min={startIso || undefined}
                onChange={(e) => onChange({ endDate: e.target.value })}
                aria-invalid={errors.endDate ? true : undefined}
                data-testid="study-end-date-input"
              />
              {endIso && (
                <button
                  type="button"
                  onClick={() => onChange({ endDate: "" })}
                  className="absolute inset-y-0 end-2 my-auto h-7 rounded-full bg-[var(--bg)] px-2.5 text-[11px] font-bold text-[var(--text-secondary)] transition hover:bg-slate-200 hover:text-[var(--text)]"
                  data-testid="clear-end-date"
                >
                  {t("clearEndDate")}
                </button>
              )}
            </div>
            {endIso && !errors.endDate && (
              <span className="mt-1.5 block text-[11px] font-semibold text-[var(--text-tertiary)]">
                {formatDate(endIso, lang)}
              </span>
            )}
          </Field>
        </div>

        {/* Quick durations */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 flex items-center gap-1 text-[11px] font-bold text-[var(--text-tertiary)]">
            <IconClock size={12} />
            {t("quickDuration")}:
          </span>
          {QUICK_DURATIONS.map((q) => {
            const selected = totalDays === q.days;
            return (
              <button
                key={q.days}
                type="button"
                onClick={() => applyDuration(q.days)}
                aria-pressed={selected}
                data-testid={`duration-${q.days}`}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                  selected
                    ? "border-[var(--accent-strong)] bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                    : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-slate-300 hover:text-[var(--text)]"
                }`}
              >
                {t(q.key)}
              </button>
            );
          })}
        </div>

        {/* Summary */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-[var(--bg)] px-3.5 py-2.5 text-xs"
          data-testid="period-summary"
        >
          <span className="font-bold text-[var(--text)]">
            {startIso && endIso
              ? formatDateRange(startIso, endIso, lang)
              : startIso
                ? `${lang === "en" ? "From" : "من"} ${formatDate(startIso, lang)}`
                : t("datePh")}
          </span>
          <span className="num font-semibold text-[var(--text-secondary)]">
            {totalDays
              ? `${t("duration")}: ${formatDays(totalDays, lang)}`
              : startIso
                ? t("openEnded")
                : ""}
          </span>
        </div>
      </FormSection>

      {/* ------------------------------------------------ status */}
      <FormSection title={t("status")} icon={<IconClock size={16} />}>
        <SegmentedControl<StoredStatus>
          value={form.status}
          onChange={(status) => onChange({ status })}
          label={t("status")}
          testId="study-status-select"
          options={[
            { value: "active", label: t("statusAuto") },
            { value: "draft", label: t("draft") },
            { value: "closed", label: t("closed") },
          ]}
        />
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">{t(statusHintKey)}</p>
          <div className="flex shrink-0 items-center gap-2" data-testid="status-preview">
            <span className="text-[11px] font-bold text-[var(--text-tertiary)]">{t("statusNow")}:</span>
            <StatusBadge status={effective} label={t(effective)} />
            {hint && <span className="num text-[11px] font-semibold text-[var(--text-secondary)]">{hint}</span>}
          </div>
        </div>
      </FormSection>
    </div>
  );
}

/** Save / cancel row shared by the popup footer and the edit page. */
export function StudyFormActions({
  onCancel,
  saving,
  saveLabel,
  savingLabel,
  cancelLabel,
  shortcutHint,
  saveIcon,
  extra,
  formId,
}: {
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
  savingLabel?: string;
  cancelLabel: string;
  shortcutHint?: string;
  saveIcon?: ReactNode;
  extra?: ReactNode;
  /** Id of the <form> to submit when the button is rendered outside of it (modal footer). */
  formId?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="hidden min-w-0 items-center gap-2 text-[11px] font-semibold text-[var(--text-tertiary)] sm:flex">
        {extra}
        {shortcutHint && <span className="num">{shortcutHint}</span>}
      </div>
      <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
        <button type="button" className="btn-ghost flex-1 text-sm sm:flex-none" onClick={onCancel} disabled={saving}>
          {cancelLabel}
        </button>
        <button
          type="submit"
          form={formId}
          className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm font-bold sm:flex-none"
          disabled={saving}
          data-testid="study-save"
        >
          {saving ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            saveIcon
          )}
          <span>{saving && savingLabel ? savingLabel : saveLabel}</span>
        </button>
      </div>
    </div>
  );
}
