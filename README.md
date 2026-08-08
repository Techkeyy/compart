# Compart

**A private group fund for shared plans, built on Solana devnet and MagicBlock Private Ephemeral Rollups.**

[Open the app](https://techkeyy.github.io/compart/) · [Program on Solana Explorer](https://explorer.solana.com/address/E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh?cluster=devnet) · [MagicBlock docs](https://docs.magicblock.gg/pages/overview/products)

Compart helps a group decide whether it can afford a shared plan—without asking everyone to announce their budget. It is suited to an apartment, a trip, an event, a shared subscription, or any purchase where one person should not have to front the full amount.

The organizer creates an unlisted room, chooses the number of people, a goal range, a deadline, and a public escrow cap. Each invited participant chooses a private maximum and escrows the same public cap in **Circle devnet USDC**. Once the deadline passes, the organizer selects an amount within the pre-agreed range. If the group can clear it, the program pays the organizer and makes any remaining USDC claimable by each participant. If the room cannot clear, the organizer can cancel it and the program returns every full escrow in one verified transaction. Cancellation still needs access to MagicBlock's private runtime so the delegated room accounts can be prepared and returned to Solana.

This is a **devnet prototype**. Devnet SOL and devnet USDC are free test assets and have no real-world value.

## What is live

- Solana devnet program: `E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh`
- Circle devnet USDC escrow, organizer payout, and participant refunds
- MagicBlock Private ER for private maximums and outcome calculation
- Unlisted rooms and one-time participant claim links
- Organizer-only settlement after the commitment deadline
- Wallet-specific room history and onchain prototype receipts

SOL is required only to pay small devnet transaction fees. All room amounts are devnet USDC.

## User flow

1. In Phantom, select **Solana Devnet**.
2. Request free devnet SOL for fees and free devnet USDC from the Circle faucet.
3. An organizer creates a room, choosing group size, USDC escrow cap, minimum/maximum goal, deadline, and terms.
4. The organizer shares a newly created one-time participant link. A plain room URL is read-only and cannot be used to commit.
5. An invited participant sets a private maximum, then approves the visible equal USDC escrow cap in Phantom.
6. After the deadline, the organizer selects the final goal inside the agreed range and runs settlement.
7. A successful room pays the organizer and unlocks participant excess-refund claims. Cancelling a failed room automatically returns every full deposit.

The organizer may also join as a participant. Before Phantom opens, the organizer sees both the public escrow amount and the private maximum they selected.

## Privacy model and current limitation

Public Solana state records the room, group size, equal escrow cap, progress, settlement outcome, and refunds. A participant’s maximum is kept in MagicBlock’s Private ER rather than written into the public bid account.

This safe first version uses private maximums to decide who can cover the **equal share** of the organizer-selected goal. It does not yet privately charge each person a different amount from an aggregate total. Implementing variable private payments requires MagicBlock’s private SPL-payment settlement flow; this is the next protocol upgrade, not a behavior the current prototype claims to provide.

## Build and verify

Requirements: Node.js 20.19+ or 22.12+, npm, Rust, Solana CLI, and Anchor 1.0.2 for program work.

```bash
npm --prefix app ci
cargo fmt --all -- --check
cargo check -p compartido-market
npm --prefix app run build
```

Run the frontend locally:

```bash
npm --prefix app run dev
```

## Repository map

| Path | Purpose |
| --- | --- |
| `app/` | React/Vite frontend and wallet transaction builders |
| `programs/compartido-market/` | Anchor program for rooms, USDC escrow, private matching, settlement, and refunds |
| `tests/` | Historical lifecycle runners retained for reference; current deterministic tests live beside the Rust program |
| `.github/workflows/` | Continuous verification and GitHub Pages deployment |
| `DEMO_SCRIPT.md` | Submission walkthrough |
| `GROUP_FUND_DESIGN.md` | Product and protocol design |
| `AUDIT_REPORT.md` | Current code, documentation, deployment, and risk audit |

## Safety boundaries

- Never use mainnet assets in this prototype.
- A room is a funding coordination tool, not a real inventory reservation or legally binding booking.
- Do not share wallet recovery phrases or private keys.
- A production deployment needs independent smart-contract review, durable shared-room metadata, real inventory integrations, dispute handling, and monitoring.
- Historical lifecycle runners and proof notes for the retired supplier prototype are clearly marked and are not evidence for the current program ID.

Built for **MagicBlock Solana Blitz v7 — Collaboration** by [Techkeyy](https://github.com/Techkeyy).
