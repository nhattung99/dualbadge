import Link from "next/link";
import { Catalog } from "@/components/badge-views";
import { BadgeMark } from "@/components/ui";

export default function Home() {
  return <>
    <section className="hero">
      <div>
        <span className="eyebrow pill"><i /> BUILT FOR ROME HADRIAN</span>
        <h1>One Badge System,<br /><span>Two Wallet Worlds.</span></h1>
        <p>Collect non-transferable achievements from a shared on-chain registry. Connect your wallet to see what you’ve earned.</p>
        <div className="hero-actions"><a href="#catalog" className="button primary">Explore badges ↓</a><Link href="/about" className="button secondary">How it works</Link></div>
      </div>
      <div className="hero-graphic" aria-hidden="true">
        <div className="orbit"><div className="orbit-inner"><BadgeMark /></div></div>
        <span className="lane evm">EVM</span><span className="lane solana">SOLANA</span>
        <span className="registry-label">SHARED REGISTRY</span>
      </div>
    </section>
    <section id="catalog"><Catalog /></section>
  </>;
}
