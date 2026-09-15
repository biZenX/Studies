"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "./lang";
import { StudyModal, type StudyFormData } from "./StudyModal";
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
  StatusBadge,
  Spinner,
} from "./ui";
import type { StudyWithCount, Stats } from "@/lib/types";
import { downloadStudyReport } from "@/lib/exporter";
import {
  getLocalDashboardData,
  getLocalStudyDetail,
  saveLocalStudy,
  deleteLocalStudy,
  subscribeStorage,
} from "@/lib/storage";

export function StudiesDashboard({
  initialStudies,
  initialStats,
}: {
  initialStudies?: StudyWithCount[] | null;
  initialStats?: Stats | null;
}) {
  const { t } = useLang();

  // Local-first state initialization
  const [studies, setStudies] = useState<StudyWithCount[]>(() => {
    if (typeof window !== "undefined") {
      const local = getLocalDashboardData();
      if (local.studies.length > 0) return local.studies;
    }
    return initialStudies || [];
  });

  const [stats, setStats] = useState<Stats>(() => {
    if (typeof window !== "undefined") {
      const local = getLocalDashboardData();
      if (local.studies.length > 0) return local.stats;
    }
    return initialStats || { studies: 0, participants: 0, countries: 0, withEmail: 0 };
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudyWithCount | null>(null);
  const [deleting, setDeleting] = useState<StudyWithCount | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync with local storage
  const reloadData = () => {
    const data = getLocalDashboardData();
    setStudies(data.studies);
    setStats(data.stats);
  };

  useEffect(() => {
    reloadData();
    return subscribeStorage(() => {
      reloadData();
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studies.filter((s) => {
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.year.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [studies, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s: StudyWithCount) => {
    setEditing(s);
    setModalOpen(true);
  };

  const handleSubmit = async (data: StudyFormData) => {
    setSaving(true);
    try {
      saveLocalStudy({
        id: editing?.id,
        title: data.title,
        year: data.year,
        description: data.description,
        status: data.status,
      });
      setModalOpen(false);
      reloadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      deleteLocalStudy(deleting.id);
      setDeleting(null);
      reloadData();
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (s: StudyWithCount) => {
    const detail = getLocalStudyDetail(s.id);
    downloadStudyReport(s, detail.participants);
  };

  const statCards = [
    {
      label: t("totalStudies"),
      value: stats.studies,
      icon: <IconLayers size={20} />,
      tint: "#ecfdf5",
      color: "#059669",
    },
    {
      label: t("totalParticipants"),
      value: stats.participants,
      icon: <IconUsers size={20} />,
      tint: "#eff6ff",
      color: "#2563eb",
    },
    {
      label: t("countries"),
      value: stats.countries,
      icon: <IconGlobe size={20} />,
      tint: "#fdf4ff",
      color: "#a21caf",
    },
    {
      label: t("withEmail"),
      value: stats.withEmail,
      icon: <IconMail size={20} />,
      tint: "#fff7ed",
      color: "#ea580c",
    },
  ];

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-[var(--text)]">
            {t("welcome")}
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
            {t("welcomeSub")}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <IconPlus size={18} />
          <span>{t("newStudy")}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="card flex items-center gap-3.5 p-4 sm:p-5">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12"
              style={{ background: c.tint, color: c.color }}
            >
              {c.icon}
            </div>
            <div>
              <p className="num text-xl font-bold leading-none sm:text-2xl">{c.value}</p>
              <p className="mt-1.5 text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                {c.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white p-1 border border-[var(--border)] shadow-2xs">
          {[
            { id: "all", label: t("all") },
            { id: "active", label: t("active") },
            { id: "draft", label: t("draft") },
            { id: "closed", label: t("closed") },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-[var(--text-tertiary)]">
            <IconSearch size={16} />
          </span>
          <input
            className="input !ps-11 !pe-9 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchStudies")}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 end-3.5 flex items-center text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--text)]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Studies Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg)] text-[var(--text-tertiary)]">
            <IconLayers size={26} />
          </div>
          {search || statusFilter !== "all" ? (
            <>
              <p className="text-base font-bold text-[var(--text)]">{t("noResultsFound")}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {t("noResultsFoundSub")}
              </p>
              <button
                className="btn-ghost mt-4 text-xs font-bold"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                {t("clearSearch")}
              </button>
            </>
          ) : (
            <>
              <p className="text-base font-bold text-[var(--text)]">{t("noStudies")}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{t("noStudiesSub")}</p>
              <button className="btn-primary mt-5 flex items-center gap-2" onClick={openCreate}>
                <IconPlus size={16} />
                <span>{t("newStudy")}</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((s, i) => (
            <StudyCard
              key={s.id}
              study={s}
              index={i}
              onExport={() => handleExport(s)}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleting(s)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Study Modal */}
      <StudyModal
        open={modalOpen}
        initial={
          editing
            ? {
                title: editing.title,
                year: editing.year,
                description: editing.description ?? "",
                status: editing.status,
              }
            : null
        }
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        saving={saving}
      />

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={t("deleteStudy")}>
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IconTrash size={18} />
            </div>
            <div>
              <p className="font-bold text-[var(--text)]">{t("deleteConfirm")}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {t("deleteConfirmSub")}
              </p>
              <p className="mt-2 text-xs font-bold text-slate-700 bg-slate-100 p-2 rounded-lg">
                {deleting?.title} ({deleting?.year})
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-ghost text-xs" onClick={() => setDeleting(null)}>
              {t("cancel")}
            </button>
            <button className="btn-danger text-xs font-bold" onClick={handleDelete} disabled={saving}>
              {saving ? <Spinner size={14} /> : t("delete")}
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
  onExport,
  onEdit,
  onDelete,
  t,
}: {
  study: StudyWithCount;
  index: number;
  onExport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  return (
    <Link
      href={`/studies/${study.id}`}
      className="card group flex flex-col justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.12)]"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="num inline-flex items-center rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
            {study.year}
          </span>
          <StatusBadge status={study.status} label={t(study.status)} />
        </div>

        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug group-hover:text-[var(--accent-strong)] transition-colors">
          {study.title}
        </h3>
        {study.description && (
          <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {study.description}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
          <IconUsers size={15} />
          <span className="num">{study.participantCount}</span>
          <span>{t("participants")}</span>
        </span>
        <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
          <button
            onClick={(e) => {
              e.preventDefault();
              onExport();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
            title="تصدير كـ HTML"
            aria-label="تصدير كـ HTML"
          >
            <IconDownload size={15} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label="Edit"
          >
            <IconEdit size={15} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-red-50 hover:text-red-600"
            aria-label="Delete"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>
    </Link>
  );
}
