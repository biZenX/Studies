"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "./lang";
import { useToast } from "./toast";
import { IconBack, IconCheckCircle, Spinner, StatusBadge } from "./ui";
import { useMounted, useToday } from "./useMediaQuery";
import {
  StudyFormActions,
  StudyFormFields,
  focusFirstError,
  isStudyFormDirty,
  normalizeStudyForm,
  studyToForm,
  validateStudyForm,
  type StudyFormData,
  type StudyFormErrors,
} from "./StudyForm";
import { formatDateRange } from "@/lib/content";
import { resolveStudyStatus, scheduleHint } from "@/domain/studySchedule";
import type { StudyWithCount } from "@/lib/types";
import { getStudySnapshot, saveLocalStudy, subscribeStorage } from "@/lib/storage";

const NO_PARTICIPANTS: never[] = [];
const ID_PREFIX = "study-edit";

/**
 * `/studies/:id/edit` — full-page variant of the study form.
 *
 * It renders exactly the same fields and validation as the popup
 * (`StudyModal`), so both ways of editing behave identically.
 */
export function StudyEditForm({
  studyId,
  initialStudy,
}: {
  studyId: number;
  initialStudy?: StudyWithCount | null;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const toast = useToast();
  const mounted = useMounted();
  const today = useToday();

  const serverSnapshot = useMemo(
    () => ({ study: initialStudy ?? null, participants: NO_PARTICIPANTS }),
    [initialStudy],
  );

  const getClientSnapshot = useCallback(() => {
    const local = getStudySnapshot(studyId);
    if (local.study) return local;
    return serverSnapshot.study ? serverSnapshot : local;
  }, [studyId, serverSnapshot]);

  const snapshot = useSyncExternalStore(
    subscribeStorage,
    getClientSnapshot,
    () => serverSnapshot,
  );

  const study = snapshot.study;
  const participantCount = snapshot.study ? snapshot.participants.length : 0;

  const [form, setForm] = useState<StudyFormData | null>(null);
  const [baseline, setBaseline] = useState<StudyFormData | null>(null);
  const [seededFor, setSeededFor] = useState<number | null>(null);
  const [errors, setErrors] = useState<StudyFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  // Seed the form once, during render, as soon as the record is known. Doing
  // this in an effect would flash an empty form and cascade extra renders.
  if (study && seededFor !== study.id && !touched) {
    setSeededFor(study.id);
    const seeded = studyToForm(study);
    setForm(seeded);
    setBaseline(seeded);
  }

  const dirty = form && baseline ? isStudyFormDirty(form, baseline) : false;

  const update = (patch: Partial<StudyFormData>) => {
    setTouched(true);
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    const touchedKeys = Object.keys(patch) as (keyof StudyFormErrors)[];
    if (touchedKeys.some((k) => errors[k])) {
      setErrors((prev) => {
        const next = { ...prev };
        touchedKeys.forEach((k) => delete next[k]);
        return next;
      });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;

    const nextErrors = validateStudyForm(form, t);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusFirstError(nextErrors, ID_PREFIX);
      return;
    }

    setSaving(true);
    try {
      const payload = normalizeStudyForm(form);
      saveLocalStudy({ ...payload, id: studyId });
      toast.success(t("studyUpdated"));
      router.push(`/studies/${studyId}`);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // The record lives in the browser store, so before hydration we render a
  // skeleton rather than claiming the study does not exist.
  if (!mounted && !study) {
    return (
      <div className="animate-fade-up" aria-busy="true" data-testid="edit-loading">
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--bg)]/60 px-6 py-6 text-center">
            <div className="mx-auto h-6 w-52 rounded-full bg-white" />
            <div className="mx-auto mt-3 h-3 w-72 max-w-full rounded-full bg-white" />
          </div>
          <div className="space-y-4 px-5 py-6 sm:px-7">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-[var(--bg)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!study || !form) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
        {study === null ? (
          <>
            <p className="text-lg font-bold text-[var(--text)]">{t("studyNotFound")}</p>
            <Link href="/" className="btn-primary mt-4 flex items-center gap-2 text-sm font-bold">
              <IconBack size={16} />
              <span>{t("backToStudies")}</span>
            </Link>
          </>
        ) : (
          <Spinner size={22} />
        )}
      </div>
    );
  }

  const effective = resolveStudyStatus(study, today);
  const hint = scheduleHint(study, today, lang);

  return (
    <div className="animate-fade-up pb-12">
      <Link
        href={`/studies/${studyId}`}
        className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--text)] sm:text-sm"
      >
        <IconBack size={16} />
        <span>{t("backToStudy")}</span>
      </Link>

      <div className="card overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--bg)]/60 px-5 py-5 text-center sm:px-7">
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <StatusBadge status={effective} label={t(effective)} />
            {hint && (
              <span className="num rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                {hint}
              </span>
            )}
            <span className="num rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
              {participantCount} {t("participants")}
            </span>
          </div>
          <h1 className="doc-title text-xl sm:text-2xl lg:text-3xl">{t("editStudyPage")}</h1>
          <div className="doc-title-rule" />
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            {study.year && (
              <span className="num block font-bold text-[var(--navy)]">
                {formatDateRange(study.year, study.endDate, lang)}
              </span>
            )}
            {t("editStudySub")}
          </p>
        </div>

        <form
          onSubmit={submit}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLFormElement).requestSubmit();
            }
          }}
          className="px-4 py-5 sm:px-7 sm:py-6"
          noValidate
        >
          <StudyFormFields
            form={form}
            errors={errors}
            onChange={update}
            idPrefix={ID_PREFIX}
            autoFocusTitle={false}
          />

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <StudyFormActions
              onCancel={() => router.push(`/studies/${studyId}`)}
              saving={saving}
              saveLabel={t("saveChanges")}
              savingLabel={t("savingChanges")}
              cancelLabel={t("cancel")}
              shortcutHint={t("saveShortcut")}
              saveIcon={<IconCheckCircle size={16} />}
              extra={
                dirty ? (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {t("unsavedChanges")}
                  </span>
                ) : null
              }
            />
          </div>
        </form>
      </div>
    </div>
  );
}
