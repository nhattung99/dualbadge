# DualBadge Arena submission draft

**DualBadge**  
**One Badge System, Two Wallet Worlds**

**Proposed category** · EVM and Solana wallets. The closest published idea is Identity Manager because wallet-specific activity maps to canonical Rome accounts. DualBadge focuses on open-claim badges and keeps cross-wallet identity linking outside this MVP. [Rome Arena ideas](https://arena.mainnet.romeprotocol.xyz/ideas#ideas-both-wallets)

## Builder form

Arena requires sign-in and a Builder account for registration. Its public registration form defines an app name of up to 60 characters, a one-line description of up to 120 characters, a description of up to 1,000 characters, an app kind, and fields for Website, GitHub and X. Use the project name and tagline above and the following description.

> DualBadge is an achievement app on Rome Hadrian. Its Solidity registry issues capped, non-transferable badges. A dashboard tracks rank milestones from verified Hadrian transaction hashes, supported Rome DEX swaps and outbound bridge transactions. MetaMask minting has been verified on Hadrian. Phantom integration is available for testing and awaits a successful live mint.

Select **Both** for app kind. Use the Website and GitHub links in the evidence table and [the project creator’s X profile](https://x.com/nhattung00) for the X field.

After registration, the contract-linking flow asks for the Hadrian deployment transaction hash and a message signed by its deployer. The signing step needs separate approval. [Arena app registration](https://arena.mainnet.romeprotocol.xyz/apps/new)

## Problem

Wallet-specific achievement apps fragment badge catalogs, supply, and ownership. Organizers and users need a common registry while retaining the wallet they already use.

## Solution

DualBadge records non-transferable achievements in a single Hadrian Solidity registry. Owners publish badge types with finite supply and an enabled state. Users claim badges and read their ownership through a common catalog, dashboard, and activity feed.

## Rome differentiation and architecture

MetaMask uses the EVM write path. The Phantom integration uses the legacy Solana SDK path and awaits live validation. Rome derives the caller from the signing Solana account and uses the same contract state. The frontend connects wallets and shows the canonical address, while the contract handles caps and claims. There is one public event stream.

## Evidence

| Item | Status |
| --- | --- |
| Hadrian deployment address and Via link | `0x1f78d726497e64eb86f0b3355be02cfbcaf3d329` · [Rome Via deployment](https://via-hadrian.testnet.romeprotocol.xyz/tx/0x83e70997b1474f178cb538342f1d530f116e4b95bcce98f10cb5a04fc366322f) |
| GitHub repository URL | [nhattung99/dualbadge](https://github.com/nhattung99/dualbadge) |
| Live demo URL | [DualBadge on Vercel](https://dualbadge.vercel.app) |
| Screenshots | TODO · Catalog, detail, both wallet dashboards, activity |
| MetaMask mint transaction and Solana settlement | Creator Circle, badge #2 · [Rome Via](https://via-hadrian.testnet.romeprotocol.xyz/tx/0x9a1a0a8256b16416292cc5d9e1e23f92d319883e651dc0ef3d9a1a9eb7b0b380) · [Solana devnet settlement](https://explorer.solana.com/tx/58Auk9fYuXe8CCPtmR4oNbsaKmtGC1GekrYY3hpFY1JUajY4z9xWGPZiQzKMYwmnXCCs27aJWJ6pV5Sm1gt9LiEv?cluster=devnet) |
| Phantom signature, EVM receipt and canonical account | TODO |
| Shared state ownership and counts | TODO |

## Known limitations and roadmap

Open claims have per-account limits. Identity linking and criteria-based issuer attestations are future work. Phantom needs a legacy-capable devnet wallet and verified runtime settlement. The next milestone is a successful claim from each browser wallet on one deployed registry. Then capture evidence and confirm the draft in the authenticated Builder form. [Arena registration](https://arena.mainnet.romeprotocol.xyz/apps/new)
