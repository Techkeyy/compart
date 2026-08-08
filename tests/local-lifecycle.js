const anchor = require("@coral-xyz/anchor");
const { Keypair, PublicKey, SystemProgram } = anchor.web3;
const idl = require("../artifacts/compartido-market/compartido_market.json");

const RPC_URL = "http://127.0.0.1:8899";
const CAMPAIGN_SEED = Buffer.from("campaign");
const TREASURY_SEED = Buffer.from("treasury");
const BID_SEED = Buffer.from("bid");
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

async function confirmAirdrop(connection, publicKey, lamports) {
  const signature = await connection.requestAirdrop(publicKey, lamports);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
}

async function waitForDeadline(connection, deadline) {
  for (;;) {
    const slot = await connection.getSlot("confirmed");
    const blockTime = await connection.getBlockTime(slot);
    if (blockTime !== null && blockTime >= deadline + 1) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function main() {
  const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
  const creator = Keypair.generate();
  const buyers = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
  const suppliers = [Keypair.generate(), Keypair.generate()];

  for (const participant of [creator, ...buyers, ...suppliers]) {
    await confirmAirdrop(
      connection,
      participant.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL,
    );
  }

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(creator),
    { commitment: "confirmed" },
  );
  const program = new anchor.Program(idl, provider);
  const programId = new PublicKey(idl.address);
  const campaignId = BigInt(Date.now());
  const [campaign] = PublicKey.findProgramAddressSync(
    [CAMPAIGN_SEED, creator.publicKey.toBuffer(), u64Le(campaignId)],
    programId,
  );
  const [treasury] = PublicKey.findProgramAddressSync(
    [TREASURY_SEED, campaign.toBuffer()],
    programId,
  );

  const deadline = Math.floor(Date.now() / 1000) + 8;
  await program.methods
    .initializeCampaign(
      new anchor.BN(campaignId.toString()),
      titleBytes("Private Festival House"),
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

  const bidPdas = [];
  for (const buyer of buyers) {
    const [bid] = PublicKey.findProgramAddressSync(
      [BID_SEED, campaign.toBuffer(), buyer.publicKey.toBuffer()],
      programId,
    );
    bidPdas.push(bid);
    await program.methods
      .createBid(1)
      .accounts({
        buyer: buyer.publicKey,
        campaign,
        bid,
        treasury,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();
  }

  const publicBids = await Promise.all(
    bidPdas.map((bid) => program.account.bid.fetch(bid)),
  );
  if (publicBids.some((bid) => Object.hasOwn(bid, "maxUnitPrice"))) {
    throw new Error("privacy regression: a public commitment exposes maxUnitPrice");
  }
  if (publicBids.some((bid) => bid.deposit.toNumber() !== DEPOSIT_CAP)) {
    throw new Error("commitments did not use the shared public deposit ceiling");
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
      programId,
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

  await waitForDeadline(connection, deadline);
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

  const campaignState = await program.account.campaign.fetch(campaign);
  if (campaignState.depositCap.toNumber() !== DEPOSIT_CAP) {
    throw new Error("unexpected public deposit ceiling");
  }
  if (campaignState.clearingPrice.toNumber() !== 1_000_000) {
    throw new Error("the cheapest qualifying supplier was not selected");
  }
  if (!campaignState.winningSupplier.equals(suppliers[1].publicKey)) {
    throw new Error("winning supplier mismatch");
  }

  let settlementBlocked = false;
  try {
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
  } catch (error) {
    settlementBlocked = String(error).includes("AllocationsNotComputed");
  }
  if (!settlementBlocked) {
    throw new Error("base settlement was not blocked before private allocation");
  }

  console.log(
    JSON.stringify(
      {
        programId: programId.toBase58(),
        campaign: campaign.toBase58(),
        depositCap: campaignState.depositCap.toNumber(),
        publicBidFields: Object.keys(publicBids[0]),
        privateMaximumPresentOnBase: false,
        clearingPrice: campaignState.clearingPrice.toNumber(),
        winningSupplier: campaignState.winningSupplier.toBase58(),
        settlementBeforePrivateAllocation: "blocked",
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
