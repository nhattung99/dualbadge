# DualBadge test report

## Local and read-only checks

| Check | Result |
| --- | --- |
| Clean npm ci and pinned Rome SDK exports | Passed |
| Solidity 0.8.28 compilation, Paris target | Passed |
| Hardhat local contract suite | 9 passed |
| ESLint and TypeScript | Passed |
| Next.js production build | Passed |
| Production HTTP smoke | All six pages returned 200 in the undeployed state. An invalid badge ID returned 404. |
| Production RPC route | Returned Hadrian chain ID for eth_chainId and rejected an unlisted EVM broadcast method. |
| Rome CLI v0.12.0 | Facts, doctor and Hardhat preset completed. Public Hadrian RPC responded. |
| Solana devnet | Registry program account was executable. Devnet genesis hash checked. |

The Hardhat suite deploys the compiled contract to a local EVM. It checks owner authorization, two-step ownership, badge creation and update events, mint attribution, per-type duplicate protection, cap, disabled state, invalid inputs, and counts. The synthetic address test compares SDK derivation to Keccak-256 and uses **local impersonation** to check both address types in one registry.

## Hadrian evidence

| Acceptance check | Status |
| --- | --- |
| Approved deployment with receipt and source artifact | Passed · The MetaMask creation transaction succeeded. The deployed runtime bytecode matched the compiled artifact, and the owner matched the deployer. See the deployment record. |
| MetaMask mint and confirmed Hadrian event | Passed · Creator Circle, badge #2, emitted BadgeMinted for `0xBB97Ae918a92EaFE81304E1829eAcb0dA0c66E47`. The live hasBadge read returned true. [Rome Via](https://via-hadrian.testnet.romeprotocol.xyz/tx/0x9a1a0a8256b16416292cc5d9e1e23f92d319883e651dc0ef3d9a1a9eb7b0b380) |
| Public mint authorization | A read-only Hadrian simulation of mintBadge for badge #2 succeeded from a different, non-owner EVM account. |
| Phantom legacy signing, Solana confirmation and matched Rome event | Pending |
| Fresh synthetic account funding and any required provisioning | Pending |
| Both ownership records and totalMinted on the same deployment | Pending |

The live MetaMask deployment and mint demonstrate contract creation and EVM sender attribution on Hadrian. A Phantom mint and same-badge dual-lane ownership check remain pending. Follow the live demo script after separate approvals.
