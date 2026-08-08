const fs = require("node:fs");
const { Connection, PublicKey } = require("@solana/web3.js");

const proofPath = process.env.HOSTED_PROOF_JSON;
const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

if (!proofPath) {
  throw new Error("Set HOSTED_PROOF_JSON to the generated public proof JSON.");
}

async function main() {
  const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
  const connection = new Connection(rpcUrl, "confirmed");
  const signatureNames = [
    "initializeCampaign",
    "settleCampaign",
    "refund1",
    "refund2",
    "refund3",
    "receipt1",
    "receipt2",
  ];
  const statuses = await connection.getSignatureStatuses(
    signatureNames.map((name) => proof.signatures[name]),
    { searchTransactionHistory: true },
  );
  const privateBudgets = await connection.getMultipleAccountsInfo(
    proof.privateBudgetAddresses.map((address) => new PublicKey(address)),
    "confirmed",
  );
  const receipts = await connection.getMultipleAccountsInfo(
    proof.receiptAddresses.map((address) => new PublicKey(address)),
    "confirmed",
  );

  const result = {
    statuses: Object.fromEntries(
      signatureNames.map((name, index) => [
        name,
        statuses.value[index]
          ? {
              confirmationStatus: statuses.value[index].confirmationStatus,
              error: statuses.value[index].err,
            }
          : null,
      ]),
    ),
    privateBudgetsOnBase: privateBudgets.map(Boolean),
    receiptsOnBase: receipts.map(Boolean),
  };

  if (
    Object.values(result.statuses).some(
      (status) => !status || status.error || status.confirmationStatus !== "finalized",
    ) ||
    result.privateBudgetsOnBase.some(Boolean) ||
    result.receiptsOnBase.some((present) => !present)
  ) {
    throw new Error(`hosted proof verification failed: ${JSON.stringify(result)}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
