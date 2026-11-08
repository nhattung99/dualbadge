import { decodeEventLog, decodeFunctionData, isAddressEqual, parseAbi, parseAbiItem, type Address, type Hash } from "viem";
import { client } from "./badges";
import { hadrian } from "./chain";

const swapEvent = parseAbiItem("event Swapped(address indexed user, bytes32 indexed poolId, bool direction, uint64 amountIn, uint64 amountOut)");
const bridgeAbi = parseAbi([
  "function bridgeOutToSolana(bytes32 recipient, uint256 amount, bytes32 mint)",
  "function burnUSDC(uint256 amount, address recipient, uint32 destinationDomain)",
  "function burnETH(uint256 amount, address recipient)",
  "function burnToWormhole(address wrapper, uint256 amount, bytes32 recipient, uint16 targetChain)",
]);
const swaps = new Set(hadrian.activity.swapRouters.map((address) => address.toLowerCase()));
const bridges = new Set(hadrian.activity.bridgeRouters.map((address) => address.toLowerCase()));

export const proofLimit = 30;
export const hashPattern = /^0x[\da-f]{64}$/i;
export type Proof = { hash: Hash; swap: boolean; bridge: boolean };

export async function verifyProof(hash: Hash, account: Address): Promise<Proof> {
  const receipt = await client.getTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("This Hadrian transaction reverted.");
  if (!isAddressEqual(receipt.from, account)) throw new Error("The Hadrian sender does not match your connected Rome account.");
  const swap = receipt.logs.some((log) => {
    if (!swaps.has(log.address.toLowerCase())) return false;
    try {
      const { args } = decodeEventLog({ abi: [swapEvent], data: log.data, topics: log.topics });
      return isAddressEqual(args.user, account) && args.amountOut > 0n;
    } catch {
      return false;
    }
  });
  let bridge = false;
  if (receipt.to && bridges.has(receipt.to.toLowerCase())) {
    const tx = await client.getTransaction({ hash });
    try {
      const { functionName, args } = decodeFunctionData({ abi: bridgeAbi, data: tx.input });
      const amount = functionName === "burnUSDC" || functionName === "burnETH" ? args[0] : args[1];
      bridge = amount > 0n;
    } catch {
      // Successful administrative or approval calls do not count as bridges.
    }
  }
  return { hash, swap, bridge };
}
