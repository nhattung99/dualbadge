# Architecture

| Entry point | Signer | Rome caller | Write path |
| --- | --- | --- | --- |
| MetaMask | Browser EVM account | EVM sender | submitRomeTx |
| Phantom | Browser Solana account | SDK syntheticAddress of the public key | submitRomeTxSolanaLane, legacy DoTxUnsigned |

Both paths target the configured DualBadge contract on Hadrian. All public contract reads use EVM JSON-RPC. The frontend uses the signing account’s canonical address for hasBadge. The registry never accepts a beneficiary parameter, and a mint stores only the account authenticated by the EVM as msg.sender.

The Solana SDK discovers account metas from the Rome RPC, assembles the call, and submits the wallet-signed Solana transaction to devnet. The Phantom adapter supplies the devnet chain to Wallet Standard so Phantom can preview on the right cluster. After the SDK confirms on Solana, the app looks up the indexed mint event for that badge and account and checks Rome’s settlement mapping against the exact Solana signature. It surfaces delayed or missing evidence as an unconfirmed mint with an explorer link.

The contract uses no token approvals, fund or sweep leg, or native value. External-authority PDA provisioning serves value-moving operations that require the PDA as a signer. DualBadge skips it for the registry-only call, a design assumption to verify on a fresh wallet during live smoke testing.

The UI pages share wallet state, use bounded catalog and block-range queries, and show actual RPC data. The same-origin route forwards a method allowlist to registry-derived endpoints and accepts only serialized Solana transactions for its send path. Metadata loads in the browser. The contract has no external calls.

The Dashboard shows ten preset milestones before publication and matches published presets against the actual on-chain metadata. It revalidates submitted transaction hashes against successful Hadrian receipts whose sender is the connected canonical account. A swap requires the wallet's positive-output Swapped event from a registry-listed Rome DEX router. A bridge requires a successful, positive-amount outbound call to a registry-listed RomeBridgeWithdraw contract using a supported selector. The counter measures the source transaction. It excludes native Solana swaps, inbound bridge routes and destination redemption. Hashes stay in the browser and are rechecked after reload. Rank and milestone eligibility are app-level. The Solidity registry accepts open claims. X visit tasks complete when the profile link is clicked. [Rome DEX](https://github.com/rome-protocol/rome-dex) · [Rome Bridge architecture](https://github.com/rome-protocol/rome-bridge-api/blob/main/docs/BRIDGE_API_ARCHITECTURE.md)
