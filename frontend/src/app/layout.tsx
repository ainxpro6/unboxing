import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unboxing Retur — Dokumentasi Retur Otomatis",
  description:
    "Aplikasi dokumentasi proses unboxing barang retur e-commerce. Scan barcode resi, auto-capture foto & video, sinkronisasi cloud otomatis.",
  keywords: ["unboxing", "retur", "e-commerce", "barcode", "scanner", "dokumentasi"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
