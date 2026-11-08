export const metadata = { title: "About" };
export default function Page() {
  return <>
    <div className="page-heading"><span className="eyebrow">Architecture</span><h1>One shared registry</h1><p>Rome runs Solidity contracts inside the Solana runtime.</p></div>
    <div className="badge-grid">
      <article className="panel prose"><span className="eyebrow">01 · EVM lane</span><h2>MetaMask</h2><p>MetaMask signs a Hadrian transaction. The registry credits the caller’s EVM address. Hadrian gas uses USDC.</p></article>
      <article className="panel prose"><span className="eyebrow">02 · Solana lane</span><h2>Phantom</h2><p>The app requests a devnet legacy Solana signature. Rome derives an EVM sender from the Solana public key. This path awaits a live DualBadge mint.</p></article>
      <article className="panel prose"><span className="eyebrow">03 · Shared state</span><h2>One Solidity contract</h2><p>Both paths target the same cap, count, and ownership records. Each canonical account can claim a badge type once.</p></article>
    </div>
    <p className="mt-8"><a className="text-button" href="https://docs.rome.builders/" target="_blank" rel="noreferrer">Rome developer documentation ↗</a></p>
  </>;
}
