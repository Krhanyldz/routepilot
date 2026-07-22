import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoutePilot — Smarter routes, lower fares",
  description: "Compare direct flights with money-saving multimodal routes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><SiteHeader />{children}</body>
    </html>
  );
}
