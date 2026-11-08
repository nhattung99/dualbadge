"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { chooseMetaMaskAccount, connectMetaMask, connectPhantom, disconnectWallet, switchNetwork, watchWallet, type Wallet } from "@/lib/wallets";

import { walletErrorText as errorText } from "@/lib/wallet-error";
export { errorText };

function useWalletState() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => wallet ? watchWallet(wallet, setWallet) : undefined, [wallet]);

  async function connect(action: "evm" | "solana" | "switch" | "choose" | "disconnect") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      if (action === "disconnect") {
        setWallet(null);
        if (wallet) await disconnectWallet(wallet);
      } else if (action === "switch") {
        if (wallet?.lane === "evm") setWallet(await switchNetwork(wallet.provider));
      } else if (action === "choose") {
        if (wallet?.lane === "evm") setWallet(await chooseMetaMaskAccount(wallet.provider));
      } else {
        setWallet(await (action === "evm" ? connectMetaMask() : connectPhantom()));
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function refresh() {
    setRevision((value) => value + 1);
  }
  return { wallet, pending, error, connect, revision, refresh };
}

const WalletContext = createContext<ReturnType<typeof useWalletState> | null>(null);
export function WalletProvider({ children }: { children: ReactNode }) {
  return <WalletContext.Provider value={useWalletState()}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("WalletProvider is required.");
  return context;
}
