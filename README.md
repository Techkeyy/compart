# Compart

Compart is a private group-purchasing protocol built on Solana with MagicBlock.

People state what they want and the maximum they are willing to pay. Compatible demand is grouped into a live pool. Suppliers compete to fulfil the pool, while private bids stay shielded. Successful participants settle at one fair clearing price; unsuccessful participants are refunded.

The first product is a private commitment room for event accommodation and group
stays. The interface stays focused on that concrete problem while the underlying
conditional-purchase primitive can later support retreats, event passes, creator
memberships, and shared software purchases.

## Hackathon fit

- Collaboration: multiple participants change one shared economic outcome.
- Real-time Solana app: live pool state and supplier offers update through an Ephemeral Rollup.
- Private Ephemeral Rollup: each participant's maximum price stays private.
- Solana settlement: final payment, refund, receipt, and access-pass ownership are auditable onchain.
- Magic Actions: committed market state can trigger base-layer settlement.

## Mainnet policy

The organizers have said that a mainnet build is preferred, but the current
program would require roughly 3.37 SOL in size-based deployment rent. That is not a
responsible hackathon expense for this team, so the submission target is a complete
hosted-devnet deployment with real MagicBlock privacy proof and Solana Explorer
transactions. Mainnet remains an optional sponsored bonus, not a blocker.

The hackathon deployment uses only negligible test value and clearly labels the
receipt as a prototype booking voucher. It does not custody real accommodation
payments or claim to have booked inventory without a supplier integration.

## Status

- Public demo: [techkeyy.github.io/compart](https://techkeyy.github.io/compart/)
- Public source: [github.com/Techkeyy/compart](https://github.com/Techkeyy/compart)
- Compart's outcome-only privacy architecture is implemented.
- The Anchor market core compiles to an optimized SBPF program and generates an IDL.
- Program ID: `9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs`
- The full local MagicBlock Private ER lifecycle passes: owner read/update succeeds,
  another wallet is denied, organizer allocation succeeds, private budgets remain
  absent from Solana, and only allocations/refunds return for settlement.
- Public privacy regression and threshold-allocation tests pass.
- The optimized program artifact is 482,544 bytes (about 472 KiB).
- The verified artifact is deployed on devnet at slot `482003683`; its deployed
  bytes match the local artifact exactly.
- Live campaign: `B58nZRh9XEvUMNN45TdUmTaXQTbAWFUDcqnKC28i4jfh`.
- Campaign initialization: [view the confirmed devnet transaction](https://explorer.solana.com/tx/3BMKUWMNUU3JSNnqG2pa9apcFC5NJKMtfj8MmsEwF6BMf6Enxo11eZnaxVwetEeCCStRbxVizceTMiBzpkPcZPpP?cluster=devnet).
- The internal Anchor crate and artifact retain the compatibility name
  `compartido_market` so the existing program ID and upgrade path do not change.
- A responsive frontend runs under `app/`, connects an injected Solana wallet, and
  executes the public deposit, delegation, TEE authentication, and private budget
  flow when a campaign address is configured.
- The frontend also reads live campaign/offer state, posts supplier quotes, and
  exposes participant refund and prototype-receipt transactions after settlement.
- Preview commitments and host quotes work without a wallet and are explicitly
  labeled as no-funds simulations.
- The local preview is available at `http://127.0.0.1:4173` while the development
  server is running, and the public GitHub Pages deployment uses the live campaign.
- Next gate: capture hosted two-wallet privacy denial, settlement, refund, and
  receipt evidence, then record the submission demo.

See:

- `BUILD_PLAN.md`
- `ARCHITECTURE.md`
- `TEST_RESULTS.md`
- `DEMO_SCRIPT.md`

## Run the frontend

```bash
cd app
npm install
npm run dev -- --host 127.0.0.1 --port 4173
```

Without `VITE_CAMPAIGN_ADDRESS`, the interface runs in an explicitly labeled
wallet-free preview mode. Copy `app/.env.example` to `app/.env.local` and add the
campaign address after hosted-devnet initialization to enable real transactions.

Create another campaign reproducibly with:

```bash
cd scripts
npm install
SOLANA_KEYPAIR=/path/outside/repository/id.json npm run initialize:devnet
```

## Verification

```bash
cargo test -p compartido-market --lib
node tests/local-lifecycle.js
node tests/private-er-lifecycle.js
cd app && npm run build
```

The JavaScript lifecycle tests require their corresponding local Solana and
MagicBlock validator stacks. See `TEST_RESULTS.md` and `SETUP_NOTES.md` for the
verified environments and expected evidence.

## Official MagicBlock references

The implementation follows MagicBlock's current official documentation and
official example repository:

- [Ephemeral Rollups quickstart](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart)
- [Private ER access control](https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/how-to-guide/access-control)
- [Magic Router](https://docs.magicblock.gg/pages/ephemeral-rollups-ers/introduction/magic-router)
- `vendor/magicblock-engine-examples` at reference commit
  `a291e4b2c9cc4bab6918ff434d9aaa72c702cf29`
