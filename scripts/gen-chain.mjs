import { mkdir, writeFile } from "node:fs/promises";
import { getChain, getContracts } from "@rome-protocol/registry";

const hadrian = getChain(200010);
if (!hadrian?.romeEvmProgramId || hadrian.solana?.cluster !== "devnet") {
  throw new Error("Registry entry for Hadrian is missing or has changed clusters.");
}
await mkdir("lib/generated", { recursive: true });
const addresses = (names) => getContracts(hadrian.chainId)
  .filter((contract) => names.includes(contract.name))
  .flatMap((contract) => contract.versions.map((version) => version.address));
const activity = {
  swapRouters: addresses(["RomeDexRouter", "RomeClmmRouter"]),
  bridgeRouters: addresses(["RomeBridgeWithdraw"]),
};
await writeFile("lib/generated/hadrian.json", JSON.stringify({ ...hadrian, activity }, null, 2) + "\n");
