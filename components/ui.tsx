"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { badgeAddress, hadrian } from "@/lib/chain";
import type { TxRef } from "@/lib/wallets";
import { useWallet } from "./wallet-provider";

export function BadgeMark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <path d="M40 4 72 22v36L40 76 8 58V22Z" fill="#e9e5ff" stroke="#8063ea" strokeWidth="2"/>
    <path d="M40 13 64 27v26L40 67 16 53V27Z" fill="#f8f6ff" stroke="#a38cf4" strokeWidth="1.5"/>
    <path d="m40 24 5 10 11 1.6-8 7.8 2 11-10-5.2-10 5.2 2-11-8-7.8L35 34Z" fill="#7152df"/>
  </svg>;
}

const links = [["Explore", "/"], ["Dashboard", "/dashboard"], ["Activity", "/activity"], ["Admin", "/admin"], ["About", "/about"]];
export function Navbar() {
  const path = usePathname();
  return <header className="header"><div className="wrap nav">
    <Link className="brand" href="/"><BadgeMark /> DualBadge</Link>
    <nav aria-label="Main">{links.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>)}</nav>
    <WalletConnect />
  </div></header>;
}

export function WalletConnect() {
  const { wallet, pending, connect } = useWallet();
  return <div className="wallet-actions">
    {wallet ? <>
      <Link className="button secondary" href="/dashboard">{wallet.lane === "evm" ? "MetaMask" : "Phantom"}</Link>
      {wallet.lane === "evm" && <button className="button secondary" disabled={pending} onClick={() => void connect("choose")}>Change account</button>}
      <button className="button quiet" disabled={pending} onClick={() => void connect("disconnect")}>Disconnect</button>
    </> : <>
      <button className="button secondary" disabled={pending} onClick={() => void connect("evm")}>MetaMask</button>
      <button className="button secondary" disabled={pending} onClick={() => void connect("solana")}>Phantom</button>
    </>}
  </div>;
}

export function WalletStatus() {
  const { wallet } = useWallet();
  if (!wallet) return <EmptyState title="Connect a wallet" text="Choose MetaMask or Phantom to look up your achievements." />;
  return <div className="panel wallet-status">
    <span className="eyebrow">{wallet.lane === "evm" ? "MetaMask · EVM" : "Phantom · Solana"}</span>
    <dl>
      {wallet.lane === "solana" && <><dt>Solana wallet</dt><dd>{wallet.account.address}</dd></>}
      <dt>Canonical Rome account</dt><dd>{wallet.address}</dd>
    </dl>
    {wallet.lane === "solana" && <p className="muted">Phantom uses the legacy Solana path. Have devnet SOL and USDC available for fees. Live DualBadge minting through Phantom is pending verification.</p>}
  </div>;
}

export function NetworkBanner() {
  const { wallet, error, pending, connect } = useWallet();
  return <>
    {!badgeAddress && <div className="banner">Hadrian testnet · Set the deployment address to enable live registry data and writes.</div>}
    {wallet && !wallet.network && <div className="banner">
      {wallet.lane === "evm" ? <>Switch MetaMask to {hadrian.name}. <button disabled={pending} onClick={() => void connect("switch")} className="text-button">Switch network</button></>
        : "This Phantom account does not advertise legacy signing on Solana devnet. Minting is unavailable for this session."}
    </div>}
    {error && <ErrorNotice text={error} />}
  </>;
}

export function ExplorerLink({ tx }: { tx: TxRef }) {
  return <span className="flex flex-wrap gap-3">
    {tx.evm && <a className="text-button" href={new URL("tx/" + tx.evm, hadrian.explorerUrl).href} target="_blank" rel="noreferrer">Rome Via ↗</a>}
    {tx.solana && <a className="text-button" href={hadrian.solana.explorerUrl + "/tx/" + encodeURIComponent(tx.solana) + "?cluster=" + hadrian.solana.cluster} target="_blank" rel="noreferrer">Solana explorer ↗</a>}
  </span>;
}

export type TxState = { phase: "pending" | "success" | "error"; detail: string; tx?: TxRef };
export function TransactionStatus({ state }: { state?: TxState }) {
  return state && <div className={"transaction " + state.phase} role={state.phase === "error" ? "alert" : "status"}>
    <strong>{state.phase === "pending" ? "Waiting for confirmation" : state.phase === "success" ? "Confirmed" : "Transaction check failed"}</strong>
    <p>{state.detail}</p>{state.tx && <ExplorerLink tx={state.tx} />}
  </div>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty"><BadgeMark /><h2>{title}</h2><p>{text}</p></div>;
}

export function ErrorNotice({ text }: { text: string }) {
  return <p role="alert" className="notice">{text}</p>;
}
