import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My App - Score Tracker & Discord Image Bot",
  description: "Score Tracker and Discord Image Extractor with Supabase Storage",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
