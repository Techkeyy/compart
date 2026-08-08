const fs = require("node:fs");
const path = require("node:path");
const anchor = require("@coral-xyz/anchor");

const PROGRAM_ID = new anchor.web3.PublicKey(
  "E2jBtfWynBhkA7yxXfNFPrhpKuEZwweuvb1GDNzkRDEh",
);
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR;
const REPO_ROOT = path.resolve(
  process.env.COMPART_REPO_ROOT || path.join(__dirname, ".."),
);

if (!KEYPAIR_PATH) {
  throw new Error("Set SOLANA_KEYPAIR to a keypair file outside the repository.");
}

function assertOutsideRepository(value, label) {
  const relative = path.relative(REPO_ROOT, path.resolve(value));
  const outside =
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);
  if (!outside) {
    throw new Error(`${label} must be outside the repository.`);
  }
}

assertOutsideRepository(KEYPAIR_PATH, "SOLANA_KEYPAIR");

function u64Le(value) {
  const data = Buffer.alloc(8);
  data.writeBigUInt64LE(value);
  return data;
}

function fixedTitle(value) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length > 32) throw new Error("CAMPAIGN_TITLE must fit in 32 UTF-8 bytes.");
  return Array.from(Buffer.concat([bytes, Buffer.alloc(32 - bytes.length)]));
}

async function main() {
  const secret = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"));
  const payer = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(secret));
  const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(payer),
    { commitment: "confirmed", preflightCommitment: "confirmed" },
  );
  const idlPath = process.env.COMPART_IDL_PATH || path.join(
    __dirname,
    "..",
    "artifacts",
    "compartido-market",
    "compartido_market.json",
  );
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
  const program = new anchor.Program(idl, provider);

  const campaignId = BigInt(process.env.CAMPAIGN_ID || Date.now());
  const targetQuantity = Number(process.env.TARGET_QUANTITY || 6);
  const depositCap = BigInt(process.env.DEPOSIT_CAP_LAMPORTS || 1_800_000);
  const durationSeconds = Number(process.env.CAMPAIGN_DURATION_SECONDS || 86_400);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + durationSeconds);
  const title = process.env.CAMPAIGN_TITLE || "Solana Festival House";

  const [campaign] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("campaign"), payer.publicKey.toBuffer(), u64Le(campaignId)],
    PROGRAM_ID,
  );
  const [treasury] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), campaign.toBuffer()],
    PROGRAM_ID,
  );

  const signature = await program.methods
    .initializeCampaign(
      new anchor.BN(campaignId.toString()),
      fixedTitle(title),
      targetQuantity,
      new anchor.BN(depositCap.toString()),
      new anchor.BN(deadline.toString()),
    )
    .accountsStrict({
      creator: payer.publicKey,
      campaign,
      treasury,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log(JSON.stringify({
    network: "devnet",
    programId: PROGRAM_ID.toBase58(),
    creator: payer.publicKey.toBase58(),
    campaignId: campaignId.toString(),
    campaign: campaign.toBase58(),
    treasury: treasury.toBase58(),
    targetQuantity,
    depositCapLamports: depositCap.toString(),
    deadline: deadline.toString(),
    signature,
    explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
