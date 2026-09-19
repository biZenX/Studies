"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

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
    <path d="M12 2 2 7l10 5 10-5-10-5z" />
    <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

export const IconBack = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, `rtl:rotate-180 transition-transform ${className || ""}`)}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const IconUpload = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const IconDownload = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const IconFileText = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
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
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const IconAlert = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const IconCalendar = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const IconClock = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export const IconArrowEnd = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, `rtl:rotate-180 ${className || ""}`)}>
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
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog shell shared by every popup in the app.
 *
 * - Header with optional icon + subtitle, scrollable body and a *sticky*
 *   footer, so the action buttons never scroll out of reach on long forms.
 * - Bottom sheet on phones (slides up, respects the safe area), centred card
 *   on larger screens.
 * - Focus is moved inside on open, trapped while open (Tab cycles) and handed
 *   back to the opener on close. Escape closes; a backdrop click closes unless
 *   `closeOnBackdrop` is false.
 * - Background scrolling is locked without the layout jumping.
 */
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
  /** Rendered outside the scroll area so it is always visible. */
  footer?: ReactNode;
  /** Absolutely positioned layer covering the whole panel (confirm prompts…). */
  overlay?: ReactNode;
  /** @deprecated use `size="xl"` */
  wide?: boolean;
  size?: "md" | "lg" | "xl";
  testId?: string;
  closeOnBackdrop?: boolean;
  /** Focus the first field on open (skipped on touch devices to keep the keyboard closed). */
  autoFocus?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  // Latest close handler, readable from the long-lived key/backdrop listeners
  // without re-binding them (and without re-running the open effect) every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Keep Tab inside the dialog.
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // Lock background scrolling without losing the scrollbar width (prevents the
    // page from jumping and from becoming unscrollable after the modal closes).
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      paddingInlineEnd: body.style.paddingInlineEnd,
    };
    const scrollbar = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingInlineEnd = `${scrollbar}px`;

    // Move focus inside. Fine pointers only: on phones an auto-focused input
    // pops the keyboard over the sheet before the user can even read it.
    const finePointer =
      typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const preferred = panel.querySelector<HTMLElement>("[data-autofocus]");
      const firstField =
        autoFocus && finePointer
          ? preferred ??
            panel.querySelector<HTMLElement>(
              'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
            )
          : null;
      (firstField ?? panel).focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.paddingInlineEnd = prev.paddingInlineEnd;
      // Hand focus back to whatever opened the dialog.
      if (opener && typeof opener.focus === "function" && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, autoFocus]);

  if (!open) return null;

  const width =
    size === "xl" || wide ? "sm:max-w-4xl" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        // Only a click that starts *and* ends on the backdrop closes the dialog,
        // so selecting text inside a field and releasing outside does not.
        if (!closeOnBackdrop || e.target !== e.currentTarget) return;
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
        className={`modal-panel card relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white outline-none sm:max-h-[90dvh] sm:rounded-3xl ${width}`}
      >
        {/* Grab handle — phones only */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <div className="flex shrink-0 items-start gap-3 border-b border-[var(--border)] px-4 py-3.5 sm:px-6 sm:py-4">
          {icon && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-tint)] text-[var(--accent-strong)]">
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
                className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)] sm:text-xs"
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
          className="modal-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>

        {footer && (
          <div
            className="shrink-0 border-t border-[var(--border)] bg-white/95 px-4 py-3 sm:px-6 sm:py-4"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
          >
            {footer}
          </div>
        )}
        {!footer && <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />}

        {overlay}
      </div>
    </div>
  );
}

/**
 * Inline "you have unsaved changes" prompt rendered *inside* a modal, so the
 * user never loses a half-filled form to a stray backdrop click.
 */
export function DiscardPrompt({
  open,
  title,
  description,
  keepLabel,
  discardLabel,
  onKeep,
  onDiscard,
}: {
  open: boolean;
  title: string;
  description: string;
  keepLabel: string;
  discardLabel: string;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 p-4 backdrop-blur-[2px]"
      role="alertdialog"
      aria-label={title}
      data-testid="discard-prompt"
    >
      <div className="animate-scale-in w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <IconAlert size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[var(--text)]">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost !min-h-[38px] !py-1.5 text-xs" onClick={onKeep} data-autofocus>
            {keepLabel}
          </button>
          <button
            type="button"
            className="btn-danger !min-h-[38px] !py-1.5 text-xs"
            onClick={onDiscard}
            data-testid="discard-confirm"
          >
            {discardLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small uppercase-style heading that separates groups of fields in a form. */
export function FormSection({
  title,
  hint,
  icon,
  children,
  action,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {icon && <span className="mt-0.5 shrink-0 text-[var(--accent-strong)]">{icon}</span>}
          <div className="min-w-0">
            <h4 className="text-[13px] font-extrabold text-[var(--text)]">{title}</h4>
            {hint && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">{hint}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Radio-like button row used for the study status. */
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
                ? "bg-white text-[var(--accent-strong)] shadow-xs ring-1 ring-emerald-200"
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
    "تونس": "#dcfce7",
    "مصر": "#fef3c7",
    "الأردن": "#dbeafe",
    "السعودية": "#dcfce7",
    "العراق": "#fee2e2",
    "اليمن": "#e0e7ff",
    "فلسطين": "#ccfbf1",
    "سوريا": "#ffe4e6",
    "الجزائر": "#e9d5ff",
    "السودان": "#fde68a",
  };

  // Stable colour for any country not in the curated palette.
  const fallbackTints = ["#e0f2fe", "#fce7f3", "#ecfccb", "#fef9c3", "#ede9fe", "#ffedd5"];
  let hash = 0;
  for (let i = 0; i < country.length; i++) hash = (hash * 31 + country.charCodeAt(i)) >>> 0;

  const bg = palette[country] ?? fallbackTints[hash % fallbackTints.length];

  return (
    <span
      className="inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:text-xs"
      style={{ background: bg, color: "rgba(15,23,42,0.78)" }}
      title={label ?? country}
    >
      <span className="truncate">{label ?? country}</span>
    </span>
  );
}

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active: { label: "نشطة", bg: "#dcfce7", color: "#166534" },
    upcoming: { label: "قادمة", bg: "#dbeafe", color: "#1d4ed8" },
    closed: { label: "مكتملة", bg: "#fee2e2", color: "#991b1b" },
    draft: { label: "مسودة", bg: "#f1f5f9", color: "#475569" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
      data-status={status}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.color }}
      />
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
  /** Small helper text under the control. */
  hint?: string;
  /** Validation message — replaces the hint and turns the control red. */
  error?: string;
  /** Text shown after the label, e.g. "optional". */
  optional?: string;
  /** Use "div" when the control is not a single input (a date pair, a button row…). */
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
