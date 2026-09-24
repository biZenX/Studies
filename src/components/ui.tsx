"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type IconProps = { className?: string; size?: number };

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
}

export const IconPlus = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconEdit = ({ className, size = 16 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

export const IconTrash = ({ className, size = 16 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconSearch = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconMail = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 6L2 7" />
  </svg>
);

export const IconPhone = ({ className, size = 16 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const IconUsers = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconGlobe = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const IconLayers = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
);

export const IconBack = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const IconUpload = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

export const IconDownload = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export const IconFileText = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const IconFilter = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const IconCheckCircle = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const IconX = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const IconCheck = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const IconAlert = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconCalendar = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

export const IconClock = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const IconArrowEnd = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const IconUser = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  overlay,
  wide,
  size,
  testId,
  closeOnBackdrop = true,
  autoFocus = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  overlay?: ReactNode;
  wide?: boolean;
  size?: "md" | "lg" | "xl";
  testId?: string;
  closeOnBackdrop?: boolean;
  autoFocus?: boolean;
}) {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    if (autoFocus) {
      requestAnimationFrame(() => panelRef.current?.focus());
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
    };
  }, [open, autoFocus]);

  if (!open) return null;

  const width =
    size === "xl" || wide ? "sm:max-w-3xl" : size === "lg" ? "sm:max-w-xl" : "sm:max-w-md";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target !== e.currentTarget) return;
        const onUp = (up: MouseEvent) => {
          document.removeEventListener("mouseup", onUp);
          if (up.target === e.currentTarget) onCloseRef.current();
        };
        document.addEventListener("mouseup", onUp);
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        data-testid={testId ?? "modal"}
        className={`modal-panel card relative flex max-h-[min(90dvh,820px)] w-full flex-col overflow-hidden rounded-2xl bg-white outline-none sm:max-h-[min(88dvh,760px)] sm:rounded-2xl ${width}`}
      >
        <div className="flex shrink-0 items-start gap-2.5 border-b border-[var(--border)] px-4 py-3 sm:px-5 sm:py-3.5">
          {icon && (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent-strong)]">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3
              id={titleId}
              className="truncate text-base font-extrabold leading-tight text-[var(--text)] sm:text-lg"
            >
              {title}
            </h3>
            {subtitle && (
              <p
                id={subtitleId}
                className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)] sm:text-xs"
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-me-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label="Close"
            data-testid="modal-close"
          >
            <IconX size={18} />
          </button>
        </div>

        <div
          className="modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 sm:py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="shrink-0 border-t border-[var(--border)] bg-white px-4 py-3 sm:px-5"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
          >
            {footer}
          </div>
        )}

        {overlay}
      </div>
    </div>
  );
}

export function DiscardPrompt({
  open,
  onKeep,
  onDiscard,
  title,
  body,
  keepLabel,
  discardLabel,
}: {
  open: boolean;
  onKeep: () => void;
  onDiscard: () => void;
  title: string;
  body: string;
  keepLabel: string;
  discardLabel: string;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 p-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-white p-4 shadow-lg">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <IconAlert size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-[var(--text)]">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{body}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-ghost flex-1 text-xs font-bold" onClick={onKeep}>
            {keepLabel}
          </button>
          <button type="button" className="btn-danger flex-1 text-xs font-bold" onClick={onDiscard}>
            {discardLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-[var(--border)] p-3 sm:p-4 ${className ?? ""}`}>
      <h4 className="mb-3 text-xs font-extrabold text-[var(--text)]">{title}</h4>
      {children}
    </section>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  testId,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
  testId?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-testid={testId}
      className="grid gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            data-testid={testId ? `${testId}-${opt.value}` : undefined}
            className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center text-xs font-bold transition ${
              selected
                ? "bg-white text-[var(--accent-strong)] shadow-sm ring-1 ring-emerald-200"
                : "text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** In-app select — never opens the OS native picker. */
export function AppSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  placeholder,
  testId,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  label?: string;
  placeholder?: string;
  testId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder ?? "—";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative block ${className ?? ""}`}>
      {label && (
        <span className="mb-1.5 block text-[11px] font-bold text-[var(--text-tertiary)]">{label}</span>
      )}
      <button
        type="button"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="input flex w-full min-h-[44px] items-center justify-between gap-2 !py-2 !text-xs text-start"
      >
        <span className="min-w-0 truncate font-bold text-[var(--text)]">{display}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-[var(--text-tertiary)] transition ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-inline-0 z-[70] mt-1 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] bg-white py-1 shadow-lg"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {options.map((o) => {
            const isSel = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={isSel}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-start text-xs font-bold transition ${
                    isSel
                      ? "bg-emerald-50 text-[var(--accent-strong)]"
                      : "text-[var(--text)] hover:bg-[var(--bg)]"
                  }`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {isSel && <IconCheck size={14} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-white/30 border-t-white"
      style={{ width: size, height: size }}
    />
  );
}

export function CountryBadge({ country, label }: { country: string; label?: string }) {
  const palette: Record<string, string> = {
    Egypt: "#dbeafe",
    Saudi: "#dcfce7",
    UAE: "#fef3c7",
    Kuwait: "#fce7f3",
    Qatar: "#ede9fe",
    Bahrain: "#ffedd5",
    Oman: "#ecfccb",
    Jordan: "#e0f2fe",
    Lebanon: "#fce7f3",
    Morocco: "#fef9c3",
    Tunisia: "#e0e7ff",
    Algeria: "#d1fae5",
    Sudan: "#fde68a",
    Iraq: "#fecaca",
    Yemen: "#fed7aa",
    Syria: "#e9d5ff",
    Palestine: "#bbf7d0",
    Libya: "#a5f3fc",
  };

  const fallbackTints = ["#e0f2fe", "#fce7f3", "#ecfccb", "#fef9c3", "#ede9fe", "#ffedd5"];
  let hash = 0;
  for (let i = 0; i < country.length; i++) hash = (hash * 31 + country.charCodeAt(i)) | 0;
  const bg = palette[country] ?? fallbackTints[Math.abs(hash) % fallbackTints.length];

  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[var(--text)]"
      style={{ background: bg }}
      title={label ?? country}
    >
      {label ?? country}
    </span>
  );
}

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  active: { color: "#10b981", label: "active" },
  closed: { color: "#64748b", label: "closed" },
  draft: { color: "#a855f7", label: "draft" },
  upcoming: { color: "#0ea5e9", label: "upcoming" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const s = STATUS_STYLE[status] ?? { color: "#94a3b8", label: status };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--text)] ring-1 ring-[var(--border)]">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
      {label ?? s.label}
    </span>
  );
}

export function Field({
  label,
  children,
  required,
  hint,
  error,
  optional,
  as = "label",
  className,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  optional?: string;
  as?: "label" | "div";
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag className={`block ${error ? "field-error" : ""} ${className ?? ""}`}>
      <span className="mb-1.5 flex items-baseline gap-1.5 text-sm font-semibold text-[var(--text-secondary)]">
        <span>{label}</span>
        {required && <span className="text-[var(--danger)]">*</span>}
        {optional && !required && (
          <span className="text-[11px] font-medium text-[var(--text-tertiary)]">({optional})</span>
        )}
      </span>
      {children}
      {error ? (
        <span
          className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-[var(--danger)]"
          role="alert"
        >
          <IconAlert size={12} />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-[var(--text-tertiary)]">{hint}</span>
      ) : null}
    </Tag>
  );
}
