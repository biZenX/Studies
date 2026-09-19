"use client";

import { useCallback, useSyncExternalStore } from "react";

const supportsMatchMedia = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

/**
 * SSR-safe media query hook built on `useSyncExternalStore`, so the server
 * snapshot is always `false` and the real value is adopted right after
 * hydration — no mismatch, no cascading effect renders.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!supportsMatchMedia()) return () => {};
      const mql = window.matchMedia(query);
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      }
      // Safari < 14
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (supportsMatchMedia() ? window.matchMedia(query).matches : false),
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

const noopSubscribe = () => () => {};

/** False during SSR/hydration, true afterwards. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* ------------------------------------------------------------------ *
 * Today's date (ISO, local time)
 *
 * Study statuses are derived from the date range, so every screen needs
 * "today". It is read through an external store so that:
 *   - the server snapshot is "" (statuses fall back to the stored value and
 *     the markup matches on hydration, whatever the server's timezone), and
 *   - the value refreshes by itself when midnight passes while a tab is
 *     open, flipping an "active" study to "completed" without a reload.
 * ------------------------------------------------------------------ */

function localIsoToday(): string {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60_000).toISOString().slice(0, 10);
}

const todayListeners = new Set<() => void>();
let todayTimer: ReturnType<typeof setInterval> | null = null;
let lastToday = "";

function subscribeToday(onChange: () => void) {
  todayListeners.add(onChange);
  if (typeof window !== "undefined" && !todayTimer) {
    lastToday = localIsoToday();
    todayTimer = setInterval(() => {
      const next = localIsoToday();
      if (next !== lastToday) {
        lastToday = next;
        todayListeners.forEach((fn) => fn());
      }
    }, 30_000);
  }
  return () => {
    todayListeners.delete(onChange);
    if (todayListeners.size === 0 && todayTimer) {
      clearInterval(todayTimer);
      todayTimer = null;
    }
  };
}

/** `YYYY-MM-DD` in the browser's local time; "" during SSR/hydration. */
export function useToday(): string {
  return useSyncExternalStore(subscribeToday, localIsoToday, () => "");
}
