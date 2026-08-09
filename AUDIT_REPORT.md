# Compart Audit Report

Audit date: 2026-08-09  
Scope: repository history and hygiene, frontend, Anchor program, generated artifacts, documentation, CI, production build, dependency advisories, responsive UI, and the deployed Solana devnet program.

## Verdict

The repository is structurally clean, its deterministic checks pass, and the stale MagicBlock executable that caused Anchor error `0xbbb` has been removed from the active deployment path. Compart now uses a fresh Solana devnet program address, and MagicBlock exposes a fresh Loader v4 clone for that address. A new two-wallet room remains the final hosted acceptance run before recording the demo.

## Material findings fixed

1. **Settlement account-count mismatch.** Private allocation receives one public commitment and one private-budget account per participant, while base settlement receives one commitment account per participant. The program had those counts reversed, causing valid transactions to fail. The counts now match the frontend builders and have a regression test.
2. **Cancellation crossed execution layers incorrectly.** The previous client attempted USDC transfers while accounts were still delegated to the Private ER. Cancellation is now a two-phase protocol: prepare full-refund outcomes privately, return the delegated accounts to Solana, then atomically transfer every full deposit on the base layer.
3. **Retired supplier workflow remained active.** Supplier/host screens, invitation roles, quote builders, and stale explanatory copy were removed from the live product. The current flow is organizer plus invited participants only.
4. **Some valid-looking goals could never split evenly.** Room creation and settlement now require at least one total in the approved range that divides evenly across the required participants, and the UI suggests a valid total.
5. **Generic product copy still leaked accommodation assumptions.** Active form labels, plan types, dates, terms, cards, and demo text now describe group purchasing broadly rather than one hardcoded stay.
6. **Documentation and automation had drifted.** The root and app READMEs now describe Circle devnet USDC, private rooms, current roles, refunds, and limitations. Historical supplier-era runners and proof files are explicitly archived. A CI workflow now builds the frontend and runs Rust formatting, tests, and strict Clippy checks.
7. **Cancelled-room UI implied a manual claim.** The result screen now states that full deposits were returned automatically by the organizer's cancellation transaction.
8. **Wallet connection failures were invisible in the lobby.** Provider detection now validates an injected Solana wallet, normalizes its returned public key, and shows connecting, success, cancellation, missing-extension, or provider errors directly beneath the app header.

## Verified

- `cargo fmt --all -- --check` passed.
- `cargo check --workspace --all-targets` passed.
- `cargo test --workspace --all-targets` passed: 4 tests, 0 failures.
- `cargo clippy --workspace --all-targets -- -D warnings` passed.
- `npm --prefix app run build` passed: 305 modules transformed.
- Root production dependency audit: 0 vulnerabilities.
- Frontend production dependency audit: no high or critical advisories; 2 low and 4 moderate transitive advisories remain in the Solana/MagicBlock dependency graph. The automated forced fixes propose incompatible downgrades and were not applied.
- Secret-pattern and repository-hygiene scans found no committed wallet keypair or environment secret. Keypair and environment patterns remain ignored.
- Desktop landing page and mobile live-app lobby were visually inspected. At Chrome's true 500 px headless viewport, the page had no horizontal overflow and all primary controls were readable.
- The wallet adapter now completes the injected provider's `connect()` handshake before exposing a connected account, preventing a cached address from creating a false signing session. The missing-provider path was browser-tested and displays an accessible error and Phantom installation link.
- Participant commitments now confirm the public USDC deposit before delegating the account to MagicBlock. This matches the intended lifecycle ordering, but it does not resolve the current hosted TEE executable mismatch.
- Organizer settlement re-checks the campaign owner after a reported delegation failure. If Solana already records the MagicBlock handoff, the flow resumes at private verification instead of displaying a false step-two failure.
- Anchor generated the current JSON and TypeScript IDLs, including `prepare_cancellation`.
- Audited fresh program artifact SHA-256: `5ece2cd2b7d2327de89333d916cdab911bc488ee98c387fa68586563536c203e`.
- Current devnet program: `BaxzdeGdxpnNELYZtXX9s1zNzTvdNNKWqFyDYpzz2WpJ`.
- Deployment transaction: `58WqomWFbLrr7oaz9fPzNZG9VZoVVn7fq1iBZ8n4X5VMq4ZVv6d9bFdhonWNcDSRqHDtiKdYVjbBghV7Z6vvDrxW`.
- Deployed slot: `482409811`.
- Solana reports a 638,272-byte program, and MagicBlock exposes a fresh 638,320-byte Loader v4 representation for the new address. The retired address remains historical devnet state.
- The current public room and delegated commitment accounts were read successfully from both Solana devnet and the TEE RPC with valid Anchor discriminators and expected lengths.
- The private-budget PDA did not yet exist when `place_private_budget` failed, isolating the error to execution-time account deserialization rather than an already-initialized private account.
- The retired program address reproduced the hosted-validator cache mismatch: its ProgramData updated while its 554,072-byte Loader v4 executable did not. Migrating to the fresh program address forced a new MagicBlock clone and removed that stale executable from the active application path.

## Confirmed non-issues

- Legacy supplier-named fields and instructions remain in the on-chain ABI for account-layout compatibility, but the active app does not expose or call that workflow. Current goal selection fixes the organizer as payout recipient, preventing supplier-address redirection.
- The checked-in program binary is well below GitHub's file-size limits, and repository object history is small.
- A clipped 390 px audit screenshot was caused by headless Chrome enforcing a 500 px internal viewport while cropping the bitmap. DOM measurements showed no page overflow; a matching 500 px capture rendered correctly.

## Current blocker and remaining limitations

- The current goal-range workflow does not yet have a new automated hosted two-wallet lifecycle runner. The archived runners describe an older supplier workflow and are not accepted as current proof. Perform one fresh organizer-plus-participant stress test against the new program before recording the demo.
- Cancellation still requires MagicBlock's private runtime to be reachable long enough to prepare and return delegated accounts. A total Private ER outage cannot be bypassed by this prototype.
- A room coordinates and settles prototype funds; it does not reserve real inventory, enforce delivery, resolve disputes, or create a legally binding purchase.
- Room descriptive metadata is shared in invitation URLs and cached locally, while money, membership, status, outcomes, refunds, and receipts are authoritative on-chain. Production use needs durable shared metadata storage.

## Recommended acceptance run

Create a five-minute room with two wallets, fund both with free devnet assets, have both participants commit, wait for the UI to unlock without refreshing, settle a viable goal, and verify organizer payout plus participant excess-refund claims. Then repeat with a second room and use **Cancel room and refund everyone** to verify both full USDC balances return in the final transaction.
