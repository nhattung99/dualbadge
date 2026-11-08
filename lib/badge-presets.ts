export const followTasks = {
  rome: { handle: "@RomeProtocol", url: "https://x.com/RomeProtocol" },
  creator: { handle: "@nhattung00", url: "https://x.com/nhattung00" },
} as const;

export type FollowTask = keyof typeof followTasks;
export type Artwork = "compass" | "torch" | "orbit" | "registry" | "rome" | "creator" | "spark" | "swap" | "bridge" | "crown";
export const milestones = {
  tx1: { kind: "tx", target: 1 }, tx5: { kind: "tx", target: 5 }, tx10: { kind: "tx", target: 10 },
  swap1: { kind: "swap", target: 1 }, swap3: { kind: "swap", target: 3 }, swap5: { kind: "swap", target: 5 },
  bridge1: { kind: "bridge", target: 1 }, bridge3: { kind: "bridge", target: 3 },
} as const;
export type Milestone = keyof typeof milestones;
export type ActivityKind = typeof milestones[Milestone]["kind"];
type Preset = { name: string; description: string; artwork: Artwork; follow?: FollowTask; goal?: Milestone };

export const badgePresets: readonly Preset[] = [
  { name: "First Footstep", description: "Confirm 1 Hadrian transaction.", artwork: "compass", goal: "tx1" },
  { name: "Hadrian Pioneer", description: "Confirm 5 Hadrian transactions.", artwork: "torch", goal: "tx5" },
  { name: "Rome Veteran", description: "Confirm 10 Hadrian transactions.", artwork: "crown", goal: "tx10" },
  { name: "Swap Spark", description: "Complete 1 supported Rome DEX swap.", artwork: "spark", goal: "swap1" },
  { name: "Swap Voyager", description: "Complete 3 supported Rome DEX swaps.", artwork: "orbit", goal: "swap3" },
  { name: "Swap Strategist", description: "Complete 5 supported Rome DEX swaps.", artwork: "swap", goal: "swap5" },
  { name: "Bridge Scout", description: "Submit 1 supported bridge out of Hadrian.", artwork: "bridge", goal: "bridge1" },
  { name: "Bridge Builder", description: "Submit 3 supported bridges out of Hadrian.", artwork: "registry", goal: "bridge3" },
  { name: "Rome Legion", description: "Open the Rome Protocol profile on X to unlock minting.", artwork: "rome", follow: "rome" },
  { name: "Creator Circle", description: "Open the nhattung00 profile on X to unlock minting.", artwork: "creator", follow: "creator" },
];

export function readArtwork(value: unknown): Artwork | undefined {
  return badgePresets.find((preset) => preset.artwork === value)?.artwork;
}

export function readFollowTask(value: unknown): FollowTask | undefined {
  if (value === "rome" || value === "creator") return value;
}

export function recordXVisit(task: FollowTask) {
  try { sessionStorage.setItem("dualbadge:x-visit:" + task, "1"); } catch { /* Keep the current page usable when storage is blocked. */ }
}

export function hasXVisit(task: FollowTask) {
  try { return sessionStorage.getItem("dualbadge:x-visit:" + task) === "1"; } catch { return false; }
}

export function readMilestone(value: unknown): Milestone | undefined {
  if (typeof value === "string" && Object.hasOwn(milestones, value)) return value as Milestone;
}
