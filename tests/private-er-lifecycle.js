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
} = require("@magicblock-labs/ephemeral-rollups-sdk");
const idl = require("../artifacts/compartido-market/compartido_market.json");

const { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } =
  anchor.web3;
const BASE_RPC = "http://127.0.0.1:8899";
const PRIVATE_RPC = "http://127.0.0.1:6699";
const PRIVATE_WS = "ws://127.0.0.1:6700";
const VALIDATOR = new PublicKey(
  "mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev",
);
const PROGRAM_ID = new PublicKey(idl.address);
const CAMPAIGN_SEED = Buffer.from("campaign");
const TREASURY_SEED = Buffer.from("treasury");
const BID_SEED = Buffer.from("bid");
const PRIVATE_BUDGET_SEED = Buffer.from("private-budget");
const OFFER_SEED = Buffer.from("offer");
const DEPOSIT_CAP = 1_800_000;

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

async function confirmAirdrop(connection, publicKey, lamports) {
  const signature = await connection.requestAirdrop(publicKey, lamports);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
}

async function chainTime(connection) {
  const slot = await connection.getSlot("confirmed");
  const blockTime = await connection.getBlockTime(slot);
  if (blockTime === null) throw new Error("base validator returned no block time");
  return blockTime;
}

async function waitForDeadline(connection, deadline) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if ((await chainTime(connection)) >= deadline + 1) return;
    await sleep(250);
  }
  throw new Error("campaign deadline was not reached in time");
}

async function authenticatedPrivateConnection(keypair) {
  const auth = await getAuthToken(
    PRIVATE_RPC,
    keypair.publicKey,
    (message) => Promise.resolve(nacl.sign.detached(message, keypair.secretKey)),
  );
  const token = encodeURIComponent(auth.token);
  return new anchor.web3.Connection(`${PRIVATE_RPC}?token=${token}`, {
    wsEndpoint: `${PRIVATE_WS}?token=${token}`,
    commitment: "confirmed",
  });
}

async function waitForAccount(connection, address, present, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const info = await connection.getAccountInfo(address, "confirmed");
    if (Boolean(info) === present) return info;
    await sleep(250);
  }
  throw new Error(`${label} did not reach expected account state`);
}

async function waitForProgramOwner(connection, address, label) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const info = await connection.getAccountInfo(address, "confirmed");
    if (info?.owner.equals(PROGRAM_ID)) return info;
    await sleep(250);
  }
  throw new Error(`${label} was not committed and undelegated to the base layer`);
}

async function main() {
  const baseConnection = new anchor.web3.Connection(BASE_RPC, "confirmed");
  const creator = Keypair.generate();
  const buyers = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
  const suppliers = [Keypair.generate(), Keypair.generate()];

  for (const participant of [creator, ...buyers, ...suppliers]) {
    await confirmAirdrop(
      baseConnection,
      participant.publicKey,
      3 * anchor.web3.LAMPORTS_PER_SOL,
    );
  }

  const provider = new anchor.AnchorProvider(
    baseConnection,
    new anchor.Wallet(creator),
    { commitment: "confirmed" },
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
  const deadline = (await chainTime(baseConnection)) + 24;

  await program.methods
    .initializeCampaign(
      new anchor.BN(campaignId.toString()),
      titleBytes("Private ER Festival House"),
      2,
      new anchor.BN(DEPOSIT_CAP),
      new anchor.BN(deadline),
    )
    .accounts({
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

    await program.methods
      .createBid(bidSpecs[index].quantity)
      .accounts({
        buyer: buyer.publicKey,
        campaign,
        bid,
        treasury,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    await program.methods
      .delegateBid()
      .accounts({
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
    await waitForAccount(privateConnection, bid, true, `buyer ${index + 1} delegated commitment`);
    const buyerPrivateProvider = new anchor.AnchorProvider(
      privateConnection,
      new anchor.Wallet(buyer),
      { commitment: "confirmed" },
    );
    const buyerPrivateProgram = new anchor.Program(idl, buyerPrivateProvider);
    const placeBudget = await buyerPrivateProgram.methods
      .placePrivateBudget(new anchor.BN(bidSpecs[index].privateMax))
      .accounts({
        buyer: buyer.publicKey,
        campaign,
        bid,
        privateBudget,
        vault: EPHEMERAL_VAULT_ID,
        magicProgram: MAGIC_PROGRAM_ID,
      })
      .instruction();
    const protectBudget = await buyerPrivateProgram.methods
      .initPrivateBudgetPermission()
      .accounts({
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
    await sendAndConfirmTransaction(
      privateConnection,
      new Transaction().add(placeBudget, protectBudget),
      [buyer],
      { commitment: "confirmed" },
    );
  }

  const ownerCanRead = await privateConnections[0].getAccountInfo(
    privateBudgetPdas[0],
    "confirmed",
  );
  if (!ownerCanRead) throw new Error("budget owner could not read their private maximum");

  const buyerOnePrivateProvider = new anchor.AnchorProvider(
    privateConnections[0],
    new anchor.Wallet(buyers[0]),
    { commitment: "confirmed" },
  );
  const buyerOnePrivateProgram = new anchor.Program(idl, buyerOnePrivateProvider);
  await buyerOnePrivateProgram.methods
    .updatePrivateBudget(new anchor.BN(1_550_000))
    .accounts({
      buyer: buyers[0].publicKey,
      campaign,
      bid: bidPdas[0],
      privateBudget: privateBudgetPdas[0],
    })
    .rpc();
  const updatedBudget = await buyerOnePrivateProgram.account.privateBudget.fetch(
    privateBudgetPdas[0],
  );
  if (updatedBudget.maxUnitPrice.toNumber() !== 1_550_000) {
    throw new Error("budget owner could not revise their private maximum");
  }

  let earlyUndelegationBlocked = false;
  try {
    await buyerOnePrivateProgram.methods
      .undelegateBid()
      .accounts({
        payer: buyers[0].publicKey,
        campaign,
        bid: bidPdas[0],
        magicProgram: MAGIC_PROGRAM_ID,
        magicContext: MAGIC_CONTEXT_ID,
      })
      .rpc();
  } catch (error) {
    const errorCode =
      error?.error?.errorCode?.code || error?.errorCode?.code || "";
    earlyUndelegationBlocked =
      error?.code === 6027 ||
      errorCode === "AllocationsNotComputed" ||
      String(error).includes("AllocationsNotComputed") ||
      String(error?.msg).includes("allocations have not been computed") ||
      error?.logs?.some((line) => line.includes("AllocationsNotComputed"));
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
    otherBuyerDenied = /permission|forbidden|unauthori|denied/i.test(String(error));
  }
  if (!otherBuyerDenied) {
    throw new Error("privacy regression: another buyer could read a private budget");
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
      throw new Error("campaign organizer could not read a permissioned private budget");
    }
    if (await baseConnection.getAccountInfo(privateBudget, "confirmed")) {
      throw new Error("privacy regression: an ER-only budget exists on the base layer");
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
    await program.methods
      .postSupplierOffer(
        offerSpecs[index].quantity,
        new anchor.BN(offerSpecs[index].unitPrice),
      )
      .accounts({
        supplier: supplier.publicKey,
        campaign,
        offer,
        systemProgram: SystemProgram.programId,
      })
      .signers([supplier])
      .rpc();
  }

  await waitForDeadline(baseConnection, deadline);
  await program.methods
    .selectWinningOffer()
    .accounts({ caller: creator.publicKey, campaign })
    .remainingAccounts(
      offerPdas.map((pubkey) => ({
        pubkey,
        isWritable: false,
        isSigner: false,
      })),
    )
    .rpc();

  await program.methods
    .delegateCampaign(new anchor.BN(campaignId.toString()))
    .accounts({
      creator: creator.publicKey,
      bufferCampaign: delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
        campaign,
        PROGRAM_ID,
      ),
      delegationRecordCampaign: delegationRecordPdaFromDelegatedAccount(campaign),
      delegationMetadataCampaign: delegationMetadataPdaFromDelegatedAccount(campaign),
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
  await creatorPrivateProgram.methods
    .computeAllocations()
    .accounts({ creator: creator.publicKey, campaign })
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
  if (
    JSON.stringify(erBids.map((bid) => bid.allocatedQuantity)) !==
    JSON.stringify(expectedAllocations)
  ) {
    throw new Error("private allocation produced an unexpected outcome");
  }

  for (const bid of bidPdas) {
    await creatorPrivateProgram.methods
      .undelegateBid()
      .accounts({
        payer: creator.publicKey,
        campaign,
        bid,
        magicProgram: MAGIC_PROGRAM_ID,
        magicContext: MAGIC_CONTEXT_ID,
      })
      .rpc();
  }
  await creatorPrivateProgram.methods
    .undelegateCampaign()
    .accounts({
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
  );
  await program.methods
    .settleCampaign()
    .accounts({
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
    throw new Error("supplier payout did not equal the exact group clearing cost");
  }
  if (!("settled" in campaignState.status)) {
    throw new Error(`campaign did not settle: ${JSON.stringify(campaignState.status)}`);
  }

  console.log(
    JSON.stringify(
      {
        programId: PROGRAM_ID.toBase58(),
        campaign: campaign.toBase58(),
        ownerCanReadPrivateBudget: true,
        ownerCanUpdatePrivateBudget: true,
        otherBuyerDenied: true,
        organizerCanCompute: true,
        earlyUndelegationBlocked: true,
        privateBudgetsOnBase: false,
        allocations,
        refunds,
        supplierPayout: supplierBalanceAfter - supplierBalanceBefore,
        status: "settled",
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
