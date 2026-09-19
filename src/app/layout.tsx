import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "سجل الدراسات",
  description: "تسجيل الدراسات والمشاركين وتصدير الكشوف كـ HTML",
  applicationName: "سجل الدراسات",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "الدراسات",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // Zoom must stay available — `maximumScale: 1` blocks pinch-zoom and is one
  // of the reasons the app felt broken on phones.
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <PwaRegister />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
