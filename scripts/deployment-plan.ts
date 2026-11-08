import { existsSync, readFileSync } from "node:fs";
import { buildRome1559Fees, padRomeGas } from "@rome-protocol/sdk";
import { createPublicClient, defineChain, formatUnits, http, keccak256, type Abi, type Address, type Hex } from "viem";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}
const registry = JSON.parse(readFileSync("lib/generated/hadrian.json", "utf8"));
const chain = defineChain({
  id: Number(registry.chainId),
  name: String(registry.name),
  nativeCurrency: registry.nativeCurrency,
  rpcUrls: { default: { http: [String(registry.rpcUrl)] } },
  testnet: true,
});
export const client = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0], { timeout: 14000, retryCount: 0 }) });
export const artifact = JSON.parse(readFileSync("artifacts/DualBadge.json", "utf8")) as {
  abi: Abi; bytecode: Hex; deployedBytecode: Hex; compiler: string; settings: { evmVersion: string };
};

export async function plan(deployer: Address) {
  const chainId = await client.getChainId();
  if (chainId !== chain.id || registry.solana.cluster !== "devnet") throw new Error("Wrong chain. Expected Hadrian on Solana devnet.");
  const [estimate, gasPrice, balance] = await Promise.all([
    client.estimateGas({ account: deployer, data: artifact.bytecode }),
    client.getGasPrice(),
    client.getBalance({ address: deployer }),
  ]);
  if (estimate <= 0n || gasPrice <= 0n) throw new Error("Hadrian returned an unusable fee estimate.");
  const fees = buildRome1559Fees({ gasPrice });
  const gas = padRomeGas(estimate);
  const maxFeePerGas = fees.maxFeePerGas ?? gasPrice;
  const maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? 0n;
  const info = {
    network: chain.name, chainId, rpc: chain.rpcUrls.default.http[0], explorer: String(registry.explorerUrl),
    deployer, contract: "DualBadge", constructorArgs: [], owner: deployer,
    bytecodeHash: keccak256(artifact.bytecode), compiler: artifact.compiler, evmVersion: artifact.settings.evmVersion,
    gasEstimate: String(estimate), gasLimit: String(gas),
    maxFeePerGas: String(maxFeePerGas), maxPriorityFeePerGas: String(maxPriorityFeePerGas),
    feeCapWei: String(gas * maxFeePerGas),
    feeCapUSDC: formatUnits(gas * maxFeePerGas, chain.nativeCurrency.decimals),
    balanceUSDC: formatUnits(balance, chain.nativeCurrency.decimals),
  };
  return { chain, info, balance, gas, maxFeePerGas, maxPriorityFeePerGas };
}
