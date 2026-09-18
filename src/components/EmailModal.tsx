"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Field, Spinner, IconMail, IconAlert, IconCheck, IconCheckCircle } from "./ui";
import { useLang } from "./lang";
import { useToast } from "./toast";
import { buildEmailHtml } from "@/lib/brevo";
import { formatDate } from "@/lib/content";
import type { SendResult } from "@/lib/types";

type Recipient = { name: string; email: string | null };

type ServiceStatus = {
  brevo: boolean;
  database: boolean;
  senderName?: string;
  senderEmail?: string;
} | null;

const REQUIRED_VARS = [
  { key: "BREVO_API_KEY", hint: "مفتاح Brevo (Sendinblue) — إجباري للإرسال" },
  { key: "BREVO_SENDER_NAME", hint: "اسم المرسل الظاهر في الرسالة" },
  { key: "BREVO_SENDER_EMAIL", hint: "بريد المرسل (يجب أن يكون موثقاً في Brevo)" },
  { key: "DATABASE_URL", hint: "اختياري — للمزامنة الفعلية مع قاعدة البيانات" },
];

export function EmailModal({
  open,
  studyId,
  studyTitle,
  year,
  recipientCount,
  recipients,
  brevoConfigured,
  onClose,
}: {
  open: boolean;
  studyId: number;
  studyTitle: string;
  year: string;
  recipientCount: number;
  /** Local-first roster slice; used when the server has no database attached. */
  recipients?: Recipient[];
  brevoConfigured: boolean;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const toast = useToast();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<ServiceStatus>(null);
  const [checking, setChecking] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);

  const dateText = formatDate(year, lang);

  if (open && !prevOpen) {
    setPrevOpen(true);
    setSubject(`${studyTitle} — ${dateText}`);
    setMessage(
      `نود إعلامكم بأن فعاليات الدراسة "${studyTitle}" (${dateText}) تقارب على الانتهاء. يرجى استكمال ما تبقى من إجراءات قبل الموعد النهائي المحدد.`,
    );
    setResult(null);
    setError("");
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  /** Ask the server which services are actually configured. */
  const fetchStatus = async (): Promise<ServiceStatus> => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      return {
        brevo: Boolean(data?.brevo),
        database: Boolean(data?.database),
        senderName: data?.senderName,
        senderEmail: data?.senderEmail,
      };
    } catch {
      return { brevo: brevoConfigured, database: false };
    }
  };

  // Probed once per open. Every setState happens after an await, inside the
  // async callback, so no synchronous effect-driven render cascade.
  useEffect(() => {
    if (!open || status !== null) return;
    let cancelled = false;
    (async () => {
      const next = await fetchStatus();
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status]);

  const checkStatus = async () => {
    setChecking(true);
    setStatus(await fetchStatus());
    setChecking(false);
  };

  const effectiveCount = recipients?.length ?? recipientCount;
  const configured = status ? status.brevo : brevoConfigured;

  const previewHtml = useMemo(
    () =>
      buildEmailHtml({ studyTitle, year: dateText, message }).replace(
        /\{\{\s*params\.name\s*\}\}/g,
        "المشارك الكريم",
      ),
    [studyTitle, dateText, message],
  );

  const send = async () => {
    setSending(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/studies/${studyId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          // Local-first: the browser holds the roster, so pass the recipients
          // along instead of relying on a server-side database read.
          recipients: (recipients ?? [])
            .filter((r) => r.email && r.email.includes("@"))
            .map((r) => ({ name: r.name, email: r.email })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Failed to send");
        toast.error(data?.error || t("failed"));
      } else {
        setResult(data);
        toast.success(`${t("sentTo")} ${data.sent} / ${data.total}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("sendToParticipants")} wide testId="email-modal">
      <div className="space-y-5">
        {!configured && (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-3">
              <IconAlert size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-extrabold">{t("brevoNotConfigured")}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                  الإرسال يتطلب إضافة مفاتيح API في بيئة التشغيل (Cloudflare Workers → Settings →
                  Variables and Secrets، أو ملف <span className="num" dir="ltr">.env</span> محلياً).
                  لا يمكن للتطبيق قراءة هذه المفاتيح من المتصفح لأسباب أمنية.
                </p>
              </div>
            </div>

            <ul className="grid gap-1.5 sm:grid-cols-2">
              {REQUIRED_VARS.map((v) => (
                <li
                  key={v.key}
                  className="rounded-xl border border-amber-200/80 bg-white/70 px-3 py-2"
                >
                  <p className="num text-[11px] font-extrabold text-slate-800" dir="ltr">
                    {v.key}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">{v.hint}</p>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="btn-ghost flex items-center gap-2 !px-3.5 !py-1.5 text-[11px] font-bold"
            >
              {checking ? <Spinner size={13} /> : <IconCheckCircle size={13} />}
              إعادة فحص حالة الخدمة
            </button>
          </div>
        )}

        {status && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--bg)] px-3.5 py-2.5 text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: status.brevo ? "#10b981" : "#f59e0b" }}
              />
              Brevo API: {status.brevo ? "مفعّل" : "غير مفعّل"}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: status.database ? "#10b981" : "#94a3b8" }}
              />
              قاعدة البيانات: {status.database ? "متصلة" : "غير متصلة (وضع الحفظ المحلي)"}
            </span>
            {status.senderEmail && (
              <span className="num text-[var(--text-tertiary)]" dir="ltr">
                {status.senderName} &lt;{status.senderEmail}&gt;
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl bg-[var(--accent-tint)] px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
            <IconMail size={16} />
            {t("recipients")}
          </span>
          <span className="num text-lg font-bold text-[var(--accent-strong)]">
            {effectiveCount}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
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
                className="input min-h-[140px] resize-y"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("messagePh")}
              />
            </Field>
          </div>

          <div className="min-w-0">
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
            <p className="num mt-2 text-center text-[11px] text-[var(--text-tertiary)]">
              AADC Cairo — {t("emailPreview")}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            <IconAlert size={16} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        {result && (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
            <IconCheck size={18} className="shrink-0" />
            <div className="num text-sm">
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

        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={send}
            disabled={sending || effectiveCount === 0 || !configured || !subject || !message}
            data-testid="send-emails"
          >
            {sending ? <Spinner size={16} /> : t("send")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
