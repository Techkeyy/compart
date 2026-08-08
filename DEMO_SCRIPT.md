# Compart Demo Script

## 90-second business-pitch walkthrough

### 0:00–0:12 — The problem

> Planning a group stay breaks down before anyone reaches checkout. Friends have
> different budgets, nobody wants to explain theirs in a group chat, and one
> organizer is usually asked to carry the financial risk.

Open Compart's live app. Show the empty **My rooms** area, plus **Create a room**
and **Join with invite**.

> Compart is not a public marketplace of everyone’s travel plans. Every room is
> unlisted by default: you create one, then invite the exact friends and hosts you
> want involved.

### 0:12–0:27 — Create and invite

Show a prepared room or create one with a group size, equal deposit, deadline,
and simple prototype terms. In the organizer view, show **Copy participant
invite** and **Copy supplier invite**.

> The organizer sends one invitation to the group and another to selected property
> hosts. They are coordinating one private purchase room—not broadcasting demand to
> the internet.

### 0:27–0:45 — Private commitment

Open the participant invitation with Wallet A. Choose a maximum of 0.02 SOL and
run the commitment flow. Show the public progress move without showing the limit.

> Everyone puts down the same refundable public deposit. Their personal maximum
> is protected in MagicBlock’s private runtime, so neither friends nor suppliers
> can use it to pressure the price upward.

Open the public Explorer transaction.

> Solana can verify that someone committed. It never receives their private budget.

### 0:45–1:02 — Competing supply, one fair price

Open the supplier invitation with two supplier wallets. Show complete-group quotes
of 0.016 SOL and 0.014 SOL per person. Return to the organizer view after the
deadline and
start **Close, match and settle**.

> Suppliers compete for the whole group. Compart privately checks whether enough
> invited people can support a quote, then selects the cheapest quote that clears.
> It does not reveal why any individual did or did not qualify.

Show the guided private matching and public settlement steps.

### 1:02–1:20 — Outcome and safety net

Show the settled room: winning supplier, equal 0.014 SOL allocation price, excess
refunds, and a participant prototype receipt.

> The group pays one fair clearing price. Participants who deposited more receive
> the difference back. If the room cannot clear, the supplier receives nothing and
> every participant can reclaim the full deposit. Nobody is forced to become the
> bank for the group.

Open the final Solana Explorer transaction and the receipt account.

### 1:20–1:30 — Close

> Compart starts with group accommodation, but the product is bigger: a private
> group checkout for any purchase that only makes sense once enough people agree.

## Claims to keep precise

- Call the room **unlisted**, not fully secret: anyone who already knows its
  Solana address can inspect its public settlement state.
- Say the private maximum is protected only after the authenticated private
  transaction has completed.
- Call the final document a **prototype booking voucher**, not proof that a real
  property was booked.
- Devnet transfers are prototype accounting, not dollars, USDC, or live customer funds.
