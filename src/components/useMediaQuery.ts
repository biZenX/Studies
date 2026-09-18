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
