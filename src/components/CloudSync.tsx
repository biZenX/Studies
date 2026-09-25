"use client";

import { useEffect } from "react";
import { pullFromCloud } from "@/lib/storage";

/**
 * On first paint, pull cloud data (or push local if the cloud is empty).
 * Keeps localStorage and the database in sync so studies are reachable
 * from any phone / tablet / laptop.
 */
export function CloudSync() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await pullFromCloud(true);
      } catch (err) {
        if (!cancelled) console.warn("Cloud sync failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
