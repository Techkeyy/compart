# Compart frontend

The frontend contains two hash-routed views:

- `/` — product overview, usage guide, documentation links, and the entry point to the product;
- `/#app` — the interactive room for commitments, supplier quotes, and settlement actions.

It is a React 19 + TypeScript + Vite application. Wallet and chain behavior is isolated in `src/chain.ts`; interface state and routing live in `src/main.tsx`.

## Run locally

From the repository root:

```bash
npm --prefix app ci
npm --prefix app run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173`. With no campaign configured, commitments and host quotes are explicitly simulated in the browser and move no funds.

## Configure devnet

Copy `.env.example` to `.env.local`, then set `VITE_CAMPAIGN_ADDRESS`. The configured live app can:

- connect an injected Solana wallet;
- create the equal public deposit and participant commitment;
- delegate the participant account to MagicBlock's hosted TEE;
- create or update an authenticated private budget;
- read live campaign and supplier-offer state;
- post a supplier group quote;
- claim a participant refund or prototype receipt after settlement.

Never commit `.env.local` or a wallet keypair. The app does not need a private key in its environment; transactions are approved through the user's wallet.

## Production build

```bash
npm --prefix app run build
npm --prefix app run preview -- --host 127.0.0.1 --port 4173
```

The build performs TypeScript checking before Vite emits static assets to `app/dist/`. GitHub Pages deploys that directory through `.github/workflows/deploy-pages.yml`.

## Network behavior

Explorer links and network labels follow `VITE_SOLANA_NETWORK`. Use `.env.mainnet.example` only after both the program and a campaign are genuinely deployed on mainnet. Until real supplier inventory is integrated, all receipts must remain labeled as prototypes.

See the repository [README](../README.md), [architecture](../ARCHITECTURE.md), and [hosted proof](../HOSTED_DEVNET_PROOF.md) for the full protocol context.
