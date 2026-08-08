# Compart frontend

Compart's React 19 + TypeScript + Vite frontend separates the product overview from the working application:

- `/` — overview, use cases, protocol explanation, documentation, and product entry points;
- `/#app` — live room lobby and Solana room directory;
- `/?room=<CAMPAIGN>#app` — a specific room shared by invite link.

The live app includes organizer room creation, room-address or invite-link entry, participant commitments, host quotes, organizer settlement, lifecycle and transaction progress, room outcomes, previous-room history, prototype receipts, and visible privacy proof.

## Source map

| File | Purpose |
| --- | --- |
| `src/main.tsx` | Lightweight overview/live-app router and lazy loading |
| `src/LandingPage.tsx` | Public product overview |
| `src/LiveApp.tsx` | Lobby, room creation, role workspaces, lifecycle, and history |
| `src/chain.ts` | Wallet, Solana, and MagicBlock transactions and account reads |
| `src/styles.css` | Overview design system |
| `src/live-app.css` | Responsive application design system |

## Run locally

From the repository root:

```bash
npm --prefix app ci
npm --prefix app run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173`. The app defaults to the verified Solana devnet program and reads its live room directory. Wallet actions are real devnet transactions and always require approval from an injected Solana wallet such as Phantom or Solflare.

## Configure devnet

Copy `.env.example` to `.env.local` when you want to override the default RPC endpoints or feature a specific room. The live app can:

- create a new room and treasury account;
- discover public room accounts or join from an address/share link;
- create the equal public deposit and participant commitment;
- delegate a participant account to MagicBlock's hosted TEE;
- create or update an authenticated private budget;
- post a public supplier group quote;
- run the organizer's verified allocation and settlement lifecycle;
- claim a participant refund or prototype receipt after settlement.

Public accommodation details that are not part of the compact on-chain campaign account are included in share links and cached locally. Deposits, deadlines, roles, quotes, allocations, refunds, and receipts are always read from authoritative program accounts.

Never commit `.env.local` or a wallet keypair. The app does not need a private key in its environment; transactions are approved through the user's wallet.

## Production build

```bash
npm --prefix app run build
npm --prefix app run preview -- --host 127.0.0.1 --port 4173
```

The build performs TypeScript checking before Vite emits static assets to `app/dist/`. GitHub Pages deploys that directory through `.github/workflows/deploy-pages.yml`.

## Network behavior

Explorer links and network labels follow `VITE_SOLANA_NETWORK`. Use `.env.mainnet.example` only after the program is genuinely deployed on mainnet. Until real supplier inventory is integrated, all receipts remain explicitly labeled as prototypes.

See the repository [README](../README.md), [architecture](../ARCHITECTURE.md), and [hosted proof](../HOSTED_DEVNET_PROOF.md) for the full protocol context.
