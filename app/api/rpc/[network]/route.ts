import { hadrian } from "@/lib/chain";

const methods = {
  rome: new Set(["eth_chainId", "eth_call", "eth_blockNumber", "eth_getLogs", "eth_getCode",
    "eth_getTransactionReceipt", "eth_getTransactionByHash", "eth_getTransactionCount", "eth_estimateGas", "eth_getBlockByNumber",
    "eth_gasPrice", "eth_maxPriorityFeePerGas", "eth_getBalance", "rome_emulateCallAccounts", "rome_solanaTxForEvmTx"]),
  solana: new Set(["getLatestBlockhash", "getSignatureStatuses", "getBlockHeight", "sendTransaction",
    "getBalance", "getAccountInfo", "getGenesisHash", "getTransaction"]),
};

export async function POST(request: Request, { params }: { params: Promise<{ network: string }> }) {
  const { network } = await params;
  if (network !== "rome" && network !== "solana") return new Response(null, { status: 404 });

  try {
    const raw = await request.text();
    if (raw.length > 16000) return new Response(null, { status: 413 });
    const body = JSON.parse(raw) as { method?: string; jsonrpc?: string; params?: unknown[] };
    if (!body?.method || !methods[network].has(body.method) || body.jsonrpc !== "2.0") {
      return Response.json({ error: "RPC method unavailable" }, { status: 400 });
    }
    if (body.method === "eth_getLogs") {
      const filter = body.params?.[0] as { fromBlock?: string; toBlock?: string } | undefined;
      if (!filter?.fromBlock || !filter.toBlock || !/^0x[\da-f]+$/i.test(filter.fromBlock) ||
        !/^0x[\da-f]+$/i.test(filter.toBlock) || BigInt(filter.toBlock) - BigInt(filter.fromBlock) > 500n) {
        return Response.json({ error: "A bounded log range is required" }, { status: 400 });
      }
    }

    const endpoint = network === "rome" ? hadrian.rpcUrl : process.env.SOLANA_RPC_URL || hadrian.solana.rpc;
    if (new URL(endpoint).protocol !== "https:") throw new Error("Expected HTTPS RPC");
    const upstream = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: raw,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(14000),
    });
    return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return Response.json({ error: "RPC request failed" }, { status: 502 });
  }
}
