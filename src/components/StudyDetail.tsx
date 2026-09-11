"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "./lang";
import { StudyModal, type StudyFormData } from "./StudyModal";
import { ParticipantModal, type ParticipantFormData } from "./ParticipantModal";
import { EmailModal } from "./EmailModal";
import {
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
} from "./ui";
import type { StudyWithCount, Participant } from "@/lib/types";

export function StudyDetail({
  study: initialStudy,
  participants: initialParticipants,
  brevoConfigured,
}: {
  study: StudyWithCount;
  participants: Participant[];
  brevoConfigured: boolean;
}) {
  const { t } = useLang();
  const router = useRouter();

  const [study, setStudy] = useState(initialStudy);
  const [participants, setParticipants] = useState(initialParticipants);
  const [search, setSearch] = useState("");

  const [studyModal, setStudyModal] = useState(false);
  const [participantModal, setParticipantModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [deleteStudyOpen, setDeleteStudyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const countries = new Set<string>();
    let withEmail = 0;
    for (const p of participants) {
      if (p.country) countries.add(p.country);
      if (p.email) withEmail += 1;
    }
    return {
      participants: participants.length,
      countries: countries.size,
      withEmail,
    };
  }, [participants]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q) ||
        (p.federation ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q),
    );
  }, [participants, search]);

  const validEmails = useMemo(
    () => participants.filter((p) => p.email && p.email.includes("@")).length,
    [participants],
  );

  const openAdd = () => {
    setEditingParticipant(null);
    setParticipantModal(true);
  };

  const openEdit = (p: Participant) => {
    setEditingParticipant(p);
    setParticipantModal(true);
  };

  const handleStudySubmit = async (data: StudyFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/studies/${study.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      setStudy(updated);
      setStudyModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleParticipantSubmit = async (data: ParticipantFormData) => {
    setSaving(true);
    try {
      if (editingParticipant) {
        const res = await fetch(`/api/participants/${editingParticipant.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
        const updated = await res.json();
        setParticipants((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)),
        );
      } else {
        const res = await fetch(`/api/studies/${study.id}/participants`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data),
        });
        const created = await res.json();
        setParticipants((prev) => [...prev, created]);
      }
      setParticipantModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParticipant = async () => {
    if (!deletingParticipant) return;
    setSaving(true);
    try {
      await fetch(`/api/participants/${deletingParticipant.id}`, {
        method: "DELETE",
      });
      setParticipants((prev) => prev.filter((p) => p.id !== deletingParticipant.id));
      setDeletingParticipant(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudy = async () => {
    setSaving(true);
    try {
      await fetch(`/api/studies/${study.id}`, { method: "DELETE" });
      router.push("/");
    } finally {
      setSaving(false);
    }
  };

  const statItems = [
    { label: t("totalParticipants"), value: stats.participants, icon: <IconUsers size={18} />, tint: "#ecfdf5", color: "#059669" },
    { label: t("countries"), value: stats.countries, icon: <IconGlobe size={18} />, tint: "#fdf4ff", color: "#a21caf" },
    { label: t("withEmail"), value: stats.withEmail, icon: <IconMail size={18} />, tint: "#fff7ed", color: "#ea580c" },
  ];

  return (
    <div className="animate-fade-up">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text)]"
      >
        <IconBack size={16} />
        {t("backToStudies")}
      </Link>

      <div className="card mb-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="num inline-flex items-center rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                {study.year}
              </span>
              <StatusBadge status={study.status} label={t(study.status)} />
            </div>
            <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{study.title}</h1>
            {study.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                {study.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost flex items-center gap-2 !py-2.5 text-sm" onClick={() => setStudyModal(true)}>
              <IconEdit size={16} />
              {t("editStudy")}
            </button>
            <button
              className="btn-ghost flex items-center gap-2 !py-2.5 text-sm !text-red-600 hover:!border-red-200 hover:!bg-red-50"
              onClick={() => setDeleteStudyOpen(true)}
            >
              <IconTrash size={16} />
              {t("deleteStudy")}
            </button>
            <button className="btn-primary flex items-center gap-2 !py-2.5 text-sm" onClick={() => setEmailModal(true)}>
              <IconMail size={16} />
              {t("sendEmails")}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
          {statItems.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: s.tint, color: s.color }}>
                {s.icon}
              </div>
              <div>
                <p className="num text-lg font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-[var(--text-tertiary)]">
            <IconSearch size={16} />
          </span>
          <input
            className="input ps-9 py-2.5 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchParticipants")}
          />
        </div>
        <button className="btn-primary flex items-center gap-2 !py-2.5 text-sm" onClick={openAdd}>
          <IconPlus size={16} />
          {t("addParticipant")}
        </button>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bg)] text-[var(--text-tertiary)]">
              <IconUsers size={28} />
            </div>
            <p className="text-lg font-bold">{t("noParticipants")}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("noParticipantsSub")}</p>
            <button className="btn-primary mt-5 flex items-center gap-2" onClick={openAdd}>
              <IconPlus size={18} />
              {t("addParticipant")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-right">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]/60 text-sm text-[var(--text-secondary)]">
                  <th className="px-5 py-3.5 text-start font-semibold">#</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t("name")}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t("federation")}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t("country")}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t("email")} / {t("phone")}</th>
                  <th className="px-5 py-3.5 text-start font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--border)] transition last:border-0 hover:bg-[var(--bg)]/60"
                  >
                    <td className="num px-5 py-3.5 text-sm font-semibold text-[var(--text-tertiary)]">
                      {i + 1}
                    </td>
                    <td className="px-5 py-3.5 font-semibold">{p.name}</td>
                    <td className="px-5 py-3.5 text-sm text-[var(--text-secondary)]">
                      {p.federation || "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.country ? <CountryBadge country={p.country} /> : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1 text-sm text-[var(--text-secondary)]">
                        {p.email ? (
                          <span dir="ltr" className="num flex items-center justify-end gap-1.5">
                            {p.email}
                            <IconMail size={13} className="text-[var(--text-tertiary)]" />
                          </span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                        {p.phone && (
                          <span dir="ltr" className="num flex items-center justify-end gap-1.5">
                            {p.phone}
                            <IconPhone size={13} className="text-[var(--text-tertiary)]" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
                          aria-label="Edit"
                        >
                          <IconEdit size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingParticipant(p)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <IconTrash size={15} />
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

      <StudyModal
        open={studyModal}
        initial={{
          title: study.title,
          year: study.year,
          description: study.description ?? "",
          status: study.status,
        }}
        onClose={() => setStudyModal(false)}
        onSubmit={handleStudySubmit}
        saving={saving}
      />

      <ParticipantModal
        open={participantModal}
        initial={
          editingParticipant
            ? {
                name: editingParticipant.name,
                federation: editingParticipant.federation ?? "",
                country: editingParticipant.country ?? "",
                email: editingParticipant.email ?? "",
                phone: editingParticipant.phone ?? "",
              }
            : null
        }
        onClose={() => setParticipantModal(false)}
        onSubmit={handleParticipantSubmit}
        saving={saving}
      />

      <EmailModal
        open={emailModal}
        studyId={study.id}
        studyTitle={study.title}
        year={study.year}
        recipientCount={validEmails}
        brevoConfigured={brevoConfigured}
        onClose={() => setEmailModal(false)}
      />

      <Modal open={!!deletingParticipant} onClose={() => setDeletingParticipant(null)} title={t("delete")}>
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IconTrash size={18} />
            </div>
            <div>
              <p className="font-bold">{t("deleteConfirm")}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("deleteConfirmSub")}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-tertiary)]">
                {deletingParticipant?.name}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-ghost" onClick={() => setDeletingParticipant(null)}>
              {t("cancel")}
            </button>
            <button className="btn-danger" onClick={handleDeleteParticipant} disabled={saving}>
              {saving ? <Spinner size={16} /> : t("delete")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteStudyOpen} onClose={() => setDeleteStudyOpen(false)} title={t("deleteStudy")}>
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IconTrash size={18} />
            </div>
            <div>
              <p className="font-bold">{t("deleteConfirm")}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{t("deleteConfirmSub")}</p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-tertiary)]">{study.title}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-ghost" onClick={() => setDeleteStudyOpen(false)}>
              {t("cancel")}
            </button>
            <button className="btn-danger" onClick={handleDeleteStudy} disabled={saving}>
              {saving ? <Spinner size={16} /> : t("delete")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
