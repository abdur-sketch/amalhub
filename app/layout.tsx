import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "AmalHub — Berbagi Hari Ini, Mengubah Esok",
    description: "Platform donasi yayasan yang transparan, mudah, dan tepat sasaran.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "AmalHub — Berbagi Hari Ini, Mengubah Esok",
      description: "Donasi mudah, transparan, dan tepat sasaran.",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "AmalHub — Berbagi hari ini, mengubah esok" }],
      type: "website",
    },
    twitter: { card: "summary_large_image", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
