import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Griya Jariyah Nurul Iman — Berbagi Hari Ini, Mengubah Esok",
    description: "Platform donasi Yayasan Pendidikan Nurul Iman Pesawaran yang transparan, mudah, dan tepat sasaran.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Griya Jariyah Nurul Iman — Berbagi Hari Ini, Mengubah Esok",
      description: "Donasi mudah, transparan, dan tepat sasaran.",
      type: "website",
    },
    twitter: { card: "summary" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
