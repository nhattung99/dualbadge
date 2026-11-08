# Implementation plan

1. Verify the official scaffold, pinned SDK source and registry. Use the scaffold's shared-state architecture with Next App Router and Tailwind.
2. Build a compact, non-transferable Solidity registry. Ownable gates badge configuration. Public minting credits msg.sender and enforces enabled state, cap and one mint per account. Keep metadata as an on-chain URI.
3. Connect MetaMask and Phantom explicitly. Before a write, check the active signer, chain and contract call. Use the official Rome SDK and verify the resulting event or exact state change. Preserve transaction references when confirmation fails.
4. Build catalog, detail, dashboard, admin, activity and architecture pages. Show honest empty and unavailable states before configuration.
5. Compile, test on a local EVM, lint and build. Keep protocol-level sender authentication and live settlement as separate Hadrian acceptance checks.
6. Run read-only preflight. Present the actual deployment proposal before approval. Record deployment and both wallet receipts only after approved live execution.
