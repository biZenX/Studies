"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and keeps it fresh.
 *
 * Escape hatches for devices stuck on an old build:
 *   /?sw=off    → unregisters every service worker and clears all caches
 *   /?sw=reset  → handled inside the worker (clears caches, then unregisters)
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const wipeAndUnregister = async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (err) {
        console.warn("Service worker cleanup failed:", err);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const mode = params.get("sw");

    if (mode === "off" || mode === "reset") {
      wipeAndUnregister();
      return () => {
        /* nothing to clean up */
      };
    }

    const register = async () => {
      if (cancelled) return;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // A previous install may already be waiting — let it take over.
        if (reg.waiting) reg.waiting.postMessage("skip-waiting");

        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              next.postMessage("skip-waiting");
            }
          });
        });

        // Re-check hourly so a redeploy reaches open tabs.
        interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 60 * 1000);
      } catch (err) {
        console.warn("ServiceWorker registration error:", err);
      }
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
