# Compart Demo Script

## 90-second story

### 0:00–0:12 — The problem

> Group trips break down before checkout. Friends have different budgets, nobody
> wants to announce their limit in the group chat, and one organizer usually has
> to front the money. Compart lets the group commit together without exposing
> what each person can afford.

Show the Solana Festival House room: dates, six-person target, deadline, equal
public deposit, and live group progress.

### 0:12–0:35 — A private commitment

Connect the first wallet and choose a maximum of €165.

> Everyone puts down the same refundable public deposit. My personal maximum goes
> into MagicBlock's Private Ephemeral Rollup, so neither my friends nor the host can
> use it to push the price upward.

Approve the deposit/delegation and the authenticated private transaction. Show the
public Explorer proof, which contains the commitment but not the private maximum.

### 0:35–0:50 — Prove the privacy

Switch to a second wallet and attempt to read the first wallet's private budget.
Show the denied request. Then show that the owner can still read and update it.

> This is enforced by the private account's permissions, not hidden with CSS or a
> database promise.

### 0:50–1:10 — The group clears a quote

Show two host quotes: €158 and €142 per person. Close the room and let the organizer
run allocation inside the TEE.

> Private limits are matched against competing group quotes. The cheapest viable
> quote wins, accepted friends all pay the same €142 price, and only those outcomes
> return to Solana.

Show that the private budget accounts do not exist on the base layer.

### 1:10–1:25 — Settlement

Show the winning host, equal charges, excess-deposit refunds, one rejected buyer's
full refund, and the prototype booking receipt. Open the final Explorer transaction.

> If the required group cannot clear a quote, the host gets nothing and every
> commitment becomes fully refundable. Nobody becomes the bank.

### 1:25–1:30 — Close

> Accommodation is our first room. The product underneath is private group
> purchasing for any purchase that becomes possible only when enough people agree.

## Proof fixture versus product screen

The polished product screen uses a six-person festival stay. The short technical
proof fixture uses three buyers, two suppliers, and a two-person threshold so the
privacy, allocation, refund, and payout can be demonstrated quickly and repeated
without manual repair.

## Claims to avoid

- Do not say a real property was booked without an inventory integration.
- Call the receipt a prototype booking voucher.
- Do not describe preview-mode interactions as transactions.
- Do not say a budget is private unless the authenticated TEE transaction confirms.
