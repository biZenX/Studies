"use client";

import { useMemo, useRef } from "react";
import { Modal, IconDownload, IconPrinter } from "./ui";
import { generateLecturerHtmlReport } from "@/lib/exporter";
import type { Participant, Study } from "@/lib/types";

export function ExportModal({
  open,
  study,
  participants,
  onClose,
}: {
  open: boolean;
  study: Pick<Study, "title" | "year" | "description">;
  participants: Participant[];
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const htmlContent = useMemo(() => {
    return generateLecturerHtmlReport(study, participants);
  }, [study, participants]);

  const handleDownload = () => {
    const cleanTitle = study.title.replace(/[^\w\u0600-\u06FF\s-]/g, "").trim().replace(/\s+/g, "_");
    const fileName = `كشف_محاضرين_${cleanTitle}_${study.year}.html`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="تصدير كشف المشاركين للمحاضرين" wide>
      <div className="space-y-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200/70 p-3.5 text-xs text-emerald-900 leading-relaxed">
          <p className="font-bold mb-0.5">معلومات الكشف المستخرج:</p>
          <p>
            هذا الملف مستقل وموحد (HTML مع CSS مدمج) مخصص للسادة المحاضرين، يحتوي حصراً على البيانات
            الأساسية (الاسم والدولة والاتحاد) مع خانات الحضور والتقييم والتوقيع، وتم استبعاد البريد الإلكتروني
            ورقم الهاتف بالكامل.
          </p>
        </div>

        {/* Live Preview Iframe */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-900 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-400">
            <span>معاينة المستند (A4 Printable HTML)</span>
            <span>{participants.length} مشارك</span>
          </div>
          <iframe
            ref={iframeRef}
            title="Lecturer Report Preview"
            srcDoc={htmlContent}
            className="h-[380px] w-full bg-white sm:h-[460px]"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-xs text-[var(--text-secondary)]">
            الملف جاهز للتشغيل والطباعة على أي جهاز بدون إنترنت.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost flex items-center gap-1.5 !px-4 !py-2 text-xs font-bold"
              onClick={handlePrint}
            >
              <IconPrinter size={15} />
              طباعة فورية
            </button>
            <button
              type="button"
              className="btn-primary flex items-center gap-1.5 !px-5 !py-2 text-xs font-bold"
              onClick={handleDownload}
            >
              <IconDownload size={15} />
              تحميل ملف الكشف (HTML)
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
