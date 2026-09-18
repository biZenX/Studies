"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "./lang";
import { useToast } from "./toast";
import { Field, IconBack, IconCheckCircle, Spinner, StatusBadge } from "./ui";
import { useMounted } from "./useMediaQuery";
import { formatDate, isIsoDate, toDateInputValue } from "@/lib/content";
import type { StudyWithCount } from "@/lib/types";
import { getStudySnapshot, saveLocalStudy, subscribeStorage } from "@/lib/storage";

const NO_PARTICIPANTS: never[] = [];

type FormState = {
  title: string;
  titleEn: string;
  year: string;
  description: string;
  descriptionEn: string;
  status: string;
};

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

  const [form, setForm] = useState<FormState | null>(null);
  const [seededFor, setSeededFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  // Seed the form once, during render, as soon as the record is known. Doing
  // this in an effect would flash an empty form and cascade extra renders.
  if (study && seededFor !== study.id && !touched) {
    setSeededFor(study.id);
    setForm({
      title: study.title ?? "",
      titleEn: study.titleEn ?? "",
      year: study.year ?? "",
      description: study.description ?? "",
      descriptionEn: study.descriptionEn ?? "",
      status: study.status ?? "active",
    });
  }

  const dateValue = useMemo(() => toDateInputValue(form?.year), [form?.year]);
  const legacyYear = Boolean(form?.year) && !isIsoDate(form?.year);

  const update = (patch: Partial<FormState>) => {
    setTouched(true);
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    if (error) setError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    if (!form.title.trim()) {
      setError(t("missingFields"));
      return;
    }
    if (!form.year || !toDateInputValue(form.year)) {
      setError(lang === "en" ? "Please pick a date" : "يرجى اختيار التاريخ");
      return;
    }

    setSaving(true);
    try {
      const saved = saveLocalStudy({
        id: studyId,
        title: form.title.trim(),
        year: toDateInputValue(form.year) || form.year.trim(),
        description: form.description.trim(),
        status: form.status,
        titleEn: form.titleEn.trim(),
        descriptionEn: form.descriptionEn.trim(),
      });
      void saved;
      toast.success(t("studyUpdated"));
      router.push(`/studies/${studyId}`);
    } catch (err) {
      console.error("Save failed:", err);
      setError(err instanceof Error ? err.message : String(err));
      toast.error(t("exportFailed"));
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
            {Array.from({ length: 5 }).map((_, i) => (
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
            <StatusBadge status={form.status} label={t(form.status)} />
            <span className="num rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
              {participantCount} {t("participants")}
            </span>
          </div>
          <h1 className="doc-title text-xl sm:text-2xl lg:text-3xl">{t("editStudyPage")}</h1>
          <div className="doc-title-rule" />
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            {t("editStudyPageSub")}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 px-4 py-5 sm:px-7 sm:py-6">
          <Field label={t("studyTitle")} required>
            <input
              className="input"
              value={form.title}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={t("studyTitlePh")}
              data-testid="study-title-input"
              autoFocus
            />
          </Field>

          <Field label={t("studyTitleEn")}>
            <input
              className="input"
              dir="ltr"
              value={form.titleEn}
              onChange={(e) => update({ titleEn: e.target.value })}
              placeholder="Shown when the interface language is English"
              data-testid="study-title-en-input"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("date")} required>
              <input
                type="date"
                className="input num"
                value={dateValue}
                onChange={(e) => update({ year: e.target.value })}
                data-testid="study-date-input"
              />
              {dateValue && (
                <span className="mt-1 block text-[11px] font-semibold text-[var(--text-tertiary)]">
                  {formatDate(dateValue, lang)}
                </span>
              )}
              {legacyYear && (
                <span className="mt-1 block text-[11px] font-semibold text-amber-600">
                  القيمة المحفوظة «{form.year}» — اختر التاريخ الكامل لتحديثها.
                </span>
              )}
            </Field>

            <Field label={t("status")}>
              <select
                className="input"
                value={form.status}
                onChange={(e) => update({ status: e.target.value })}
                data-testid="study-status-select"
              >
                <option value="active">{t("active")}</option>
                <option value="draft">{t("draft")}</option>
                <option value="closed">{t("closed")}</option>
              </select>
            </Field>
          </div>

          <Field label={t("description")}>
            <textarea
              className="input min-h-[110px] resize-y"
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder={t("descriptionPh")}
              data-testid="study-description-input"
            />
          </Field>

          <Field label={t("descriptionEn")}>
            <textarea
              className="input min-h-[80px] resize-y"
              dir="ltr"
              value={form.descriptionEn}
              onChange={(e) => update({ descriptionEn: e.target.value })}
              placeholder="Optional English description"
              data-testid="study-description-en-input"
            />
          </Field>

          {error && <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
            <Link href={`/studies/${studyId}`} className="btn-ghost text-sm">
              {t("cancel")}
            </Link>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2 text-sm font-bold"
              disabled={saving}
              data-testid="study-save"
            >
              {saving ? <Spinner size={16} /> : <IconCheckCircle size={16} />}
              <span>{saving ? t("savingChanges") : t("saveChanges")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
