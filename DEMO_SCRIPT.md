# Compart Demo Script

## 90-second business-pitch walkthrough

### 0:00–0:12 — The problem

> Planning a shared purchase breaks down before anyone reaches checkout. Friends have
> different budgets, nobody wants to explain theirs in a group chat, and one
> organizer is usually asked to carry the financial risk.

Open Compart's live app. Show the empty **My rooms** area, plus **Create a room**
and **Join with invite**.

> Compart is not a public marketplace of everyone’s plans. Every room is unlisted
> by default: you create one, then invite the exact people you want involved.

### 0:12–0:27 — Create and invite

Show a prepared room or create one with a group size, equal USDC deposit, approved
goal range, five-minute demo deadline, and simple prototype terms. In the organizer
view, use **Create and copy claim link**.

> The organizer shares a fresh one-time link with each person. When someone connects
> their wallet, that link grants participant access once. A plain room address stays
> read-only, so strangers cannot add commitments.

### 0:27–0:45 — Private commitment

Open the participant invitation with Wallet A. Choose a private maximum in devnet USDC and
run the commitment flow. Show the public progress move without showing the limit.

> Everyone puts down the same refundable public deposit. Their personal maximum
> is protected in MagicBlock’s private runtime, so friends cannot use it to pressure
> anyone’s contribution upward.

Open the public Explorer transaction.

> Solana can verify that someone committed. It never receives their private budget.

### 0:45–1:02 — One group decision

Commit from Wallet B, then return to the organizer after the deadline. Select a
final total inside the goal range and start **Close, match and settle**.

> Compart divides the selected goal into one equal share and privately checks
> whether enough invited people can cover it. The room learns the outcome, not
> anyone’s private ceiling.

Show the guided private matching and public settlement steps.

### 1:02–1:20 — Outcome and safety net

Show the settled room: organizer payout, equal-share price, excess refunds, and a
participant prototype receipt.

> The group pays one fair clearing price. Participants who deposited more receive
> the difference back. If the room cannot clear, the organizer cancels and the
> program automatically returns every full deposit. That recovery path still needs
> the private runtime to return the protected room accounts to Solana.
> Nobody is forced to become the bank for the group.

Open the final Solana Explorer transaction and the receipt account.

### 1:20–1:30 — Close

> Compart is a private group checkout for trips, events, subscriptions, stays, or
> any purchase that only makes sense once enough people agree.

## Claims to keep precise

- Call the room **unlisted**, not fully secret: anyone who already knows its
  Solana address can inspect its public settlement state.
- Say the private maximum is protected only after the authenticated private
  transaction has completed.
- Call the final document a **prototype purchase receipt**, not proof that a real
  item, booking, or service was delivered.
- Say **Circle devnet USDC**, not real customer funds. Devnet SOL and devnet USDC
  have no real-world value.
- Do not claim variable private charges or a revealed private aggregate. The current
  matcher tests whether each participant can cover an equal share.
