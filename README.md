# DualBadge

**One Badge System, Two Wallet Worlds**

DualBadge is an open-claim achievement registry for Rome Hadrian. The Next.js frontend has a public catalog, wallet dashboard, badge details, activity, and owner administration. A single Solidity contract records supply and ownership for both wallet paths.

**Status** · Deployed on Rome Hadrian at `0x1f78d726497e64eb86f0b3355be02cfbcaf3d329`. The EVM lane recorded a live Creator Circle mint. A Phantom mint remains pending. The Phantom adapter uses Rome’s legacy Solana transaction path because the current scaffold documents a Phantom limitation with Solana v1 on devnet. [Rome Via deployment](https://via-hadrian.testnet.romeprotocol.xyz/tx/0x83e70997b1474f178cb538342f1d530f116e4b95bcce98f10cb5a04fc366322f) · [Creator Circle mint](https://via-hadrian.testnet.romeprotocol.xyz/tx/0x9a1a0a8256b16416292cc5d9e1e23f92d319883e651dc0ef3d9a1a9eb7b0b380)

## Local setup

Use Node.js 22 or newer, npm, and Git. Package installation fetches the pinned Rome packages from GitHub and generates Hadrian config from the official registry.

```sh
npm ci
npm run compile
npm test
npm run lint
npm run build
npm run dev
```

Open http://localhost:3000. The app shows a deployment-required state until a real Hadrian address is set. For a deployed registry, copy .env.example to .env.local and set NEXT_PUBLIC_BADGE_ADDRESS and NEXT_PUBLIC_BADGE_DEPLOYMENT_BLOCK. Restart Next.js after changing local environment variables. Custom badges use CORS-enabled HTTPS JSON with optional name, description and HTTPS image fields. Admin presets store their short metadata directly on-chain, render built-in artwork, and show a live fee quote before each MetaMask confirmation. Clicking an X profile link completes the visit task in the current browser tab. The contract supports open claims.

## Deployment

Start with the read-only checks in [Deployment](docs/DEPLOYMENT.md). The deploy script requires a public deployer, an approved bytecode hash and fee cap, an explicit broadcast flag, and a matching local signing key. Vercel receives public contract configuration only, plus an optional server-only Solana devnet RPC.

## Project notes

- [Research](docs/RESEARCH.md) and [implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md) and [security](docs/SECURITY.md)
- [Test report](docs/TEST_REPORT.md) and [demo script](docs/DEMO_SCRIPT.md)
- [Arena submission draft](docs/ARENA_SUBMISSION.md)
