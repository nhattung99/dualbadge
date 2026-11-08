# Deployment

## Read-only preflight

The project targets Hadrian (200010), USDC gas, and Solana devnet. RPC and Via explorer come from the pinned registry. The public RPC and executable Solana program responded during preflight.

Install the official CLI in a separate folder, or use the verified copy under .research/rome-cli in this workspace.

```sh
git clone --branch v0.12.0 https://github.com/rome-protocol/rome-cli.git
cd rome-cli
npm ci
node dist/bin.js facts chain hadrian
node dist/bin.js facts gas hadrian
node dist/bin.js doctor hadrian
node dist/bin.js preset hardhat hadrian
```

From DualBadge, compile and run the read-only plan. Set DUALBADGE_DEPLOYER in the shell or .env.local to the intended public address.

```sh
npm run compile
npm run preflight
```

Run node dist/bin.js doctor hadrian --address ADDRESS in the CLI checkout to inspect that wallet as well. The deployment plan prints the deployer and initial owner, chain, compiler, bytecode hash, gas estimate, padded limit, fee ceiling, and USDC balance. Review and explicitly approve that plan before funding or deployment. The maximum fee is a ceiling. Actual gas and fees come from the receipt.

Rome documents no general Hadrian faucet. A funded MetaMask deployer needs Hadrian native USDC. Rome documents a bridge from a supported testnet holding source test USDC. Bridging, funding and deploying are separate approvals. For the Phantom smoke, use a legacy-capable devnet account, devnet SOL for fees and rent, and devnet USDC for Rome gas as required by the SDK/runtime.

## Approved broadcast

### MetaMask

After reviewing the deployer, bytecode hash and fee cap, set DUALBADGE_DEPLOYER, DUALBADGE_APPROVED_BYTECODE_HASH and DUALBADGE_APPROVED_MAX_FEE_WEI in the local shell and run the command below. Open http://127.0.0.1:4178 in the desktop browser with MetaMask. The page asks the selected deployer to review and confirm one contract creation on Hadrian. Keep the original fee settings and verify the maximum fee against the reviewed cap in the wallet.

```sh
npm run deploy:metamask
```

The local page saves the transaction hash to deployment.json and verifies the receipt, deployed bytecode, and initial owner. If you close the page before it records the hash, inspect the wallet activity and reconcile any broadcasting record before another attempt.

### Local CLI signer

Set DUALBADGE_APPROVED_BYTECODE_HASH and DUALBADGE_APPROVED_MAX_FEE_WEI from the approved plan and supply the matching ROME_EVM_KEY privately in your local shell. Keep all deployment variables away from Vercel.

```sh
npm run deploy -- --broadcast
```

The script targets Hadrian only and checks the signer, bytecode and refreshed fee cap. It reserves deployment.json before attempting broadcast. If it stops at broadcasting or submitted, reconcile the deployer’s nonce and explorer history or the recorded transaction before rerunning. On success the record includes address, deployer, chain ID, block, deployment hash, Via URL and block timestamp.

Run node dist/bin.js tx hadrian EVM_TX_HASH for the deployment and each mint to inspect the receipt and associated Solana settlement. The official verify command can submit funded sample calls. It requires separate authorization and does not replace app-specific evidence.

## Vercel

Import the DualBadge Git repository as a Next.js project. Use Node 22 or newer, npm ci, and npm run build. Configure the actual address and block as NEXT_PUBLIC_BADGE_ADDRESS and NEXT_PUBLIC_BADGE_DEPLOYMENT_BLOCK. Optionally set SOLANA_RPC_URL as a server-only HTTPS devnet RPC. Deploy or redeploy after setting build-time variables. Confirm the read-only catalog before attempting any wallet mint.

## Deployment record

Status · Confirmed on Rome Hadrian, chain 200010.

| Field | Value |
| --- | --- |
| Contract | `0x1f78d726497e64eb86f0b3355be02cfbcaf3d329` |
| Deployer and initial owner | `0xBB97Ae918a92EaFE81304E1829eAcb0dA0c66E47` |
| Deployment block | 519910639 |
| Block timestamp | 2026-11-08 12:08:20 ICT (05:08:20 UTC) |
| Gas used | 20,375,721 |
| Fee paid | 3.31763364783404676 testnet USDC |
| EVM receipt | [Rome Via](https://via-hadrian.testnet.romeprotocol.xyz/tx/0x83e70997b1474f178cb538342f1d530f116e4b95bcce98f10cb5a04fc366322f) |
| Solana settlement | [Solana devnet explorer](https://explorer.solana.com/tx/3sKV62diWg6jhgqKWvGWQDPRhohiYm5TwG77hY9DysS9Zri3rR6D6D7weCpopLLFXMsDo3TRA3r4XguQnAChJQgh?cluster=devnet) |

MetaMask signed the creation transaction. The local recorder matched the deployed bytecode and owner. Rome CLI reported a successful receipt and returned the Solana settlement signature before exiting with a Windows runtime assertion.
