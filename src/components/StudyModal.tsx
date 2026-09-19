"use client";

import { useState } from "react";
import { Modal, DiscardPrompt, IconCheckCircle, IconEdit, IconPlus } from "./ui";
import { useLang } from "./lang";
import {
  StudyFormActions,
  StudyFormFields,
  emptyStudyForm,
  focusFirstError,
  isStudyFormDirty,
  normalizeStudyForm,
  validateStudyForm,
  type StudyFormData,
  type StudyFormErrors,
} from "./StudyForm";

export type { StudyFormData } from "./StudyForm";
export type StudyPayload = ReturnType<typeof normalizeStudyForm>;

const ID_PREFIX = "study-modal";

/**
 * Create / edit a study in a popup.
 *
 * - The same fields (and the same validation) as the full edit page.
 * - The form is (re)seeded when the dialog opens or when a *different* record
 *   is handed in — never on unrelated parent re-renders, so nothing the user
 *   typed can be wiped mid-edit.
 * - Escape / backdrop / ✕ with unsaved changes asks before discarding.
 * - Ctrl/⌘ + Enter saves.
 */
export function StudyModal({
  open,
  initial,
  onClose,
  onSubmit,
  saving,
}: {
  open: boolean;
  /** Record being edited, or null to create a new study. */
  initial: StudyFormData | null;
  onClose: () => void;
  onSubmit: (data: StudyPayload) => void;
  saving: boolean;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<StudyFormData>(emptyStudyForm);
  const [baseline, setBaseline] = useState<StudyFormData>(form);
  const [errors, setErrors] = useState<StudyFormErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Seed the form during render (React's recommended "derive state from props"
  // pattern). The key changes only when the dialog opens or the record differs.
  const seedKey = open ? `${initial?.id ?? "new"}` : null;
  const [prevSeedKey, setPrevSeedKey] = useState<string | null>(null);
  if (seedKey !== prevSeedKey) {
    setPrevSeedKey(seedKey);
    if (seedKey !== null) {
      const next = initial ? { ...emptyStudyForm(), ...initial } : emptyStudyForm();
      setForm(next);
      setBaseline(next);
      setErrors({});
      setConfirmDiscard(false);
    }
  }

  const isEdit = Boolean(initial?.id);
  const dirty = isStudyFormDirty(form, baseline);

  const update = (patch: Partial<StudyFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    // Clear the error of every field that just changed.
    const touched = Object.keys(patch) as (keyof StudyFormData)[];
    if (touched.some((k) => errors[k as keyof StudyFormErrors])) {
      setErrors((prev) => {
        const next = { ...prev };
        touched.forEach((k) => delete next[k as keyof StudyFormErrors]);
        return next;
      });
    }
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
    const nextErrors = validateStudyForm(form, t);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusFirstError(nextErrors, ID_PREFIX);
      return;
    }
    onSubmit(normalizeStudyForm(form));
  };

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={isEdit ? t("editStudyPage") : t("createStudy")}
      subtitle={isEdit ? t("editStudySub") : t("createStudySub")}
      icon={isEdit ? <IconEdit size={18} /> : <IconPlus size={18} />}
      size="lg"
      testId="study-modal"
      footer={
        <StudyFormActions
          onCancel={requestClose}
          saving={saving}
          saveLabel={isEdit ? t("saveChanges") : t("save")}
          savingLabel={t("savingChanges")}
          cancelLabel={t("cancel")}
          shortcutHint={t("saveShortcut")}
          saveIcon={<IconCheckCircle size={16} />}
          formId={`${ID_PREFIX}-form`}
          extra={
            dirty ? (
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t("unsavedChanges")}
              </span>
            ) : null
          }
        />
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
      {/* The Save button sits in the sticky footer, outside this element, and
          submits it through the `form` attribute (form id below). */}
      <form
        id={`${ID_PREFIX}-form`}
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
        noValidate
      >
        <StudyFormFields form={form} errors={errors} onChange={update} idPrefix={ID_PREFIX} />
        {/* Enter inside a text input submits through this hidden button. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
