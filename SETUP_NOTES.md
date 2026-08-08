# Setup Notes

> **Historical environment archive.** Values and deployment details below describe the earlier supplier prototype and previous program ID. Use `README.md`, the checked-in environment examples, and `AUDIT_REPORT.md` for the current build.

## Environment detected

- Node: 24.14.0
- npm: 11.9.0
- Rust: 1.95.0
- Solana CLI: 3.1.13
- Existing default Anchor CLI: 0.30.1
- Installed for the MagicBlock reference: Anchor CLI 1.0.2
- Default Anchor was restored to 0.30.1 after installing/testing 1.0.2.

## MagicBlock connectivity

- Solana devnet RPC responded successfully.
- MagicBlock devnet TEE returned `getHealth: ok`.
- Magic Router responded, although it does not expose the standard `getHealth` method.

## Official reference

Cloned at:

`vendor/magicblock-engine-examples`

Reference commit:

`a291e4b2c9cc4bab6918ff434d9aaa72c702cf29`

Private-counter dependencies installed successfully with Yarn 1.22.19.

The Windows MSVC build failed inside `ephemeral-rollups-sdk-attribute-ephemeral-accounts`
with `LNK1181: cannot open input file '.obj'`. The same source builds successfully in
Ubuntu WSL using its native filesystem, Rust 1.89.0, Solana 3.1.11, and Anchor 1.0.2.

Verified reference artifacts:

- `artifacts/private-counter/private_counter.so`
- `artifacts/private-counter/private_counter.json`
- `artifacts/private-counter/private_counter.ts`

The Compart market core also builds successfully in WSL. Verified artifacts:

- `artifacts/compartido-market/compartido_market.so`
- `artifacts/compartido-market/compartido_market.json`

Compart program ID:

`9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs`

The deploy key remains outside the Desktop repository. Do not commit deployment
keypairs.

## Compatibility observation

The current official reference uses:

- Anchor CLI/Rust dependency 1.0.2
- TypeScript `@coral-xyz/anchor` 0.32.1
- `@magicblock-labs/ephemeral-rollups-sdk` 0.14.3
- Rust `ephemeral-rollups-sdk` 0.16.2

Compart should follow the reference versions in an isolated project toolchain. Do not downgrade or overwrite other desktop projects.

## Reproducible WSL build

Build from a copy on WSL's native filesystem rather than directly under `/mnt/c`.
Cargo can use `CARGO_NET_OFFLINE=true` after the reference dependencies are cached.

## Verified Compart build

- Rust allocation tests: 3 passed, 0 failed.
- Public Solana regression test: passed.
- Full local MagicBlock Private ER lifecycle: passed.
- Frontend production build: passed.
- Optimized program size: 482,544 bytes.

The local Private ER test uses the official ephemeral-validator stack and proves
owner read/update, other-wallet denial, organizer allocation, early-undelegation
rejection, outcome-only commits, final settlement, and absence of private budget
accounts on the base layer.

## Hosted deployment status

Configured deployer:

`B1QKnX6RHfA8Bx3S8zzJGSKNiXbSTa7yy33fZJDWgsWS`

- Devnet balance after the verified upgrade: 6.44672932 SOL.
- Mainnet balance at the last check: 0 SOL.
- Exact rent-exempt minimum for the 482,544-byte deployment buffer plus its
  37-byte loader header: 3.35965464 SOL, plus transaction fees. Budget about
  3.37 SOL.
- The buffer rent is temporary and is reclaimed after a successful upgrade.
- The devnet upgrade completed at slot `482003683`. The onchain program bytes match
  the 482,544-byte local artifact, and the loader buffer was closed after its rent
  was reclaimed.
- Upgrade signature:
  `3raMu9eKGDrjgvB2rm1Lu853Fsg6UW6KxWgAXvtZEEP5MbGPGN8HSToUtNFNxrRxX8TbPcyoToxPJ9ckMdybfeyK`.
- Live campaign: `B58nZRh9XEvUMNN45TdUmTaXQTbAWFUDcqnKC28i4jfh`.
- Campaign initialization signature:
  `3BMKUWMNUU3JSNnqG2pa9apcFC5NJKMtfj8MmsEwF6BMf6Enxo11eZnaxVwetEeCCStRbxVizceTMiBzpkPcZPpP`.
- The hosted privacy and settlement proof passed against
  `https://devnet-tee.magicblock.app`. Proof campaign:
  `E96bS6AiPobPYKTf3iAqsEHomRKCc8go2txTNkV2JnUK`.
- Settlement signature:
  `2kkPwByve6VsStk5x3HQRWh4zxozLTkXLvu4okfWuxpJCZs36tkTvV5kRHTMzto9e8PQYhbEgUwivSaZtDbVsDgt`.
- The official devnet RPC independently confirmed all checked proof signatures as
  finalized, all three private budgets absent, and both receipts present.
- No mainnet deployment has been claimed.

For the existing devnet program, the loader buffer is temporary. For a new mainnet
deployment, budget about 3.37 SOL; most of the size-based cost remains as rent in
the deployed program account while the program exists.

The frontend environment templates are `app/.env.example` for devnet and
`app/.env.mainnet.example` for the final proof deployment. A live transaction path
also requires `VITE_CAMPAIGN_ADDRESS` after campaign initialization.
