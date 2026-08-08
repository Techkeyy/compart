# Test Results

## Current result

The outcome-only privacy design passes locally and on hosted devnet against the
full MagicBlock stack. The verified artifact, live public campaign, hosted
two-wallet privacy proof, settlement, refunds, and receipts are complete.

## Rust allocation tests — passed

Command:

```text
cargo test -p compartido-market --lib
```

Result: 3 passed, 0 failed.

Verified behavior:

- With three fixed deposits of 1,800,000 lamports, private limits of 1,500,000,
  1,300,000, and 900,000, and a 1,000,000-lamport clearing price, allocations are
  `[1, 1, 0]`.
- Refund liabilities are `[800000, 800000, 1800000]` lamports.
- Supplier payout is 2,000,000 lamports.
- An underfilled group produces zero allocations, zero payout, and full refunds.

## Public privacy regression — passed

`tests/local-lifecycle.js` runs against a local Solana validator.

Verified behavior:

- The campaign uses a fixed public deposit cap of 1,800,000 lamports.
- The public `Bid` account has no `maxUnitPrice` field.
- Deposits do not reveal a participant's private limit.
- The cheapest qualifying supplier is selected deterministically.
- Base-layer settlement before private allocation is rejected.

## Full Private ER lifecycle — passed

`tests/private-er-lifecycle.js` runs against the official local MagicBlock
ephemeral-validator stack: Solana base RPC, Ephemeral Rollup RPC, and private QFS.

Verified results:

```text
ownerCanReadPrivateBudget true
ownerCanUpdatePrivateBudget true
otherBuyerDenied true
organizerCanCompute true
earlyUndelegationBlocked true
privateBudgetsOnBase false
allocations [1,1,0]
refunds [800000,800000,1800000]
supplierPayout 2000000
status settled
```

This is the core privacy proof: private values participate in computation without
being copied to the base layer, while public settlement still has enough outcome
data to enforce its accounting rules.

## Hosted Private ER lifecycle — passed

`tests/hosted-devnet-lifecycle.js` repeated the full lifecycle through Solana
devnet and `https://devnet-tee.magicblock.app`.

Verified results:

```text
campaign E96bS6AiPobPYKTf3iAqsEHomRKCc8go2txTNkV2JnUK
ownerCanReadPrivateBudget true
ownerCanUpdatePrivateBudget true
otherBuyerDenied true
organizerCanCompute true
earlyUndelegationBlocked true
privateBudgetsOnBase [false,false,false]
allocations [1,1,0]
refundsBeforeClaim [800000,800000,1800000]
supplierPayout 2000000
status settled
receiptsOnBase [true,true]
```

Solana's official devnet RPC independently reported every checked initialization,
settlement, refund, and receipt signature as finalized with no error. See
`HOSTED_DEVNET_PROOF.md` for direct Explorer links.

## Build verification — passed

- Anchor/SBPF program build passes.
- Optimized program size: 482,544 bytes (about 472 KiB).
- Current `.so`, IDL, and TypeScript types are stored in
  `artifacts/compartido-market/`.
- Frontend production build passes.
- Local frontend preview returns HTTP 200 at `http://127.0.0.1:4173` while the
  preview server is running.

The frontend build is split into app, React, Solana, and MagicBlock delivery
chunks and completes without a bundle-size warning. Its installed dependency tree
reports two low and four moderate advisories in transitive packages; no forced
dependency rewrite has been applied because that could break the official SDK
integration during the hackathon.

## Repository audit — passed (August 8, 2026)

- `cargo fmt --all -- --check` passes.
- `cargo clippy -p compartido-market --lib -- -D warnings` passes. Two diagnostics
  produced inside Anchor's generated host entrypoint are contained at the crate
  boundary; project-authored warnings remain fatal.
- All three Rust allocation/privacy unit tests pass.
- Every JavaScript lifecycle and utility file passes `node --check`.
- TypeScript checking and the Vite production build pass.
- Desktop and 390 px mobile renders of the lobby, room creation flow, participant,
  host, and organizer workspaces were inspected after the full workflow build.
- Room discovery, dynamic address routing, share-link metadata, role separation,
  lifecycle and transaction steppers, result states, history/receipts, and privacy
  proof are included in the production TypeScript build.
- Root lifecycle dependencies are now declared and locked in `package.json` and
  `package-lock.json`, so the documented test commands no longer depend on an
  undeclared parent installation.
- Production dependency audits report no high or critical advisories. The app has
  two low and four moderate transitive advisories; the scripts have five moderate
  advisories. npm's proposed forced fixes require incompatible downgrades of the
  official MagicBlock/Solana stack, so they were not applied.

## Hosted network status

- Deployer: `B1QKnX6RHfA8Bx3S8zzJGSKNiXbSTa7yy33fZJDWgsWS`
- Program: `9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs`
- Upgrade completed at slot `482003683` with signature
  `3raMu9eKGDrjgvB2rm1Lu853Fsg6UW6KxWgAXvtZEEP5MbGPGN8HSToUtNFNxrRxX8TbPcyoToxPJ9ckMdybfeyK`.
- The first 482,544 bytes dumped from the deployed program match the verified local
  artifact exactly; the existing account retains its larger reserved allocation.
- The temporary loader buffer was closed and its rent returned. Deployer balance
  after the upgrade was 6.44672932 devnet SOL.
- Live campaign: `B58nZRh9XEvUMNN45TdUmTaXQTbAWFUDcqnKC28i4jfh`.
- Campaign initialization signature:
  `3BMKUWMNUU3JSNnqG2pa9apcFC5NJKMtfj8MmsEwF6BMf6Enxo11eZnaxVwetEeCCStRbxVizceTMiBzpkPcZPpP`.
- Public frontend: `https://techkeyy.github.io/compart/`.
- Mainnet deployer balance checked: 0 SOL. No mainnet deployment has been claimed.

## Evidence still required

- Pitch/demo recording.
- Mainnet deployment remains a sponsor-funded stretch goal, not a submission blocker.
