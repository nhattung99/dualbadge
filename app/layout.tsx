import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navbar, NetworkBanner } from "@/components/ui";
import { WalletProvider } from "@/components/wallet-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DualBadge", template: "%s · DualBadge" },
  description: "One Badge System, Two Wallet Worlds.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><WalletProvider>
    <Navbar />
    <main className="wrap main"><NetworkBanner />{children}</main>
    <footer><div className="wrap"><strong>DualBadge</strong><span>Rome Hadrian testnet · Solana devnet</span></div></footer>
  </WalletProvider></body></html>;
}
