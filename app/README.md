# Compart frontend

Compart's React 19 + TypeScript + Vite frontend separates the product overview from the working application:

- `/` — overview, use cases, protocol explanation, documentation, and product entry points;
- `/#app` — invite-only room lobby and wallet-scoped activity;
- `/?room=<CAMPAIGN>#app` — a specific room shared by invite link.

The live app includes organizer room creation, one-time participant invitations, private participant commitments, organizer settlement, automatic failed-room refunds, lifecycle feedback, wallet-scoped room history, prototype receipts, and visible privacy proof.

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

Open `http://127.0.0.1:4173`. The app defaults to the verified Solana devnet program. It has no public room directory: a visitor creates a room or opens an invitation, while a connected wallet sees only rooms it created, joined, or received a receipt from. Wallet actions are real devnet transactions and always require approval from an injected Solana wallet such as Phantom or Solflare.

All room amounts are entered, displayed, and transferred as Circle devnet USDC. Devnet SOL is used only for transaction fees. Neither asset has real-world value on devnet.

## Configure devnet

Copy `.env.example` to `.env.local` when you want to override the default RPC endpoints. The public deployment does not inject a featured campaign or demo room metadata. The live app can:

- create a new room and treasury account;
- create an unlisted room or join from a one-time participant invitation;
- create the equal public deposit and participant commitment;
- delegate a participant account to MagicBlock's hosted TEE;
- create or update an authenticated private budget;
- let the organizer select a final goal inside the room's approved range;
- run private eligibility matching and public organizer settlement;
- automatically return full deposits when the organizer cancels a failed room;
- claim a successful-room excess refund or prototype receipt after settlement.

Public plan details that are not part of the compact on-chain campaign account are included in share links and cached locally. Deposits, deadlines, access, allocations, refunds, and receipts are read from authoritative program accounts.

Never commit `.env.local` or a wallet keypair. The app does not need a private key in its environment; transactions are approved through the user's wallet.

## Production build

```bash
npm --prefix app run build
npm --prefix app run preview -- --host 127.0.0.1 --port 4173
```

The build performs TypeScript checking before Vite emits static assets to `app/dist/`. GitHub Pages deploys that directory through `.github/workflows/deploy-pages.yml`.

## Network behavior

Explorer links and network labels follow `VITE_SOLANA_NETWORK`. Use `.env.mainnet.example` only after the program is genuinely deployed on mainnet. Until a real purchase or reservation integration exists, all receipts remain explicitly labeled as prototypes.

See the repository [README](../README.md), [architecture](../ARCHITECTURE.md), and [current audit](../AUDIT_REPORT.md) for the full protocol context.
