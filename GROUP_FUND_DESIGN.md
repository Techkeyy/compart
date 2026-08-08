# Compart private group fund

## Product rule

An organizer opens a time-bound plan with a **minimum viable goal** and a
**maximum approved goal**. The organizer may participate under the same rules as
everyone else. Every contributor privately chooses a maximum per-person share.
At the deadline, the organizer selects a total inside the approved range. The
plan succeeds only when enough private maximums can cover the resulting equal
share; otherwise the fund fails and contributors recover their deposits.

## Privacy and settlement model

Public Solana transfers cannot carry different contributor amounts without
revealing them. This safe prototype therefore uses a uniform public escrow cap.
Each private maximum lives in MagicBlock's Private ER, which decides whether the
participant can cover the equal share. The public chain receives allocation and
refund outcomes, but never the private maximum itself.

## State flow

1. Organizer creates `min_goal`, `max_goal`, escrow cap, and deadline.
2. Organizer and invitees create a public commitment plus a Private ER pledge.
3. At the deadline, the organizer selects a final goal in the approved range.
4. Private ER checks which commitments can cover `final goal ÷ required people`
   and publishes only allocations and refund liabilities.
5. Solana pays the organizer when the required group clears. Successful-room
   excess becomes individually claimable; cancellation returns every full
   deposit automatically.

## Non-negotiable constraints

- The organizer cannot withdraw more than the selected goal.
- The selected goal cannot exceed the approved maximum or the room's public escrow capacity.
- A failed goal pays the organizer nothing.
- Individual pledge values never appear in public campaign or bid data.
- The organizer's own wallet can create a contribution without changing its
  organizer authority.

## Current limitation

Compart does not yet privately debit a different amount from every participant
or reveal a private aggregate to the organizer. Variable private charging needs
a separate private SPL-payment settlement design and is intentionally not
claimed by this version.
