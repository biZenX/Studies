"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  IconUpload,
  IconDownload,
  IconCheckCircle,
} from "./ui";
import { downloadLecturerReport } from "@/lib/exporter";
import { parseFile } from "@/lib/parsers";
import type { StudyWithCount, Participant } from "@/lib/types";
import {
  getLocalStudyDetail,
  saveLocalStudy,
  deleteLocalStudy,
  saveLocalParticipant,
  deleteLocalParticipant,
  bulkAddLocalParticipants,
  subscribeStorage,
} from "@/lib/storage";

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
  const { t } = useLang();
  const router = useRouter();

  const activeId = propStudyId || initialStudy?.id || 1;

  // Local-first state initialization
  const [study, setStudy] = useState<StudyWithCount | null>(() => {
    if (typeof window !== "undefined") {
      const local = getLocalStudyDetail(activeId);
      if (local.study) return local.study;
    }
    return initialStudy || null;
  });

  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (typeof window !== "undefined") {
      const local = getLocalStudyDetail(activeId);
      if (local.study) return local.participants;
    }
    return initialParticipants || [];
  });

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modals
  const [studyModal, setStudyModal] = useState(false);
  const [participantModal, setParticipantModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<Participant | null>(null);
  const [deleteStudyOpen, setDeleteStudyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>("");

  const reloadData = () => {
    const local = getLocalStudyDetail(activeId);
    if (local.study) {
      setStudy(local.study);
      setParticipants(local.participants);
    }
  };

  useEffect(() => {
    reloadData();
    return subscribeStorage(() => {
      reloadData();
    });
  }, [activeId]);

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
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
    );
  }, [participants, search]);

  const validEmails = useMemo(
    () => participants.filter((p) => p.email && p.email.includes("@")).length,
    [participants]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const openAdd = () => {
    setEditingParticipant(null);
    setParticipantModal(true);
  };

  const openEdit = (p: Participant) => {
    setEditingParticipant(p);
    setParticipantModal(true);
  };

  const handleStudySubmit = async (data: StudyFormData) => {
    if (!study) return;
    setSaving(true);
    try {
      const updated = saveLocalStudy({
        id: study.id,
        title: data.title,
        year: data.year,
        description: data.description,
        status: data.status,
      });
      setStudy({ ...updated, participantCount: participants.length });
      setStudyModal(false);
      showToast("تم تحديث بيانات الدراسة بنجاح");
    } finally {
      setSaving(false);
    }
  };

  const handleParticipantSubmit = async (data: ParticipantFormData) => {
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
      });
      setParticipantModal(false);
      reloadData();
      showToast(editingParticipant ? "تم تحديث بيانات المشارك" : "تمت إضافة المشارك بنجاح");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteParticipant = async () => {
    if (!deletingParticipant) return;
    setSaving(true);
    try {
      deleteLocalParticipant(deletingParticipant.id);
      setDeletingParticipant(null);
      reloadData();
      showToast("تم حذف المشارك");
    } finally {
      setSaving(false);
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

  const handleDirectImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !study) return;

    showToast(`جارٍ استيراد المشاركين من "${file.name}"...`);
    try {
      const data = await parseFile(file);
      if (!data || !data.rows || data.rows.length === 0) {
        showToast("لم يتم العثور على بيانات صالحة داخل الملف");
        return;
      }

      const { nameIdx, countryIdx, federationIdx, emailIdx, phoneIdx } = data.suggestedMapping;
      const toImport: Array<{
        name: string;
        country: string | null;
        federation: string | null;
        email: string | null;
        phone: string | null;
      }> = [];

      for (const row of data.rows) {
        const name = (row[nameIdx >= 0 ? nameIdx : 0] ?? "").trim();
        if (!name) continue;

        const country = countryIdx >= 0 && row[countryIdx] ? row[countryIdx].trim() : null;
        const federation = federationIdx >= 0 && row[federationIdx] ? row[federationIdx].trim() : country;
        const email = emailIdx >= 0 && row[emailIdx] ? row[emailIdx].trim() : null;
        const phone = phoneIdx >= 0 && row[phoneIdx] ? row[phoneIdx].trim() : null;

        toImport.push({ name, country, federation, email, phone });
      }

      if (toImport.length === 0) {
        showToast("لم يتم العثور على أسماء مشاركين صالحة داخل الملف");
        return;
      }

      bulkAddLocalParticipants(study.id, toImport);
      reloadData();
      showToast(`تم استيراد ${toImport.length} مشارك بنجاح`);
    } catch (err) {
      console.error("Direct import error:", err);
      showToast(err instanceof Error ? err.message : "حدث خطأ أثناء قراءة الملف");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDirectExport = () => {
    if (!study) {
      showToast("يرجى الانتظار حتى اكتمال تحميل بيانات الدراسة");
      return;
    }
    const success = downloadLecturerReport(study, participants);
    if (success) {
      showToast(`تم تصدير ملف الـ HTML بنجاح (${participants.length} مشارك)`);
    } else {
      showToast("تعذر تصدير الملف، يرجى المحاولة لاحقاً");
    }
  };

  if (!study) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-lg font-bold text-[var(--text)]">لم يتم العثور على الدراسة المطلوبة</p>
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
      tint: "#fdf4ff",
      color: "#a21caf",
    },
    {
      label: t("withEmail"),
      value: stats.withEmail,
      icon: <IconMail size={18} />,
      tint: "#fff7ed",
      color: "#ea580c",
    },
  ];

  return (
    <div className="animate-fade-up pb-10">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 start-5 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl">
          <IconCheckCircle size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[var(--text-secondary)] transition hover:text-[var(--text)]"
      >
        <IconBack size={16} />
        <span>{t("backToStudies")}</span>
      </Link>

      {/* Main Study Card */}
      <div className="card mb-6 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 max-w-4xl">
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <span className="num inline-flex items-center rounded-full bg-[var(--bg)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">
                {study.year}
              </span>
              <StatusBadge status={study.status} label={t(study.status)} />
            </div>
            <h1 className="text-xl font-bold leading-snug sm:text-2xl lg:text-3xl text-[var(--text)]">
              {study.title}
            </h1>
            {study.description && (
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                {study.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold"
              onClick={() => setStudyModal(true)}
            >
              <IconEdit size={14} />
              <span>{t("editStudy")}</span>
            </button>
            <button
              className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold !text-red-600 hover:!border-red-200 hover:!bg-red-50"
              onClick={() => setDeleteStudyOpen(true)}
            >
              <IconTrash size={14} />
              <span>{t("deleteStudy")}</span>
            </button>
            <button
              className="btn-primary flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold"
              onClick={() => setEmailModal(true)}
            >
              <IconMail size={14} />
              <span>{t("sendEmails")}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
          {statItems.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: s.tint, color: s.color }}
              >
                {s.icon}
              </div>
              <div>
                <p className="num text-base sm:text-lg font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participants Controls Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-[var(--text-tertiary)]">
            <IconSearch size={16} />
          </span>
          <input
            className="input !ps-11 !pe-9 py-2 text-xs sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchParticipants")}
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Table / Cards toggle for mobile/tablet */}
          <div className="flex rounded-xl bg-white p-0.5 border border-[var(--border)] sm:hidden">
            <button
              onClick={() => setViewMode("cards")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                viewMode === "cards" ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]" : "text-[var(--text-secondary)]"
              }`}
            >
              بطاقات
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                viewMode === "table" ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]" : "text-[var(--text-secondary)]"
              }`}
            >
              جدول
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.docx,.doc,.csv,.tsv,.txt,.csx"
            className="hidden"
            onChange={handleDirectImport}
          />

          <button
            className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold"
            onClick={() => fileInputRef.current?.click()}
            title="استيراد كشف المشاركين فوراً من ملفات Excel أو Word أو CSV أو نص"
          >
            <IconUpload size={14} />
            <span>{t("importParticipants")}</span>
          </button>

          <button
            className="btn-ghost flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold text-emerald-800 border-emerald-300/80 bg-emerald-50/50 hover:bg-emerald-50"
            onClick={handleDirectExport}
            title="تصدير وتحميل جدول المشاركين كملف HTML مستقل ومباشر"
          >
            <IconDownload size={14} />
            <span>{t("exportStudyHtml")}</span>
          </button>

          <button
            className="btn-primary flex items-center gap-1.5 !px-3.5 !py-2 text-xs font-bold"
            onClick={openAdd}
          >
            <IconPlus size={14} />
            <span>{t("addParticipant")}</span>
          </button>
        </div>
      </div>

      {/* Participants Content: Table or Cards */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg)] text-[var(--text-tertiary)]">
              <IconUsers size={26} />
            </div>
            {search ? (
              <>
                <p className="text-base font-bold text-[var(--text)]">{t("noResultsFound")}</p>
                <button
                  className="btn-ghost mt-4 text-xs font-bold"
                  onClick={() => setSearch("")}
                >
                  {t("clearSearch")}
                </button>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-[var(--text)]">{t("noParticipants")}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    className="btn-ghost flex items-center gap-2 text-xs font-bold"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload size={15} />
                    <span>{t("importParticipants")}</span>
                  </button>
                  <button
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
        ) : (
          <>
            {/* Mobile Cards View */}
            <div
              className={`p-3 space-y-2.5 sm:hidden ${
                viewMode === "cards" ? "block" : "hidden"
              }`}
            >
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-[var(--border)] bg-white p-3.5 transition shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg)] text-[11px] font-bold text-[var(--text-secondary)]">
                        {i + 1}
                      </span>
                      <h4 className="text-sm font-bold text-[var(--text)]">{p.name}</h4>
                    </div>
                    {p.country && <CountryBadge country={p.country} />}
                  </div>

                  {p.federation && (
                    <p className="mt-1.5 ps-8 text-xs text-[var(--text-secondary)]">
                      الاتحاد: <span className="font-semibold text-[var(--text)]">{p.federation}</span>
                    </p>
                  )}

                  {(p.email || p.phone) && (
                    <div className="mt-2.5 ps-8 flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
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
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg)]"
                    >
                      <IconEdit size={13} />
                      تعديل
                    </button>
                    <button
                      onClick={() => setDeletingParticipant(p)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <IconTrash size={13} />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop and Tablet Table View */}
            <div
              className={`overflow-x-auto ${
                viewMode === "cards" ? "hidden sm:block" : "block"
              }`}
            >
              <table className="w-full min-w-[700px] border-collapse text-right">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg)]/60 text-xs text-[var(--text-secondary)]">
                    <th className="px-5 py-3.5 text-start font-bold">#</th>
                    <th className="px-5 py-3.5 text-start font-bold">{t("name")}</th>
                    <th className="px-5 py-3.5 text-start font-bold">{t("federation")}</th>
                    <th className="px-5 py-3.5 text-start font-bold">{t("country")}</th>
                    <th className="px-5 py-3.5 text-start font-bold">
                      {t("email")} / {t("phone")}
                    </th>
                    <th className="px-5 py-3.5 text-start font-bold">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--border)] transition last:border-0 hover:bg-[var(--bg)]/50"
                    >
                      <td className="num px-5 py-3 text-xs font-semibold text-[var(--text-tertiary)]">
                        {i + 1}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-[var(--text)]">{p.name}</td>
                      <td className="px-5 py-3 text-xs text-[var(--text-secondary)] font-medium">
                        {p.federation || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {p.country ? <CountryBadge country={p.country} /> : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                          {p.email ? (
                            <span dir="ltr" className="num flex items-center justify-end gap-1.5">
                              {p.email}
                              <IconMail size={12} className="text-[var(--text-tertiary)]" />
                            </span>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">—</span>
                          )}
                          {p.phone && (
                            <span dir="ltr" className="num flex items-center justify-end gap-1.5">
                              {p.phone}
                              <IconPhone size={12} className="text-[var(--text-tertiary)]" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
                            aria-label="Edit"
                          >
                            <IconEdit size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingParticipant(p)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete"
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
          </>
        )}
      </div>

      {/* Edit Study Modal */}
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

      {/* Add / Edit Participant Modal */}
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

      {/* Email Announcement Modal */}
      <EmailModal
        open={emailModal}
        studyId={study.id}
        studyTitle={study.title}
        year={study.year}
        recipientCount={validEmails}
        brevoConfigured={brevoConfigured || false}
        onClose={() => setEmailModal(false)}
      />

      {/* Delete Participant Modal */}
      <Modal open={!!deletingParticipant} onClose={() => setDeletingParticipant(null)} title={t("delete")}>
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
                {deletingParticipant?.name}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-ghost text-xs" onClick={() => setDeletingParticipant(null)}>
              {t("cancel")}
            </button>
            <button className="btn-danger text-xs font-bold" onClick={handleDeleteParticipant} disabled={saving}>
              {saving ? <Spinner size={14} /> : t("delete")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Study Modal */}
      <Modal open={deleteStudyOpen} onClose={() => setDeleteStudyOpen(false)} title={t("deleteStudy")}>
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
                {study.title} ({study.year})
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-ghost text-xs" onClick={() => setDeleteStudyOpen(false)}>
              {t("cancel")}
            </button>
            <button className="btn-danger text-xs font-bold" onClick={handleDeleteStudy} disabled={saving}>
              {saving ? <Spinner size={14} /> : t("delete")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
