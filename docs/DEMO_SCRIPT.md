# Demo script

## Read-only walkthrough

1. Open the home page and show the configured Hadrian registry status. Before deployment, show the deployment-required state.
2. Open Dashboard, select a wallet and show its canonical address. For Phantom, show the separate Solana public key.
3. Open About and explain how both signing paths target one Solidity contract.

## Approved live smoke

1. Record the deployment receipt and verify the initial owner and zero counts on Hadrian.
2. Connect the owner’s MetaMask wallet. Create an enabled badge with supply of at least two and a reachable HTTPS metadata document. Record the badge ID and transaction.
3. Connect an independent MetaMask wallet and mint the badge. Save the EVM receipt, mint event, Via URL and Solana settlement mapping. Confirm hasBadge and the new count.
4. Disconnect and connect a fresh Phantom devnet wallet. Record its base58 public key and canonical address. Approve the legacy transaction for the same badge ID. Save the Solana signature, indexed EVM receipt, event and explorer links. Confirm the event account equals the synthetic address and Rome maps that event’s transaction to the exact signature.
5. Read both owners and both counts from the same contract. The badge count and totalMinted should increase by two over the baseline if no other users minted.
6. Try the same badge again from each wallet. The UI should show Already earned. The local contract tests independently verify duplicate reverts.
7. Capture the catalog, badge detail, MetaMask dashboard, Phantom dashboard, and Activity. Record errors verbatim and keep evidence pending for any lane that did not pass.
