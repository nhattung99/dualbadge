# Security and ownership

- OpenZeppelin Ownable2Step gates creation and configuration. The deployer starts as owner. Ownership transfer requires acceptance by the new account. The contract rejects renunciation to preserve a configuration authority.
- A mint credits msg.sender and never accepts a user-provided beneficiary, mapping, signature, or arbitrary delegation. No transfer, approval, payable, callback or upgrade function exists.
- Public minting means anyone with a funded account can claim while a type is enabled and supply remains. The registry enforces one claim per canonical account, which provides no proof of identity or achievement eligibility. A person can control multiple addresses across either wallet family.
- Rome is trusted to verify wallet signatures and bind the Solana signer to the synthetic EVM sender. The Hardhat impersonation test verifies local storage semantics only. On-chain runtime authorization requires actual Hadrian evidence.
- The browser verifies the active wallet and network before signing. The Solana connection checks the devnet genesis hash and compares the returned transaction message before submission. Wallet confirmations provide the signing boundary.
- The app never requests an export of wallet keys. The CLI deployer consumes a local environment key. Do not put it in Vercel, browser environment variables, committed files, or a chat.
- Browser metadata fetches omit credentials and reject redirects. Metadata can change after minting when its host serves mutable content. Keep hosted badge metadata on a trustworthy origin.
- Public RPC availability, indexing latency, a temporary pool payer shortage, and changes in Rome or wallet behavior can affect claims. A signature with a pending or failed confirmation requires explorer inspection before retry.
