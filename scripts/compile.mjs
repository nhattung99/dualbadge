import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import solc from "solc";

const sourceName = "contracts/DualBadge.sol";
const settings = {
  evmVersion: "paris",
  optimizer: { enabled: true, runs: 200 },
  outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
};
const output = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity",
  sources: { [sourceName]: { content: readFileSync(sourceName, "utf8") } },
  settings,
}), { import: (path) => {
  try {
    return { contents: readFileSync(join("node_modules", path), "utf8") };
  } catch {
    return { error: "Import unavailable: " + path };
  }
} }));

for (const item of output.errors ?? []) console.error(item.formattedMessage);
if (output.errors?.some((item) => item.severity === "error")) process.exit(1);
const contract = output.contracts[sourceName].DualBadge;
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/DualBadge.json", JSON.stringify({
  contractName: "DualBadge",
  abi: contract.abi,
  bytecode: "0x" + contract.evm.bytecode.object,
  deployedBytecode: "0x" + contract.evm.deployedBytecode.object,
  compiler: solc.version(),
  settings,
}, null, 2));
console.log("Compiled DualBadge with " + solc.version() + " for " + settings.evmVersion);
