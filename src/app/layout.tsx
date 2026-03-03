import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Focus Flow - ADHD-Friendly Task App",
  description: "Simple, visual task management for ADHD brains",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
