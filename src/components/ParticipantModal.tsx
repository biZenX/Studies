"use client";

import { useState } from "react";
import { Modal, Field, Spinner, IconMail, IconPhone } from "./ui";
import { useLang } from "./lang";

export type ParticipantFormData = {
  name: string;
  federation: string;
  country: string;
  email: string;
  phone: string;
  /** Optional file / membership number detected by the smart importer. */
  code: string;
};

const EMPTY: ParticipantFormData = {
  name: "",
  federation: "",
  country: "",
  email: "",
  phone: "",
  code: "",
};

export function ParticipantModal({
  open,
  initial,
  onClose,
  onSubmit,
  saving,
}: {
  open: boolean;
  initial: ParticipantFormData | null;
  onClose: () => void;
  onSubmit: (data: ParticipantFormData) => void;
  saving: boolean;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<ParticipantFormData>(EMPTY);
  const [error, setError] = useState("");
  const [prevProps, setPrevProps] = useState<{ open: boolean; initial: ParticipantFormData | null }>({
    open: false,
    initial: null,
  });

  if (open !== prevProps.open || initial !== prevProps.initial) {
    setPrevProps({ open, initial });
    if (open) {
      setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
      setError("");
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t("missingFields"));
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? t("editParticipant") : t("addParticipant")}
      testId="participant-modal"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("name")} required>
          <input
            className="input"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (error) setError("");
            }}
            placeholder={t("namePh")}
            data-testid="participant-name-input"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("federation")}>
            <input
              className="input"
              value={form.federation}
              onChange={(e) => setForm({ ...form, federation: e.target.value })}
              placeholder={t("federationPh")}
            />
          </Field>
          <Field label={t("country")}>
            <input
              className="input"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder={t("countryPh")}
              list="country-options"
            />
          </Field>
        </div>

        <Field label={t("code")}>
          <input
            className="input num"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder={t("codePh")}
          />
        </Field>

        <Field label={t("email")}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--text-tertiary)]">
              <IconMail size={16} />
            </span>
            <input
              type="email"
              dir="ltr"
              className="input ps-9 text-start"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t("emailPh")}
            />
          </div>
        </Field>

        <Field label={t("phone")}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--text-tertiary)]">
              <IconPhone size={16} />
            </span>
            <input
              dir="ltr"
              className="input ps-9 text-start"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("phonePh")}
            />
          </div>
        </Field>

        {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            data-testid="participant-save"
          >
            {saving ? <Spinner size={16} /> : t("save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
