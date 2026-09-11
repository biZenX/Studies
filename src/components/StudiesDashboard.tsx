"use client";

import { useMemo, useState } from "react";
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
  StatusBadge,
  Spinner,
} from "./ui";
import type { StudyWithCount, Stats } from "@/lib/types";

export function StudiesDashboard({
  initialStudies,
  initialStats,
}: {
  initialStudies: StudyWithCount[];
  initialStats: Stats;
}) {
  const { t } = useLang();
  const [studies, setStudies] = useState(initialStudies);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudyWithCount | null>(null);
  const [deleting, setDeleting] = useState<StudyWithCount | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const res = await fetch("/api/studies");
    const data = await res.json();
    setStudies(data.studies);
    setStats(data.stats);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return studies;
    return studies.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.year.toLowerCase().includes(q),
    );
  }, [studies, search]);

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
      if (editing) {
        await fetch(`/api/studies/${editing.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/studies", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      setModalOpen(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await fetch(`/api/studies/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: t("totalStudies"), value: stats.studies, icon: <IconLayers size={20} />, tint: "#ecfdf5", color: "#059669" },
    { label: t("totalParticipants"), value: stats.participants, icon: <IconUsers size={20} />, tint: "#eff6ff", color: "#2563eb" },
    { label: t("countries"), value: stats.countries, icon: <IconGlobe size={20} />, tint: "#fdf4ff", color: "#a21caf" },
    { label: t("withEmail"), value: stats.withEmail, icon: <IconMail size={20} />, tint: "#fff7ed", color: "#ea580c" },
  ];

  return (
    <div className="animate-fade-up">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("welcome")} 👋
          </h1>
          <p className="mt-1.5 text-[var(--text-secondary)]">{t("welcomeSub")}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <IconPlus size={18} />
          {t("newStudy")}
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="card flex items-center gap-4 p-5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: c.tint, color: c.color }}
            >
              {c.icon}
            </div>
            <div>
              <p className="num text-2xl font-bold leading-none">{c.value}</p>
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t("allStudies")}</h2>
        <div className="relative w-64 max-w-full">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--text-tertiary)]">
            <IconSearch size={16} />
          </span>
          <input
            className="input ps-9 py-2.5 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchStudies")}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bg)] text-[var(--text-tertiary)]">
            <IconLayers size={28} />
          </div>
          <p className="text-lg font-bold">{t("noStudies")}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("noStudiesSub")}</p>
          <button className="btn-primary mt-5 flex items-center gap-2" onClick={openCreate}>
            <IconPlus size={18} />
            {t("newStudy")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => (
            <StudyCard
              key={s.id}
              study={s}
              index={i}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleting(s)}
              t={t}
            />
          ))}
        </div>
      )}

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

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={t("deleteStudy")}>
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IconTrash size={18} />
            </div>
            <div>
              <p className="font-bold text-[var(--text)]">{t("deleteConfirm")}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {t("deleteConfirmSub")}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-tertiary)]">
                {deleting?.title}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-ghost" onClick={() => setDeleting(null)}>
              {t("cancel")}
            </button>
            <button className="btn-danger" onClick={handleDelete} disabled={saving}>
              {saving ? <Spinner size={16} /> : t("delete")}
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
  onEdit,
  onDelete,
  t,
}: {
  study: StudyWithCount;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  t: (k: string) => string;
}) {
  return (
    <Link
      href={`/studies/${study.id}`}
      className="card group block p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="num inline-flex items-center rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
          {study.year}
        </span>
        <StatusBadge status={study.status} label={t(study.status)} />
      </div>

      <h3 className="mb-2 line-clamp-2 text-[15px] font-bold leading-snug group-hover:text-[var(--accent-strong)]">
        {study.title}
      </h3>
      {study.description && (
        <p className="mb-4 line-clamp-2 text-sm text-[var(--text-secondary)]">
          {study.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-secondary)]">
          <IconUsers size={15} />
          <span className="num">{study.participantCount}</span>
          {t("participants")}
        </span>
        <div className="flex gap-1">
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
