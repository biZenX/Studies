"use client";

import { useState } from "react";
import {
  Modal,
  Field,
  FormSection,
  DiscardPrompt,
  IconMail,
  IconPhone,
  IconUser,
  IconGlobe,
  IconEdit,
  IconPlus,
  IconCheckCircle,
} from "./ui";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORM_ID = "participant-modal-form";
const KEYS = Object.keys(EMPTY) as (keyof ParticipantFormData)[];

type Errors = Partial<Record<"name" | "email", string>>;

/**
 * Add / edit a participant in a popup.
 *
 * Seeded when the dialog opens or when a different record is handed in, so a
 * parent re-render (another tab saving, a toast…) can never wipe what the user
 * is typing. Unsaved changes are protected by a discard prompt.
 */
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
  const [baseline, setBaseline] = useState<ParticipantFormData>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [prevProps, setPrevProps] = useState<{ open: boolean; initial: ParticipantFormData | null }>({
    open: false,
    initial: null,
  });

  // (Re)seed only on open, or when a different record is passed while open.
  if (open !== prevProps.open || (open && initial !== prevProps.initial)) {
    setPrevProps({ open, initial });
    if (open) {
      const next = initial ? { ...EMPTY, ...initial } : EMPTY;
      setForm(next);
      setBaseline(next);
      setErrors({});
      setConfirmDiscard(false);
    }
  }

  const isEdit = Boolean(initial);
  const dirty = KEYS.some((k) => (form[k] ?? "") !== (baseline[k] ?? ""));

  const update = (patch: Partial<ParticipantFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    if (patch.name !== undefined && errors.name) setErrors((e) => ({ ...e, name: undefined }));
    if (patch.email !== undefined && errors.email) setErrors((e) => ({ ...e, email: undefined }));
  };

  const requestClose = () => {
    if (saving) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const submit = () => {
    if (saving) return;
    const next: Errors = {};
    if (!form.name.trim()) next.name = t("nameRequired");
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = t("invalidEmail");
    if (next.name || next.email) {
      setErrors(next);
      document.getElementById(next.name ? "participant-name" : "participant-email")?.focus();
      return;
    }
    onSubmit({
      name: form.name.trim(),
      federation: form.federation.trim(),
      country: form.country.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      code: form.code.trim(),
    });
  };

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={isEdit ? t("editParticipant") : t("addParticipant")}
      subtitle={isEdit ? t("editParticipantSub") : t("addParticipantSub")}
      icon={isEdit ? <IconEdit size={18} /> : <IconPlus size={18} />}
      testId="participant-modal"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="hidden items-center gap-2 text-[11px] font-semibold text-[var(--text-tertiary)] sm:flex">
            {dirty && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t("unsavedChanges")}
              </span>
            )}
            <span className="num">{t("saveShortcut")}</span>
          </div>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <button
              type="button"
              className="btn-ghost flex-1 text-sm sm:flex-none"
              onClick={requestClose}
              disabled={saving}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              form={FORM_ID}
              className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm font-bold sm:flex-none"
              disabled={saving}
              data-testid="participant-save"
            >
              {saving ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <IconCheckCircle size={16} />
              )}
              <span>{isEdit ? t("saveChanges") : t("save")}</span>
            </button>
          </div>
        </div>
      }
      overlay={
        <DiscardPrompt
          open={confirmDiscard}
          title={t("unsavedChanges")}
          description={t("unsavedChangesSub")}
          keepLabel={t("keepEditing")}
          discardLabel={t("discardChanges")}
          onKeep={() => setConfirmDiscard(false)}
          onDiscard={() => {
            setConfirmDiscard(false);
            onClose();
          }}
        />
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        className="space-y-6"
        noValidate
      >
        <FormSection title={t("basicInfo")} icon={<IconUser size={16} />}>
          <Field label={t("name")} required error={errors.name}>
            <input
              id="participant-name"
              className="input"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder={t("namePh")}
              aria-invalid={errors.name ? true : undefined}
              data-testid="participant-name-input"
              data-autofocus=""
              autoComplete="off"
            />
          </Field>

          <Field label={t("code")} optional={t("optional")}>
            <input
              className="input num"
              value={form.code}
              onChange={(e) => update({ code: e.target.value })}
              placeholder={t("codePh")}
              autoComplete="off"
            />
          </Field>
        </FormSection>

        <FormSection title={t("affiliation")} icon={<IconGlobe size={16} />}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("country")} optional={t("optional")}>
              <input
                className="input"
                value={form.country}
                onChange={(e) => update({ country: e.target.value })}
                placeholder={t("countryPh")}
                list="country-options"
                autoComplete="off"
              />
            </Field>
            <Field label={t("federation")} optional={t("optional")}>
              <input
                className="input"
                value={form.federation}
                onChange={(e) => update({ federation: e.target.value })}
                placeholder={t("federationPh")}
                autoComplete="off"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title={t("contactDetails")} icon={<IconMail size={16} />}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("email")} optional={t("optional")} error={errors.email}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--text-tertiary)]">
                  <IconMail size={16} />
                </span>
                <input
                  id="participant-email"
                  type="email"
                  dir="ltr"
                  inputMode="email"
                  className="input ps-9 text-start"
                  value={form.email}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder={t("emailPh")}
                  aria-invalid={errors.email ? true : undefined}
                  autoComplete="off"
                />
              </div>
            </Field>

            <Field label={t("phone")} optional={t("optional")}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--text-tertiary)]">
                  <IconPhone size={16} />
                </span>
                <input
                  dir="ltr"
                  inputMode="tel"
                  className="input ps-9 text-start"
                  value={form.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                  placeholder={t("phonePh")}
                  autoComplete="off"
                />
              </div>
            </Field>
          </div>
        </FormSection>

        {/* Enter inside a text input submits through this hidden button. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
