# Hosted Devnet Proof

Compart's full privacy and settlement lifecycle passed on Solana devnet and
MagicBlock's hosted devnet TEE on August 8, 2026.

## Result

- Program: `9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs`
- Proof campaign: `E96bS6AiPobPYKTf3iAqsEHomRKCc8go2txTNkV2JnUK`
- The owner read and updated their own private budget.
- A second authenticated buyer was denied access to that budget.
- The organizer could compute the group outcome.
- All three private-budget accounts were absent from Solana before and after the
  computation.
- Private limits of 1,550,000, 1,300,000, and 900,000 lamports produced public
  allocations `[1, 1, 0]` at a clearing price of 1,000,000 lamports.
- Refund liabilities were `[800000, 800000, 1800000]` lamports.
- Supplier payout was exactly 2,000,000 lamports.
- Three refunds and two prototype access receipts finalized successfully.

## Public transaction evidence

- [Initialize proof campaign](https://explorer.solana.com/tx/Cd4UhDCrHmmmZkbNK7bdRjhwiJAt2xaJqYqW6NpRBYHgDAj32KVtfFPepmC4j5HfedS6PFMUhFjJMZgpNRzt8fk?cluster=devnet)
- [Delegate buyer 1 commitment to the TEE](https://explorer.solana.com/tx/48LjMx7gkTvg2Sy8oXjQfjpZKKdy2T95HnXSWMK6YkSNLVxuTchB4sPJnWegLn2mqeJg6WNW7ny1GcLvMpcMAR74?cluster=devnet)
- [Delegate buyer 2 commitment to the TEE](https://explorer.solana.com/tx/2gvfvSNgc8tkD7hpaQG3o7aPPnJjpGUjgM4nRjYkQRUkWU45dV6HMaDsNu4D1xW7vhepzNMa9aykub6FujV3e6LP?cluster=devnet)
- [Select the cheapest qualifying supplier](https://explorer.solana.com/tx/eSZVBDSKy6LRpwzVB48QhDZtLM73YDoU5CSz6yFFc3vDzTD5Nup3PXhxZchw23nNeZyAqkyyVXa1CNxiVs7NP3K?cluster=devnet)
- [Delegate campaign for private allocation](https://explorer.solana.com/tx/gQAHU7nEiniwsaB29UYwTvyfv7CrZzii577t4yuG49guezzpFY2F6yPPNQBTz3YzVHQZWEjuz7wUSgesKZsByXe?cluster=devnet)
- [Settle the campaign and pay the supplier](https://explorer.solana.com/tx/2kkPwByve6VsStk5x3HQRWh4zxozLTkXLvu4okfWuxpJCZs36tkTvV5kRHTMzto9e8PQYhbEgUwivSaZtDbVsDgt?cluster=devnet)
- Refunds: [buyer 1](https://explorer.solana.com/tx/2pBWuUgdMsjz6Q65MbVQmhfUkKdyMnQRMeUQbK8KXHDb9d8r7L8tjFMLj4fuVWYXNzhWRsdtzubhBfFWRczt6sM?cluster=devnet), [buyer 2](https://explorer.solana.com/tx/2gjXuA8Q78Mnt2jaPNhTJEuBxGaisyR7pXvBdo1LfjXz894B2Y7bRgW84BTL1xSwj5ZyeStaXEwNGZWwGABBz8Vf?cluster=devnet), [buyer 3](https://explorer.solana.com/tx/4WspUXdVKPWqfdW5hK9u9ibvXgcQ85qUoisGVMozSrRcETNhRgfaWFSrkmSBnrkfmBmW3tGCfYvZpDDLBvMwEzyh?cluster=devnet)
- Prototype receipts: [buyer 1](https://explorer.solana.com/tx/2WNGYTYwPHHN8rgscc2kBR6tighRfMpL4QLq4scSzzXSbDoJL5AuUJuFKz6BFiq4yVabRGkS7bDRh4sUWMbrt86c?cluster=devnet), [buyer 2](https://explorer.solana.com/tx/ppwqZ6F9oV4u11mp7sAFfuppHA1bdBK5QtFu4uCEpj588nBDXKA1xs77vERUEWifJa9Gpm2gsXY1ddMNj1fcm9t?cluster=devnet)

The TEE-only budget transactions are intentionally not Solana base-layer
transactions. The reproducible runner in `tests/hosted-devnet-lifecycle.js`
authenticates two different wallet identities, asserts the cross-wallet read is
denied, and asserts every private-budget address is absent from base-layer state.
`scripts/verify-hosted-proof.js` independently checks the finalized public
signatures, private-account absence, and receipt presence through Solana's official
devnet RPC.

Core hosted TEE signatures retained from the run:

- Buyer 1 private budget creation and protection:
  `24c53nDbEA362DZbe3xvvgSZpMt6v3TZf1BWTwJn3PjvKeppcJAC1DkjUFVMTYgHTYPQ8A71CQTC5QreMB1V7skS`
- Buyer 2 private budget creation and protection:
  `29ALcBfwgLtBYZ1LrawFgpDV6iRQyzNJ8QVMAuja5Dgu54eXgzXYvLQ3K45ugmrLcJQnDwCK3dPLbCavjxsR5kba`
- Owner-only budget update:
  `KWv1bUXnUeqEZHUvSXhAJdyD6iU5NnfM9ZeHenGkJKNYyJ6yiMGj2yf1avFf6ZNhb1JRZzFNP1usheqHJeAGfVB`
- Private allocation computation:
  `4w96WhJ3uVhUm17jHtHtqEUct1ntEta4bRn1MD739rZtztTZzDS7bJ4mLSM2bzuue2j4jtrPCPHtQZhx9m7WwyAa`

After verification, 237,643,408 unused devnet lamports were returned from the five
disposable proof wallets to the deployer in [this cleanup transaction](https://explorer.solana.com/tx/21AyjxrZyddtFZN7JoP3n6gyEpyRZDK4pJzc9cUdGRqDpycD44TYTR5ET1CX7HTF49hFY5NMNwQEs2uEDFtr2UCX?cluster=devnet).
