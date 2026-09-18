"use client";

import { useState } from "react";
import { Modal, Field, Spinner } from "./ui";
import { useLang } from "./lang";
import { formatDate, isIsoDate, toDateInputValue, todayIso } from "@/lib/content";

export type StudyFormData = {
  title: string;
  /** ISO date (YYYY-MM-DD); legacy records may still hold a bare year. */
  year: string;
  description: string;
  status: string;
  titleEn?: string;
  descriptionEn?: string;
};

function emptyForm(): StudyFormData {
  return {
    title: "",
    year: todayIso(),
    description: "",
    status: "active",
    titleEn: "",
    descriptionEn: "",
  };
}

export function StudyModal({
  open,
  initial,
  onClose,
  onSubmit,
  saving,
}: {
  open: boolean;
  initial: StudyFormData | null;
  onClose: () => void;
  onSubmit: (data: StudyFormData) => void;
  saving: boolean;
}) {
  const { t, lang } = useLang();
  const [form, setForm] = useState<StudyFormData>(emptyForm);
  const [error, setError] = useState("");
  const [prevProps, setPrevProps] = useState<{ open: boolean; initial: StudyFormData | null }>({
    open: false,
    initial: null,
  });

  // Derive state from props during render (React's recommended pattern) so the
  // form always reflects the record being edited.
  if (open !== prevProps.open || initial !== prevProps.initial) {
    setPrevProps({ open, initial });
    if (open) {
      setForm(initial ? { ...emptyForm(), ...initial } : emptyForm());
      setError("");
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !String(form.year).trim()) {
      setError(t("missingFields"));
      return;
    }
    onSubmit(form);
  };

  const dateValue = toDateInputValue(form.year);
  const legacyYear = !isIsoDate(form.year) && Boolean(form.year);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? t("editStudyPage") : t("createStudy")}
      testId="study-modal"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("studyTitle")} required>
          <input
            className="input"
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
              if (error) setError("");
            }}
            placeholder={t("studyTitlePh")}
            data-testid="study-title-input"
          />
        </Field>

        <Field label={t("studyTitleEn")}>
          <input
            className="input"
            dir="ltr"
            value={form.titleEn ?? ""}
            onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
            placeholder="Shown when the interface language is English"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("date")} required>
            <input
              type="date"
              className="input num"
              value={dateValue}
              onChange={(e) => {
                setForm({ ...form, year: e.target.value });
                if (error) setError("");
              }}
              data-testid="study-date-input"
            />
            {dateValue && (
              <span className="mt-1 block text-[11px] font-semibold text-[var(--text-tertiary)]">
                {formatDate(dateValue, lang)}
              </span>
            )}
            {legacyYear && (
              <span className="mt-1 block text-[11px] font-semibold text-amber-600">
                القيمة المحفوظة حالياً «{form.year}» — اختر التاريخ الكامل لتحديثها.
              </span>
            )}
          </Field>

          <Field label={t("status")}>
            <select
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">{t("active")}</option>
              <option value="draft">{t("draft")}</option>
              <option value="closed">{t("closed")}</option>
            </select>
          </Field>
        </div>

        <Field label={t("description")}>
          <textarea
            className="input min-h-[90px] resize-y"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t("descriptionPh")}
            data-testid="study-description-input"
          />
        </Field>

        <Field label={t("descriptionEn")}>
          <textarea
            className="input min-h-[70px] resize-y"
            dir="ltr"
            value={form.descriptionEn ?? ""}
            onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
            placeholder="Optional English description"
          />
        </Field>

        {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={saving} data-testid="study-save">
            {saving ? <Spinner size={16} /> : t("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
