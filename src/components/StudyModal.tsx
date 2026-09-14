"use client";

import { useEffect, useState } from "react";
import { Modal, Field, Spinner } from "./ui";
import { useLang } from "./lang";

export type StudyFormData = {
  title: string;
  year: string;
  description: string;
  status: string;
};

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
  const { t } = useLang();
  const [form, setForm] = useState<StudyFormData>({
    title: "",
    year: "",
    description: "",
    status: "active",
  });
  const [error, setError] = useState("");
  const [prevProps, setPrevProps] = useState<{ open: boolean; initial: StudyFormData | null }>({
    open: false,
    initial: null,
  });

  if (open !== prevProps.open || initial !== prevProps.initial) {
    setPrevProps({ open, initial });
    if (open) {
      setForm(initial ?? { title: "", year: "", description: "", status: "active" });
      setError("");
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.year.trim()) {
      setError(t("missingFields"));
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? t("editStudy") : t("createStudy")}>
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
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("year")} required>
            <input
              className="input"
              value={form.year}
              onChange={(e) => {
                setForm({ ...form, year: e.target.value });
                if (error) setError("");
              }}
              placeholder={t("yearPh")}
            />
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
            className="input min-h-[90px] resize-none"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t("descriptionPh")}
          />
        </Field>

        {error && (
          <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner size={16} /> : t("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
