"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Without it a single runtime error used to leave a
 * blank page — one of the "it works on one laptop only" reports.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      </div>

      <h1 className="text-lg font-extrabold text-[var(--text)]">حدث خطأ غير متوقع</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        تعذر عرض هذا الجزء من الصفحة. بياناتك محفوظة محلياً ولم تُفقد — جرّب إعادة التحميل.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn-primary text-sm font-bold" onClick={reset}>
          إعادة المحاولة
        </button>
        <Link href="/" className="btn-ghost text-sm font-bold">
          العودة للدراسات
        </Link>
        <Link href="/?sw=off" className="btn-ghost text-sm font-bold" title="إعادة ضبط تخزين المتصفح">
          إصلاح التخزين المؤقت
        </Link>
      </div>

      {error?.digest && (
        <p className="num mt-5 text-[11px] text-[var(--text-tertiary)]" dir="ltr">
          ref: {error.digest}
        </p>
      )}
    </div>
  );
}
