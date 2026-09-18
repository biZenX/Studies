"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IconAlert, IconCheckCircle, IconX } from "./ui";

export type ToastKind = "success" | "error" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
};

type ToastContextValue = {
  toast: (message: string, opts?: { kind?: ToastKind; action?: ToastAction }) => void;
  success: (message: string, action?: ToastAction) => void;
  error: (message: string, action?: ToastAction) => void;
  info: (message: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONES: Record<ToastKind, { bg: string; border: string; icon: ReactNode }> = {
  success: {
    bg: "#f0fdf4",
    border: "#bbf7d0",
    icon: <IconCheckCircle size={17} className="text-emerald-600" />,
  },
  error: {
    bg: "#fef2f2",
    border: "#fecaca",
    icon: <IconAlert size={17} className="text-red-600" />,
  },
  info: {
    bg: "#0b2545",
    border: "#0b2545",
    icon: <IconCheckCircle size={17} className="text-emerald-300" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    (message, opts) => {
      if (!message) return;
      counter.current += 1;
      const id = counter.current;
      const item: ToastItem = {
        id,
        message,
        kind: opts?.kind ?? "success",
        action: opts?.action,
      };
      setItems((prev) => [...prev.slice(-2), item]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), opts?.action ? 7000 : 4200),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (m, a) => toast(m, { kind: "success", action: a }),
      error: (m, a) => toast(m, { kind: "error", action: a }),
      info: (m, a) => toast(m, { kind: "info", action: a }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 p-3 sm:inset-x-auto sm:bottom-5 sm:start-5 sm:items-start sm:p-0"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => {
          const tone = TONES[item.kind];
          const dark = item.kind === "info";
          return (
            <div
              key={item.id}
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-xs font-bold shadow-lg sm:w-auto"
              style={{
                background: tone.bg,
                borderColor: tone.border,
                color: dark ? "#fff" : "#0f172a",
              }}
            >
              <span className="mt-px shrink-0">{tone.icon}</span>
              <span className="min-w-0 flex-1 leading-relaxed">{item.message}</span>
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    dismiss(item.id);
                  }}
                  className="shrink-0 rounded-lg border px-2 py-1 text-[11px] font-extrabold transition hover:opacity-80"
                  style={{
                    color: dark ? "#a7f3d0" : "#047857",
                    borderColor: dark ? "rgba(167,243,208,0.35)" : "rgba(4,120,87,0.25)",
                  }}
                >
                  {item.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="close"
                className={`shrink-0 rounded-full p-0.5 transition hover:bg-black/5 ${
                  dark ? "text-white/70" : "text-slate-400"
                }`}
              >
                <IconX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful fallback so components never crash outside the provider.
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}
