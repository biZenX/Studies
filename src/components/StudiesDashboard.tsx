"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "./lang";
import { useToast } from "./toast";
import { useMounted, useToday } from "./useMediaQuery";
import { StudyModal, type StudyPayload } from "./StudyModal";
import { studyToForm } from "./StudyForm";
import { ExportModal } from "./ExportModal";
import {
  Modal,
  IconPlus,
  IconLayers,
  IconUsers,
  IconGlobe,
  IconMail,
  IconSearch,
  IconEdit,
  IconTrash,
  IconDownload,
  IconCalendar,
  StatusBadge,
  Spinner,
} from "./ui";
import type { StudyWithCount, Stats, Participant } from "@/lib/types";
import { formatDateRange, localizeStudy } from "@/lib/content";
import { filterAndSortStudies } from "@/domain/rosterEngine";
import {
  countByEffectiveStatus,
  resolveStudyStatus,
  scheduleHint,
  type EffectiveStatus,
} from "@/domain/studySchedule";
import {
  getDashboardSnapshot,
  getStudySnapshot,
  saveLocalStudy,
  deleteLocalStudy,
  subscribeStorage,
} from "@/lib/storage";

const EMPTY_STATS: Stats = { studies: 0, participants: 0, countries: 0, withEmail: 0 };
const EMPTY_PARTICIPANTS: Participant[] = [];

type SortKey = "newest" | "date" | "title" | "participants";
type StatusTab = "all" | EffectiveStatus;
const STATUS_TABS: StatusTab[] = ["all", "active", "upcoming", "closed", "draft"];

export function StudiesDashboard({
  initialStudies,
  initialStats,
}: {
  initialStudies?: StudyWithCount[] | null;
  initialStats?: Stats | null;
}) {
  const { t, lang } = useLang();
  const toast = useToast();
  const router = useRouter();
  const mounted = useMounted();
  const today = useToday();

  const serverSnapshot = useMemo(
    () => ({
      studies: initialStudies ?? [],
      stats: initialStats ?? EMPTY_STATS,
    }),
    [initialStudies, initialStats],
  );

  const getClientSnapshot = useCallback(() => {
    const local = getDashboardSnapshot();
    if (local.studies.length > 0) return local;
    return serverSnapshot.studies.length > 0 ? serverSnapshot : local;
  }, [serverSnapshot]);

  const snapshot = useSyncExternalStore(
    subscribeStorage,
    getClientSnapshot,
    () => serverSnapshot,
  );
  const studies = snapshot.studies;
  const stats = snapshot.stats;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudyWithCount | null>(null);
  const [deleting, setDeleting] = useState<StudyWithCount | null>(null);
  const [exporting, setExporting] = useState<StudyWithCount | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return filterAndSortStudies(studies, {
      search,
      status: statusFilter,
      sort: sortKey,
      lang,
      today,
    });
  }, [studies, search, statusFilter, sortKey, lang, today]);

  const statusCounts = useMemo(() => countByEffectiveStatus(studies, today), [studies, today]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s: StudyWithCount) => {
    setEditing(s);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const modalInitial = useMemo(() => (editing ? studyToForm(editing) : null), [editing]);

  const handleSubmit = (data: StudyPayload) => {
    setSaving(true);
    try {
      const isEdit = Boolean(editing);
      const saved = saveLocalStudy({
        id: editing?.id,
        title: data.title,
        year: data.year,
        endDate: data.endDate,
        description: data.description,
        status: data.status,
        titleEn: data.titleEn,
        descriptionEn: data.descriptionEn,
      });
      setModalOpen(false);
      if (isEdit) {
        toast.success(t("studyUpdated"));
      } else {
        toast.success(t("studyCreated"), {
          label: t("openStudy"),
          onClick: () => router.push(`/studies/${saved.id}`),
        });
      }
    } catch (err) {
      console.error("Save failed:", err);
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const target = deleting;
    if (!target) return;
    setDeleting(null);
    deleteLocalStudy(target.id);
    toast.success(
      lang === "en" ? `Study deleted: ${target.title}` : `تم حذف الدراسة: ${target.title}`,
    );
  };

  const openExport = (s: StudyWithCount) => setExporting(s);

  const exportParticipants = useMemo(
    () => (exporting ? getStudySnapshot(exporting.id).participants : EMPTY_PARTICIPANTS),
    [exporting],
  );

  const unknown = mounted ? null : "—";

  const statCards = [
    {
      label: t("totalStudies"),
      value: unknown ?? stats.studies,
      icon: <IconLayers size={20} />,
      tint: "#eff6ff",
      color: "#0b2545",
    },
    {
      label: t("totalParticipants"),
      value: unknown ?? stats.participants,
      icon: <IconUsers size={20} />,
      tint: "#ecfdf5",
      color: "#059669",
    },
    {
      label: t("countries"),
      value: unknown ?? stats.countries,
      icon: <IconGlobe size={20} />,
      tint: "#fdf4ff",
      color: "#a21caf",
    },
    {
      label: t("withEmail"),
      value: unknown ?? stats.withEmail,
      icon: <IconMail size={20} />,
      tint: "#fff7ed",
      color: "#ea580c",
    },
  ];

  return (
    <div className="animate-fade-up page-stack">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)] sm:text-2xl">
            {t("studies")}
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {mounted
              ? `${studies.length} ${t("totalStudies").toLowerCase()} • ${stats.participants} ${t("participants")}`
              : t("appTagline")}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={openCreate}
          data-testid="new-study-button"
        >
          <IconPlus size={18} />
          <span>{t("newStudy")}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="card flex items-center gap-3 p-3.5 sm:p-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11"
              style={{ background: c.tint, color: c.color }}
            >
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="num text-lg font-extrabold leading-none sm:text-2xl">{c.value}</p>
              <p className="mt-1.5 truncate text-[11px] font-medium text-[var(--text-secondary)] sm:text-xs">
                {c.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap items-center gap-0.5 rounded-xl border border-[var(--border)] bg-white p-1"
          role="tablist"
          aria-label={t("filterStatus")}
        >
          {STATUS_TABS.map((id) => {
            const selected = statusFilter === id;
            const count = statusCounts[id];
            return (
              <button
                key={id}
                type="button"
                role="tab"
                onClick={() => setStatusFilter(id)}
                aria-selected={selected}
                data-testid={`status-tab-${id}`}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selected
                    ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                }`}
              >
                <span>{t(id)}</span>
                {mounted && (
                  <span
                    className={`num rounded-full px-1.5 py-px text-[10px] ${
                      selected ? "bg-white/80 text-[var(--accent-strong)]" : "bg-[var(--bg)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="input !py-2 !text-xs sm:w-44"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            aria-label={t("sortBy")}
          >
            <option value="newest">{t("sortNewest")}</option>
            <option value="date">{t("sortDate")}</option>
            <option value="title">{t("sortName")}</option>
            <option value="participants">{t("totalParticipants")}</option>
          </select>

          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-[var(--text-tertiary)]">
              <IconSearch size={16} />
            </span>
            <input
              className="input !py-2 !text-xs !ps-11 !pe-9 sm:!text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchStudies")}
              aria-label={t("searchStudies")}
              data-testid="study-search"
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
        </div>
      </div>

      {!mounted && studies.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="mb-4 h-5 w-20 rounded-full bg-[var(--bg)]" />
              <div className="mb-2 h-4 w-full rounded-full bg-[var(--bg)]" />
              <div className="mb-5 h-4 w-2/3 rounded-full bg-[var(--bg)]" />
              <div className="h-8 w-full rounded-full bg-[var(--bg)]" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg)] text-[var(--text-tertiary)]">
            <IconLayers size={26} />
          </div>
          {search || statusFilter !== "all" ? (
            <>
              <p className="text-base font-bold text-[var(--text)]">{t("noResultsFound")}</p>
              <button
                type="button"
                className="btn-ghost mt-4 text-xs font-bold"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                {t("clearFilters")}
              </button>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-[var(--text)]">{t("noStudies")}</p>
              <button type="button" className="btn-primary mt-5" onClick={openCreate}>
                <IconPlus size={16} />
                <span>{t("newStudy")}</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((s, i) => (
            <StudyCard
              key={s.id}
              study={s}
              index={i}
              lang={lang}
              today={today}
              onExport={() => openExport(s)}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleting(s)}
              t={t}
            />
          ))}
        </div>
      )}

      <StudyModal
        open={modalOpen}
        initial={modalInitial}
        onClose={closeModal}
        onSubmit={handleSubmit}
        saving={saving}
      />

      <ExportModal
        open={!!exporting}
        study={exporting}
        participants={exportParticipants}
        totalCount={exporting?.participantCount}
        onClose={() => setExporting(null)}
      />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
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
                {deleting ? localizeStudy(deleting, lang).title : ""}
                {deleting?.year && (
                  <span className="num block font-semibold text-slate-500">
                    {formatDateRange(deleting.year, deleting.endDate, lang)}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn-ghost text-xs" onClick={() => setDeleting(null)}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn-danger text-xs font-bold"
              onClick={handleDelete}
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

function StudyCard({
  study,
  index,
  lang,
  today,
  onExport,
  onEdit,
  onDelete,
  t,
}: {
  study: StudyWithCount;
  index: number;
  lang: "ar" | "en";
  today: string;
  onExport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  const localized = localizeStudy(study, lang);
  const effective = resolveStudyStatus(study, today);
  const hint = scheduleHint(study, today, lang);

  return (
    <article
      className="card group relative flex flex-col justify-between p-4 transition hover:shadow-[var(--shadow-md)] sm:p-4"
      style={{ animationDelay: `${index * 35}ms` }}
      data-testid={`study-card-${study.id}`}
    >
      <Link
        href={`/studies/${study.id}`}
        className="absolute inset-0 z-0 rounded-[var(--radius)]"
        aria-label={localized.title}
        data-testid="study-card-link"
      />

      <div className="relative z-10 pointer-events-none">
        <div className="mb-2.5 flex items-start justify-between gap-2">
          <span
            className="num inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#eef2f7] px-2.5 py-1 text-[11px] font-bold text-[var(--navy)]"
            data-testid="study-card-period"
          >
            <IconCalendar size={12} className="shrink-0" />
            <span className="truncate">{formatDateRange(study.year, study.endDate, lang)}</span>
          </span>
          <StatusBadge status={effective} label={t(effective)} />
        </div>
        {hint && (
          <p className="num -mt-1.5 mb-2.5 text-[11px] font-semibold text-[var(--text-tertiary)]" data-testid="study-card-hint">
            {hint}
          </p>
        )}

        <h3
          className="mb-1.5 line-clamp-2 text-[15px] font-extrabold leading-snug text-[var(--navy)] sm:text-base"
          data-testid="study-card-title"
        >
          {localized.title}
        </h3>
        {localized.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]" data-testid="study-card-description">
            {localized.description}
          </p>
        )}
      </div>

      <div className="pointer-events-none relative z-10 mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
          <IconUsers size={15} className="shrink-0" />
          <span className="num">{study.participantCount}</span>
          <span className="truncate">{t("participants")}</span>
        </span>

        <div className="pointer-events-auto relative z-20 flex shrink-0 gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExport();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
            title={t("exportStudyHtml")}
            aria-label={t("exportStudyHtml")}
            data-testid={`export-study-${study.id}`}
          >
            <IconDownload size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label={t("editStudy")}
            data-testid={`edit-study-${study.id}`}
          >
            <IconEdit size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-red-50 hover:text-red-600"
            aria-label={t("deleteStudy")}
            data-testid={`delete-study-${study.id}`}
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
