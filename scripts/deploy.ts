import { existsSync, writeFileSync } from "node:fs";
import { createWalletClient, getAddress, http, isAddressEqual } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { artifact, client, plan } from "./deployment-plan.ts";

if (!process.argv.includes("--broadcast")) throw new Error("Run preflight and approve the printed deployment plan before passing --broadcast.");
if (existsSync("deployment.json")) throw new Error("Existing deployment record. Inspect it before considering a second deployment.");
const deployer = process.env.DUALBADGE_DEPLOYER;
const key = process.env.ROME_EVM_KEY;
const approvedHash = process.env.DUALBADGE_APPROVED_BYTECODE_HASH;
const approvedFee = process.env.DUALBADGE_APPROVED_MAX_FEE_WEI;
if (!deployer || !key || !/^0x[\da-f]{64}$/i.test(key) || !approvedHash || !approvedFee || !/^[1-9]\d*$/.test(approvedFee)) {
  throw new Error("Set the approved deployer, bytecode hash, maximum total fee in base units, and local signer key.");
}
const account = privateKeyToAccount(key as `0x${string}`);
if (!isAddressEqual(account.address, getAddress(deployer))) throw new Error("The signing key does not match the approved deployer.");

const { chain, info, balance, gas, maxFeePerGas, maxPriorityFeePerGas } = await plan(account.address);
const cost = gas * maxFeePerGas;
if (info.bytecodeHash !== approvedHash || cost > BigInt(approvedFee) || balance < cost) {
  throw new Error("Bytecode, fee cap, or balance differs from the approved deployment constraints. Rerun preflight.");
}

const wallet = createWalletClient({ account, chain, transport: http(chain.rpcUrls.default.http[0], { retryCount: 0 }) });
const submittedAt = new Date().toISOString();
writeFileSync("deployment.json", JSON.stringify({ ...info, status: "broadcasting", submittedAt }, null, 2) + "\n", { flag: "wx" });
const hash = await wallet.deployContract({
  abi: artifact.abi, bytecode: artifact.bytecode, gas, maxFeePerGas, maxPriorityFeePerGas, type: "eip1559",
});
const record = { ...info, hash, transactionUrl: new URL("tx/" + hash, info.explorer).href, submittedAt };
writeFileSync("deployment.json", JSON.stringify({ ...record, status: "submitted" }, null, 2) + "\n");
console.log(record.transactionUrl);

const receipt = await client.waitForTransactionReceipt({ hash, timeout: 120000, checkReplacement: false });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Deployment reverted. See the recorded transaction.");
const block = await client.getBlock({ blockNumber: receipt.blockNumber });
const result = {
  ...record, status: "success", address: receipt.contractAddress,
  blockNumber: String(receipt.blockNumber), gasUsed: String(receipt.gasUsed),
  timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
};
writeFileSync("deployment.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
