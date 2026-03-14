import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoicedOS",
  description:
    "AI-powered accounts receivable and invoice management platform for mid-market finance teams.",
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
