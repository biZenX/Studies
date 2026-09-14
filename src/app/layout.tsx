import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "مساحات الدراسات — منظومة إدارة الدراسات التدريبية والمشاركين",
  description: "منظومة أكاديمية متكاملة لتنظيم وإدارة الدراسات والبرامج التدريبية واستخراج كشوف المشاركين الرسمية.",
  applicationName: "مساحات الدراسات",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "مساحات الدراسات",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
