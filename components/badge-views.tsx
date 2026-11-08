"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { formatUnits, isAddressEqual } from "viem";
import { badgeAddress, deploymentBlock } from "@/lib/chain";
import { badgePresets, followTasks, hasXVisit, recordXVisit, type FollowTask } from "@/lib/badge-presets";
import { badgeMetadataURI, client, contract, httpsUrl, readActivity, readBadge, readCatalog, readInlineMetadata, readPresetIds } from "@/lib/badges";
import { configureBadge, mintBadge, quoteBadgeCreation, type TxRef } from "@/lib/wallets";
import { BadgeMark, EmptyState, ErrorNotice, ExplorerLink, TransactionStatus, WalletStatus, type TxState } from "./ui";
import { errorText, useWallet } from "./wallet-provider";
import { BadgeArtwork } from "./badge-artwork";
import { ActivityRequirement, TaskBoard } from "./task-board";

type Badge = Awaited<ReturnType<typeof readBadge>>;
type Result<T> = { data: T; error?: never } | { error: string; data?: never };

function useRead<T>(read: () => Promise<T>) {
  const { revision } = useWallet();
  const [state, setState] = useState<{ read: typeof read; result: Result<T> }>();
  useEffect(() => {
    if (!badgeAddress) return;
    let active = true;
    void read().then(
      (data) => { if (active) setState({ read, result: { data } }); },
      (cause) => { if (active) setState({ read, result: { error: errorText(cause) } }); },
    );
    return () => { active = false; };
  }, [read, revision]);
  return state && state.read === read ? state.result : undefined;
}

type Metadata = { name?: string; description?: string; image?: string };
function BadgeArt({ badge, detail = false }: { badge: Badge; detail?: boolean }) {
  const uri = httpsUrl(badge.metadataURI);
  const [record, setRecord] = useState<{ uri: string; data: Metadata }>();
  const [failedImage, setFailedImage] = useState<string>();
  useEffect(() => {
    if (!uri) return;
    const abort = new AbortController();
    void fetch(uri, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error",
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]) })
      .then(async (response) => {
        if (!response.ok) return;
        const raw = await response.json() as Record<string, unknown>;
        if (!raw || abort.signal.aborted) return;
        setRecord({ uri, data: {
          name: typeof raw.name === "string" ? raw.name.slice(0, 100) : undefined,
          description: typeof raw.description === "string" ? raw.description.slice(0, 600) : undefined,
          image: typeof raw.image === "string" ? httpsUrl(raw.image) : undefined,
        } });
      }).catch(() => {});
    return () => abort.abort();
  }, [uri]);
  const inline = readInlineMetadata(badge.metadataURI);
  const metadata: Metadata | undefined = inline ?? (record?.uri === uri ? record?.data : undefined);
  const title = metadata?.name || "Badge #" + badge.id;
  const description = inline?.follow ? "Open " + followTasks[inline.follow].handle + " on X to unlock minting." : metadata?.description;
  const image = metadata?.image;
  return <>
    <div className="badge-art">
      {image && failedImage !== image
        ? <Image src={image} alt="" width={92} height={92} unoptimized referrerPolicy="no-referrer" onError={() => setFailedImage(image)} />
        : inline?.artwork ? <BadgeArtwork artwork={inline.artwork} /> : <BadgeMark />}
    </div>
    {detail ? <h1>{title}</h1> : <h3>{title}</h3>}
    {detail && description && <p className="muted">{description}</p>}
  </>;
}

function Supply({ badge }: { badge: Badge }) {
  const label = badge.minted + " / " + badge.maxSupply + " minted";
  const percent = Number(badge.minted * 100n / badge.maxSupply);
  return <div className="supply"><span>{label}</span><progress aria-label={label} value={percent} max={100} /></div>;
}

function BadgeCard({ badge }: { badge: Badge }) {
  const follow = readInlineMetadata(badge.metadataURI)?.follow;
  return <article className="panel badge-card">
    <span className="eyebrow">{badge.earned ? "Earned" : badge.minted >= badge.maxSupply ? "Sold out" : badge.enabled ? "Open claim" : "Paused"}</span>
    <BadgeArt badge={badge} />
    {follow && <span className="muted">X task · Visit {followTasks[follow].handle}</span>}
    <Supply badge={badge} />
    <Link className="text-button" href={"/badge/" + badge.id}>View badge →</Link>
  </article>;
}

function BadgeGrid({ badges }: { badges: Badge[] }) {
  return <div className="badge-grid">{badges.map((badge) => <BadgeCard key={String(badge.id)} badge={badge} />)}</div>;
}

function Loading({ label }: { label: string }) {
  return <p className="muted" role="status">{label}</p>;
}

export function Catalog({ dashboard = false }: { dashboard?: boolean }) {
  const [page, setPage] = useState(0n);
  const { wallet, refresh } = useWallet();
  const address = wallet?.address;
  const read = useCallback(() => readCatalog(page, address), [page, address]);
  const result = useRead(read);
  const visible = result?.data?.badges.filter((badge) => !dashboard || badge.earned) ?? [];
  return <>
    {dashboard && <><WalletStatus /><TaskBoard /></>}
    <div className="section-heading">
      <div><span className="eyebrow">{dashboard ? "Your registry" : "On-chain catalog"}</span>
        <h2>{dashboard ? "Earned badges" : "Explore badges"}</h2></div>
      {badgeAddress && (!dashboard || wallet) && <button className="button quiet" onClick={refresh}>Refresh</button>}
    </div>
    {(!dashboard || wallet) && (
      !badgeAddress ? <EmptyState title="Registry awaiting deployment" text="Badges will appear here once a Hadrian contract address is configured." />
        : !result ? <Loading label="Reading the Hadrian registry…" />
        : result.error ? <ErrorNotice text={result.error} />
        : result.data && <>
          {!dashboard && <p className="muted stats">{String(result.data.count)} badge types · {String(result.data.total)} mints on Hadrian</p>}
          {visible.length ? <BadgeGrid badges={visible} /> : <EmptyState title={dashboard ? "No earned badges on this page" : "No badges yet"} text={dashboard ? "Only claimed badges appear here. Browse Tasks & rank above or open Explore to find a badge to claim." : "The owner can create the first badge in Admin."} />}
          {(page > 0n || result.data.next) && <div className="pagination">
            <button className="button secondary" disabled={page === 0n} onClick={() => setPage(page - 1n)}>Previous</button>
            <span>Page {String(page + 1n)}</span>
            <button className="button secondary" disabled={!result.data.next} onClick={() => setPage(page + 1n)}>Next</button>
          </div>}
        </>
    )}
  </>;
}

function useTransaction() {
  const { refresh } = useWallet();
  const [state, setState] = useState<TxState>();
  const busy = useRef(false);
  async function run(action: (report: (tx: TxRef) => void) => Promise<unknown>, success: string) {
    if (busy.current) return;
    busy.current = true;
    let tx: TxRef | undefined;
    setState({ phase: "pending", detail: "Review the request in your wallet." });
    try {
      await action((ref) => {
        tx = ref;
        setState({ phase: "pending", detail: "Submitted. Checking chain results.", tx });
      });
      setState({ phase: "success", detail: success, tx });
      refresh();
      return true;
    } catch (error) {
      setState({ phase: "error", detail: errorText(error), tx });
    } finally {
      busy.current = false;
    }
  }
  return { state, run, busy: state?.phase === "pending" };
}

function MintButton({ badge, taskReady = true }: { badge: Badge; taskReady?: boolean }) {
  const { wallet, pending } = useWallet();
  const { state, run, busy } = useTransaction();
  const label = badge.earned ? "Already earned" : !badge.enabled ? "Minting paused" : badge.minted >= badge.maxSupply ? "Supply exhausted"
    : !wallet ? "Connect a wallet to mint" : !wallet.network ? "Compatible network required"
    : !taskReady ? "Complete the task to mint" : "Mint badge";
  return <>
    <button className="button primary" disabled={busy || pending || !wallet?.network || !taskReady || badge.earned || !badge.enabled || badge.minted >= badge.maxSupply}
      onClick={() => wallet && void run((onTx) => mintBadge(wallet, badge.id, onTx), "The registry recorded the badge for your Rome account.")}>
      {busy ? "Mint in progress…" : label}
    </button>
    <TransactionStatus state={state} />
  </>;
}

function FollowMint({ badge, task }: { badge: Badge; task: FollowTask }) {
  const { handle, url } = followTasks[task];
  const [opened, setOpened] = useState(() => hasXVisit(task));
  return <>
    {!badge.earned && <section className="transaction" aria-label="Follow task">
      <strong>Visit {handle} on X</strong>
      <p className="my-2" role="status">{opened ? "Task complete. You can mint when your wallet is ready." : "Open the profile in a new tab to unlock minting here."}</p>
      <a className="button secondary" href={url} target="_blank" rel="noreferrer" onClick={() => { recordXVisit(task); setOpened(true); }}>
        Open {handle} on X ↗
      </a>
    </section>}
    <MintButton badge={badge} taskReady={opened} />
  </>;
}

export function BadgeDetail({ id }: { id: string }) {
  const { wallet } = useWallet();
  const address = wallet?.address;
  const read = useCallback(() => readBadge(BigInt(id), address), [id, address]);
  const result = useRead(read);
  if (!badgeAddress) return <EmptyState title="Registry awaiting deployment" text="A Hadrian contract is required to load this badge." />;
  if (!result) return <Loading label="Reading badge details…" />;
  if (result.error) return <ErrorNotice text={result.error} />;
  const badge = result.data;
  if (!badge) return null;
  const inline = readInlineMetadata(badge.metadataURI);
  const task = inline?.follow;
  return <article className="panel detail">
    <span className="eyebrow">Hadrian achievement</span>
    <BadgeArt badge={badge} detail />
    <Supply badge={badge} />
    {httpsUrl(badge.metadataURI) && <a className="text-button" href={httpsUrl(badge.metadataURI)} target="_blank" rel="noreferrer">Metadata ↗</a>}
    {task ? <FollowMint key={id + ":" + address} badge={badge} task={task} />
      : inline?.goal ? <ActivityRequirement milestone={inline.goal}>{(ready) => <MintButton badge={badge} taskReady={ready} />}</ActivityRequirement>
      : <MintButton badge={badge} />}
  </article>;
}

export function Admin() {
  const { wallet } = useWallet();
  const read = useCallback(() => client.readContract({ ...contract(), functionName: "owner" }), []);
  const owner = useRead(read);
  const readPresets = useCallback(() => readPresetIds(badgePresets.map(badgeMetadataURI)), []);
  const onChainPresets = useRead(readPresets);
  const { state, run, busy } = useTransaction();
  const [checking, setChecking] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [published, setPublished] = useState<string[]>([]);
  const [review, setReview] = useState<{ name: string; uri: string; maximum: bigint; gas: bigint }>();
  if (!badgeAddress) return <EmptyState title="Registry awaiting deployment" text="Deploy the registry before configuring badges." />;
  if (!owner) return <Loading label="Checking the registry owner…" />;
  if (owner.error) return <ErrorNotice text={owner.error} />;
  if (!owner.data || wallet?.lane !== "evm" || !wallet.network || !isAddressEqual(wallet.address, owner.data)) {
    return <EmptyState title="Owner access required" text="Connect the registry owner's MetaMask account and switch to Hadrian." />;
  }
  function submit(event: FormEvent<HTMLFormElement>, update: boolean) {
    event.preventDefault();
    if (!wallet) return;
    const data = new FormData(event.currentTarget);
    void run((onTx) => {
      const enabled = data.get("enabled") === "on";
      if (update) return configureBadge(wallet, { id: BigInt(String(data.get("id"))), enabled }, onTx);
      const uri = httpsUrl(String(data.get("uri")));
      if (!uri || new TextEncoder().encode(uri).length > 256) throw new Error("Enter an HTTPS metadata URL of at most 256 bytes.");
      const cap = BigInt(String(data.get("cap")));
      if (cap < 1n || cap > (1n << 64n) - 1n) throw new Error("Supply must fit in an unsigned 64-bit integer.");
      return configureBadge(wallet, { uri, cap, enabled }, onTx);
    }, update ? "Badge settings updated." : "Badge type created.");
  }
  async function reviewPreset(preset: typeof badgePresets[number]) {
    if (!wallet || busy || checking) return;
    setChecking(true);
    setReview(undefined);
    setQuoteError("");
    try {
      const uri = badgeMetadataURI(preset);
      const quote = await quoteBadgeCreation(wallet.address, { uri, cap: 10n, enabled: true });
      setReview({ name: preset.name, uri, ...quote });
    } catch (error) {
      setQuoteError(errorText(error));
    } finally {
      setChecking(false);
    }
  }
  async function publishPreset() {
    if (!review || !wallet || busy) return;
    const { name, uri, maximum } = review;
    const done = await run((onTx) => configureBadge(wallet, { uri, cap: 10n, enabled: true }, onTx, maximum), name + " created.");
    setReview(undefined);
    if (done) setPublished((names) => [...names, name]);
  }
  return <>
    <section className="panel mb-5">
      <span className="eyebrow">Badge presets</span>
      <h2 className="mt-2">Add a badge in two steps</h2>
      <p className="muted my-3">Each preset allows 10 claims. Review the live fee, then confirm the selected badge in MetaMask.</p>
      <div className="badge-grid">
        {badgePresets.map((preset) => {
          const id = onChainPresets?.data?.[badgeMetadataURI(preset)];
          return (
          <article key={preset.name} id={"preset-" + preset.artwork} className="panel badge-card scroll-mt-4">
            <div className="badge-art"><BadgeArtwork artwork={preset.artwork} /></div>
            <h3>{preset.name}</h3>
            <p className="muted">{preset.follow ? "X task · Visit " + followTasks[preset.follow].handle : preset.description}</p>
            {id ? <Link className="text-button" href={"/badge/" + id}>Published · Badge #{String(id)} →</Link>
              : <button className="button secondary" disabled={checking || busy || published.includes(preset.name) || !onChainPresets?.data}
                onClick={() => void reviewPreset(preset)}>{published.includes(preset.name) ? "Published ✓" : "Review fee"}</button>}
          </article>
        );})}
      </div>
      {onChainPresets?.error && <ErrorNotice text={onChainPresets.error} />}
      {checking && <p className="muted mt-3" role="status">Estimating on Hadrian…</p>}
      {quoteError && <ErrorNotice text={quoteError} />}
      {review && <div className="transaction">
        <strong>{review.name}</strong>
        <p>Rome Hadrian · {wallet.address} · 10 claims · Minting enabled</p>
        <p>Padded gas limit {review.gas.toString()} · Maximum fee {formatUnits(review.maximum, 18)} testnet USDC</p>
        <button className="button primary mt-2" disabled={busy} onClick={() => void publishPreset()}>Approve and open MetaMask</button>
      </div>}
      <TransactionStatus state={state} />
    </section>
    <div className="badge-grid">
      <form className="panel form" onSubmit={(event) => submit(event, false)}>
        <h2>Create badge type</h2>
        <label>HTTPS metadata URL<input name="uri" type="url" required maxLength={256} /></label>
        <label>Max supply<input name="cap" required inputMode="numeric" pattern="[1-9][0-9]*" maxLength={20} /></label>
        <label className="check"><input name="enabled" type="checkbox" defaultChecked /> Enable minting</label>
        <button className="button primary" disabled={busy}>Create badge</button>
      </form>
      <form className="panel form" onSubmit={(event) => submit(event, true)}>
        <h2>Configure minting</h2>
        <label>Badge type ID<input name="id" required inputMode="numeric" pattern="[1-9][0-9]*" maxLength={78} /></label>
        <label className="check"><input name="enabled" type="checkbox" /> Enable minting</label>
        <button className="button primary" disabled={busy}>Save settings</button>
      </form>
    </div>
  </>;
}

export function Activity() {
  const [before, setBefore] = useState<bigint>();
  const { refresh } = useWallet();
  const read = useCallback(() => readActivity(before), [before]);
  const result = useRead(read);
  if (!badgeAddress) return <EmptyState title="No registry to scan" text="Activity shows events from the configured Hadrian contract." />;
  if (!result) return <Loading label="Reading Hadrian events…" />;
  if (result.error) return <><ErrorNotice text={result.error} /><button className="button quiet" onClick={refresh}>Retry</button></>;
  if (!result.data) return null;
  const { logs, start, latest, previous } = result.data;
  return <>
    {deploymentBlock === undefined && <p className="muted">Set the deployment block to bound historical browsing.</p>}
    <div className="pagination">
      <span>Blocks {String(start)}–{String(latest)}</span>
      <button className="button quiet" onClick={() => { setBefore(undefined); refresh(); }}>Latest</button>
      {previous !== undefined && <button className="button secondary" onClick={() => setBefore(previous)}>Older blocks</button>}
    </div>
    {logs.length ? <ul className="panel event-list">
      {logs.map((log) => <li key={log.transactionHash + ":" + log.logIndex}>
        <div><strong>{log.eventName === "BadgeMinted" ? "Badge minted" : log.eventName === "BadgeTypeCreated" ? "Badge type created" : "Badge settings updated"}</strong>
          <div><Link href={"/badge/" + log.args.badgeTypeId}>Badge #{String(log.args.badgeTypeId)}</Link>
            {log.eventName === "BadgeMinted" && <code>{log.args.account}</code>}</div></div>
        <ExplorerLink tx={{ evm: log.transactionHash }} />
      </li>)}
    </ul> : <EmptyState title="No events in this range" text="New claims and owner actions will appear here when indexed by Rome." />}
  </>;
}
