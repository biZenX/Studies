"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { translate, type Lang } from "@/lib/i18n";

type LangContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

const LANG_KEY = "studies_app_lang";

/* ------------------------------------------------------------------ *
 * The language lives in a tiny external store so every provider (and
 * every tab) stays in sync without setState-inside-effect cascades.
 * ------------------------------------------------------------------ */

let cachedLang: Lang | null = null;
const langListeners = new Set<() => void>();

function readSavedLang(): Lang {
  if (typeof window === "undefined") return "ar";
  try {
    const saved = localStorage.getItem(LANG_KEY) ?? localStorage.getItem("lang");
    if (saved === "ar" || saved === "en") return saved;
    // Arabic-first product: never flip the whole UI based on the browser
    // locale, the user picks English explicitly with the toggle.
  } catch {
    /* private mode / blocked storage */
  }
  return "ar";
}

function getLangSnapshot(): Lang {
  if (cachedLang === null) cachedLang = readSavedLang();
  return cachedLang;
}

function subscribeLang(onChange: () => void) {
  langListeners.add(onChange);

  const onStorage = (e: StorageEvent) => {
    if (e.key === LANG_KEY || e.key === "lang") {
      cachedLang = null;
      onChange();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);

  return () => {
    langListeners.delete(onChange);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function writeLang(next: Lang) {
  if (cachedLang === next) return;
  cachedLang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* ignore */
  }
  langListeners.forEach((fn) => fn());
}

function applyLang(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(
    subscribeLang,
    getLangSnapshot,
    (): Lang => "ar",
  );

  // Mirroring the language onto <html> is a DOM side effect — no state involved.
  useEffect(() => {
    applyLang(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => writeLang(next), []);
  const t = useCallback((key: string) => translate(key, lang), [lang]);

  const value = useMemo<LangContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
