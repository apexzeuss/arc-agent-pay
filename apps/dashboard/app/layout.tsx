import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "arc-agent-pay",
  description: "AI agent payments on Arc testnet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
