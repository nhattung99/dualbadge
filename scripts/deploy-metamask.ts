import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { formatUnits, getAddress, isAddressEqual, keccak256, toHex, type Hash } from "viem";
import { artifact, client, plan } from "./deployment-plan.ts";

const deployer = process.env.DUALBADGE_DEPLOYER;
const approvedHash = process.env.DUALBADGE_APPROVED_BYTECODE_HASH;
const feeCap = process.env.DUALBADGE_APPROVED_MAX_FEE_WEI;
if (!deployer || !approvedHash || !feeCap || !/^[1-9]\d*$/.test(feeCap)) {
  throw new Error("Set the reviewed deployer, bytecode hash, and total fee cap before opening the MetaMask page.");
}

const address = getAddress(deployer.toLowerCase());
const recordPath = "deployment.json";
if (existsSync(recordPath)) throw new Error("A deployment record already exists. Inspect it before deploying again.");

async function checkedPlan() {
  const quote = await plan(address);
  if (quote.info.bytecodeHash !== approvedHash) throw new Error("Deployment bytecode changed. Review a new plan.");
  if (BigInt(quote.info.feeCapWei) > BigInt(feeCap!)) throw new Error("Current gas exceeds the reviewed cap. Review a new estimate.");
  if (quote.balance < BigInt(quote.info.feeCapWei)) throw new Error("The wallet has insufficient Hadrian USDC for this estimate.");
  return quote;
}

const first = await checkedPlan();
const origin = "http://127.0.0.1:4178";
const token = randomBytes(24).toString("hex");
const script = readFileSync(new URL("./deploy-metamask.js", import.meta.url));
const page = readFileSync(new URL("./deploy-metamask.html", import.meta.url));
type State = Awaited<ReturnType<typeof plan>>["info"] & {
  status: "broadcasting" | "submitted" | "success" | "error";
  submittedAt: string;
  hash?: Hash;
  transactionUrl?: string;
  message?: string;
};
let state: State | undefined;
let preparing = false;

async function confirm(submitted: State & { hash: Hash }) {
  try {
    const receipt = await client.waitForTransactionReceipt({ hash: submitted.hash, timeout: 120000, checkReplacement: false });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Hadrian reported a reverted deployment.");
    const [tx, block, code, owner] = await Promise.all([
      client.getTransaction({ hash: submitted.hash }),
      client.getBlock({ blockNumber: receipt.blockNumber }),
      client.getCode({ address: receipt.contractAddress }),
      client.readContract({ address: receipt.contractAddress, abi: artifact.abi, functionName: "owner" }),
    ]);
    if (!isAddressEqual(tx.from, address) || tx.to !== null || keccak256(tx.input) !== approvedHash ||
      tx.value !== 0n || tx.gas * (tx.maxFeePerGas ?? tx.gasPrice ?? 0n) > BigInt(feeCap!) ||
      code?.toLowerCase() !== artifact.deployedBytecode.toLowerCase() ||
      !isAddressEqual(String(owner) as `0x${string}`, address)) {
      throw new Error("The mined transaction did not match the reviewed deployment. Inspect the explorer link.");
    }
    const result = {
      ...submitted, status: "success" as const, address: receipt.contractAddress, blockNumber: String(receipt.blockNumber),
      gasUsed: String(receipt.gasUsed),
      feeUSDC: formatUnits(receipt.gasUsed * receipt.effectiveGasPrice, first.chain.nativeCurrency.decimals),
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
    };
    writeFileSync(recordPath, JSON.stringify(result, null, 2) + "\n");
    state = result;
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    state = { ...submitted, status: "error", message: error instanceof Error ? error.message : String(error) };
    writeFileSync(recordPath, JSON.stringify(state, null, 2) + "\n");
    console.error(state.message);
  }
}

const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'");
  const json = (payload: unknown, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(payload));
  };
  if (request.headers.host !== "127.0.0.1:4178") return json({ error: "Use the loopback address." }, 403);

  try {
    if (request.method === "GET") {
      if (request.url === "/") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return response.end(page);
      }
      if (request.url === "/deploy-metamask.js") {
        response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
        return response.end(script);
      }
      if (request.url === "/plan") return json({ token, info: first.info, capUSDC: formatUnits(BigInt(feeCap), 18), state });
      return json({ error: "Not found" }, 404);
    }

    if (request.method !== "POST" || request.headers.origin !== origin || request.headers["x-deployment-token"] !== token) {
      return json({ error: "Invalid deployment session." }, 403);
    }
    if (request.url === "/prepare") {
      if (preparing || state || existsSync(recordPath)) return json({ error: "A deployment is already in progress." }, 409);
      preparing = true;
      try {
        const quote = await checkedPlan();
        const reserved: State = { ...quote.info, status: "broadcasting", submittedAt: new Date().toISOString() };
        writeFileSync(recordPath, JSON.stringify(reserved, null, 2) + "\n", { flag: "wx" });
        state = reserved;
        return json({
          from: address, data: artifact.bytecode, chainId: toHex(quote.chain.id), value: "0x0",
          gas: toHex(quote.gas), maxFeePerGas: toHex(quote.maxFeePerGas), maxPriorityFeePerGas: toHex(quote.maxPriorityFeePerGas),
        });
      } finally {
        preparing = false;
      }
    }
    if (request.url === "/cancel" && state?.status === "broadcasting") {
      unlinkSync(recordPath);
      state = undefined;
      return json({ canceled: true });
    }
    if (state?.status === "broadcasting" && request.url?.startsWith("/submitted/")) {
      const hash = request.url.slice("/submitted/".length) as Hash;
      if (!/^0x[\da-f]{64}$/i.test(hash)) return json({ error: "Invalid transaction hash." }, 400);
      const submitted = { ...state, status: "submitted" as const, hash, transactionUrl: new URL("tx/" + hash, state.explorer).href };
      writeFileSync(recordPath, JSON.stringify(submitted, null, 2) + "\n");
      state = submitted;
      void confirm(submitted);
      return json(submitted);
    }
    return json({ error: "No matching deployment action." }, 409);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

server.listen(4178, "127.0.0.1", () => {
  console.log("Open the deployment page in the browser with your MetaMask wallet: " + origin);
});
