# Compart Build Plan

## Product decision

Compart is a **private group-purchasing protocol**, beginning with one focused
beachhead: commitment rooms for event accommodation and group stays.

The initial demo is a group of friends trying to book shared accommodation for a
festival. Each person privately states the most they can afford and commits funds.
The public room shows whether the group is close to being viable, without exposing
any individual's budget. Deal-option publishers submit group quotes. A booking settles
only when one quote fits enough committed participants; otherwise everyone can be
refunded.

The product promise is:

> Plan together without one friend becoming the bank or anyone having to reveal
> what they can afford.

The product is narrow at the interface and broad at the protocol layer. The
hackathon ships one accommodation room, while the reusable primitive is a
conditional group purchase: participants commit private limits, suppliers compete
for the aggregate demand, and settlement happens only if the shared threshold is
met. Retreats and offsites, event passes, creator memberships, and group software
purchases remain expansion paths after the first use case is proven.

Positioning hierarchy:

- Category: private group purchasing.
- Beachhead: event accommodation and group stays.
- Demo: six friends booking one festival property.
- Promise: buy together without exposing what each person can afford.

## Problem

Group bookings regularly fail for three reasons:

1. People have different budgets but do not want to disclose them in a group chat.
2. One organizer must pay the deposit and chase everyone for reimbursement.
3. A late cancellation can leave the organizer or remaining participants covering
   the shortfall.

Expense trackers begin after somebody has already paid. Compart operates before
the booking: it discovers whether the group can afford a real option, collects
commitments, and either settles or refunds according to rules everyone can see.

## North-star demo

Six friends want shared accommodation for a festival.

1. An organizer creates a room with the dates, required group size, deadline, and
   maximum public deposit cap.
2. Friends join from an invite link and privately enter their maximum per-person
   budget.
3. Each participant commits the same public deposit cap, so the transfer amount
   does not reveal their private maximum.
4. The room updates live with public information only: participant count, committed
   quantity, deadline, and available host quotes.
5. Two hosts submit quotes for the whole group.
6. Compart selects the cheapest qualifying quote that fits enough private
   commitments.
7. Every accepted participant pays the same per-person clearing price. Excess
   deposits are refunded automatically.
8. If the required group size is not reached, the booking does not execute and all
   commitments become refundable.
9. The UI shows the final booking receipt and a Solana Explorer transaction.

The demo must visibly prove three things:

- Wallet A cannot read Wallet B's private budget.
- The shared room changes in real time as people and offers arrive.
- Final payment and refunds settle on Solana without the organizer fronting funds.

## Hackathon fit

The published Blitz brief is:

- **Theme:** Collaboration.
- **Eligibility:** every submission must integrate MagicBlock's Ephemeral Rollup.
- **Judging:** creativity, technical depth, and how compellingly the project
  showcases what is possible on Solana.

Compart crosses the requirements as follows:

| Published requirement or judging lens | Compart evidence |
| --- | --- |
| Collaboration | Several participants jointly determine whether one booking becomes possible. |
| **Eligibility — MagicBlock Ephemeral Rollup** | Participant bid accounts are delegated to MagicBlock's hosted TEE; authenticated private writes and allocation computation execute there. |
| Private ER integration | Each participant's maximum budget is isolated inside a permissioned private account. |
| Meaningful use of MagicBlock | Privacy prevents social pressure and price discrimination; real-time updates make the room feel live; neither is decorative. |
| Solana integration | Deposits, final payment, refunds, and booking receipts settle on Solana. |
| Creativity | The product coordinates demand before a purchase instead of merely tracking debts afterward. |
| Technical depth | Private state, public aggregate state, threshold clearing, escrow invariants, ER lifecycle, and base-layer settlement are shown end to end. |
| Compelling Solana showcase | One live room, private budget proof, onchain outcome, refund, receipt, and Explorer trail. |

The deal-option publisher is only the payout role for the selected group option;
it is not a MagicBlock requirement. The essential hackathon proof is collaborative
coordination, Private ER budget storage, ER delegation/private matching, and
Solana settlement.

Submission evidence required:

- Public GitHub repository.
- Deployed demo URL.
- Pitch/demo video.
- Solana Explorer link showing final settlement.
- Program ID.
- Two-wallet privacy proof.
- A short explanation of why the product requires MagicBlock.

## Current status

### Complete

- Official MagicBlock private-counter reference builds successfully in WSL.
- Compart's Anchor market core builds to an SBPF program and generates an IDL.
- Current devnet program ID: `E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh`.
- `PrivateBudget` exists only inside the Private ER; the public commitment contains
  no maximum price and every buyer deposits the same public cap.
- The full local Private ER lifecycle passes with three buyers and two suppliers.
- Owners can read and update their own private budget; another buyer is denied.
- The organizer can compute allocations privately and commit outcomes only.
- Premature undelegation is blocked and private budgets remain absent from Solana.
- Exact-threshold and failed-threshold allocation unit tests pass.
- Public regression proves the public bid has no maximum-price field and settlement
  cannot occur before private allocation.
- The optimized 482,544-byte program and current IDL are saved under `artifacts/`.
- The frontend opens in an invite-only room lobby instead of a hardcoded campaign
  or public marketplace.
- The public build does not inject a featured room or demo metadata. It does not
  display a network-wide room feed; connected wallets load only rooms they created,
  joined, or received a receipt from.
- Organizers can create unlisted rooms on devnet and copy distinct participant and
  supplier invitations. Public accommodation details travel with the shared link.
- Organizers create one-time, role-bound claim links. Recipients connect their own
  wallet to claim participant or supplier access; the program rejects cross-role and
  uninvited actions.
- Participant, host, and organizer workspaces are separated, with creator-wallet
  verification protecting organizer settlement controls.
- The participant flow implements the public deposit, account delegation,
  authenticated TEE session, private-budget create/update, and Explorer proof path.
- Supplier quotes, the organizer's full private-allocation lifecycle, public
  settlement, participant refunds, and prototype receipt transactions are wired
  into the frontend.
- Transaction steppers show each wallet and network stage, while the room lifecycle
  explains collecting, quoting, private matching, settlement, and completion.
- Every room includes its public purchase brief, dates, terms, privacy boundary,
  success/failure result, and links to verifiable program and room accounts.
- Previous rooms and on-chain receipt accounts are available from the activity view.
- Desktop and 390 px mobile layouts have been visually inspected.
- The responsive frontend builds and is locally previewable.
- The verified program artifact is upgraded on hosted devnet and byte-matched
  against an onchain dump.
- The live six-person festival campaign is initialized on devnet.
- The public frontend is deployed at `https://techkeyy.github.io/compart/`.
- The public source repository is `https://github.com/Techkeyy/compart`.
- The hosted Private ER lifecycle passes with two-wallet denial, outcome-only
  allocation, settlement, refunds, and prototype receipts.

### In progress

- Recording the final demo and assembling the submission entry.

### Not yet complete

- Mainnet program deployment and minimal proof transaction.
- Inventory-backed booking integration (the clearly labeled prototype receipt is complete).
- Recorded demo.

## Implemented correctness rules

### 1. Keep the maximum budget off the base layer

The program uses two accounts:

- `Commitment` on Solana: participant, fixed deposit, requested quantity,
  allocation, charge, refund, and status.
- `PrivateBudget` created as an ephemeral-only account in the Private ER: participant,
  room, maximum unit price, and any private preferences.

Only the outcome is committed. The private maximum is never committed back to
Solana, and the local privacy test proves the ER-only account is absent from the
base layer.

### 2. Use a fixed public deposit cap

Every participant deposits the same public cap for the room or selected tier. The
deposit is not derived from the private maximum.

At settlement:

```text
accepted charge = allocated quantity * uniform clearing price
accepted refund = fixed deposit - accepted charge
rejected refund = fixed deposit
```

### 3. Require a viable group before payout

Supplier payout must not happen unless the allocation meets the room's required
group size or quantity.

```text
allocated quantity >= required quantity
```

If this is false, the room expires and all participant commitments become
refundable.

### 4. Do not overclaim delivery

For the hackathon, the receipt may represent a prototype booking voucher. The UI
and pitch must not claim that a real hotel or ticketing system has been booked
unless an actual integration exists. The onchain receipt should still record the
room, participant, supplier, quantity, price, and settlement transaction.

## Architecture

```text
Solana base layer
├── Room configuration
├── Fixed-cap participant commitments
├── Treasury / escrow
├── Supplier quotes and public room progress
├── Final charges and refunds
└── Booking receipts

Private Ephemeral Rollup / TEE
├── Delegated participant bid account
├── PrivateBudget per participant
│   ├── participant
│   ├── maximum unit price
│   └── permission metadata
└── Outcome-only allocation computation
```

## 24-hour execution plan

### Gate 1 — Correct private commitment path — complete

Target: hours 0-5.

- Split the current `Bid` into public `Commitment` outcome state and an
  ephemeral-only `PrivateBudget`.
- Add a fixed deposit cap to room configuration.
- Create and permission the private budget directly inside the TEE.
- Add or update tests proving the maximum never exists in base-layer account data
  or transaction-sized deposits.
- Enforce the required allocation threshold before payout.

Exit criteria: the revised program builds and deterministic local tests cover both
successful and failed group thresholds.

### Gate 2 — Prove MagicBlock lifecycle — complete

Target: hours 5-9.

- Delegate the live room or commitment state to the ER.
- Create two private budgets with two wallets.
- Prove each owner can read their own budget.
- Prove Wallet A is rejected when reading Wallet B's budget.
- Complete one ER update and commit only the public outcome.

Both local and hosted-devnet exit criteria are satisfied. The hosted run saved
privacy-denial output, outcome-commit signatures, settlement, all three refunds,
and two prototype receipt transactions.

### Gate 3 — Build one polished room — participant path complete

Target: hours 9-16.

Build only these views:

- Room page: trip image, dates, required group size, deadline, live progress, quotes.
- Participant panel: connect wallet, enter private maximum, commit, view personal
  status and refund.
- Host panel: submit quantity and per-person quote.
- Receipt panel: final price, allocation/refund, supplier, and Explorer link.

UX rules:

- Role-specific participant and supplier invitations are the primary onboarding path.
- Explain “private budget” and “public progress” in ordinary language.
- Do not require users to understand ERs, PDAs, delegation, or RPC routing.
- Show confirmed signatures rather than simulated success messages.

The room, real participant commitment, supplier quote, organizer finalization,
refund, and prototype receipt paths are implemented in the application and build
cleanly. The hosted scripts remain reproducible proof and recovery tools.

### Gate 4 — End-to-end hosted-devnet demo — complete

Target: hours 16-19.

- Reset and seed one festival accommodation room.
- Run three participant commitments and two host quotes.
- Settle one qualifying quote.
- Claim or display refunds.
- Create booking receipts.
- Capture the final Explorer transaction.

Exit criteria: the demo can be repeated twice without manual state repair.

### Gate 5 — Submission and pitch — repository and frontend published

Target: hours 19-24.

- Publish the repository and deployed frontend.
- Record a 90-120 second demo.
- Update README with setup, program ID, architecture, privacy proof, and Explorer
  link.
- Submit before the deadline.
- Reserve the final two hours for failed transactions, deployment delays, and video
  re-recording.

## Demo script

Opening:

> Planning a group trip usually means awkward budget conversations and one friend
> fronting the money. Compart lets everyone commit privately and books only when
> the group can actually afford it.

Demo sequence:

1. Show the festival accommodation room and invite link.
2. Connect three participant wallets.
3. Enter three different private maximum budgets.
4. Show that the public room reveals progress but not the amounts.
5. Attempt to read one participant's budget from another wallet and show rejection.
6. Post two host quotes and show live updates.
7. Close the room and select the cheapest viable quote.
8. Show equal participant pricing, refunds, booking receipts, and the Explorer link.

Closing:

> Expense apps tell you who owes whom after someone pays. Compart makes the plan
> real without anyone becoming the bank.

## Scope guardrails

Do not add during the hackathon:

- General marketplace discovery.
- Chat or itinerary planning.
- Multiple currencies.
- Reputation systems.
- Governance or a new token.
- Real hotel APIs unless the complete core demo is already stable.
- Mainnet custody of real user funds.

One room, one currency, one uniform price, one threshold, one settlement, and one
refund path are sufficient.

## Post-hackathon path

If the demo resonates:

1. Validate the workflow with group-trip organizers and festival communities.
2. Start supply manually through hosts, travel agents, or affiliate booking partners.
3. Charge a success fee only when a room clears.
4. Add cancellation rules and supplier collateral.
5. Expand the same commitment-room primitive to retreats and offsites, event
   passes, creator drops, and shared software purchases.

## Mainnet stretch goal

Do not hold real funds or represent real bookings on mainnet until:

- Private budgets never touch public Solana state.
- The two-wallet privacy proof passes repeatedly.
- Successful and failed threshold settlement tests pass.
- Refunds pass under forced failure cases.
- Supplier delivery and cancellation rules are defined.
- The program receives an independent review.

The organizers have said mainnet is preferred, but the verified program would cost
roughly 3.37 SOL to deploy because of its size. The team will not spend that amount
for a hackathon proof. A complete hosted-devnet deployment, Private ER privacy
evidence, live frontend, and Explorer transactions are the submission target.

Mainnet is attempted only if the organizers provide credits or another sponsor
covers deployment rent. It is not allowed to delay the devnet demo, public URL, or
recording.
