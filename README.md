# Compart

**Private group purchasing on Solana, powered by MagicBlock Private Ephemeral Rollups.**

[Open the overview](https://techkeyy.github.io/compart/) · [Enter the live app](https://techkeyy.github.io/compart/#app) · [View the hosted proof](HOSTED_DEVNET_PROOF.md) · [Read the architecture](ARCHITECTURE.md)

Compart lets a group make one conditional purchase without asking everyone to reveal what they can afford. Each person commits the same public deposit and privately sets a maximum. A deal-option publisher quotes for the whole group. The purchase clears only when enough private limits can support one quote; otherwise participants can reclaim their deposits.

The live product starts with a private-room lobby rather than a fixed demo or a public marketplace. An organizer creates an unlisted room and shares a participant or deal-option invitation; a new visitor can create a room or open an invitation, but cannot browse other people’s rooms. Participant, deal-option, and organizer actions are presented in separate workspaces. Every room shows its lifecycle, transaction progress, public terms, privacy boundary, final outcome, and available receipts.

All live amount fields are denominated in devnet SOL. Compart does not imply a fiat-dollar or USDC exchange rate.

The first room is event accommodation because the pain is immediate: group chats stall, one person often fronts the money, and budgets are socially awkward. The underlying primitive can later support retreats, event passes, memberships, shared software, and other threshold purchases.

## Blitz v7 fit

- **Required integration:** participant commitments delegate to MagicBlock Ephemeral Rollups.
- **Theme — collaboration:** a group coordinates one conditional checkout without exposing individual budgets.
- **Creativity:** Compart handles the decision before anyone pays, rather than tracking debts after the fact.
- **Technical depth:** permissioned Private ER state, private matching, and public Solana settlement are connected end to end.
- **Compelling Solana showcase:** the room, deposits, outcomes, refunds, and prototype receipts are all inspectable on devnet.

The deal-option publisher is simply the payout role for a selected group option; it is not a hackathon requirement.

## Why it matters

- **Private by default:** a participant's maximum is written only inside the authorized Private ER account.
- **Useful public signal:** Solana records deposits, demand, supplier offers, allocations, refunds, and prototype receipts.
- **Shared leverage:** suppliers compete for a complete group instead of six isolated buyers.
- **Conditional settlement:** nobody should be stuck with the full bill when the group cannot clear a quote.
- **Concrete wedge, broader protocol:** accommodation keeps the demo understandable without limiting the market primitive.

## How the room works

1. An organizer opens a room with a target group size, deadline, and equal public deposit.
2. Participants deposit publicly, then delegate their bid accounts to MagicBlock.
3. Each participant authenticates to the Private ER and stores a private maximum.
4. Suppliers post public per-person quotes for the complete group.
5. The organizer computes outcome-only allocations in the private runtime.
6. Only allocations and refund amounts return to Solana for settlement.

The public chain learns the outcome it must enforce, not the private values used to reach it. Rooms are unlisted in the product: an organizer creates a one-time participant or supplier claim link, and the recipient connects their own wallet to claim that role onchain. The program rejects a commitment or quote from a wallet without that explicit, matching role—even if it edits an invitation URL or calls the program directly. Public settlement state remains inspectable by anyone who already knows the Solana room address. See [ARCHITECTURE.md](ARCHITECTURE.md) for account boundaries and the full state transition.

## Current devnet deployment

| Item | Value |
| --- | --- |
| Network | Solana devnet + MagicBlock hosted TEE |
| Program | [`E2jB…kRDEh`](https://explorer.solana.com/address/E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh?cluster=devnet) |
| Upgrade authority | Fresh local devnet-only wallet (not committed) |
| Access model | One-time claim link required for participant or deal-option actions |
| Full lifecycle evidence | [HOSTED_DEVNET_PROOF.md](HOSTED_DEVNET_PROOF.md) — archival proof for the prior deployment |

The current deployment contains the full role-enforcement program. The recorded hosted lifecycle covers two-wallet privacy denial, outcome-only allocation, settlement, three refunds, and two prototype receipts on the prior deployment; reproducible details live in [TEST_RESULTS.md](TEST_RESULTS.md).

## Repository map

| Path | Purpose |
| --- | --- |
| `programs/compartido-market/` | Anchor program and market state machine |
| `app/` | Responsive React/Vite overview, room lobby, creation flow, role workspaces, and history |
| `tests/` | Local Solana, local Private ER, and hosted-devnet lifecycle tests |
| `scripts/` | Campaign initialization and hosted-proof utilities |
| `artifacts/compartido-market/` | Verified program binary, IDL, and artifact metadata |
| `.github/workflows/` | GitHub Pages deployment |

The internal crate and IDL keep the compatibility name `compartido_market`; changing it would break the established program ID and upgrade path.

## Quick start

Requirements: Node.js 20.19 or newer, npm, and a Rust toolchain. Solana/Anchor tooling is needed only for local validator or deployment work.

```bash
npm install
npm --prefix app ci
npm run verify
```

Run the frontend locally:

```bash
npm --prefix app run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173`. The lobby has no public room directory: create a room or paste a complete invitation. Once connected, a wallet sees only rooms it created, joined, or received a receipt from. Creating a room or taking a room action requires an injected Solana wallet and explicit transaction approval. Copy `app/.env.example` to `app/.env.local` only when overriding the default network endpoints for local development. Environment files containing local values remain ignored by Git.

## Verification levels

### Safe on any development machine

```bash
cargo fmt --all -- --check
cargo test -p compartido-market --lib
cargo clippy -p compartido-market --lib -- -D warnings
npm --prefix app run build
```

`npm run verify` runs the unit tests and production frontend build.

### Requires local validators

```bash
npm run test:local
npm run test:private-local
```

These lifecycle tests expect the corresponding local Solana and MagicBlock stacks described in [SETUP_NOTES.md](SETUP_NOTES.md).

### Uses hosted devnet state

```bash
npm run test:hosted
```

Do not treat the hosted command as a routine unit test: it requires `SOLANA_KEYPAIR` and `PROOF_KEYS_DIR` outside the repository, creates accounts, and spends devnet SOL. The checked evidence is already recorded in [HOSTED_DEVNET_PROOF.md](HOSTED_DEVNET_PROOF.md).

## Prototype and security boundaries

- The live deployment uses devnet value only.
- A receipt is a **prototype booking voucher**, not proof of real accommodation inventory.
- No wallet secret, proof key, or `.env.local` file belongs in the repository.
- A production launch still needs an independent program audit, supplier inventory integration, dispute handling, and operational monitoring.
- Mainnet deployment remains optional until it is sponsored or economically justified; devnet is the verified hackathon target.

## Project documents

- [BUILD_PLAN.md](BUILD_PLAN.md) — delivery scope and remaining submission work
- [ARCHITECTURE.md](ARCHITECTURE.md) — public/private account model and lifecycle
- [TEST_RESULTS.md](TEST_RESULTS.md) — reproducible verification record
- [HOSTED_DEVNET_PROOF.md](HOSTED_DEVNET_PROOF.md) — hosted TEE evidence
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md) — 90–120 second submission walkthrough
- [SETUP_NOTES.md](SETUP_NOTES.md) — local validator and environment notes

## Official MagicBlock references

- [Ephemeral Rollups quickstart](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart)
- [Private ER access control](https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/how-to-guide/access-control)
- [Magic Router](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/introduction/magic-router)
- Official example repository vendored during development at reference commit `a291e4b2c9cc4bab6918ff434d9aaa72c702cf29`

Built for **Solana Blitz v7** by [Techkeyy](https://github.com/Techkeyy).
