# Test Results

## Current result

The outcome-only privacy design passes locally against the full MagicBlock stack.
The remaining verification is to repeat the same lifecycle on hosted devnet and
save its transaction signatures before the preferred mainnet proof deployment.

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

## Build verification — passed

- Anchor/SBPF program build passes.
- Optimized program size: 482,544 bytes (about 472 KiB).
- Current `.so`, IDL, and TypeScript types are stored in
  `artifacts/compartido-market/`.
- Frontend production build passes.
- Local frontend preview returns HTTP 200 at `http://127.0.0.1:4173` while the
  preview server is running.

The frontend build reports a non-blocking large-chunk warning. Its installed
dependency tree also reports two low and four moderate advisories in transitive
packages; no forced dependency rewrite has been applied because that could break
the official SDK integration during the hackathon.

## Hosted network status

- Deployer: `B1QKnX6RHfA8Bx3S8zzJGSKNiXbSTa7yy33fZJDWgsWS`
- Devnet balance checked: 1.44912932 SOL.
- An older artifact is deployed at program ID
  `9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs` and its upgrade authority matches
  the deployer.
- The new 482,544-byte artifact fits within the existing devnet program account.
- Required temporary loader buffer, including its 37-byte header: 3.35965464 SOL
  plus a small fee margin. Budget about 3.37 SOL. The
  buffer rent is reclaimed after a successful upgrade.
- Devnet faucet requests were rate limited, so the hosted upgrade is waiting for
  additional devnet SOL.
- Mainnet deployer balance checked: 0 SOL. No mainnet deployment has been claimed.

## Evidence still required

- Hosted-devnet program upgrade.
- Hosted two-wallet privacy denial and outcome-only commit signatures.
- Hosted settlement/refund/receipt signature and Explorer link.
- Mainnet funding, deployment, and minimal proof transaction.
- Deployed frontend URL configured with the live campaign address.
