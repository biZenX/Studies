"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangProvider, useLang } from "./lang";

function Sidebar() {
  const { t, lang, setLang } = useLang();
  const pathname = usePathname();

  const isHome = pathname === "/";

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-l border-[var(--border)] bg-white/70 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-3 px-6 pt-8 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-bold text-[var(--text)]">{t("appName")}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">AADC Cairo</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4">
        <NavLink href="/" active={isHome} icon="grid">
          {t("overview")}
        </NavLink>
        <NavLink href="/" active={isHome} icon="layers">
          {t("studies")}
        </NavLink>
      </nav>

      <div className="border-t border-[var(--border)] px-4 py-4">
        <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {t("language")}
        </div>
        <div className="flex rounded-full bg-[var(--bg)] p-1">
          <button
            onClick={() => setLang("ar")}
            className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition ${
              lang === "ar"
                ? "bg-white text-[var(--accent-strong)] shadow-sm"
                : "text-[var(--text-tertiary)]"
            }`}
          >
            العربية
          </button>
          <button
            onClick={() => setLang("en")}
            className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition ${
              lang === "en"
                ? "bg-white text-[var(--accent-strong)] shadow-sm"
                : "text-[var(--text-tertiary)]"
            }`}
          >
            English
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: "grid" | "layers";
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        active
          ? "bg-[var(--accent-tint)] text-[var(--accent-strong)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
      }`}
    >
      {icon === "grid" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )}
      {children}
    </Link>
  );
}

function MobileBar() {
  const { t, lang, setLang } = useLang();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <span className="text-sm font-bold">{t("appName")}</span>
      </Link>
      <div className="flex rounded-full bg-[var(--bg)] p-0.5">
        <button
          onClick={() => setLang("ar")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            lang === "ar" ? "bg-white text-[var(--accent-strong)] shadow-sm" : "text-[var(--text-tertiary)]"
          }`}
        >
          ع
        </button>
        <button
          onClick={() => setLang("en")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            lang === "en" ? "bg-white text-[var(--accent-strong)] shadow-sm" : "text-[var(--text-tertiary)]"
          }`}
        >
          EN
        </button>
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
          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </LangProvider>
  );
}
