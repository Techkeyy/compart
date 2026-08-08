# Compart Architecture

## The simple version

Compart separates a person's secret spending limit from the public proof that
they joined the group.

- Solana holds the room rules, equal deposits, supplier quotes, final outcomes,
  refunds, and receipts.
- MagicBlock's Private Ephemeral Rollup temporarily holds each person's maximum
  price and performs the matching inside its TEE.
- Only the result comes back to Solana. The private maximum does not.

## State ownership

```text
Solana base layer
├── Campaign
│   ├── organizer, deadline, required quantity
│   ├── public deposit cap
│   └── final aggregate outcome
├── Treasury / escrow
├── Bid (public commitment)
│   ├── buyer and requested quantity
│   ├── fixed public deposit
│   └── allocation, charge, and refund outcome
├── Supplier offers
└── Prototype booking receipts

MagicBlock Private Ephemeral Rollup / TEE
└── PrivateBudget per buyer
    ├── campaign and buyer
    ├── maximum unit price
    └── permission boundary: buyer + organizer
```

The public `Bid` deliberately has no `max_unit_price` field. A transfer derived
from the maximum would leak it indirectly, so each participant escrows the same
public cap for the requested quantity.

## Transaction flow

1. The organizer creates a campaign and public deposit cap on Solana.
2. A buyer creates a public commitment and escrows the fixed deposit.
3. The commitment is delegated to MagicBlock's TEE validator.
4. The wallet authenticates to the Private ER by signing a message.
5. The buyer creates or updates an ER-only `PrivateBudget` and gives read access
   only to themselves and the organizer.
6. The organizer delegates the campaign and computes the allocation in the TEE
   using the public commitments, private budgets, and supplier offers.
7. The TEE writes only allocation, charge, refund, clearing price, and status into
   the delegated public accounts. `PrivateBudget` accounts are not committed.
8. The outcome accounts return to Solana and base-layer settlement verifies the
   escrow arithmetic before enabling payout, refund, and receipt instructions.

## Privacy properties

Public by design:

- who committed and how much quantity they requested;
- the same fixed deposit for each unit;
- participant count, deadline, supplier offers, and room status;
- final allocation, common price, charge, and refund.

Private by design:

- each participant's maximum price;
- any future private matching preferences.

The full local integration test confirms that an owner can read and update their
budget, a different buyer is denied, the organizer can compute allocations, and
the private budget account never appears on the Solana base layer.

## Settlement invariants

```text
accepted charge = allocated quantity × uniform clearing price
accepted refund = fixed deposit − accepted charge
rejected refund = fixed deposit
supplier payout = total allocated quantity × clearing price
```

If the required quantity is not reached, every allocation and supplier payout is
zero and every participant receives the full deposit as their refund liability.
Settlement is rejected until the private allocation has been computed and its
public outcomes returned.

## Failure handling

- Campaign expires without a viable offer: all deposits become refundable.
- Supplier offer cannot cover the required quantity: it cannot win.
- Commitment arrives after the deadline: reject without changing state.
- Early undelegation: reject until allocation has been computed.
- Missing or inconsistent payout accounts: fail before moving settlement funds.
- Private TEE unavailable: show a retry state and never present simulated success
  as a confirmed transaction.

## Repository shape

```text
compart/
├── app/                    # Vite + React frontend
├── programs/
│   └── compartido-market/ # Anchor program
├── tests/                  # Public and Private ER lifecycle tests
├── artifacts/              # Verified program binary, IDL, and generated types
├── scripts/                # Local/devnet setup helpers
├── README.md
├── BUILD_PLAN.md
├── ARCHITECTURE.md
├── TEST_RESULTS.md
└── DEMO_SCRIPT.md
```
