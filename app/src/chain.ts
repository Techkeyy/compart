import { Buffer } from "buffer";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  DELEGATION_PROGRAM_ID,
  EPHEMERAL_VAULT_ID,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
  PERMISSION_PROGRAM_ID,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationMetadataPdaFromDelegatedAccount,
  delegationRecordPdaFromDelegatedAccount,
  getAuthToken,
  permissionPdaFromAccount,
  verifyTeeRpcIntegrity,
} from "@magicblock-labs/ephemeral-rollups-sdk";

export type SolanaNetwork = "devnet" | "mainnet-beta";

export type BrowserWallet = {
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signMessage: (
    message: Uint8Array,
    display?: "utf8" | "hex",
  ) => Promise<Uint8Array | { signature: Uint8Array }>;
};

declare global {
  interface Window {
    solana?: BrowserWallet;
    phantom?: { solana?: BrowserWallet };
    solflare?: BrowserWallet;
  }
}

let activeWalletProvider: BrowserWallet | null = null;

const text = (value: string) => new TextEncoder().encode(value);

export const PROGRAM_ID = new PublicKey(
  "E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh",
);
// Circle's official Solana devnet USDC. Rooms created by this release escrow
// this SPL token; SOL remains only the wallet's network-fee currency.
export const DEVNET_USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const NETWORK: SolanaNetwork =
  import.meta.env.VITE_SOLANA_NETWORK === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet";
export const BASE_RPC =
  import.meta.env.VITE_SOLANA_RPC_URL ||
  (NETWORK === "mainnet-beta"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com");
export const TEE_RPC =
  import.meta.env.VITE_MAGICBLOCK_TEE_URL ||
  (NETWORK === "mainnet-beta"
    ? "https://mainnet-tee.magicblock.app"
    : "https://devnet-tee.magicblock.app");
export const TEE_WS = TEE_RPC.replace(/^http/, "ws");
export const TEE_VALIDATOR = new PublicKey(
  "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo",
);
export const CAMPAIGN_ADDRESS = import.meta.env.VITE_CAMPAIGN_ADDRESS
  ? new PublicKey(import.meta.env.VITE_CAMPAIGN_ADDRESS)
  : null;

const campaignSeed = text("campaign");
const treasurySeed = text("treasury");
const bidSeed = text("bid");
const privateBudgetSeed = text("private-budget");
const receiptSeed = text("receipt");
const accessSeed = text("access");
const inviteSeed = text("invite");

function associatedTokenAddress(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBytes(), TOKEN_PROGRAM_ID.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

export const baseConnection = new Connection(BASE_RPC, "confirmed");

async function discriminator(name: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", text(`global:${name}`));
  return new Uint8Array(digest).slice(0, 8);
}

function u16Le(value: number): Uint8Array {
  const data = new Uint8Array(2);
  new DataView(data.buffer).setUint16(0, value, true);
  return data;
}

function u8(value: number): Uint8Array {
  return new Uint8Array([value]);
}

function u64Le(value: bigint): Uint8Array {
  const data = new Uint8Array(8);
  new DataView(data.buffer).setBigUint64(0, value, true);
  return data;
}

function fixedText32(value: string): Uint8Array {
  const encoded = text(value.trim());
  if (!encoded.length) throw new Error("Enter a room title.");
  if (encoded.length > 32) throw new Error("The room title must fit in 32 UTF-8 bytes.");
  const data = new Uint8Array(32);
  data.set(encoded);
  return data;
}

function instructionData(
  instructionDiscriminator: Uint8Array,
  ...args: Uint8Array[]
): Buffer {
  return Buffer.concat([
    Buffer.from(instructionDiscriminator),
    ...args.map((arg) => Buffer.from(arg)),
  ]);
}

async function sendWithWallet(
  connection: Connection,
  wallet: BrowserWallet,
  transaction: Transaction,
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = latest.blockhash;
  const signed = await wallet.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
  });
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  return signature;
}

function walletSignature(
  value: Uint8Array | { signature: Uint8Array },
): Uint8Array {
  return value instanceof Uint8Array ? value : value.signature;
}

export async function connectBrowserWallet(): Promise<BrowserWallet> {
  const provider = window.phantom?.solana || window.solflare || window.solana;
  if (!provider) {
    throw new Error("No Solana wallet found. Install Phantom or Solflare to continue.");
  }
  const response = await provider.connect();
  const publicKey = response.publicKey || provider.publicKey;
  if (!publicKey) throw new Error("The wallet connected without returning an account.");

  // Injected providers expose publicKey as a read-only getter. Return a bound
  // adapter instead of assigning to the provider, which breaks Phantom after
  // the connect approval and prevents the requested transaction from opening.
  const wallet: BrowserWallet = {
    publicKey,
    connect: provider.connect.bind(provider),
    disconnect: provider.disconnect?.bind(provider),
    signTransaction: provider.signTransaction.bind(provider),
    signMessage: provider.signMessage.bind(provider),
  };
  activeWalletProvider = provider;
  return wallet;
}

export async function disconnectBrowserWallet(): Promise<void> {
  const provider = activeWalletProvider || window.phantom?.solana || window.solflare || window.solana;
  await provider?.disconnect?.();
  activeWalletProvider = null;
}

export async function inspectProgram(): Promise<{
  deployed: boolean;
  campaignConfigured: boolean;
}> {
  const account = await baseConnection.getAccountInfo(PROGRAM_ID, "confirmed");
  return {
    deployed: Boolean(account?.executable),
    campaignConfigured: Boolean(CAMPAIGN_ADDRESS),
  };
}

export async function createCampaign(
  wallet: BrowserWallet,
  input: CreateCampaignInput,
): Promise<{ campaign: string; treasury: string; signature: string; campaignId: bigint }> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  if (!Number.isInteger(input.targetQuantity) || input.targetQuantity < 2 || input.targetQuantity > 25) {
    throw new Error("Choose a group size between 2 and 25.");
  }
  if (input.depositCap < 1n) throw new Error("Enter a valid public deposit.");
  if (input.minGoal < 1n || input.minGoal > input.maxGoal) {
    throw new Error("Set a valid minimum and maximum group goal.");
  }
  if (input.maxGoal > BigInt(input.targetQuantity) * input.depositCap) {
    throw new Error("The maximum goal cannot exceed the group's public escrow capacity.");
  }
  if (!Number.isInteger(input.deadline) || input.deadline <= Math.floor(Date.now() / 1000)) {
    throw new Error("Choose a deadline in the future.");
  }

  const creator = wallet.publicKey;
  const campaignId = BigInt(Date.now());
  const campaignIdBytes = u64Le(campaignId);
  const campaign = campaignPda(creator, campaignIdBytes);
  const [treasury] = PublicKey.findProgramAddressSync(
    [treasurySeed, campaign.toBytes()],
    PROGRAM_ID,
  );
  const treasuryToken = associatedTokenAddress(treasury, DEVNET_USDC_MINT);
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: campaign, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: treasuryToken, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(
      await discriminator("initialize_campaign"),
      campaignIdBytes,
      fixedText32(input.title),
      u16Le(input.targetQuantity),
      u64Le(input.depositCap),
      u64Le(input.minGoal),
      u64Le(input.maxGoal),
      u64Le(BigInt(input.deadline)),
      DEVNET_USDC_MINT.toBytes(),
    ),
  });
  const signature = await sendWithWallet(
    baseConnection,
    wallet,
    new Transaction().add(instruction),
  );
  return {
    campaign: campaign.toBase58(),
    treasury: treasury.toBase58(),
    signature,
    campaignId,
  };
}

export type PrivateCommitmentResult = {
  bid: string;
  privateBudget: string;
  baseSignature: string;
  privateSignature: string;
};

export type CommitmentProgress =
  | "public-deposit"
  | "delegating"
  | "authenticating"
  | "protecting-budget"
  | "complete";

export type CampaignSnapshot = {
  address: string;
  creator: string;
  campaignId: bigint;
  title: string;
  targetQuantity: number;
  depositCap: bigint;
  minGoal: bigint;
  maxGoal: bigint;
  deadline: number;
  status: "open" | "offer-selected" | "allocations-computed" | "settled" | "cancelled";
  bidCount: number;
  offerCount: number;
  totalRequested: number;
  clearingPrice: bigint;
  winningSupplier: string;
  allocatedQuantity: number;
  paymentMint: string;
  paymentDecimals: number;
};

export type ParticipantPosition = {
  allocation: number;
  refundOwed: bigint;
  allocationComputed: boolean;
  settled: boolean;
  refundClaimed: boolean;
  receiptClaimed: boolean;
};

export type BidSnapshot = ParticipantPosition & {
  address: string;
  campaign: string;
  buyer: string;
  quantity: number;
  deposit: bigint;
  createdAt: number;
};

export type ReceiptSnapshot = {
  address: string;
  campaign: string;
  buyer: string;
  supplier: string;
  quantity: number;
  unitPrice: bigint;
  claimedAt: number;
};

export type CreateCampaignInput = {
  title: string;
  targetQuantity: number;
  depositCap: bigint;
  minGoal: bigint;
  maxGoal: bigint;
  deadline: number;
};

const campaignStatuses: CampaignSnapshot["status"][] = [
  "open",
  "offer-selected",
  "allocations-computed",
  "settled",
  "cancelled",
];

function accountView(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function publicKeyAt(data: Uint8Array, offset: number): string {
  return new PublicKey(data.slice(offset, offset + 32)).toBase58();
}

function decodeCampaign(address: PublicKey, data: Uint8Array): CampaignSnapshot {
  if (data.length < 203) throw new Error("This is an earlier SOL-only room. Create a new USDC room to use the upgraded settlement.");
  const view = accountView(data);
  const title = new TextDecoder()
    .decode(data.slice(48, 80))
    .replace(/\0+$/g, "")
    .trim();
  return {
    address: address.toBase58(),
    creator: publicKeyAt(data, 8),
    campaignId: view.getBigUint64(40, true),
    title,
    targetQuantity: view.getUint16(80, true),
    depositCap: view.getBigUint64(82, true),
    minGoal: view.getBigUint64(90, true),
    maxGoal: view.getBigUint64(98, true),
    deadline: Number(view.getBigInt64(106, true)),
    status: campaignStatuses[data[114]] || "open",
    bidCount: view.getUint16(115, true),
    offerCount: data[117],
    totalRequested: view.getUint32(118, true),
    clearingPrice: view.getBigUint64(122, true),
    winningSupplier: publicKeyAt(data, 130),
    allocatedQuantity: view.getUint32(164, true),
    paymentMint: publicKeyAt(data, 170),
    paymentDecimals: data[202],
  };
}

function decodeBidSnapshot(address: PublicKey, data: Uint8Array): BidSnapshot {
  const position = decodeBid(data);
  const view = accountView(data);
  return {
    ...position,
    address: address.toBase58(),
    campaign: publicKeyAt(data, 8),
    buyer: publicKeyAt(data, 40),
    quantity: view.getUint16(72, true),
    deposit: view.getBigUint64(74, true),
    createdAt: Number(view.getBigInt64(96, true)),
  };
}

function decodeReceipt(address: PublicKey, data: Uint8Array): ReceiptSnapshot {
  if (data.length < 123) throw new Error("The receipt account has an unexpected layout.");
  const view = accountView(data);
  return {
    address: address.toBase58(),
    campaign: publicKeyAt(data, 8),
    buyer: publicKeyAt(data, 40),
    supplier: publicKeyAt(data, 72),
    quantity: view.getUint16(104, true),
    unitPrice: view.getBigUint64(106, true),
    claimedAt: Number(view.getBigInt64(114, true)),
  };
}

function resolveCampaignAddress(
  value: PublicKey | string | null | undefined,
): PublicKey | null {
  if (value instanceof PublicKey) return value;
  if (typeof value === "string" && value.trim()) return new PublicKey(value.trim());
  return CAMPAIGN_ADDRESS;
}

export function normalizeCampaignAddress(value: string): string {
  return new PublicKey(value.trim()).toBase58();
}

function decodeBid(data: Uint8Array): ParticipantPosition {
  if (data.length < 105) throw new Error("The commitment account has an unexpected layout.");
  const view = accountView(data);
  return {
    allocation: view.getUint16(82, true),
    refundOwed: view.getBigUint64(84, true),
    allocationComputed: Boolean(data[92]),
    settled: Boolean(data[93]),
    refundClaimed: Boolean(data[94]),
    receiptClaimed: Boolean(data[95]),
  };
}

export async function readCampaignRoom(
  selectedCampaign?: PublicKey | string | null,
): Promise<{
  campaign: CampaignSnapshot;
} | null> {
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) return null;
  const campaignInfo = await baseConnection.getAccountInfo(campaignAddress, "confirmed");
  if (!campaignInfo) return null;

  return { campaign: decodeCampaign(campaignAddress, campaignInfo.data) };
}

export async function readCampaignBids(
  selectedCampaign: PublicKey | string,
): Promise<BidSnapshot[]> {
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) return [];
  const accounts = await baseConnection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      { dataSize: 105 },
      { memcmp: { offset: 8, bytes: campaignAddress.toBase58() } },
    ],
  });
  return accounts.map(({ pubkey, account }) => decodeBidSnapshot(pubkey, account.data));
}

export async function readBuyerRoomAddresses(buyer: PublicKey): Promise<string[]> {
  const accounts = await baseConnection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      { dataSize: 105 },
      { memcmp: { offset: 40, bytes: buyer.toBase58() } },
    ],
  });
  return accounts.map(({ account }) => publicKeyAt(account.data, 8));
}

export async function readOrganizerRoomAddresses(organizer: PublicKey): Promise<string[]> {
  const accounts = await baseConnection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
  });
  // Some RPCs can return stale results for a combined data-size and memcmp
  // filter immediately after an upgraded program creates an account. Read the
  // small program account set and apply the same strict checks locally.
  return accounts
    .filter(({ account }) => account.data.length === 203)
    .filter(({ account }) => publicKeyAt(account.data, 8) === organizer.toBase58())
    .map(({ pubkey }) => pubkey.toBase58());
}

export async function readReceiptsForBuyer(buyer: PublicKey): Promise<ReceiptSnapshot[]> {
  const accounts = await baseConnection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      { dataSize: 123 },
      { memcmp: { offset: 40, bytes: buyer.toBase58() } },
    ],
  });
  return accounts
    .map(({ pubkey, account }) => decodeReceipt(pubkey, account.data))
    .sort((a, b) => b.claimedAt - a.claimedAt);
}

export async function readParticipantPosition(
  buyer: PublicKey,
  selectedCampaign?: PublicKey | string | null,
): Promise<ParticipantPosition | null> {
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) return null;
  const [bid] = PublicKey.findProgramAddressSync(
    [bidSeed, campaignAddress.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const info = await baseConnection.getAccountInfo(bid, "confirmed");
  return info ? decodeBid(info.data) : null;
}

export async function hasParticipantAccess(
  buyer: PublicKey,
  selectedCampaign?: PublicKey | string | null,
): Promise<boolean> {
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) return false;
  const [access] = PublicKey.findProgramAddressSync(
    [accessSeed, campaignAddress.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const account = await baseConnection.getAccountInfo(access, "confirmed");
  return Boolean(account?.owner.equals(PROGRAM_ID));
}

export async function createPrivateCommitment(
  wallet: BrowserWallet,
  maxUnitPrice: bigint,
  quantity = 1,
  selectedCampaign?: PublicKey | string | null,
  onProgress?: (step: CommitmentProgress) => void,
): Promise<PrivateCommitmentResult> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) {
    throw new Error("The live campaign has not been configured yet.");
  }

  const buyer = wallet.publicKey;
  const [bid] = PublicKey.findProgramAddressSync(
    [bidSeed, campaignAddress.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const [treasury] = PublicKey.findProgramAddressSync(
    [treasurySeed, campaignAddress.toBytes()],
    PROGRAM_ID,
  );
  const buyerToken = associatedTokenAddress(buyer, DEVNET_USDC_MINT);
  const treasuryToken = associatedTokenAddress(treasury, DEVNET_USDC_MINT);
  const [privateBudget] = PublicKey.findProgramAddressSync(
    [privateBudgetSeed, bid.toBytes()],
    PROGRAM_ID,
  );
  const [access] = PublicKey.findProgramAddressSync(
    [accessSeed, campaignAddress.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );

  const createBid = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: true },
      { pubkey: access, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: buyerToken, isSigner: false, isWritable: true },
      { pubkey: treasuryToken, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("create_bid"), u16Le(quantity)),
  });

  const delegateBid = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: false },
      {
        pubkey: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
          bid,
          PROGRAM_ID,
        ),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: delegationRecordPdaFromDelegatedAccount(bid),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: delegationMetadataPdaFromDelegatedAccount(bid),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: TEE_VALIDATOR, isSigner: false, isWritable: false },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("delegate_bid")),
  });

  const existingBid = await baseConnection.getAccountInfo(bid, "confirmed");
  let baseSignature = "";
  if (!existingBid) {
    onProgress?.("public-deposit");
    baseSignature = await sendWithWallet(
      baseConnection,
      wallet,
      new Transaction().add(createBid, delegateBid),
    );
  } else if (existingBid.owner.equals(PROGRAM_ID)) {
    onProgress?.("delegating");
    baseSignature = await sendWithWallet(
      baseConnection,
      wallet,
      new Transaction().add(delegateBid),
    );
  } else if (!existingBid.owner.equals(DELEGATION_PROGRAM_ID)) {
    throw new Error("The commitment account has an unexpected owner.");
  }

  onProgress?.("authenticating");
  await verifyTeeRpcIntegrity(TEE_RPC);
  const auth = await getAuthToken(TEE_RPC, buyer, async (message) =>
    walletSignature(await wallet.signMessage(message, "utf8")),
  );
  const token = encodeURIComponent(auth.token);
  const privateConnection = new Connection(`${TEE_RPC}?token=${token}`, {
    wsEndpoint: `${TEE_WS}?token=${token}`,
    commitment: "confirmed",
  });

  let delegated = false;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (await privateConnection.getAccountInfo(bid, "confirmed")) {
      delegated = true;
      break;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 800));
  }
  if (!delegated) {
    throw new Error("The private room did not become ready in time. Retry shortly.");
  }

  const placeBudget = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: privateBudget, isSigner: false, isWritable: true },
      { pubkey: EPHEMERAL_VAULT_ID, isSigner: false, isWritable: true },
      { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData(
      await discriminator("place_private_budget"),
      u64Le(maxUnitPrice),
    ),
  });

  const protectBudget = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: false },
      { pubkey: campaignAddress, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: privateBudget, isSigner: false, isWritable: true },
      {
        pubkey: permissionPdaFromAccount(privateBudget),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: PERMISSION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: EPHEMERAL_VAULT_ID, isSigner: false, isWritable: true },
      { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("init_private_budget_permission")),
  });

  const updateBudget = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: false },
      { pubkey: campaignAddress, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: false },
      { pubkey: privateBudget, isSigner: false, isWritable: true },
    ],
    data: instructionData(
      await discriminator("update_private_budget"),
      u64Le(maxUnitPrice),
    ),
  });

  const existingPrivateBudget = await privateConnection.getAccountInfo(
    privateBudget,
    "confirmed",
  );

  onProgress?.("protecting-budget");
  const privateSignature = await sendWithWallet(
    privateConnection,
    wallet,
    existingPrivateBudget
      ? new Transaction().add(updateBudget)
      : new Transaction().add(placeBudget, protectBudget),
  );

  onProgress?.("complete");

  return {
    bid: bid.toBase58(),
    privateBudget: privateBudget.toBase58(),
    baseSignature,
    privateSignature,
  };
}

function inviteSecretToUrl(secret: Uint8Array): string {
  let binary = "";
  secret.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function inviteSecretFromUrl(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  if (binary.length !== 32) throw new Error("This invite link is invalid.");
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function createClaimableInvite(
  wallet: BrowserWallet,
  selectedCampaign?: PublicKey | string | null,
): Promise<{ signature: string; invite: string; secret: string }> {
  if (!wallet.publicKey) throw new Error("Connect the organizer wallet first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) throw new Error("Choose a room first.");
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const secretHash = new Uint8Array(await crypto.subtle.digest("SHA-256", secretBytes));
  const nonce = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));
  const [invite] = PublicKey.findProgramAddressSync(
    [inviteSeed, campaignAddress.toBytes(), u64Le(nonce)],
    PROGRAM_ID,
  );
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: false },
      { pubkey: invite, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(
      await discriminator("create_claimable_invite"),
      u64Le(nonce),
      u8(1),
      secretHash,
    ),
  });
  return {
    signature: await sendWithWallet(baseConnection, wallet, new Transaction().add(instruction)),
    invite: invite.toBase58(),
    secret: inviteSecretToUrl(secretBytes),
  };
}

export async function claimRoomAccess(
  wallet: BrowserWallet,
  inviteAddress: string,
  secret: string,
  selectedCampaign?: PublicKey | string | null,
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect the wallet receiving this invite first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) throw new Error("This invite does not identify a room.");
  const invite = new PublicKey(inviteAddress);
  const [access] = PublicKey.findProgramAddressSync(
    [accessSeed, campaignAddress.toBytes(), wallet.publicKey.toBytes()],
    PROGRAM_ID,
  );
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: false },
      { pubkey: invite, isSigner: false, isWritable: true },
      { pubkey: access, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("claim_room_access"), inviteSecretFromUrl(secret)),
  });
  return sendWithWallet(baseConnection, wallet, new Transaction().add(instruction));
}

export async function claimRefund(
  wallet: BrowserWallet,
  selectedCampaign?: PublicKey | string | null,
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) throw new Error("Choose a live campaign first.");
  const buyer = wallet.publicKey;
  const [bid] = PublicKey.findProgramAddressSync(
    [bidSeed, campaignAddress.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const [treasury] = PublicKey.findProgramAddressSync(
    [treasurySeed, campaignAddress.toBytes()],
    PROGRAM_ID,
  );
  const buyerToken = associatedTokenAddress(buyer, DEVNET_USDC_MINT);
  const treasuryToken = associatedTokenAddress(treasury, DEVNET_USDC_MINT);
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: treasuryToken, isSigner: false, isWritable: true },
      { pubkey: buyerToken, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("claim_refund")),
  });
  return sendWithWallet(baseConnection, wallet, new Transaction().add(instruction));
}

export async function claimPrototypeReceipt(
  wallet: BrowserWallet,
  selectedCampaign?: PublicKey | string | null,
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) throw new Error("Choose a live campaign first.");
  const buyer = wallet.publicKey;
  const [bid] = PublicKey.findProgramAddressSync(
    [bidSeed, campaignAddress.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const [receipt] = PublicKey.findProgramAddressSync(
    [receiptSeed, campaignAddress.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("claim_access_receipt")),
  });
  return sendWithWallet(baseConnection, wallet, new Transaction().add(instruction));
}

export type OrganizerProgress =
  | "selecting-goal"
  | "delegating-room"
  | "reading-private-room"
  | "computing-allocations"
  | "publishing-outcomes"
  | "settling"
  | "complete";

export async function selectGoal(
  wallet: BrowserWallet,
  goal: bigint,
  selectedCampaign: PublicKey | string,
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect the organizer wallet first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) throw new Error("Choose a room first.");
  return sendWithWallet(baseConnection, wallet, new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: true },
    ],
    data: instructionData(await discriminator("select_goal"), u64Le(goal)),
  })));
}

export async function settleReadyCampaign(
  wallet: BrowserWallet,
  selectedCampaign: PublicKey | string,
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect the organizer wallet first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) throw new Error("Choose a room first.");
  const room = await readCampaignRoom(campaignAddress);
  if (!room) throw new Error("The room could not be loaded.");
  if (room.campaign.creator !== wallet.publicKey.toBase58()) {
    throw new Error("Only this room's organizer can settle it.");
  }
  if (room.campaign.status !== "allocations-computed") {
    throw new Error("Private allocations must be published before settlement.");
  }
  const bids = await readCampaignBids(campaignAddress);
  if (bids.length !== room.campaign.bidCount) {
    throw new Error("The complete public commitment set is not available yet.");
  }
  const [treasury] = PublicKey.findProgramAddressSync(
    [treasurySeed, campaignAddress.toBytes()],
    PROGRAM_ID,
  );
  const treasuryToken = associatedTokenAddress(treasury, DEVNET_USDC_MINT);
  // Compart is a private group fund: the selected outcome pays the organizer,
  // never a legacy supplier address.
  const organizerRecipient = new PublicKey(room.campaign.creator);
  const organizerToken = associatedTokenAddress(organizerRecipient, DEVNET_USDC_MINT);
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: campaignAddress, isSigner: false, isWritable: true },
      { pubkey: organizerRecipient, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: treasuryToken, isSigner: false, isWritable: true },
      { pubkey: organizerToken, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ...bids.map((bid) => ({
        pubkey: new PublicKey(bid.address),
        isSigner: false,
        isWritable: true,
      })),
    ],
    data: instructionData(await discriminator("settle_campaign")),
  });
  return sendWithWallet(baseConnection, wallet, new Transaction().add(instruction));
}

export async function cancelStalledCampaign(
  wallet: BrowserWallet,
  selectedCampaign: PublicKey | string,
): Promise<string[]> {
  if (!wallet.publicKey) throw new Error("Connect the organizer wallet first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) throw new Error("Choose a room first.");
  const room = await readCampaignRoom(campaignAddress);
  if (!room || room.campaign.creator !== wallet.publicKey.toBase58()) {
    throw new Error("Only the organizer can cancel this room.");
  }
  if (Math.floor(Date.now() / 1000) < room.campaign.deadline) {
    throw new Error("Cancellation unlocks when the commitment deadline is reached.");
  }

  const signatures: string[] = [];
  const campaignInfo = await baseConnection.getAccountInfo(campaignAddress, "confirmed");
  if (!campaignInfo) throw new Error("The room account is unavailable.");
  if (campaignInfo.owner.equals(PROGRAM_ID)) {
    signatures.push(await sendWithWallet(baseConnection, wallet, new Transaction().add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(campaignAddress, PROGRAM_ID), isSigner: false, isWritable: true },
        { pubkey: delegationRecordPdaFromDelegatedAccount(campaignAddress), isSigner: false, isWritable: true },
        { pubkey: delegationMetadataPdaFromDelegatedAccount(campaignAddress), isSigner: false, isWritable: true },
        { pubkey: campaignAddress, isSigner: false, isWritable: true },
        { pubkey: TEE_VALIDATOR, isSigner: false, isWritable: false },
        { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData(await discriminator("delegate_campaign"), u64Le(room.campaign.campaignId)),
    }))));
  } else if (!campaignInfo.owner.equals(DELEGATION_PROGRAM_ID)) {
    throw new Error("The room account has an unexpected owner.");
  }

  await verifyTeeRpcIntegrity(TEE_RPC);
  const auth = await getAuthToken(TEE_RPC, wallet.publicKey, async (message) =>
    walletSignature(await wallet.signMessage(message, "utf8")),
  );
  const token = encodeURIComponent(auth.token);
  const privateConnection = new Connection(`${TEE_RPC}?token=${token}`, {
    wsEndpoint: `${TEE_WS}?token=${token}`,
    commitment: "confirmed",
  });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await privateConnection.getAccountInfo(campaignAddress, "confirmed")) break;
    if (attempt === 19) throw new Error("The private room did not become ready for cancellation.");
    await new Promise((resolve) => window.setTimeout(resolve, 800));
  }
  const privateBids = await privateConnection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      { dataSize: 105 },
      { memcmp: { offset: 8, bytes: campaignAddress.toBase58() } },
    ],
  });
  if (privateBids.length !== room.campaign.bidCount) {
    throw new Error("The complete private commitment set is not available for recovery yet.");
  }
  const bids = privateBids
    .map(({ pubkey, account }) => decodeBidSnapshot(pubkey, account.data))
    .sort((a, b) => a.address.localeCompare(b.address));

  if (room.campaign.status !== "allocations-computed") {
    signatures.push(await sendWithWallet(privateConnection, wallet, new Transaction().add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: campaignAddress, isSigner: false, isWritable: true },
        ...bids.map((bid) => ({ pubkey: new PublicKey(bid.address), isSigner: false, isWritable: true })),
      ],
      data: instructionData(await discriminator("prepare_cancellation")),
    }))));
  }

  for (const bid of bids) {
    signatures.push(await sendWithWallet(privateConnection, wallet, new Transaction().add(new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaignAddress, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(bid.address), isSigner: false, isWritable: true },
        { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: MAGIC_CONTEXT_ID, isSigner: false, isWritable: true },
      ],
      data: instructionData(await discriminator("undelegate_bid")),
    }))));
  }
  signatures.push(await sendWithWallet(privateConnection, wallet, new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: campaignAddress, isSigner: false, isWritable: true },
      { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: MAGIC_CONTEXT_ID, isSigner: false, isWritable: true },
    ],
    data: instructionData(await discriminator("undelegate_campaign")),
  }))));

  const accountsToPublish = [campaignAddress, ...bids.map((bid) => new PublicKey(bid.address))];
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const accounts = await baseConnection.getMultipleAccountsInfo(accountsToPublish, "confirmed");
    if (accounts.every((account) => account?.owner.equals(PROGRAM_ID))) break;
    if (attempt === 29) throw new Error("Cancellation state is still publishing to Solana.");
    await new Promise((resolve) => window.setTimeout(resolve, 1_000));
  }

  const [treasury] = PublicKey.findProgramAddressSync([treasurySeed, campaignAddress.toBytes()], PROGRAM_ID);
  signatures.push(await sendWithWallet(baseConnection, wallet, new Transaction().add(new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
      { pubkey: campaignAddress, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: associatedTokenAddress(treasury, DEVNET_USDC_MINT), isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ...bids.flatMap((bid) => {
        const bidAddress = new PublicKey(bid.address);
        return [
          { pubkey: bidAddress, isSigner: false, isWritable: true },
          { pubkey: associatedTokenAddress(new PublicKey(bid.buyer), DEVNET_USDC_MINT), isSigner: false, isWritable: true },
        ];
      }),
    ],
    data: instructionData(await discriminator("cancel_campaign")),
  }))));
  return signatures;
}

export async function runOrganizerSettlement(
  wallet: BrowserWallet,
  selectedCampaign: PublicKey | string,
  finalGoal: bigint,
  onProgress?: (step: OrganizerProgress) => void,
): Promise<{ signatures: string[]; finalStatus: "settled" | "cancelled" }> {
  if (!wallet.publicKey) throw new Error("Connect the organizer wallet first.");
  const campaignAddress = resolveCampaignAddress(selectedCampaign);
  if (!campaignAddress) throw new Error("Choose a room first.");
  let room = await readCampaignRoom(campaignAddress);
  if (!room) throw new Error("The room could not be loaded.");
  if (room.campaign.creator !== wallet.publicKey.toBase58()) {
    throw new Error("Connect the wallet that created this room.");
  }
  if (Math.floor(Date.now() / 1000) < room.campaign.deadline) {
    throw new Error("The commitment deadline has not been reached yet.");
  }
  if (room.campaign.status === "settled" || room.campaign.status === "cancelled") {
    return { signatures: [], finalStatus: room.campaign.status };
  }

  const signatures: string[] = [];
  if (room.campaign.status === "open") {
    onProgress?.("selecting-goal");
    signatures.push(await selectGoal(wallet, finalGoal, campaignAddress));
    room = await readCampaignRoom(campaignAddress);
    if (!room) throw new Error("The selected quote could not be reloaded.");
  }

  if (room.campaign.status === "offer-selected") {
    onProgress?.("delegating-room");
    const campaignInfo = await baseConnection.getAccountInfo(campaignAddress, "confirmed");
    if (!campaignInfo) throw new Error("The room account is unavailable.");
    if (campaignInfo.owner.equals(PROGRAM_ID)) {
      const delegateInstruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          {
            pubkey: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(campaignAddress, PROGRAM_ID),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: delegationRecordPdaFromDelegatedAccount(campaignAddress),
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: delegationMetadataPdaFromDelegatedAccount(campaignAddress),
            isSigner: false,
            isWritable: true,
          },
          { pubkey: campaignAddress, isSigner: false, isWritable: true },
          { pubkey: TEE_VALIDATOR, isSigner: false, isWritable: false },
          { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData(
          await discriminator("delegate_campaign"),
          u64Le(room.campaign.campaignId),
        ),
      });
      signatures.push(
        await sendWithWallet(baseConnection, wallet, new Transaction().add(delegateInstruction)),
      );
    } else if (!campaignInfo.owner.equals(DELEGATION_PROGRAM_ID)) {
      throw new Error("The room account has an unexpected owner.");
    }

    await verifyTeeRpcIntegrity(TEE_RPC);
    const auth = await getAuthToken(TEE_RPC, wallet.publicKey, async (message) =>
      walletSignature(await wallet.signMessage(message, "utf8")),
    );
    const token = encodeURIComponent(auth.token);
    const privateConnection = new Connection(`${TEE_RPC}?token=${token}`, {
      wsEndpoint: `${TEE_WS}?token=${token}`,
      commitment: "confirmed",
    });

    onProgress?.("reading-private-room");
    let campaignReady = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (await privateConnection.getAccountInfo(campaignAddress, "confirmed")) {
        campaignReady = true;
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    }
    if (!campaignReady) throw new Error("The private room did not become ready in time.");

    const privateBids = await privateConnection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [
        { dataSize: 105 },
        { memcmp: { offset: 8, bytes: campaignAddress.toBase58() } },
      ],
    });
    if (privateBids.length !== room.campaign.bidCount) {
      throw new Error("Not every private commitment is available to the organizer yet.");
    }
    const orderedBids = privateBids
      .map(({ pubkey, account }) => decodeBidSnapshot(pubkey, account.data))
      .sort((a, b) => a.address.localeCompare(b.address));

    onProgress?.("computing-allocations");
    const computeInstruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: campaignAddress, isSigner: false, isWritable: true },
        ...orderedBids.flatMap((bid) => {
          const bidAddress = new PublicKey(bid.address);
          const [privateBudget] = PublicKey.findProgramAddressSync(
            [privateBudgetSeed, bidAddress.toBytes()],
            PROGRAM_ID,
          );
          return [
            { pubkey: bidAddress, isSigner: false, isWritable: true },
            { pubkey: privateBudget, isSigner: false, isWritable: false },
          ];
        }),
      ],
      data: instructionData(await discriminator("compute_allocations")),
    });
    signatures.push(
      await sendWithWallet(privateConnection, wallet, new Transaction().add(computeInstruction)),
    );

    onProgress?.("publishing-outcomes");
    for (const bid of orderedBids) {
      const undelegateBid = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: campaignAddress, isSigner: false, isWritable: false },
          { pubkey: new PublicKey(bid.address), isSigner: false, isWritable: true },
          { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: MAGIC_CONTEXT_ID, isSigner: false, isWritable: true },
        ],
        data: instructionData(await discriminator("undelegate_bid")),
      });
      signatures.push(
        await sendWithWallet(privateConnection, wallet, new Transaction().add(undelegateBid)),
      );
    }
    const undelegateCampaign = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: campaignAddress, isSigner: false, isWritable: true },
        { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: MAGIC_CONTEXT_ID, isSigner: false, isWritable: true },
      ],
      data: instructionData(await discriminator("undelegate_campaign")),
    });
    signatures.push(
      await sendWithWallet(privateConnection, wallet, new Transaction().add(undelegateCampaign)),
    );

    const accountsToPublish = [
      campaignAddress,
      ...orderedBids.map((bid) => new PublicKey(bid.address)),
    ];
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const accounts = await baseConnection.getMultipleAccountsInfo(accountsToPublish, "confirmed");
      if (accounts.every((account) => account?.owner.equals(PROGRAM_ID))) break;
      if (attempt === 29) throw new Error("Private outcomes are still publishing to Solana.");
      await new Promise((resolve) => window.setTimeout(resolve, 1_000));
    }
  }

  onProgress?.("settling");
  signatures.push(await settleReadyCampaign(wallet, campaignAddress));
  room = await readCampaignRoom(campaignAddress);
  if (!room || (room.campaign.status !== "settled" && room.campaign.status !== "cancelled")) {
    throw new Error("Settlement confirmed, but the final room state could not be read.");
  }
  onProgress?.("complete");
  return { signatures, finalStatus: room.campaign.status };
}

export function campaignPda(
  creator: PublicKey,
  campaignIdLe: Uint8Array,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [campaignSeed, creator.toBytes(), campaignIdLe],
    PROGRAM_ID,
  )[0];
}
