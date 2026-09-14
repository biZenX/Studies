"use client";

import { useEffect, type ReactNode } from "react";

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

export const IconPrinter = ({ className, size = 18 }: IconProps) => (
  <svg {...svgProps(size, className)}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
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

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`animate-scale-in card max-h-[92vh] w-full overflow-hidden bg-white rounded-t-3xl sm:rounded-3xl ${
          wide ? "sm:max-w-3xl" : "sm:max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h3 className="text-base font-bold text-[var(--text)]">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-70px)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
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

export function CountryBadge({ country }: { country: string }) {
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
  const bg = palette[country] ?? "#f1f5f9";
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: bg, color: "rgba(15,23,42,0.75)" }}
    >
      {country}
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
    closed: { label: "مغلقة", bg: "#fee2e2", color: "#991b1b" },
    draft: { label: "مسودة", bg: "#f1f5f9", color: "#475569" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
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
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
