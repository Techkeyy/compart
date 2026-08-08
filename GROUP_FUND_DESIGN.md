# Compart private group fund

## Product rule

An organizer opens a time-bound plan with a **minimum viable goal** and a
**maximum approved goal**. The organizer may contribute. Every contributor
privately chooses a maximum pledge. At the deadline the organizer may learn the
aggregate only. The plan succeeds only when the aggregate can cover a selected
amount inside the approved goal range; otherwise the fund fails and contributors
recover their deposits.

## Privacy and settlement model

Public Solana transfers cannot carry different contributor amounts without
revealing them. New rooms therefore use a uniform public escrow cap, while each
actual pledge and the aggregate live in MagicBlock's Private ER. The private
runtime computes each final charge and refund. The public chain receives only
the success/failure outcome and settlement commitments required to enforce
withdrawals.

## State flow

1. Organizer creates `min_goal`, `max_goal`, escrow cap, and deadline.
2. Organizer and invitees create a public commitment plus a Private ER pledge.
3. At deadline, Private ER writes a permissioned aggregate result visible only
   to the organizer and a public `goal_met` outcome.
4. Organizer selects a final goal in the approved range and no greater than the
   private aggregate.
5. Private ER calculates individual charges/refunds; Solana releases the final
   goal to the organizer or enables full refunds.

## Non-negotiable constraints

- The organizer cannot withdraw more than the selected goal.
- The selected goal cannot exceed the private aggregate or approved maximum.
- A failed goal pays the organizer nothing.
- Individual pledge values never appear in public campaign or bid data.
- The organizer's own wallet can create a contribution without changing its
  organizer authority.
