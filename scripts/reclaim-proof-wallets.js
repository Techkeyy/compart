const fs = require("node:fs");
const path = require("node:path");
const {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");

const creatorPath = process.env.SOLANA_KEYPAIR;
const proofKeysDir = process.env.PROOF_KEYS_DIR;
const rpcUrl = process.env.SOLANA_RPC_URL || "https://rpc.magicblock.app/devnet";
const repoRoot = path.resolve(
  process.env.COMPART_REPO_ROOT || path.join(__dirname, ".."),
);

if (!creatorPath || !proofKeysDir) {
  throw new Error("Set SOLANA_KEYPAIR and PROOF_KEYS_DIR outside the repository.");
}

function assertOutsideRepository(value, label) {
  const relative = path.relative(repoRoot, path.resolve(value));
  const outside =
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);
  if (!outside) {
    throw new Error(`${label} must be outside the repository.`);
  }
}

assertOutsideRepository(creatorPath, "SOLANA_KEYPAIR");
assertOutsideRepository(proofKeysDir, "PROOF_KEYS_DIR");

function loadKeypair(keypairPath) {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8"))),
  );
}

async function main() {
  const connection = new Connection(rpcUrl, "confirmed");
  const creator = loadKeypair(creatorPath);
  const names = ["buyer-1", "buyer-2", "buyer-3", "supplier-1", "supplier-2"];
  const wallets = names.map((name) =>
    loadKeypair(path.join(proofKeysDir, `${name}.json`)),
  );
  const transaction = new Transaction();
  let reclaimedLamports = 0;

  for (const wallet of wallets) {
    const balance = await connection.getBalance(wallet.publicKey, "confirmed");
    if (balance === 0) continue;
    reclaimedLamports += balance;
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: creator.publicKey,
        lamports: balance,
      }),
    );
  }

  if (transaction.instructions.length === 0) {
    console.log(JSON.stringify({ reclaimedLamports: 0, signature: null }));
    return;
  }

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [creator, ...wallets],
    { commitment: "confirmed" },
  );
  console.log(
    JSON.stringify(
      {
        destination: creator.publicKey.toBase58(),
        reclaimedLamports,
        signature,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
