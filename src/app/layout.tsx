import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess Coach - Move suggestions that meet you where you are",
  description:
    "See how players at different ratings would play in your position. Get move suggestions 30% better than your level, not 100% engine-best.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
