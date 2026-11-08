import { createPublicClient, getAbiItem, http, parseAbi, type Address } from "viem";
import { badgeAddress, chain, deploymentBlock } from "./chain";
import { readArtwork, readFollowTask, readMilestone, type Artwork, type FollowTask, type Milestone } from "./badge-presets";

export const abi = parseAbi([
  "function owner() view returns (address)",
  "function badgeTypeCount() view returns (uint256)",
  "function totalMinted() view returns (uint256)",
  "function getBadgeType(uint256 badgeTypeId) view returns ((string metadataURI, uint64 maxSupply, uint64 minted, bool enabled))",
  "function hasBadge(uint256 badgeTypeId, address account) view returns (bool)",
  "function mintBadge(uint256 badgeTypeId)",
  "function createBadgeType(string metadataURI, uint64 maxSupply, bool enabled) returns (uint256 badgeTypeId)",
  "function setBadgeTypeEnabled(uint256 badgeTypeId, bool enabled)",
  "error InvalidBadgeType(uint256 badgeTypeId)",
  "error BadgeDisabled(uint256 badgeTypeId)",
  "error SupplyExhausted(uint256 badgeTypeId)",
  "error AlreadyMinted(uint256 badgeTypeId, address account)",
  "error InvalidMetadataURI()",
  "error InvalidSupply()",
  "error OwnableUnauthorizedAccount(address account)",
  "event BadgeMinted(uint256 indexed badgeTypeId, address indexed account)",
  "event BadgeTypeCreated(uint256 indexed badgeTypeId, string metadataURI, uint64 maxSupply, bool enabled)",
  "event BadgeTypeUpdated(uint256 indexed badgeTypeId, bool enabled)",
]);

export const romeRpc = "/api/rpc/rome";
export const mintedEvent = getAbiItem({ abi, name: "BadgeMinted" });
export const client = createPublicClient({ chain, transport: http(romeRpc, { retryCount: 0, timeout: 16000 }) });
export function contract() {
  if (!badgeAddress) throw new Error("The Hadrian deployment address is missing or invalid.");
  return { address: badgeAddress, abi };
}

export async function readBadge(id: bigint, account?: Address) {
  const [badge, earned] = await Promise.all([
    client.readContract({ ...contract(), functionName: "getBadgeType", args: [id] }),
    account ? client.readContract({ ...contract(), functionName: "hasBadge", args: [id, account] }) : false,
  ]);
  return { ...badge, id, earned };
}

export async function readCatalog(page: bigint, account?: Address) {
  const [count, total] = await Promise.all([
    client.readContract({ ...contract(), functionName: "badgeTypeCount" }),
    client.readContract({ ...contract(), functionName: "totalMinted" }),
  ]);
  const offset = page * 12n;
  const ids: bigint[] = [];
  for (let id = offset + 1n; id <= count && id <= offset + 12n; id++) ids.push(id);
  return { count, total, next: offset + 12n < count, badges: await Promise.all(ids.map((id) => readBadge(id, account))) };
}

export async function readPresetIds(uris: readonly string[]) {
  const ids: Record<string, bigint> = {};
  const xKey = (uri: string) => {
    const metadata = readInlineMetadata(uri);
    return metadata?.follow ? metadata.follow + ":" + metadata.artwork + ":" + metadata.name : undefined;
  };
  const xPresets = new Map(uris.flatMap((uri) => {
    const key = xKey(uri);
    return key ? [[key, uri] as const] : [];
  }));
  for (let page = 0n; ; page++) {
    const { badges, next } = await readCatalog(page);
    for (const badge of badges) {
      const uri = uris.includes(badge.metadataURI) ? badge.metadataURI : xPresets.get(xKey(badge.metadataURI) ?? "");
      if (uri && ids[uri] === undefined) ids[uri] = badge.id;
    }
    if (!next || Object.keys(ids).length === uris.length) return ids;
  }
}

export async function readActivity(before?: bigint) {
  const latest = before ?? await client.getBlockNumber();
  const floor = deploymentBlock ?? 0n;
  const start = latest > floor + 499n ? latest - 499n : floor;
  const { address } = contract();
  const logs = start <= latest ? await client.getLogs({
    address, events: [mintedEvent, getAbiItem({ abi, name: "BadgeTypeCreated" }), getAbiItem({ abi, name: "BadgeTypeUpdated" })],
    fromBlock: start, toBlock: latest, strict: true,
  }) : [];
  return { logs: logs.reverse(), start, latest, previous: start > floor ? start - 1n : undefined };
}

export function httpsUrl(input: string): string | undefined {
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

const inlineMetadataPrefix = "data:application/json,";

type InlineMetadata = { name: string; description: string; artwork?: Artwork; follow?: FollowTask; goal?: Milestone };

export function badgeMetadataURI(metadata: InlineMetadata) {
  const uri = inlineMetadataPrefix + encodeURIComponent(JSON.stringify(metadata));
  if (uri.length > 256) throw new Error("Badge metadata is too long.");
  return uri;
}

export function readInlineMetadata(uri: string): InlineMetadata | undefined {
  if (!uri.startsWith(inlineMetadataPrefix) || uri.length > 256) return undefined;
  try {
    const value = JSON.parse(decodeURIComponent(uri.slice(inlineMetadataPrefix.length)));
    if (typeof value?.name === "string" && typeof value.description === "string") {
      return { name: value.name, description: value.description, artwork: readArtwork(value.artwork), follow: readFollowTask(value.follow), goal: readMilestone(value.goal) };
    }
  } catch {
    // Invalid on-chain metadata falls back to the badge ID and illustration.
  }
}
