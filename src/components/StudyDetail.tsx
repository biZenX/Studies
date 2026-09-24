"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "./lang";
import { useToast } from "./toast";
import { useMediaQuery, useMounted, useToday } from "./useMediaQuery";
import { ParticipantModal, type ParticipantFormData } from "./ParticipantModal";
import { StudyModal, type StudyPayload } from "./StudyModal";
import { studyToForm } from "./StudyForm";
import { EmailModal } from "./EmailModal";
import { ExportModal } from "./ExportModal";
import { ImportModal } from "./ImportModal";
import { AppSelect,
  Modal,
  CountryBadge,
  StatusBadge,
  Spinner,
  IconPlus,
  IconMail,
  IconPhone,
  IconBack,
  IconEdit,
  IconTrash,
  IconUsers,
  IconGlobe,
  IconSearch,
  IconUpload,
  IconDownload,
  IconFilter,
  IconCalendar,
  IconArrowEnd,
} from "./ui";
import {
  formatDate,
  formatDateRange,
  formatDays,
  localizeStudy,
  normalizeAr,
  translateCountry,
} from "@/lib/content";
import type { StudyWithCount, Participant } from "@/lib/types";
import {
  computeStudyStats,
  aggregateAttributeCounts,
  filterParticipants,
  sortParticipants,
  type ParticipantSortOrder,
} from "@/domain/rosterEngine";
import { describeSchedule, scheduleHint } from "@/domain/studySchedule";
import {
  getStudySnapshot,
  deleteLocalStudy,
  saveLocalStudy,
  saveLocalParticipant,
  deleteLocalParticipant,
  restoreLocalParticipant,
  subscribeStorage,
} from "@/lib/storage";

const NO_PARTICIPANTS: Participant[] = [];

type SortKey = "original" | "name" | "country" | "newest";

export function StudyDetail({
  studyId: propStudyId,
  study: initialStudy,
  participants: initialParticipants,
  brevoConfigured,
}: {
  studyId?: number;
  study?: StudyWithCount | null;
  participants?: Participant[] | null;
  brevoConfigured?: boolean;
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const toast = useToast();
  const mounted = useMounted();
  const today = useToday();
  const isSmallScreen = useMediaQuery("(max-width: 639px)");

  const activeId = propStudyId || initialStudy?.id || 1;

  // Server payload bootstraps the first paint; the local-first store takes over
  // as soon as the component hydrates (useSyncExternalStore handles the swap
  // without a hydration mismatch).
  const serverSnapshot = useMemo(
    () => ({
      study: initialStudy ?? null,
      participants: initialParticipants ?? NO_PARTICIPANTS,
    }),
    [initialStudy, initialParticipants],
  );

  const getClientSnapshot = useCallback(() => {
    const local = getStudySnapshot(activeId);
    if (local.study) return local;
    return serverSnapshot.study ? serverSnapshot : local;
  }, [activeId, serverSnapshot]);

  const snapshot = useSyncExternalStore(
    subscribeStorage,
    getClientSnapshot,
    () => serverSnapshot,
  );

  const study = snapshot.study;

  /**
   * Rows hidden by a delete that the backing store could not confirm (e.g. a
   * roster that only ever came from the server). This is what guarantees the
   * row disappears the instant the dialog is confirmed.
   */
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<number>>(() => new Set());

  const participants = useMemo(
    () =>
      hiddenIds.size === 0
        ? snapshot.participants
        : snapshot.participants.filter((p) => !hiddenIds.has(p.id)),
    [snapshot.participants, hiddenIds],
  );

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [federationFilter, setFederationFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("original");
  const [viewOverride, setViewOverride] = useState<"table" | "cards" | null>(null);

  // Modals
  const [participantModal, setParticipantModal] = useState(false);
  const [studyModal, setStudyModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [deleteStudyOpen, setDeleteStudyOpen] = useState(false);

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingStudy, setSavingStudy] = useState(false);

  /* ----------------------------- derived data ----------------------------- */

  const displayStudy = useMemo(
    () => (study ? localizeStudy(study, lang) : null),
    [study, lang],
  );

  const schedule = useMemo(
    () => (study ? describeSchedule(study, today) : null),
    [study, today],
  );
  const scheduleText = study ? scheduleHint(study, today, lang) : "";
  const periodText = study?.year ? formatDateRange(study.year, study.endDate, lang) : "";

  // Seeded only when a different record is opened, never on unrelated renders.
  const studyFormInitial = useMemo(() => (study ? studyToForm(study) : null), [study]);

  // Participant form seed — memoised for the same reason.
  const participantFormInitial = useMemo<ParticipantFormData | null>(
    () =>
      editingParticipant
        ? {
            name: editingParticipant.name,
            federation: editingParticipant.federation ?? "",
            country: editingParticipant.country ?? "",
            email: editingParticipant.email ?? "",
            phone: editingParticipant.phone ?? "",
            code: editingParticipant.code ?? "",
          }
        : null,
    [editingParticipant],
  );

  const stats = useMemo(() => computeStudyStats(participants), [participants]);

  /** Country → count, used for the breakdown chips and the filter dropdown. */
  const countryCounts = useMemo(
    () => aggregateAttributeCounts(participants, "country"),
    [participants],
  );

  const federationCounts = useMemo(
    () => aggregateAttributeCounts(participants, "federation"),
    [participants],
  );

  /**
   * Search matches the raw value *and* its translation, so filtering works in
   * both languages ("الأردن" and "Jordan" hit the same rows).
   */
  const filtered = useMemo(() => {
    const list = filterParticipants(
      participants,
      {
        search,
        country: countryFilter,
        federation: federationFilter,
      },
      translateCountry,
    );

    return sortParticipants(list, sortKey as ParticipantSortOrder, lang);
  }, [participants, search, countryFilter, federationFilter, sortKey, lang]);

  const validEmails = useMemo(
    () => participants.filter((p) => p.email && p.email.includes("@")).length,
    [participants],
  );

  const activeFilters =
    (search ? 1 : 0) + (countryFilter !== "all" ? 1 : 0) + (federationFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setCountryFilter("all");
    setFederationFilter("all");
  };

  /* -------------------------------- actions ------------------------------- */

  const openAdd = () => {
    setEditingParticipant(null);
    setParticipantModal(true);
  };

  const openEdit = (p: Participant) => {
    setEditingParticipant(p);
    setParticipantModal(true);
  };

  const handleParticipantSubmit = (data: ParticipantFormData) => {
    if (!study) return;
    setSaving(true);
    try {
      saveLocalParticipant(study.id, {
        id: editingParticipant?.id,
        name: data.name,
        federation: data.federation,
        country: data.country,
        email: data.email,
        phone: data.phone,
        code: data.code,
      });
      setParticipantModal(false);
      toast.success(
        editingParticipant ? t("participantUpdated") : t("participantAdded"),
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete is optimistic: the row leaves the roster the instant the dialog is
   * confirmed, persistence happens right after, and an undo is offered.
   */
  const handleDeleteParticipant = () => {
    const target = deletingParticipant;
    if (!target) return;

    setDeletingParticipant(null);

    // 1. Hide the row immediately — the roster must react before any I/O.
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(target.id);
      return next;
    });

    // 2. Persist (synchronous, notifies the store → snapshot without the row).
    try {
      deleteLocalParticipant(target.id);
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error(t("exportFailed"));
    }

    toast.success(`${t("participantRemoved")}: ${target.name}`, {
      label: t("undo"),
      onClick: () => {
        setHiddenIds((prev) => {
          if (!prev.has(target.id)) return prev;
          const next = new Set(prev);
          next.delete(target.id);
          return next;
        });
        try {
          restoreLocalParticipant(target);
        } catch (err) {
          console.error("Undo failed:", err);
        }
      },
    });
  };

  const handleStudySubmit = (data: StudyPayload) => {
    if (!study) return;
    setSavingStudy(true);
    try {
      saveLocalStudy({
        id: study.id,
        title: data.title,
        year: data.year,
        endDate: data.endDate,
        description: data.description,
        status: data.status,
        titleEn: data.titleEn,
        descriptionEn: data.descriptionEn,
      });
      setStudyModal(false);
      toast.success(t("studyUpdated"));
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingStudy(false);
    }
  };

  const handleDeleteStudy = async () => {
    if (!study) return;
    setSaving(true);
    try {
      deleteLocalStudy(study.id);
      router.push("/");
    } finally {
      setSaving(false);
    }
  };

  const handleImported = (count: number) => {
    toast.success(
      lang === "en" ? `${count} participants imported` : `تم استيراد ${count} مشارك بنجاح`,
    );
  };

  /* --------------------------------- render -------------------------------- */

  // Before hydration we cannot read the local-first store. When the server
  // already sent the study we render it; otherwise show a skeleton instead of
  // flashing "study not found" on every cold load.
  if (!mounted && !study) {
    return (
      <div className="animate-fade-up" aria-busy="true" data-testid="study-loading">
        <div className="card mb-5 p-6">
          <div className="mx-auto h-4 w-28 rounded-full bg-[var(--bg)]" />
          <div className="mx-auto mt-4 h-7 w-3/4 max-w-xl rounded-full bg-[var(--bg)]" />
          <div className="mx-auto mt-3 h-3 w-1/2 max-w-sm rounded-full bg-[var(--bg)]" />
        </div>
        <div className="card p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-3 h-9 rounded-xl bg-[var(--bg)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!study || !displayStudy) {
    return (
      <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-lg font-bold text-[var(--text)]">{t("studyNotFound")}</p>
        <Link href="/" className="btn-primary mt-4 flex items-center gap-2 text-sm font-bold">
          <IconBack size={16} />
          <span>{t("backToStudies")}</span>
        </Link>
      </div>
    );
  }

  const statItems = [
    {
      label: t("totalParticipants"),
      value: stats.participants,
      icon: <IconUsers size={18} />,
      tint: "#ecfdf5",
      color: "#059669",
    },
    {
      label: t("countries"),
      value: stats.countries,
      icon: <IconGlobe size={18} />,
      tint: "#eff6ff",
      color: "#0b2545",
    },
    {
      label: t("withEmail"),
      value: stats.withEmail,
      icon: <IconMail size={18} />,
      tint: "#fff7ed",
      color: "#ea580c",
    },
  ];

  // Only one roster view is mounted at a time: hidden duplicates used to leak
  // filtered-out rows into the page content.
  const showCards = mounted
    ? viewOverride
      ? viewOverride === "cards"
      : isSmallScreen
    : false;

  return (
    <div className="animate-fade-up pb-12">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] transition hover:text-[var(--text)] sm:text-sm"
      >
        <IconBack size={16} />
        <span>{t("backToStudies")}</span>
      </Link>

      {/* ---------------- Study header (centred navy title) ---------------- */}
      <div className="card mb-5 p-5 sm:p-7">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
            {periodText && (
              <span
                className="num inline-flex items-center gap-1.5 rounded-full bg-[#eef2f7] px-3 py-1 text-xs font-bold text-[var(--navy)]"
                data-testid="study-period"
              >
                <IconCalendar size={13} />
                {periodText}
              </span>
            )}
            <StatusBadge
              status={schedule?.status ?? study.status}
              label={t(schedule?.status ?? study.status)}
            />
            {scheduleText && (
              <span
                className="num inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--text-secondary)] ring-1 ring-[var(--border)]"
                data-testid="study-schedule-hint"
              >
                {scheduleText}
              </span>
            )}
            <span className="num inline-flex items-center rounded-full bg-[var(--accent-tint)] px-3 py-1 text-xs font-bold text-[var(--accent-strong)]">
              {participants.length} {t("participants")}
            </span>
          </div>

          <h1
            className="doc-title w-full max-w-4xl text-2xl sm:text-3xl lg:text-[2.6rem]"
            data-testid="study-title"
          >
            {displayStudy.title}
          </h1>
          <div className="doc-title-rule" />

          {displayStudy.description && (
            <p
              className="mt-3 max-w-3xl text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm"
              data-testid="study-description"
            >
              {displayStudy.description}
            </p>
          )}

          {/* Schedule strip — from → to, with progress while the study runs */}
          {schedule && study.year && (
            <div
              className="mx-auto mt-4 w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--bg)]/70 px-4 py-3 text-start"
              data-testid="study-schedule"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
                  <span className="text-[var(--text-tertiary)]">{lang === "en" ? "From" : "من"}</span>
                  <span className="num">{formatDate(study.year, lang)}</span>
                  <IconArrowEnd size={14} className="text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-tertiary)]">{lang === "en" ? "to" : "إلى"}</span>
                  <span className="num">
                    {study.endDate ? formatDate(study.endDate, lang) : t("openEnded")}
                  </span>
                </span>
                <span className="num font-semibold text-[var(--text-secondary)]">
                  {schedule.totalDays
                    ? schedule.dayNumber
                      ? `${t("day")} ${schedule.dayNumber} ${t("of")} ${schedule.totalDays}`
                      : `${t("duration")}: ${formatDays(schedule.totalDays, lang)}`
                    : t("openEndedHint")}
                </span>
              </div>
              {schedule.totalDays && (
                <div
                  className="progress-track mt-2"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(
                    (schedule.status === "closed" ? 1 : schedule.status === "upcoming" ? 0 : (schedule.progress ?? 0)) * 100,
                  )}
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.round(
                        (schedule.status === "closed"
                          ? 1
                          : schedule.status === "upcoming"
                            ? 0
                            : (schedule.progress ?? 0)) * 100,
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex w-full flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold"
              onClick={() => setStudyModal(true)}
              data-testid="edit-study-link"
            >
              <IconEdit size={14} />
              <span>{t("editStudy")}</span>
            </button>
            <button
              type="button"
              className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold !text-red-600 hover:!border-red-200 hover:!bg-red-50"
              onClick={() => setDeleteStudyOpen(true)}
            >
              <IconTrash size={14} />
              <span>{t("deleteStudy")}</span>
            </button>
            <button
              type="button"
              className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold text-emerald-800 !border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50"
              onClick={() => setExportModal(true)}
              data-testid="export-button"
              title={t("exportStudyHtml")}
            >
              <IconDownload size={14} />
              <span>{t("exportStudyHtml")}</span>
            </button>
            <button
              type="button"
              className="btn-primary flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold"
              onClick={() => setEmailModal(true)}
            >
              <IconMail size={14} />
              <span>{t("sendEmails")}</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
          {statItems.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: s.tint, color: s.color }}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="num text-base font-bold leading-none sm:text-lg">{s.value}</p>
                <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- Roster controls ---------------- */}
      <div className="card mb-4 p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-[var(--text-tertiary)]">
              <IconSearch size={16} />
            </span>
            <input
              className="input !py-2 !text-xs !ps-11 !pe-9 sm:!text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchParticipants")}
              aria-label={t("searchParticipants")}
              data-testid="participant-search"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label={t("clearSearch")}
                className="absolute inset-y-0 end-3.5 flex items-center text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold"
              onClick={() => setImportModal(true)}
              data-testid="import-button"
            >
              <IconUpload size={14} />
              <span>{t("importParticipants")}</span>
            </button>

            <button
              type="button"
              className="btn-primary flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold"
              onClick={openAdd}
              data-testid="add-participant-button"
            >
              <IconPlus size={14} />
              <span>{t("addParticipant")}</span>
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <AppSelect
            label={t("filterCountry")}
            value={countryFilter}
            onChange={setCountryFilter}
            testId="country-filter"
            options={[
              { value: "all", label: t("allCountries") },
              ...countryCounts.map(([country, count]) => ({
                value: country,
                label: `${translateCountry(country, lang)} (${count})`,
              })),
            ]}
          />

          <AppSelect
            label={t("filterFederation")}
            value={federationFilter}
            onChange={setFederationFilter}
            testId="federation-filter"
            options={[
              { value: "all", label: t("allFederations") },
              ...federationCounts.map(([federation, count]) => ({
                value: federation,
                label: `${translateCountry(federation, lang)} (${count})`,
              })),
            ]}
          />

          <AppSelect
            label={t("sortBy")}
            value={sortKey}
            onChange={(v) => setSortKey(v as SortKey)}
            testId="sort-select"
            options={[
              { value: "original", label: t("sortOriginal") },
              { value: "name", label: t("sortName") },
              { value: "country", label: t("sortCountry") },
              { value: "newest", label: t("sortNewest") },
            ]}
          />

          <div className="block">
            <span className="mb-1 block text-[11px] font-bold text-[var(--text-tertiary)]">
              {t("viewModeTable")} / {t("viewModeCards")}
            </span>
            <div className="flex h-[42px] items-center gap-1 rounded-[14px] border border-[var(--border)] bg-white p-1">
              <button
                type="button"
                onClick={() => setViewOverride("table")}
                className={`flex-1 rounded-[10px] px-2 py-1.5 text-xs font-bold transition ${
                  !showCards
                    ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {t("viewModeTable")}
              </button>
              <button
                type="button"
                onClick={() => setViewOverride("cards")}
                className={`flex-1 rounded-[10px] px-2 py-1.5 text-xs font-bold transition ${
                  showCards
                    ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {t("viewModeCards")}
              </button>
            </div>
          </div>
        </div>

        {/* Country chips — a real, one-tap filter */}
        {countryCounts.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={() => setCountryFilter("all")}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                countryFilter === "all"
                  ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-slate-300"
              }`}
            >
              {t("allCountries")} <span className="num">({participants.length})</span>
            </button>
            {countryCounts.slice(0, 12).map(([country, count]) => (
              <button
                key={country}
                type="button"
                onClick={() =>
                  setCountryFilter((prev) => (prev === country ? "all" : country))
                }
                data-testid={`country-chip-${country}`}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                  countryFilter === country
                    ? "border-[var(--accent-strong)] bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                    : "border-[var(--border)] bg-white text-[var(--text-secondary)] hover:border-slate-300"
                }`}
              >
                {translateCountry(country, lang)} <span className="num">({count})</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-[11px] font-bold text-[var(--text-tertiary)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num">
              {t("showingOf")} {filtered.length} {t("of")} {participants.length}
              {activeFilters > 0 && ` — ${t("filters")}: ${activeFilters}`}
            </span>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full bg-[var(--bg)] px-2.5 py-1 font-bold text-[var(--text-secondary)] hover:text-[var(--text)]"
                data-testid="clear-filters"
              >
                {t("clearFilters")}
              </button>
            )}
          </div>

          <div
            className="flex items-center rounded-xl bg-slate-100 p-0.5"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setViewOverride("table")}
              aria-pressed={!showCards}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                !showCards
                  ? "bg-white text-[var(--accent-strong)] shadow-2xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text)]"
              }`}
            >
              {lang === "en" ? "Table" : "جدول"}
            </button>
            <button
              type="button"
              onClick={() => setViewOverride("cards")}
              aria-pressed={showCards}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                showCards
                  ? "bg-white text-[var(--accent-strong)] shadow-2xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text)]"
              }`}
            >
              {lang === "en" ? "Cards" : "بطاقات"}
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Roster ---------------- */}
      <div className="card overflow-hidden" data-testid="participant-roster">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg)] text-[var(--text-tertiary)]">
              <IconUsers size={26} />
            </div>
            {activeFilters > 0 ? (
              <>
                <p className="text-base font-bold text-[var(--text)]">{t("noResultsFound")}</p>
                <button type="button" className="btn-ghost mt-4 text-xs font-bold" onClick={clearFilters}>
                  {t("clearFilters")}
                </button>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-[var(--text)]">{t("noParticipants")}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    className="btn-ghost flex items-center gap-2 text-xs font-bold"
                    onClick={() => setImportModal(true)}
                  >
                    <IconUpload size={15} />
                    <span>{t("importParticipants")}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-primary flex items-center gap-2 text-xs font-bold"
                    onClick={openAdd}
                  >
                    <IconPlus size={15} />
                    <span>{t("addParticipant")}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : showCards ? (
          <div className="space-y-2.5 p-3" data-testid="roster-cards">
            {filtered.map((p, i) => (
              <div
                key={p.id}
                data-testid={`participant-row-${p.id}`}
                className="rounded-xl border border-[var(--border)] bg-white p-3.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] text-[11px] font-bold text-[var(--text-secondary)]">
                      {i + 1}
                    </span>
                    <h4 className="min-w-0 truncate text-sm font-bold text-[var(--text)]">
                      {p.name}
                    </h4>
                  </div>
                  {p.country && (
                    <CountryBadge country={p.country} label={translateCountry(p.country, lang)} />
                  )}
                </div>

                {(p.federation || p.code) && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 ps-8 text-xs text-[var(--text-secondary)]">
                    {p.federation && (
                      <span>
                        {t("federation")}:{" "}
                        <b className="font-semibold text-[var(--text)]">
                          {translateCountry(p.federation, lang)}
                        </b>
                      </span>
                    )}
                    {p.code && (
                      <span className="num">
                        {t("code")}: <b className="font-semibold text-[var(--text)]">{p.code}</b>
                      </span>
                    )}
                  </div>
                )}

                {(p.email || p.phone) && (
                  <div className="mt-2 flex flex-col gap-1 ps-8 text-xs text-[var(--text-secondary)]">
                    {p.email && (
                      <span dir="ltr" className="num flex items-center justify-end gap-1.5">
                        {p.email}
                        <IconMail size={13} className="text-[var(--text-tertiary)]" />
                      </span>
                    )}
                    {p.phone && (
                      <span dir="ltr" className="num flex items-center justify-end gap-1.5">
                        {p.phone}
                        <IconPhone size={13} className="text-[var(--text-tertiary)]" />
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex justify-end gap-2 border-t border-[var(--border)] pt-2.5">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                  >
                    <IconEdit size={13} />
                    {t("edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingParticipant(p)}
                    data-testid={`delete-participant-${p.id}`}
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    <IconTrash size={13} />
                    {t("delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-scroll overflow-x-auto" data-testid="roster-table">
            <table className="w-full min-w-[720px] border-collapse text-start">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-secondary)]">
                  <th className="px-4 py-3.5 text-start font-bold lg:px-5">#</th>
                  <th className="px-4 py-3.5 text-start font-bold lg:px-5">{t("name")}</th>
                  <th className="px-4 py-3.5 text-start font-bold lg:px-5">{t("federation")}</th>
                  <th className="px-4 py-3.5 text-start font-bold lg:px-5">{t("country")}</th>
                  <th className="px-4 py-3.5 text-start font-bold lg:px-5">
                    {t("email")} / {t("phone")}
                  </th>
                  <th className="px-4 py-3.5 text-start font-bold lg:px-5">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    data-testid={`participant-row-${p.id}`}
                    className="border-b border-[var(--border)] transition last:border-0 hover:bg-[var(--bg)]/60"
                  >
                    <td className="num px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] lg:px-5">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-[var(--text)] lg:px-5">
                      <span className="block max-w-[280px] truncate" title={p.name}>
                        {p.name}
                      </span>
                      {p.code && (
                        <span className="num mt-0.5 block text-[11px] font-semibold text-[var(--text-tertiary)]">
                          {t("code")}: {p.code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[var(--text-secondary)] lg:px-5">
                      {p.federation ? translateCountry(p.federation, lang) : "—"}
                    </td>
                    <td className="px-4 py-3 lg:px-5">
                      {p.country ? (
                        <CountryBadge country={p.country} label={translateCountry(p.country, lang)} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 lg:px-5">
                      <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                        {p.email ? (
                          <span dir="ltr" className="num flex items-center gap-1.5">
                            <IconMail size={12} className="text-[var(--text-tertiary)]" />
                            {p.email}
                          </span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                        {p.phone && (
                          <span dir="ltr" className="num flex items-center gap-1.5">
                            <IconPhone size={12} className="text-[var(--text-tertiary)]" />
                            {p.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 lg:px-5">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
                          aria-label={t("edit")}
                          data-testid={`edit-participant-${p.id}`}
                        >
                          <IconEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingParticipant(p)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-red-50 hover:text-red-600"
                          aria-label={t("delete")}
                          data-testid={`delete-participant-${p.id}`}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- Modals ---------------- */}
      <ParticipantModal
        open={participantModal}
        initial={participantFormInitial}
        onClose={() => setParticipantModal(false)}
        onSubmit={handleParticipantSubmit}
        saving={saving}
      />

      <StudyModal
        open={studyModal}
        initial={studyFormInitial}
        onClose={() => setStudyModal(false)}
        onSubmit={handleStudySubmit}
        saving={savingStudy}
      />

      <ExportModal
        open={exportModal}
        study={study}
        participants={filtered}
        totalCount={snapshot.participants.length}
        onClose={() => setExportModal(false)}
      />

      <ImportModal
        open={importModal}
        studyId={study.id}
        studyTitle={displayStudy.title}
        existingNames={participants.map((p) => p.name)}
        onClose={() => setImportModal(false)}
        onSuccess={handleImported}
      />

      <EmailModal
        open={emailModal}
        studyId={study.id}
        studyTitle={displayStudy.title}
        dateText={periodText}
        recipientCount={validEmails}
        recipients={filtered.filter((p) => p.email && p.email.includes("@"))}
        brevoConfigured={brevoConfigured || false}
        onClose={() => setEmailModal(false)}
      />

      {/* Delete participant */}
      <Modal
        open={!!deletingParticipant}
        onClose={() => setDeletingParticipant(null)}
        title={t("confirmDeleteParticipant")}
        testId="delete-participant-modal"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IconTrash size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[var(--text)]">{t("deleteConfirm")}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {t("deleteConfirmSub")}
              </p>
              <p className="mt-2 rounded-lg bg-slate-100 p-2 text-xs font-bold text-slate-700">
                {deletingParticipant?.name}
                {deletingParticipant?.country ? ` — ${deletingParticipant.country}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setDeletingParticipant(null)}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn-danger flex items-center gap-2 text-xs font-bold"
              onClick={handleDeleteParticipant}
              disabled={saving}
              data-testid="confirm-delete-participant"
            >
              {saving && <Spinner size={14} />}
              {t("delete")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete study */}
      <Modal
        open={deleteStudyOpen}
        onClose={() => setDeleteStudyOpen(false)}
        title={t("deleteStudy")}
        testId="delete-study-modal"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IconTrash size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[var(--text)]">{t("deleteConfirm")}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {t("deleteConfirmSub")}
              </p>
              <p className="mt-2 rounded-lg bg-slate-100 p-2 text-xs font-bold text-slate-700">
                {displayStudy.title}
                {periodText && (
                  <span className="num block font-semibold text-slate-500">{periodText}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn-ghost text-xs" onClick={() => setDeleteStudyOpen(false)}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn-danger flex items-center gap-2 text-xs font-bold"
              onClick={handleDeleteStudy}
              disabled={saving}
              data-testid="confirm-delete-study"
            >
              {saving && <Spinner size={14} />}
              {t("delete")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
