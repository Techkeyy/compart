const fs = require("node:fs");
const path = require("node:path");
const anchor = require("@coral-xyz/anchor");
const nacl = require("tweetnacl");
const {
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
} = require("@magicblock-labs/ephemeral-rollups-sdk");
const IDL_PATH =
  process.env.COMPART_IDL_PATH ||
  path.join(
    __dirname,
    "..",
    "artifacts",
    "compartido-market",
    "compartido_market.json",
  );
const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));

const {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = anchor.web3;

const BASE_RPC = process.env.SOLANA_RPC_URL || "https://rpc.magicblock.app/devnet";
const TEE_RPC = process.env.MAGICBLOCK_TEE_URL || "https://devnet-tee.magicblock.app";
const TEE_WS = TEE_RPC.replace(/^http/, "ws");
const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR;
const PROOF_KEYS_DIR = process.env.PROOF_KEYS_DIR;
const REPO_ROOT = path.resolve(
  process.env.COMPART_REPO_ROOT || path.join(__dirname, ".."),
);
const VALIDATOR = new PublicKey(
  process.env.MAGICBLOCK_TEE_VALIDATOR ||
    "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo",
);
const PROGRAM_ID = new PublicKey(idl.address);
const CAMPAIGN_SEED = Buffer.from("campaign");
const TREASURY_SEED = Buffer.from("treasury");
const BID_SEED = Buffer.from("bid");
const PRIVATE_BUDGET_SEED = Buffer.from("private-budget");
const OFFER_SEED = Buffer.from("offer");
const RECEIPT_SEED = Buffer.from("receipt");
const DEPOSIT_CAP = 1_800_000;
const PARTICIPANT_BALANCE = 50_000_000;

if (!KEYPAIR_PATH || !PROOF_KEYS_DIR) {
  throw new Error(
    "Set SOLANA_KEYPAIR and PROOF_KEYS_DIR to paths outside the repository.",
  );
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
assertOutsideRepository(PROOF_KEYS_DIR, "PROOF_KEYS_DIR");

function u64Le(value) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(BigInt(value));
  return out;
}

function titleBytes(value) {
  const bytes = Buffer.alloc(32);
  Buffer.from(value).copy(bytes);
  return [...bytes];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadKeypair(keypairPath) {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8"))),
  );
}

function loadOrCreateProofKeypair(name) {
  fs.mkdirSync(PROOF_KEYS_DIR, { recursive: true, mode: 0o700 });
  const keypairPath = path.join(PROOF_KEYS_DIR, `${name}.json`);
  if (fs.existsSync(keypairPath)) return loadKeypair(keypairPath);
  const keypair = Keypair.generate();
  fs.writeFileSync(keypairPath, JSON.stringify([...keypair.secretKey]), {
    mode: 0o600,
  });
  return keypair;
}

async function chainTime(connection) {
  const slot = await connection.getSlot("confirmed");
  const blockTime = await connection.getBlockTime(slot);
  if (blockTime === null) throw new Error("devnet returned no block time");
  return blockTime;
}

async function waitForDeadline(connection, deadline) {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if ((await chainTime(connection)) >= deadline + 1) return;
    await sleep(2_000);
  }
  throw new Error("campaign deadline was not reached in time");
}

async function authenticatedPrivateConnection(keypair) {
  const auth = await getAuthToken(
    TEE_RPC,
    keypair.publicKey,
    (message) => Promise.resolve(nacl.sign.detached(message, keypair.secretKey)),
  );
  const base = TEE_RPC.replace(/\/$/, "");
  const ws = TEE_WS.replace(/\/$/, "");
  return new anchor.web3.Connection(`${base}?token=${auth.token}`, {
    wsEndpoint: `${ws}?token=${auth.token}`,
    commitment: "confirmed",
  });
}

async function waitForAccount(connection, address, present, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const info = await connection.getAccountInfo(address, "confirmed");
      if (Boolean(info) === present) return info;
    } catch (error) {
      if (present || !/permission|forbidden|unauthori|denied/i.test(String(error))) {
        throw error;
      }
      return null;
    }
    await sleep(1_000);
  }
  throw new Error(`${label} did not reach its expected account state`);
}

async function waitForProgramOwner(connection, address, label) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const info = await connection.getAccountInfo(address, "confirmed");
    if (info?.owner.equals(PROGRAM_ID)) return info;
    await sleep(1_000);
  }
  throw new Error(`${label} was not committed back to Solana`);
}

async function main() {
  const baseConnection = new anchor.web3.Connection(BASE_RPC, "confirmed");
  const creator = loadKeypair(KEYPAIR_PATH);
  const buyers = [1, 2, 3].map((index) =>
    loadOrCreateProofKeypair(`buyer-${index}`),
  );
  const suppliers = [1, 2].map((index) =>
    loadOrCreateProofKeypair(`supplier-${index}`),
  );
  const signatures = {};
  const participants = [...buyers, ...suppliers];

  await verifyTeeRpcIntegrity(TEE_RPC);

  const funding = new Transaction();
  for (const participant of participants) {
    const balance = await baseConnection.getBalance(participant.publicKey, "confirmed");
    if (balance < PARTICIPANT_BALANCE) {
      funding.add(SystemProgram.transfer({
        fromPubkey: creator.publicKey,
        toPubkey: participant.publicKey,
        lamports: PARTICIPANT_BALANCE - balance,
      }));
    }
  }
  if (funding.instructions.length > 0) {
    signatures.funding = await sendAndConfirmTransaction(
      baseConnection,
      funding,
      [creator],
      { commitment: "confirmed" },
    );
  }

  const provider = new anchor.AnchorProvider(
    baseConnection,
    new anchor.Wallet(creator),
    { commitment: "confirmed", preflightCommitment: "confirmed" },
  );
  const program = new anchor.Program(idl, provider);
  const campaignId = BigInt(Date.now());
  const [campaign] = PublicKey.findProgramAddressSync(
    [CAMPAIGN_SEED, creator.publicKey.toBuffer(), u64Le(campaignId)],
    PROGRAM_ID,
  );
  const [treasury] = PublicKey.findProgramAddressSync(
    [TREASURY_SEED, campaign.toBuffer()],
    PROGRAM_ID,
  );
  const deadline = (await chainTime(baseConnection)) + 240;

  signatures.initializeCampaign = await program.methods
    .initializeCampaign(
      new anchor.BN(campaignId.toString()),
      titleBytes("Hosted Privacy Proof"),
      2,
      new anchor.BN(DEPOSIT_CAP),
      new anchor.BN(deadline),
    )
    .accountsStrict({
      creator: creator.publicKey,
      campaign,
      treasury,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const bidSpecs = [
    { quantity: 1, privateMax: 1_500_000 },
    { quantity: 1, privateMax: 1_300_000 },
    { quantity: 1, privateMax: 900_000 },
  ];
  const bidPdas = [];
  const privateBudgetPdas = [];
  const privateConnections = [];

  for (let index = 0; index < buyers.length; index += 1) {
    const buyer = buyers[index];
    const [bid] = PublicKey.findProgramAddressSync(
      [BID_SEED, campaign.toBuffer(), buyer.publicKey.toBuffer()],
      PROGRAM_ID,
    );
    const [privateBudget] = PublicKey.findProgramAddressSync(
      [PRIVATE_BUDGET_SEED, bid.toBuffer()],
      PROGRAM_ID,
    );
    bidPdas.push(bid);
    privateBudgetPdas.push(privateBudget);

    signatures[`createBid${index + 1}`] = await program.methods
      .createBid(bidSpecs[index].quantity)
      .accountsStrict({
        buyer: buyer.publicKey,
        campaign,
        bid,
        treasury,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    signatures[`delegateBid${index + 1}`] = await program.methods
      .delegateBid()
      .accountsStrict({
        buyer: buyer.publicKey,
        campaign,
        bufferBid: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
          bid,
          PROGRAM_ID,
        ),
        delegationRecordBid: delegationRecordPdaFromDelegatedAccount(bid),
        delegationMetadataBid: delegationMetadataPdaFromDelegatedAccount(bid),
        bid,
        validator: VALIDATOR,
        ownerProgram: PROGRAM_ID,
        delegationProgram: DELEGATION_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const privateConnection = await authenticatedPrivateConnection(buyer);
    privateConnections.push(privateConnection);
    await waitForAccount(
      privateConnection,
      bid,
      true,
      `buyer ${index + 1} delegated commitment`,
    );
    const privateProvider = new anchor.AnchorProvider(
      privateConnection,
      new anchor.Wallet(buyer),
      { commitment: "confirmed" },
    );
    const privateProgram = new anchor.Program(idl, privateProvider);
    const placeBudget = await privateProgram.methods
      .placePrivateBudget(new anchor.BN(bidSpecs[index].privateMax))
      .accountsStrict({
        buyer: buyer.publicKey,
        campaign,
        bid,
        privateBudget,
        vault: EPHEMERAL_VAULT_ID,
        magicProgram: MAGIC_PROGRAM_ID,
      })
      .instruction();
    const protectBudget = await privateProgram.methods
      .initPrivateBudgetPermission()
      .accountsStrict({
        buyer: buyer.publicKey,
        campaign,
        bid,
        privateBudget,
        permission: permissionPdaFromAccount(privateBudget),
        permissionProgram: PERMISSION_PROGRAM_ID,
        ephemeralVault: EPHEMERAL_VAULT_ID,
        magicProgram: MAGIC_PROGRAM_ID,
      })
      .instruction();
    signatures[`privateBudget${index + 1}`] = await sendAndConfirmTransaction(
      privateConnection,
      new Transaction().add(placeBudget, protectBudget),
      [buyer],
      { commitment: "confirmed" },
    );
  }

  const ownerCanRead = Boolean(
    await privateConnections[0].getAccountInfo(privateBudgetPdas[0], "confirmed"),
  );
  if (!ownerCanRead) throw new Error("budget owner could not read their private budget");

  const buyerOnePrivateProvider = new anchor.AnchorProvider(
    privateConnections[0],
    new anchor.Wallet(buyers[0]),
    { commitment: "confirmed" },
  );
  const buyerOnePrivateProgram = new anchor.Program(idl, buyerOnePrivateProvider);
  signatures.updatePrivateBudget = await buyerOnePrivateProgram.methods
    .updatePrivateBudget(new anchor.BN(1_550_000))
    .accountsStrict({
      buyer: buyers[0].publicKey,
      campaign,
      bid: bidPdas[0],
      privateBudget: privateBudgetPdas[0],
    })
    .rpc();

  let earlyUndelegationBlocked = false;
  try {
    await buyerOnePrivateProgram.methods
      .undelegateBid()
      .accountsStrict({
        payer: buyers[0].publicKey,
        campaign,
        bid: bidPdas[0],
        magicProgram: MAGIC_PROGRAM_ID,
        magicContext: MAGIC_CONTEXT_ID,
      })
      .rpc();
  } catch (error) {
    earlyUndelegationBlocked =
      /AllocationsNotComputed|allocations have not been computed|custom program error: 0x178b/i.test(
        String(error),
      ) || error?.logs?.some((line) => line.includes("AllocationsNotComputed"));
  }
  if (!earlyUndelegationBlocked) {
    throw new Error("a participant could undelegate before private allocation");
  }

  let otherBuyerDenied = false;
  try {
    const leaked = await privateConnections[1].getAccountInfo(
      privateBudgetPdas[0],
      "confirmed",
    );
    otherBuyerDenied = leaked === null;
  } catch (error) {
    otherBuyerDenied = /permission|forbidden|unauthori|denied|403/i.test(
      String(error),
    );
  }
  if (!otherBuyerDenied) {
    throw new Error("privacy regression: another buyer read a private budget");
  }

  const creatorPrivateConnection = await authenticatedPrivateConnection(creator);
  const creatorPrivateProvider = new anchor.AnchorProvider(
    creatorPrivateConnection,
    new anchor.Wallet(creator),
    { commitment: "confirmed" },
  );
  const creatorPrivateProgram = new anchor.Program(idl, creatorPrivateProvider);
  for (const privateBudget of privateBudgetPdas) {
    if (!(await creatorPrivateConnection.getAccountInfo(privateBudget, "confirmed"))) {
      throw new Error("campaign organizer could not read a private budget");
    }
    if (await baseConnection.getAccountInfo(privateBudget, "confirmed")) {
      throw new Error("privacy regression: private budget exists on Solana");
    }
  }

  const offerSpecs = [
    { quantity: 2, unitPrice: 1_200_000 },
    { quantity: 2, unitPrice: 1_000_000 },
  ];
  const offerPdas = [];
  for (let index = 0; index < suppliers.length; index += 1) {
    const supplier = suppliers[index];
    const [offer] = PublicKey.findProgramAddressSync(
      [OFFER_SEED, campaign.toBuffer(), supplier.publicKey.toBuffer()],
      PROGRAM_ID,
    );
    offerPdas.push(offer);
    signatures[`supplierOffer${index + 1}`] = await program.methods
      .postSupplierOffer(
        offerSpecs[index].quantity,
        new anchor.BN(offerSpecs[index].unitPrice),
      )
      .accountsStrict({
        supplier: supplier.publicKey,
        campaign,
        offer,
        systemProgram: SystemProgram.programId,
      })
      .signers([supplier])
      .rpc();
  }

  await waitForDeadline(baseConnection, deadline);
  signatures.selectWinningOffer = await program.methods
    .selectWinningOffer()
    .accountsStrict({ caller: creator.publicKey, campaign })
    .remainingAccounts(
      offerPdas.map((pubkey) => ({
        pubkey,
        isWritable: false,
        isSigner: false,
      })),
    )
    .rpc();

  signatures.delegateCampaign = await program.methods
    .delegateCampaign(new anchor.BN(campaignId.toString()))
    .accountsStrict({
      creator: creator.publicKey,
      bufferCampaign: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
        campaign,
        PROGRAM_ID,
      ),
      delegationRecordCampaign: delegationRecordPdaFromDelegatedAccount(campaign),
      delegationMetadataCampaign:
        delegationMetadataPdaFromDelegatedAccount(campaign),
      campaign,
      validator: VALIDATOR,
      ownerProgram: PROGRAM_ID,
      delegationProgram: DELEGATION_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  await waitForAccount(
    creatorPrivateConnection,
    campaign,
    true,
    "delegated campaign",
  );
  signatures.computeAllocations = await creatorPrivateProgram.methods
    .computeAllocations()
    .accountsStrict({ creator: creator.publicKey, campaign })
    .remainingAccounts(
      bidPdas.flatMap((bid, index) => [
        { pubkey: bid, isWritable: true, isSigner: false },
        {
          pubkey: privateBudgetPdas[index],
          isWritable: false,
          isSigner: false,
        },
      ]),
    )
    .rpc();

  const erBids = await Promise.all(
    bidPdas.map((bid) => creatorPrivateProgram.account.bid.fetch(bid)),
  );
  const expectedAllocations = [1, 1, 0];
  const erAllocations = erBids.map((bid) => bid.allocatedQuantity);
  if (JSON.stringify(erAllocations) !== JSON.stringify(expectedAllocations)) {
    throw new Error(`unexpected private allocations: ${JSON.stringify(erAllocations)}`);
  }

  for (let index = 0; index < bidPdas.length; index += 1) {
    signatures[`undelegateBid${index + 1}`] = await creatorPrivateProgram.methods
      .undelegateBid()
      .accountsStrict({
        payer: creator.publicKey,
        campaign,
        bid: bidPdas[index],
        magicProgram: MAGIC_PROGRAM_ID,
        magicContext: MAGIC_CONTEXT_ID,
      })
      .rpc();
  }
  signatures.undelegateCampaign = await creatorPrivateProgram.methods
    .undelegateCampaign()
    .accountsStrict({
      payer: creator.publicKey,
      campaign,
      magicProgram: MAGIC_PROGRAM_ID,
      magicContext: MAGIC_CONTEXT_ID,
    })
    .rpc();

  await Promise.all([
    ...bidPdas.map((bid, index) =>
      waitForProgramOwner(baseConnection, bid, `commitment ${index + 1}`),
    ),
    waitForProgramOwner(baseConnection, campaign, "campaign"),
  ]);

  const supplierBalanceBefore = await baseConnection.getBalance(
    suppliers[1].publicKey,
    "confirmed",
  );
  signatures.settleCampaign = await program.methods
    .settleCampaign()
    .accountsStrict({
      caller: creator.publicKey,
      campaign,
      supplier: suppliers[1].publicKey,
      treasury,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      bidPdas.map((pubkey) => ({
        pubkey,
        isWritable: true,
        isSigner: false,
      })),
    )
    .rpc();
  const supplierBalanceAfter = await baseConnection.getBalance(
    suppliers[1].publicKey,
    "confirmed",
  );

  const campaignState = await program.account.campaign.fetch(campaign);
  const settledBids = await Promise.all(
    bidPdas.map((bid) => program.account.bid.fetch(bid)),
  );
  const allocations = settledBids.map((bid) => bid.allocatedQuantity);
  const refunds = settledBids.map((bid) => bid.refundOwed.toNumber());
  if (JSON.stringify(allocations) !== JSON.stringify(expectedAllocations)) {
    throw new Error(`unexpected committed allocations: ${JSON.stringify(allocations)}`);
  }
  if (JSON.stringify(refunds) !== JSON.stringify([800_000, 800_000, 1_800_000])) {
    throw new Error(`unexpected committed refunds: ${JSON.stringify(refunds)}`);
  }
  if (supplierBalanceAfter - supplierBalanceBefore !== 2_000_000) {
    throw new Error("supplier payout did not equal the clearing cost");
  }

  for (let index = 0; index < buyers.length; index += 1) {
    signatures[`refund${index + 1}`] = await program.methods
      .claimRefund()
      .accountsStrict({
        buyer: buyers[index].publicKey,
        campaign,
        bid: bidPdas[index],
        treasury,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyers[index]])
      .rpc();
  }

  const receiptPdas = [];
  for (let index = 0; index < 2; index += 1) {
    const [receipt] = PublicKey.findProgramAddressSync(
      [RECEIPT_SEED, campaign.toBuffer(), buyers[index].publicKey.toBuffer()],
      PROGRAM_ID,
    );
    receiptPdas.push(receipt);
    signatures[`receipt${index + 1}`] = await program.methods
      .claimAccessReceipt()
      .accountsStrict({
        buyer: buyers[index].publicKey,
        campaign,
        bid: bidPdas[index],
        receipt,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyers[index]])
      .rpc();
  }

  const result = {
    network: "devnet",
    baseRpc: BASE_RPC,
    teeRpc: TEE_RPC,
    programId: PROGRAM_ID.toBase58(),
    campaign: campaign.toBase58(),
    treasury: treasury.toBase58(),
    buyers: buyers.map((buyer) => buyer.publicKey.toBase58()),
    suppliers: suppliers.map((supplier) => supplier.publicKey.toBase58()),
    privateBudgetAddresses: privateBudgetPdas.map((budget) => budget.toBase58()),
    receiptAddresses: receiptPdas.map((receipt) => receipt.toBase58()),
    ownerCanReadPrivateBudget: true,
    ownerCanUpdatePrivateBudget: true,
    otherBuyerDenied: true,
    organizerCanCompute: true,
    earlyUndelegationBlocked: true,
    privateBudgetsOnBase: false,
    allocations,
    refundsBeforeClaim: refunds,
    supplierPayout: supplierBalanceAfter - supplierBalanceBefore,
    status: "settled",
    signatures,
    explorer: Object.fromEntries(
      Object.entries(signatures).map(([name, signature]) => [
        name,
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      ]),
    ),
  };
  const resultPath = path.join(PROOF_KEYS_DIR, "hosted-devnet-proof.json");
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
