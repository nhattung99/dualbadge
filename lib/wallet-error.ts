type RpcError = {
  code?: number | string;
  rpcCode?: number;
  message?: unknown;
  shortMessage?: unknown;
  data?: { originalError?: RpcError; message?: unknown };
};

export function walletErrorText(error: unknown) {
  const rpc = error && typeof error === "object" ? error as RpcError : undefined;
  const original = rpc?.data?.originalError;
  const code = Number(original?.code ?? rpc?.rpcCode ?? rpc?.code);
  const detail = [original?.message, rpc?.data?.message, rpc?.shortMessage, rpc?.message, error]
    .find((message): message is string => typeof message === "string" && message.trim().length > 0)?.trim();
  if (code === 4001) return "You declined the wallet request. Open it again when you're ready.";
  if (code === -32002) return "Your wallet already has an open request. Open the extension and complete or dismiss it.";
  if (code === 4100) return "The wallet has not authorized this account. Choose Change account and reconnect it.";
  if (code === 4900) return "The wallet disconnected. Unlock it and reconnect.";
  if (code === 4901 || code === 4902) return "Switch your wallet to Rome Hadrian (200010) and retry.";
  if (detail && /insufficient funds|insufficient balance|insufficient gas/i.test(detail)) {
    return "The wallet reported insufficient gas funds. Check the connected account's native USDC balance on Rome Hadrian.";
  }
  return detail?.slice(0, 360) ?? "The request failed. Check your wallet and RPC connection.";
}
