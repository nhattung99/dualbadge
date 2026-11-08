import { getAddress, isAddress } from "viem";
import { client, plan } from "./deployment-plan.ts";

const deployer = process.env.DUALBADGE_DEPLOYER;
if (deployer) {
  if (!isAddress(deployer)) throw new Error("DUALBADGE_DEPLOYER must be a public EVM address.");
  console.log(JSON.stringify((await plan(getAddress(deployer))).info, null, 2));
} else {
  const chainId = await client.getChainId();
  if (chainId !== client.chain.id) throw new Error("Unexpected chain ID.");
  console.log(JSON.stringify({
    network: client.chain.name, chainId,
    rpc: client.chain.rpcUrls.default.http[0],
    nativeCurrency: client.chain.nativeCurrency.symbol,
    gasPrice: String(await client.getGasPrice()),
    next: "Set DUALBADGE_DEPLOYER to the public deployer address for a wallet-specific deployment estimate.",
  }, null, 2));
}
