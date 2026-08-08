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
  }
}

const text = (value: string) => new TextEncoder().encode(value);

export const PROGRAM_ID = new PublicKey(
  "9f6nQaRukJ7Gd4ks3ypRyWDe8eSm3V1EHbmoHwLm3HTs",
);
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
const offerSeed = text("offer");
const receiptSeed = text("receipt");

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

function u64Le(value: bigint): Uint8Array {
  const data = new Uint8Array(8);
  new DataView(data.buffer).setBigUint64(0, value, true);
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
  const wallet = window.solana;
  if (!wallet) {
    throw new Error("No Solana wallet found. Install Phantom or Solflare to continue.");
  }
  const response = await wallet.connect();
  wallet.publicKey = response.publicKey;
  return wallet;
}

export async function disconnectBrowserWallet(): Promise<void> {
  await window.solana?.disconnect?.();
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

export type PrivateCommitmentResult = {
  bid: string;
  privateBudget: string;
  baseSignature: string;
  privateSignature: string;
};

export type CampaignSnapshot = {
  creator: string;
  campaignId: bigint;
  title: string;
  targetQuantity: number;
  depositCap: bigint;
  deadline: number;
  status: "open" | "offer-selected" | "allocations-computed" | "settled" | "cancelled";
  bidCount: number;
  offerCount: number;
  totalRequested: number;
  clearingPrice: bigint;
  winningSupplier: string;
  allocatedQuantity: number;
};

export type SupplierOfferSnapshot = {
  address: string;
  supplier: string;
  quantity: number;
  unitPrice: bigint;
  active: boolean;
};

export type ParticipantPosition = {
  allocation: number;
  refundOwed: bigint;
  allocationComputed: boolean;
  settled: boolean;
  refundClaimed: boolean;
  receiptClaimed: boolean;
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

function decodeCampaign(data: Uint8Array): CampaignSnapshot {
  if (data.length < 154) throw new Error("The campaign account has an unexpected layout.");
  const view = accountView(data);
  const title = new TextDecoder()
    .decode(data.slice(48, 80))
    .replace(/\0+$/g, "")
    .trim();
  return {
    creator: publicKeyAt(data, 8),
    campaignId: view.getBigUint64(40, true),
    title,
    targetQuantity: view.getUint16(80, true),
    depositCap: view.getBigUint64(82, true),
    deadline: Number(view.getBigInt64(90, true)),
    status: campaignStatuses[data[98]] || "open",
    bidCount: view.getUint16(99, true),
    offerCount: data[101],
    totalRequested: view.getUint32(102, true),
    clearingPrice: view.getBigUint64(106, true),
    winningSupplier: publicKeyAt(data, 114),
    allocatedQuantity: view.getUint32(148, true),
  };
}

function decodeOffer(address: PublicKey, data: Uint8Array): SupplierOfferSnapshot {
  if (data.length < 92) throw new Error("A supplier offer has an unexpected layout.");
  const view = accountView(data);
  return {
    address: address.toBase58(),
    supplier: publicKeyAt(data, 40),
    quantity: view.getUint16(72, true),
    unitPrice: view.getBigUint64(74, true),
    active: Boolean(data[82]),
  };
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

export async function readCampaignRoom(): Promise<{
  campaign: CampaignSnapshot;
  offers: SupplierOfferSnapshot[];
} | null> {
  if (!CAMPAIGN_ADDRESS) return null;
  const campaignInfo = await baseConnection.getAccountInfo(CAMPAIGN_ADDRESS, "confirmed");
  if (!campaignInfo) return null;

  const offerAccounts = await baseConnection.getProgramAccounts(PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      { dataSize: 92 },
      { memcmp: { offset: 8, bytes: CAMPAIGN_ADDRESS.toBase58() } },
    ],
  });
  const offers = offerAccounts
    .map(({ pubkey, account }) => decodeOffer(pubkey, account.data))
    .filter((offer) => offer.active)
    .sort((a, b) => Number(a.unitPrice - b.unitPrice));

  return { campaign: decodeCampaign(campaignInfo.data), offers };
}

export async function readParticipantPosition(
  buyer: PublicKey,
): Promise<ParticipantPosition | null> {
  if (!CAMPAIGN_ADDRESS) return null;
  const [bid] = PublicKey.findProgramAddressSync(
    [bidSeed, CAMPAIGN_ADDRESS.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const info = await baseConnection.getAccountInfo(bid, "confirmed");
  return info ? decodeBid(info.data) : null;
}

export async function createPrivateCommitment(
  wallet: BrowserWallet,
  maxUnitPrice: bigint,
  quantity = 1,
): Promise<PrivateCommitmentResult> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  if (!CAMPAIGN_ADDRESS) {
    throw new Error("The live campaign has not been configured yet.");
  }

  const buyer = wallet.publicKey;
  const [bid] = PublicKey.findProgramAddressSync(
    [bidSeed, CAMPAIGN_ADDRESS.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const [treasury] = PublicKey.findProgramAddressSync(
    [treasurySeed, CAMPAIGN_ADDRESS.toBytes()],
    PROGRAM_ID,
  );
  const [privateBudget] = PublicKey.findProgramAddressSync(
    [privateBudgetSeed, bid.toBytes()],
    PROGRAM_ID,
  );

  const createBid = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: CAMPAIGN_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("create_bid"), u16Le(quantity)),
  });

  const delegateBid = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: CAMPAIGN_ADDRESS, isSigner: false, isWritable: false },
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
    baseSignature = await sendWithWallet(
      baseConnection,
      wallet,
      new Transaction().add(createBid, delegateBid),
    );
  } else if (existingBid.owner.equals(PROGRAM_ID)) {
    baseSignature = await sendWithWallet(
      baseConnection,
      wallet,
      new Transaction().add(delegateBid),
    );
  } else if (!existingBid.owner.equals(DELEGATION_PROGRAM_ID)) {
    throw new Error("The commitment account has an unexpected owner.");
  }

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
      { pubkey: CAMPAIGN_ADDRESS, isSigner: false, isWritable: false },
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
      { pubkey: CAMPAIGN_ADDRESS, isSigner: false, isWritable: false },
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
      { pubkey: CAMPAIGN_ADDRESS, isSigner: false, isWritable: false },
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

  const privateSignature = await sendWithWallet(
    privateConnection,
    wallet,
    existingPrivateBudget
      ? new Transaction().add(updateBudget)
      : new Transaction().add(placeBudget, protectBudget),
  );

  return {
    bid: bid.toBase58(),
    privateBudget: privateBudget.toBase58(),
    baseSignature,
    privateSignature,
  };
}

export async function postSupplierOffer(
  wallet: BrowserWallet,
  quantity: number,
  unitPrice: bigint,
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  if (!CAMPAIGN_ADDRESS) throw new Error("The live campaign has not been configured yet.");
  if (quantity < 1 || quantity > 65_535) throw new Error("Enter a valid group size.");
  if (unitPrice < 1n) throw new Error("Enter a valid per-person quote.");

  const supplier = wallet.publicKey;
  const [offer] = PublicKey.findProgramAddressSync(
    [offerSeed, CAMPAIGN_ADDRESS.toBytes(), supplier.toBytes()],
    PROGRAM_ID,
  );
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: supplier, isSigner: true, isWritable: true },
      { pubkey: CAMPAIGN_ADDRESS, isSigner: false, isWritable: true },
      { pubkey: offer, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(
      await discriminator("post_supplier_offer"),
      u16Le(quantity),
      u64Le(unitPrice),
    ),
  });
  return sendWithWallet(baseConnection, wallet, new Transaction().add(instruction));
}

export async function claimRefund(wallet: BrowserWallet): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  if (!CAMPAIGN_ADDRESS) throw new Error("The live campaign has not been configured yet.");
  const buyer = wallet.publicKey;
  const [bid] = PublicKey.findProgramAddressSync(
    [bidSeed, CAMPAIGN_ADDRESS.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const [treasury] = PublicKey.findProgramAddressSync(
    [treasurySeed, CAMPAIGN_ADDRESS.toBytes()],
    PROGRAM_ID,
  );
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: CAMPAIGN_ADDRESS, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("claim_refund")),
  });
  return sendWithWallet(baseConnection, wallet, new Transaction().add(instruction));
}

export async function claimPrototypeReceipt(wallet: BrowserWallet): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect a Solana wallet first.");
  if (!CAMPAIGN_ADDRESS) throw new Error("The live campaign has not been configured yet.");
  const buyer = wallet.publicKey;
  const [bid] = PublicKey.findProgramAddressSync(
    [bidSeed, CAMPAIGN_ADDRESS.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const [receipt] = PublicKey.findProgramAddressSync(
    [receiptSeed, CAMPAIGN_ADDRESS.toBytes(), buyer.toBytes()],
    PROGRAM_ID,
  );
  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: CAMPAIGN_ADDRESS, isSigner: false, isWritable: false },
      { pubkey: bid, isSigner: false, isWritable: true },
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData(await discriminator("claim_access_receipt")),
  });
  return sendWithWallet(baseConnection, wallet, new Transaction().add(instruction));
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
