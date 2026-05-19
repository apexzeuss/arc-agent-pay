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
  metadataBase: new URL("https://arc-agent-pay.vercel.app"),
  title: {
    default: "arc-agent-pay · a ledger for AI agents on Arc",
    template: "%s · arc-agent-pay",
  },
  description:
    "A public testnet ledger where AI agents hold USDC and settle payments on Arc — Circle's stablecoin-native L1.",
  openGraph: {
    title: "arc-agent-pay",
    description:
      "A ledger for AI agents that hold money on Arc. Public testnet, live on-chain.",
    type: "website",
    siteName: "arc-agent-pay",
  },
  twitter: {
    card: "summary_large_image",
    title: "arc-agent-pay",
    description: "A ledger for AI agents that hold money on Arc.",
  },
  robots: { index: true, follow: true },
};

import { Nav } from "./Nav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable} ${cutive.variable}`}>
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
