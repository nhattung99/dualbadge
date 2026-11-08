"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { isAddressEqual, type Address, type Hash } from "viem";
import { badgePresets, followTasks, milestones, recordXVisit, type Milestone } from "@/lib/badge-presets";
import { badgeMetadataURI, client, contract, readPresetIds } from "@/lib/badges";
import { badgeAddress, hadrian } from "@/lib/chain";
import { hashPattern, proofLimit, verifyProof, type Proof } from "@/lib/task-progress";
import { BadgeArtwork } from "./badge-artwork";
import { ErrorNotice, ExplorerLink } from "./ui";
import { errorText, useWallet } from "./wallet-provider";

const titles = { tx: "Hadrian transactions", swap: "Rome DEX swaps", bridge: "Hadrian outbound bridges" };
const uris = badgePresets.map(badgeMetadataURI);
const emptyCounts = { tx: 0, swap: 0, bridge: 0 };
type Publication = { ids: Record<string, bigint>; owner?: Address } | { error: string };

function useProofs(address?: Address) {
  const key = address ? "dualbadge:proofs:" + hadrian.chainId + ":" + address.toLowerCase() : undefined;
  const [snapshot, setSnapshot] = useState<{ key: string; proofs: Proof[]; failed: number }>();
  useEffect(() => {
    if (!address || !key) return;
    const account = address;
    const storageKey = key;
    let active = true;
    async function restore() {
      let saved: unknown;
      try { saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { saved = []; }
      const hashes = Array.isArray(saved) ? [...new Set<Hash>(saved.filter((hash): hash is Hash =>
        typeof hash === "string" && hashPattern.test(hash)).map((hash) => hash.toLowerCase() as Hash))].slice(0, proofLimit) : [];
      const proofs: Proof[] = [];
      let failed = 0;
      for (let offset = 0; active && offset < hashes.length; offset += 4) {
        const results = await Promise.allSettled(hashes.slice(offset, offset + 4).map((hash) => verifyProof(hash, account)));
        for (const result of results) {
          if (result.status === "fulfilled") proofs.push(result.value);
          else failed++;
        }
      }
      if (active) setSnapshot({ key: storageKey, proofs, failed });
    }
    void restore();
    return () => { active = false; };
  }, [address, key]);

  const current = snapshot && snapshot.key === key ? snapshot : undefined;
  const proofs = current?.proofs ?? [];
  const counts = proofs.reduce((acc, proof) => ({
    tx: acc.tx + 1, swap: acc.swap + Number(proof.swap), bridge: acc.bridge + Number(proof.bridge),
  }), emptyCounts);
  async function add(input: string) {
    if (!address || !key || !current) throw new Error("Connect your wallet and wait for saved proofs to load.");
    const hash = input.trim().toLowerCase();
    if (!hashPattern.test(hash)) throw new Error("Paste a Hadrian transaction hash beginning with 0x.");
    if (proofs.some((proof) => proof.hash === hash)) throw new Error("This hash is already counted.");
    const proof = await verifyProof(hash as Hash, address);
    let saved: unknown;
    try { saved = JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { saved = []; }
    const hashes = Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string" && hashPattern.test(item))
      .map((item) => item.toLowerCase()) : [];
    const next = [...new Set([...hashes, proof.hash])];
    if (next.length > proofLimit) throw new Error("This browser stores up to 30 proofs per wallet.");
    localStorage.setItem(key, JSON.stringify(next));
    setSnapshot({ ...current, proofs: [...proofs, proof], failed: Math.max(0, current.failed - Number(hashes.includes(proof.hash))) });
    return proof;
  }
  return { counts, add, loading: Boolean(address && !current), failed: current?.failed ?? 0 };
}

export function TaskBoard() {
  const { wallet, revision } = useWallet();
  const [published, setPublished] = useState<Publication>();
  useEffect(() => {
    if (!badgeAddress) return;
    let active = true;
    void Promise.all([
      readPresetIds(uris),
      client.readContract({ ...contract(), functionName: "owner" }).catch(() => undefined),
    ]).then(([ids, owner]) => {
      if (active) setPublished({ ids, owner });
    }, (error) => {
      if (active) setPublished({ error: errorText(error) });
    });
    return () => { active = false; };
  }, [revision]);
  return <Board key={wallet?.address} address={wallet?.address} published={published} />;
}

function Board({ address, published }: { address?: Address; published?: Publication }) {
  const { counts, add, loading, failed } = useProofs(address);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<Proof>();
  const publication = published && "ids" in published ? published : undefined;
  const canPublish = address && publication?.owner && isAddressEqual(address, publication.owner);
  const points = counts.tx + counts.swap * 2 + counts.bridge * 3;
  const rank = points >= 20 ? "Veteran" : points >= 10 ? "Voyager" : points >= 5 ? "Pioneer" : points >= 1 ? "Explorer" : "Newcomer";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setError("");
    try {
      setLast(await add(String(new FormData(form).get("hash"))));
      form.reset();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setPending(false);
    }
  }
  return <section className="mt-8" id="tasks">
    <div className="section-heading"><div><span className="eyebrow">Hadrian quests</span><h2>Tasks &amp; rank</h2></div></div>
    <div className="panel mb-4">
      {address ? <><h3>{loading ? "Checking progress…" : rank + " · " + points + " points"}</h3>
        <p className="muted mt-2">{loading ? "Rechecking saved proofs on Hadrian." : counts.tx + " transactions · " + counts.swap + " swaps · " + counts.bridge + " bridges"}</p></>
        : <h3>Connect a wallet to track progress</h3>}
      <p className="muted mt-2">Ranks unlock at 1, 5, 10 and 20 points. A successful Hadrian transaction earns 1 point, with 2 extra for a supported swap or 3 extra for a supported outbound bridge.</p>
      <p className="muted mt-2">Paste hashes from Rome Via. Progress counts the connected Rome account and is saved in this browser. Native Solana swaps, inbound bridges and destination settlement are outside this counter.</p>
      <ul className="muted mt-3 list-disc pl-5">
        <li>Transactions · Use successful Hadrian actions you already made, such as a badge claim or contract call.</li>
        <li>Swaps · Select Hadrian in Rome DEX and use a route through a supported Rome router.</li>
        <li>Bridges · Choose Hadrian as the source in Rome Bridge. Use the Hadrian transaction hash for a supported outbound route.</li>
      </ul>
      <p className="mt-2 flex flex-wrap gap-4">
        <a className="text-button" href={hadrian.explorerUrl} target="_blank" rel="noreferrer">Rome Via ↗</a>
        <a className="button secondary" href="https://dex.devnet.romeprotocol.xyz/" target="_blank" rel="noreferrer">Open Swap on Rome DEX ↗</a>
        <a className="button secondary" href="https://bridge-api.devnet.romeprotocol.xyz/?chain=200010" target="_blank" rel="noreferrer">Open Hadrian Bridge ↗</a>
      </p>
      {address && <form onSubmit={submit} className="form mt-4">
        <label>Hadrian transaction hash<input name="hash" placeholder="0x…" required maxLength={66} spellCheck={false} /></label>
        <button className="button primary justify-self-start" disabled={pending || loading}>{pending ? "Checking…" : "Verify and add"}</button>
      </form>}
      {failed > 0 && <p className="notice mt-3">{failed} saved proofs could not be verified. Reload to retry.</p>}
      {error && <ErrorNotice text={error} />}
      {last && <div className="transaction success">Counted one transaction{last.swap ? " and one swap" : ""}{last.bridge ? " and one outbound bridge" : ""}.<ExplorerLink tx={{ evm: last.hash }} /></div>}
    </div>
    {published && "error" in published && <ErrorNotice text={published.error} />}
    <div className="badge-grid">
      {badgePresets.map((preset, index) => {
        const id = publication?.ids[uris[index]];
        const goal = preset.goal && milestones[preset.goal];
        const visit = preset.follow;
        return <article key={preset.name} className="panel badge-card">
          <div className="badge-art"><BadgeArtwork artwork={preset.artwork} /></div>
          <h3>{preset.name}</h3>
          {visit && <a className="text-button" href={followTasks[visit].url} target="_blank" rel="noreferrer"
            onClick={() => recordXVisit(visit)}>Open {followTasks[visit].handle} on X ↗</a>}
          {goal && <p>{address && !loading ? Math.min(counts[goal.kind], goal.target) + " / " : "Goal · "}{goal.target} {titles[goal.kind]}</p>}
          {id ? <Link className="text-button" href={"/badge/" + id}>View task and claim →</Link>
            : <>
              <span className="muted">{publication || !badgeAddress ? "Awaiting on-chain publication" : "Checking publication…"}</span>
              {canPublish && <Link className="text-button" href={"/admin#preset-" + preset.artwork}>Publish in Admin →</Link>}
            </>}
        </article>;
      })}
    </div>
  </section>;
}

export function ActivityRequirement({ milestone, children }: { milestone: Milestone; children: (ready: boolean) => ReactNode }) {
  const { wallet } = useWallet();
  const { counts, loading } = useProofs(wallet?.address);
  const goal = milestones[milestone];
  const ready = Boolean(wallet && !loading && counts[goal.kind] >= goal.target);
  return <>
    <div className="transaction">
      <strong>{goal.target} {titles[goal.kind]}</strong>
      <p>{loading ? "Checking saved proofs…" : wallet ? Math.min(counts[goal.kind], goal.target) + " / " + goal.target + " verified" : "Connect a wallet to check progress."}</p>
      <Link className="text-button" href="/dashboard#tasks">Add transaction proofs →</Link>
      <p className="muted">This requirement applies in the app. The current contract accepts open claims.</p>
    </div>
    {children(ready)}
  </>;
}
