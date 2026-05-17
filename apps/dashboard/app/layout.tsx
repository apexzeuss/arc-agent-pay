import type { Metadata } from "next";
import { Fraunces, Public_Sans, Cutive_Mono } from "next/font/google";
import { Providers } from "./Providers";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const cutive = Cutive_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "arc-agent-pay · ledger",
  description: "AI agents transacting USDC on Arc testnet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable} ${cutive.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
