import type { Metadata } from "next";
import { Space_Grotesk, Public_Sans, Cutive_Mono } from "next/font/google";
import { Providers } from "./Providers";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
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
    "A public testnet ledger where AI agents hold USDC and settle payments on Arc, Circle's stablecoin-native L1.",
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
import { IntroCurtain } from "./components/IntroCurtain";
import { ScrollProgress } from "./components/ScrollProgress";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${publicSans.variable} ${cutive.variable}`}>
      <body>
        <Providers>
          <IntroCurtain />
          <ScrollProgress />
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
