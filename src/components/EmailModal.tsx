"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Field, Spinner, IconMail, IconAlert, IconCheck } from "./ui";
import { useLang } from "./lang";
import { buildEmailHtml } from "@/lib/brevo";
import type { SendResult } from "@/lib/types";

export function EmailModal({
  open,
  studyId,
  studyTitle,
  year,
  recipientCount,
  brevoConfigured,
  onClose,
}: {
  open: boolean;
  studyId: number;
  studyTitle: string;
  year: string;
  recipientCount: number;
  brevoConfigured: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);

  if (open && !prevOpen) {
    setPrevOpen(true);
    setSubject(`${studyTitle} — ${year}`);
    setMessage(
      `نود إعلامكم بأن فعاليات الدراسة "${studyTitle}" (${year}) تقارب على الانتهاء. يرجى استكمال ما تبقى من إجراءات قبل الموعد النهائي المحدد.`,
    );
    setResult(null);
    setError("");
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const previewHtml = useMemo(
    () =>
      buildEmailHtml({ studyTitle, year, message }).replace(
        /\{\{\s*params\.name\s*\}\}/g,
        "المشارك الكريم",
      ),
    [studyTitle, year, message],
  );

  const send = async () => {
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/studies/${studyId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("sendToParticipants")} wide>
      <div className="space-y-5">
        {!brevoConfigured && (
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800">
            <IconAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">{t("brevoNotConfigured")}</p>
              <p className="text-xs text-amber-700">{t("brevoNotConfiguredSub")}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl bg-[var(--accent-tint)] px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            <IconMail size={16} />
            {t("recipients")}
          </span>
          <span className="num text-lg font-bold text-[var(--accent-strong)]">
            {recipientCount}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <Field label={t("subject")} required>
              <input
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("subjectPh")}
              />
            </Field>
            <Field label={t("message")} required>
              <textarea
                className="input min-h-[140px] resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePh")}
              />
            </Field>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-[var(--text-secondary)]">
              {t("emailPreview")}
            </span>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0f172a]">
              <iframe
                title="Email preview"
                className="h-[260px] w-full"
                srcDoc={previewHtml}
                sandbox=""
              />
            </div>
            <p className="mt-2 text-center text-[11px] text-[var(--text-tertiary)]">
              AADC Cairo — {t("emailPreview")}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            <IconAlert size={16} />
            {error}
          </div>
        )}

        {result && (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <IconCheck size={18} className="shrink-0" />
            <div className="text-sm">
              <p className="font-bold">
                {t("sentTo")} {result.sent} / {result.total} {t("recipients")}
              </p>
              {result.failed > 0 && (
                <p className="text-xs text-emerald-700">
                  {t("failed")}: {result.failed}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={send}
            disabled={sending || recipientCount === 0 || !brevoConfigured}
          >
            {sending ? <Spinner size={16} /> : t("send")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
