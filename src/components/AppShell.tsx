"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangProvider, useLang } from "./lang";
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
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function Sidebar() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();

  const isHome = pathname === "/";

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-l border-[var(--border)] bg-white/80 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 px-6 pt-8 pb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20">
          <AcademicLogo size={22} />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-bold text-[var(--text)]">{t("appName")}</p>
          <p className="text-[11px] font-semibold text-[var(--text-tertiary)]">AADC Cairo</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-4 pt-2">
        <Link
          href="/"
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            isHome
              ? "bg-[var(--accent-tint)] text-[var(--accent-strong)] shadow-2xs"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
          }`}
        >
          <IconLayers size={18} />
          <span>{t("allStudies")}</span>
        </Link>
      </nav>

      <div className="border-t border-[var(--border)] px-4 py-4">
        <div className="mb-2.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {t("language")}
        </div>
        <div className="flex rounded-full bg-[var(--bg)] p-1">
          <button
            onClick={() => setLang("ar")}
            className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
              lang === "ar"
                ? "bg-white text-[var(--accent-strong)] shadow-xs"
                : "text-[var(--text-tertiary)] hover:text-[var(--text)]"
            }`}
          >
            العربية
          </button>
          <button
            onClick={() => setLang("en")}
            className={`flex-1 rounded-full py-1.5 text-xs font-bold transition ${
              lang === "en"
                ? "bg-white text-[var(--accent-strong)] shadow-xs"
                : "text-[var(--text-tertiary)] hover:text-[var(--text)]"
            }`}
          >
            English
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileBar() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-white/90 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-sm">
          <AcademicLogo size={18} />
        </div>
        <span className="text-sm font-bold text-[var(--text)]">{t("appName")}</span>
      </Link>

      <div className="flex items-center gap-2">
        {!isHome && (
          <Link
            href="/"
            className="rounded-full bg-[var(--bg)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text)]"
          >
            الدراسات
          </Link>
        )}
        <div className="flex rounded-full bg-[var(--bg)] p-0.5">
          <button
            onClick={() => setLang("ar")}
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              lang === "ar" ? "bg-white text-[var(--accent-strong)] shadow-xs" : "text-[var(--text-tertiary)]"
            }`}
          >
            ع
          </button>
          <button
            onClick={() => setLang("en")}
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              lang === "en" ? "bg-white text-[var(--accent-strong)] shadow-xs" : "text-[var(--text-tertiary)]"
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LangProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileBar />
          <main className="flex-1 px-3 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </LangProvider>
  );
}
