"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangProvider, useLang } from "./lang";
import { ToastProvider } from "./toast";
import { IconLayers } from "./ui";

function AcademicLogo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();

  const base = compact
    ? "px-2.5 py-1.5 min-h-[34px] text-xs"
    : "py-2 min-h-[40px] text-xs";

  return (
    <div
      className="flex items-center rounded-full bg-[var(--bg)] p-0.5"
      role="group"
      aria-label="Language / اللغة"
    >
      <button
        type="button"
        onClick={() => setLang("ar")}
        aria-pressed={lang === "ar"}
        className={`inline-flex flex-1 items-center justify-center rounded-full font-bold transition ${base} ${
          lang === "ar"
            ? "bg-white text-[var(--accent-strong)] shadow-sm"
            : "text-[var(--text-tertiary)] hover:text-[var(--text)]"
        }`}
      >
        {compact ? "ع" : "العربية"}
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`inline-flex flex-1 items-center justify-center rounded-full font-bold transition ${base} ${
          lang === "en"
            ? "bg-white text-[var(--accent-strong)] shadow-sm"
            : "text-[var(--text-tertiary)] hover:text-[var(--text)]"
        }`}
      >
        English
      </button>
    </div>
  );
}

function Sidebar() {
  const { t } = useLang();
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-e border-[var(--border)] bg-white lg:flex">
      <div className="flex items-center gap-3 px-5 pt-7 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/20">
          <AcademicLogo size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold leading-tight text-[var(--text)]">{t("appName")}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-[var(--text-tertiary)]">
            {t("appTagline")}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-1">
        <Link
          href="/"
          className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
            isHome
              ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
          }`}
        >
          <IconLayers size={17} />
          <span>{t("allStudies")}</span>
        </Link>
      </nav>

      <div className="border-t border-[var(--border)] px-3 py-4">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {t("language")}
        </div>
        <LangSwitch />
      </div>
    </aside>
  );
}

function MobileBar() {
  const { t } = useLang();
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-[var(--border)] bg-white/95 px-3 py-2.5 backdrop-blur-sm lg:hidden">
      <Link href="/" className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm">
          <AcademicLogo size={16} />
        </span>
        <span className="truncate text-sm font-bold text-[var(--text)]">{t("appName")}</span>
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        {!isHome && (
          <Link
            href="/"
            className="rounded-full bg-[var(--bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text)]"
          >
            {t("allStudies")}
          </Link>
        )}
        <LangSwitch compact />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <ToastProvider>
        <div className="flex min-h-dvh w-full flex-col lg:flex-row">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileBar />
            <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6 xl:px-9">
              <div className="mx-auto w-full max-w-[1400px]">{children}</div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </LangProvider>
  );
}
