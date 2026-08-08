import { PublicKey } from "@solana/web3.js";
import { baseConnection, type BrowserWallet } from "./chain";

/**
 * Circle's official USDC mint on Solana devnet. It is a test token only and
 * has no cash value. Keep this explicit: a token label must never make the
 * existing SOL escrow look like it has become an SPL-token escrow.
 */
export const DEVNET_USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

export const CIRCLE_DEVNET_FAUCET = "https://faucet.circle.com/";
export const SOLANA_DEVNET_FAUCET = "https://faucet.solana.com/";

export type DevnetUsdcReadiness = {
  amount: number;
  tokenAccount: string | null;
};

export async function readDevnetUsdcReadiness(
  wallet: BrowserWallet | null,
): Promise<DevnetUsdcReadiness> {
  if (!wallet?.publicKey) return { amount: 0, tokenAccount: null };

  const accounts = await baseConnection.getParsedTokenAccountsByOwner(
    wallet.publicKey,
    { mint: DEVNET_USDC_MINT },
    "confirmed",
  );
  const first = accounts.value[0];
  if (!first) return { amount: 0, tokenAccount: null };
  const tokenAmount = first.account.data.parsed.info.tokenAmount;
  return {
    amount: Number(tokenAmount.uiAmountString || 0),
    tokenAccount: first.pubkey.toBase58(),
  };
}
