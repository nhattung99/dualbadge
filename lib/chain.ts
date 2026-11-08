import { defineChain, getAddress, isAddress } from "viem";
import config from "./generated/hadrian.json";

export const hadrian = config;
export const chain = defineChain({
  id: config.chainId,
  name: config.name,
  nativeCurrency: config.nativeCurrency,
  rpcUrls: { default: { http: [config.rpcUrl] } },
  blockExplorers: { default: { name: "Rome Via", url: config.explorerUrl } },
  testnet: true,
});

const configuredAddress = process.env.NEXT_PUBLIC_BADGE_ADDRESS;
export const badgeAddress = configuredAddress && isAddress(configuredAddress)
  ? getAddress(configuredAddress)
  : undefined;

const configuredBlock = process.env.NEXT_PUBLIC_BADGE_DEPLOYMENT_BLOCK ?? "";
export const deploymentBlock = /^\d+$/.test(configuredBlock) ? BigInt(configuredBlock) : undefined;
