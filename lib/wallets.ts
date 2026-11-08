import { getWallets } from "@wallet-standard/app";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { buildRome1559Fees, padRomeGas, submitRomeTx, submitRomeTxSolanaLane, syntheticAddress } from "@rome-protocol/sdk";
import { decodeEventLog, encodeFunctionData, getAddress, isAddress, isAddressEqual, toHex, type Address, type Hex } from "viem";
import { client, contract, mintedEvent, romeRpc } from "./badges";
import { chain, hadrian } from "./chain";

type Provider = {
  isMetaMask?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, listener: () => void): void;
  removeListener(event: string, listener: () => void): void;
};
type StandardWallet = ReturnType<ReturnType<typeof getWallets>["get"]>[number];
type Account = StandardWallet["accounts"][number];
type Connect = { connect(): Promise<{ accounts: readonly Account[] }> };
type Disconnect = { disconnect(): Promise<void> };
type Events = { on(event: "change", listener: () => void): () => void };
type Sign = {
  supportedTransactionVersions: readonly (string | number)[];
  signTransaction(input: { account: Account; chain: string; transaction: Uint8Array }): Promise<readonly { signedTransaction: Uint8Array }[]>;
};

export type Wallet = (
  { lane: "evm"; provider: Provider; address: Address; network: boolean } |
  { lane: "solana"; wallet: StandardWallet; account: Account; address: Address; network: boolean }
);

export type TxRef = { evm?: Hex; solana?: string };
const solanaChain = "solana:" + hadrian.solana.cluster;
const devnetGenesisHash = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const chainHex = toHex(chain.id);

export async function readMetaMask(provider: Provider): Promise<Wallet | null> {
  const [accounts, currentChain] = await Promise.all([
    provider.request({ method: "eth_accounts" }) as Promise<string[]>,
    provider.request({ method: "eth_chainId" }) as Promise<string>,
  ]);
  const address = accounts[0];
  return address && isAddress(address)
    ? { lane: "evm", provider, address: getAddress(address), network: BigInt(currentChain) === BigInt(chain.id) }
    : null;
}

export async function connectMetaMask() {
  const w = window as Window & { ethereum?: Provider & { providers?: Provider[] }; phantom?: { ethereum?: Provider } };
  const provider = [...(w.ethereum?.providers ?? []), w.ethereum].find((p) => p?.isMetaMask && p !== w.phantom?.ethereum);
  if (!provider) throw new Error("Open DualBadge in a browser with MetaMask installed.");
  await provider.request({ method: "eth_requestAccounts" });
  const wallet = await readMetaMask(provider);
  if (!wallet) throw new Error("MetaMask did not expose an authorized account.");
  return wallet;
}

export async function chooseMetaMaskAccount(provider: Provider) {
  await provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
  const wallet = await readMetaMask(provider);
  if (!wallet) throw new Error("Choose an account to connect in MetaMask.");
  return wallet;
}

export async function switchNetwork(provider: Provider) {
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
  } catch (error) {
    if ((error as { code?: number }).code !== 4902) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [{
      chainId: chainHex, chainName: chain.name, nativeCurrency: chain.nativeCurrency,
      rpcUrls: [hadrian.rpcUrl], blockExplorerUrls: [hadrian.explorerUrl],
    }] });
  }
  return readMetaMask(provider);
}

export function readPhantom(wallet: StandardWallet, account = wallet.accounts[0]): Wallet | null {
  if (!account) return null;
  const feature = wallet.features["solana:signTransaction"] as Sign | undefined;
  return {
    lane: "solana", wallet, account, address: getAddress(syntheticAddress(new PublicKey(account.publicKey))),
    network: wallet.chains.includes(solanaChain as `solana:${string}`) &&
      account.chains.includes(solanaChain as `solana:${string}`) &&
      (feature?.supportedTransactionVersions.includes("legacy") ?? false),
  };
}

export async function connectPhantom() {
  const wallet = getWallets().get().find((wallet) => wallet.name === "Phantom");
  const connect = wallet?.features["standard:connect"] as Connect | undefined;
  if (!wallet || !connect) throw new Error("Open DualBadge in a browser with Phantom installed.");
  const { accounts } = await connect.connect();
  const connected = readPhantom(wallet, accounts[0]);
  if (!connected) throw new Error("Phantom did not expose a Solana account.");
  return connected;
}

export function watchWallet(wallet: Wallet, update: (wallet: Wallet | null) => void) {
  if (wallet.lane === "solana") {
    const events = wallet.wallet.features["standard:events"] as Events | undefined;
    return events?.on("change", () => update(readPhantom(wallet.wallet)));
  }
  let active = true;
  let revision = 0;
  const refresh = () => {
    const current = ++revision;
    void readMetaMask(wallet.provider).then(
      (result) => { if (active && current === revision) update(result); },
      () => { if (active && current === revision) update(null); },
    );
  };
  const disconnect = () => { active = false; update(null); };
  wallet.provider.on("accountsChanged", refresh);
  wallet.provider.on("chainChanged", refresh);
  wallet.provider.on("disconnect", disconnect);
  return () => {
    active = false;
    wallet.provider.removeListener("accountsChanged", refresh);
    wallet.provider.removeListener("chainChanged", refresh);
    wallet.provider.removeListener("disconnect", disconnect);
  };
}

export async function disconnectWallet(wallet: Wallet) {
  if (wallet.lane === "solana") {
    const feature = wallet.wallet.features["standard:disconnect"] as Disconnect | undefined;
    await feature?.disconnect();
  }
}

async function sendEvm(wallet: Extract<Wallet, { lane: "evm" }>, to: Address, data: Hex, onTx: (tx: TxRef) => void, maxTotalFee?: bigint) {
  // Recheck inside the SDK's final request, after its asynchronous fee lookups.
  const hash = await submitRomeTx({ request: async (request) => {
    if (request.method === "eth_sendTransaction") {
      const current = await readMetaMask(wallet.provider);
      if (!current?.network || !isAddressEqual(current.address, wallet.address)) {
        throw new Error("MetaMask account or network changed. Reconnect and retry.");
      }
      if (maxTotalFee !== undefined) {
        const tx = request.params?.[0] as { gas?: Hex; maxFeePerGas?: Hex } | undefined;
        if (!tx?.gas || !tx.maxFeePerGas || BigInt(tx.gas) * BigInt(tx.maxFeePerGas) > maxTotalFee) {
          throw new Error("The transaction fee changed. Review a fresh quote before signing.");
        }
      }
    }
    return wallet.provider.request(request);
  } }, { from: wallet.address, to, data });
  onTx({ evm: hash });
  const receipt = await client.waitForTransactionReceipt({ hash, timeout: 90000, checkReplacement: false });
  if (receipt.status !== "success") throw new Error("The Hadrian transaction reverted.");
  return receipt;
}

async function assertHadrian() {
  if (await client.getChainId() !== chain.id) throw new Error("The Rome RPC did not return the Hadrian chain ID.");
}

export async function mintBadge(wallet: Wallet, id: bigint, onTx: (tx: TxRef) => void) {
  if (!wallet.network) throw new Error("Select a wallet compatible with the Hadrian testnet.");
  const target = contract();
  await assertHadrian();
  if (wallet.lane === "evm" && await client.getBalance({ address: wallet.address }) === 0n) {
    throw new Error("The connected account has 0 native USDC on Rome Hadrian. Verify the account shown in DualBadge.");
  }
  const { request } = await client.simulateContract({ ...target, functionName: "mintBadge", args: [id], account: wallet.address });
  const data = encodeFunctionData(request);
  if (wallet.lane === "evm") {
    const receipt = await sendEvm(wallet, target.address, data, onTx);
    const minted = receipt.logs.some((log) => {
      if (!isAddressEqual(log.address, target.address)) return false;
      try {
        const event = decodeEventLog({ abi: [mintedEvent], data: log.data, topics: log.topics });
        return event.args.badgeTypeId === id && isAddressEqual(event.args.account, wallet.address);
      } catch {
        return false;
      }
    });
    if (!minted) throw new Error("The receipt did not contain the expected badge mint.");
    return;
  }

  const connection = new Connection(new URL("/api/rpc/solana", window.location.origin).href, "confirmed");
  if (await connection.getGenesisHash() !== devnetGenesisHash) throw new Error("The configured Solana RPC is not devnet.");
  const payer = new PublicKey(wallet.account.publicKey);
  const start = await client.getBlockNumber();
  if (await connection.getBalance(payer) === 0) throw new Error("Phantom needs devnet SOL for transaction fees and account rent.");

  // No SPL transfer or CPI signer is used by mintBadge, so it does not need the external-authority PDA.
  // Surface the broadcast signature even when the SDK's subsequent confirmation throws.
  const broadcast = connection.sendRawTransaction.bind(connection);
  connection.sendRawTransaction = async (...args) => {
    const signature = await broadcast(...args);
    onTx({ solana: signature });
    return signature;
  };
  const { signature } = await submitRomeTxSolanaLane({
    connection, proxyUrl: romeRpc, chainId: chain.id, programId: hadrian.romeEvmProgramId, payer,
    signTransaction: async (tx) => {
      const current = readPhantom(wallet.wallet);
      const sign = wallet.wallet.features["solana:signTransaction"] as Sign | undefined;
      if (!current?.network || !isAddressEqual(current.address, wallet.address) || !sign) {
        throw new Error("Phantom account or devnet support changed. Reconnect and retry.");
      }
      const message = tx.serializeMessage();
      const [output] = await sign.signTransaction({
        account: wallet.account, chain: solanaChain,
        transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }),
      });
      if (!output) throw new Error("Phantom returned no signed transaction.");
      const signed = Transaction.from(output.signedTransaction);
      if (!message.equals(signed.serializeMessage())) throw new Error("Phantom returned a modified transaction.");
      return signed;
    },
  }, { to: target.address, data, autoProvision: false });

  // A Solana confirmation alone cannot prove this EVM call minted. Bind the exact mint
  // event to the wallet's Solana signature through Rome's settlement mapping.
  for (let attempt = 0; attempt < 20; attempt++) {
    const latest = await client.getBlockNumber({ cacheTime: 0 });
    const fromBlock = latest > start + 499n ? latest - 499n : start;
    const logs = await client.getLogs({
      address: target.address, event: mintedEvent, args: { badgeTypeId: id, account: wallet.address },
      fromBlock, toBlock: latest, strict: true,
    });
    for (const log of logs) {
      const response = await fetch(romeRpc, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "rome_solanaTxForEvmTx", params: [log.transactionHash] }),
      });
      const { result } = await response.json() as { result?: string[] };
      if (Array.isArray(result) && result.includes(signature)) {
        onTx({ solana: signature, evm: log.transactionHash });
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Solana confirmed. Rome did not index a matching badge event and settlement in time. Check the transaction before retrying.");
}

type CreateBadgeAction = { uri: string; cap: bigint; enabled: boolean };
type AdminAction = CreateBadgeAction | { id: bigint; enabled: boolean };

export async function quoteBadgeCreation(account: Address, action: CreateBadgeAction) {
  await assertHadrian();
  const target = contract();
  const { request } = await client.simulateContract({
    ...target, account, functionName: "createBadgeType", args: [action.uri, action.cap, action.enabled],
  });
  const [estimate, gasPrice, block, tip, balance] = await Promise.all([
    client.estimateGas({ account, to: target.address, data: encodeFunctionData(request) }),
    client.getGasPrice(), client.getBlock().catch(() => undefined),
    client.estimateMaxPriorityFeePerGas().catch(() => undefined), client.getBalance({ address: account }),
  ]);
  const { maxFeePerGas } = buildRome1559Fees({ baseFeePerGas: block?.baseFeePerGas ?? undefined, suggestedPriorityFee: tip, gasPrice });
  if (!maxFeePerGas) throw new Error("Hadrian did not return usable fee data.");
  const gas = padRomeGas(estimate);
  const maximum = gas * maxFeePerGas;
  if (maximum > balance) throw new Error("This wallet needs more Hadrian USDC for the quoted maximum fee.");
  return { gas, maximum };
}
export async function configureBadge(wallet: Wallet, action: AdminAction, onTx: (tx: TxRef) => void, maxTotalFee?: bigint) {
  if (wallet.lane !== "evm" || !wallet.network) throw new Error("Connect the owner's MetaMask account on Hadrian.");
  await assertHadrian();
  const target = contract();
  const account = wallet.address;
  const data = "id" in action
    ? encodeFunctionData((await client.simulateContract({ ...target, account, functionName: "setBadgeTypeEnabled", args: [action.id, action.enabled] })).request)
    : encodeFunctionData((await client.simulateContract({ ...target, account, functionName: "createBadgeType", args: [action.uri, action.cap, action.enabled] })).request);
  await sendEvm(wallet, target.address, data, onTx, maxTotalFee);
}
