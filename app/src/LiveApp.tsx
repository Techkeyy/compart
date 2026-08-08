import { useCallback, useEffect, useState } from "react";
import {
  baseConnection,
  NETWORK,
  PROGRAM_ID,
  type BidSnapshot,
  type BrowserWallet,
  type CampaignSnapshot,
  type CommitmentProgress,
  type OrganizerProgress,
  type ParticipantPosition,
  type ReceiptSnapshot,
  type SupplierOfferSnapshot,
  claimPrototypeReceipt,
  claimRefund,
  claimRoomAccess,
  connectBrowserWallet,
  createCampaign,
  createClaimableInvite,
  createPrivateCommitment,
  disconnectBrowserWallet,
  inspectProgram,
  hasParticipantAccess,
  normalizeCampaignAddress,
  postSupplierOffer,
  readBuyerRoomAddresses,
  readCampaignRoom,
  readOrganizerRoomAddresses,
  readParticipantPosition,
  readReceiptsForBuyer,
  runOrganizerSettlement,
} from "./chain";
import { PublicKey } from "@solana/web3.js";
import {
  CIRCLE_DEVNET_FAUCET,
  DEVNET_USDC_MINT,
  SOLANA_DEVNET_FAUCET,
  readDevnetUsdcReadiness,
} from "./devnet-usdc";
import {
  ArrowIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  HomeIcon,
  KeyIcon,
  LockIcon,
  PlusIcon,
  ReceiptIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
  WalletIcon,
} from "./icons";
import "./live-app.css";

type AppView = "lobby" | "create" | "room" | "history";
type RoomRole = "participant" | "host" | "organizer";
type SubmitState = "idle" | "working" | "done" | "error";

type RoomMetadata = {
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  propertyType: string;
  description: string;
  terms: string;
  amenities: string[];
};

// Circle devnet USDC uses six decimal places. SOL is used only for transaction
// fees; every campaign amount below is an amount of test USDC.
const USDC_BASE_UNITS = 1_000_000;

const COMMIT_STEPS: Array<{ key: CommitmentProgress | "wallet"; label: string; detail: string }> = [
  { key: "wallet", label: "Wallet ready", detail: "Your wallet signs every public and private action." },
  { key: "public-deposit", label: "Public deposit", detail: "The equal room deposit is confirmed on Solana." },
  { key: "delegating", label: "Private handoff", detail: "Your commitment account moves into the private TEE." },
  { key: "authenticating", label: "Authenticate privately", detail: "A wallet signature opens only your protected session." },
  { key: "protecting-budget", label: "Protect your limit", detail: "Your maximum is written inside the Private ER." },
  { key: "complete", label: "Commitment ready", detail: "The room learns only that one participant joined." },
];

const ORGANIZER_STEPS: Array<{ key: OrganizerProgress; label: string }> = [
  { key: "selecting-offer", label: "Lock the final group goal" },
  { key: "delegating-room", label: "Move room outcome state into the TEE" },
  { key: "reading-private-room", label: "Verify the complete private commitment set" },
  { key: "computing-allocations", label: "Compute allocations without exposing limits" },
  { key: "publishing-outcomes", label: "Publish outcomes back to Solana" },
  { key: "settling", label: "Release organizer funds and unlock refunds" },
  { key: "complete", label: "Room complete" },
];

function displayAmount(value: bigint): number {
  return Number(value) / USDC_BASE_UNITS;
}

function shortAddress(value: string): string {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function explorerPath(kind: "address" | "tx", value: string): string {
  return `https://explorer.solana.com/${kind}/${value}${NETWORK === "devnet" ? "?cluster=devnet" : ""}`;
}

function formatDate(value: string): string {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatDeadline(value: number): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value * 1000));
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Deadline reached";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h ${minutes}m remaining`;
}

function statusLabel(status: CampaignSnapshot["status"]): string {
  return {
    open: "Collecting commitments",
    "offer-selected": "Goal selected",
    "allocations-computed": "Outcomes ready",
    settled: "Purchase cleared",
    cancelled: "Room did not clear",
  }[status];
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The onchain room still works when browser storage is disabled.
  }
}

function normalizeMetadata(value: unknown): RoomMetadata {
  if (!value || typeof value !== "object") throw new Error("The shared room brief is invalid.");
  const record = value as Record<string, unknown>;
  const textFields = ["title", "location", "startDate", "endDate", "propertyType", "description", "terms"] as const;
  for (const field of textFields) {
    if (typeof record[field] !== "string") throw new Error("The shared room brief is incomplete.");
  }
  if (!Array.isArray(record.amenities) || !record.amenities.every((item) => typeof item === "string")) {
    throw new Error("The shared room amenities are invalid.");
  }
  const metadata = record as unknown as RoomMetadata;
  return {
    title: metadata.title.slice(0, 80),
    location: metadata.location.slice(0, 100),
    startDate: metadata.startDate.slice(0, 10),
    endDate: metadata.endDate.slice(0, 10),
    propertyType: metadata.propertyType.slice(0, 60),
    description: metadata.description.slice(0, 320),
    terms: metadata.terms.slice(0, 500),
    amenities: metadata.amenities.slice(0, 8).map((item) => item.slice(0, 60)),
  };
}

function encodeMetadata(value: RoomMetadata): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeMetadata(value: string): RoomMetadata {
  if (value.length > 4_096) throw new Error("The shared room brief is too large.");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = window.atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return normalizeMetadata(JSON.parse(new TextDecoder().decode(bytes)));
}

function campaignFromInvite(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    const address = new URL(trimmed).searchParams.get("room");
    if (!address) throw new Error("That link does not contain a Compart room address.");
    return normalizeCampaignAddress(address);
  }
  return normalizeCampaignAddress(trimmed);
}

function metadataFor(campaign: CampaignSnapshot): RoomMetadata {
  const stored = safeRead<unknown>(`compart:room:${campaign.address}`, null);
  if (stored) {
    try {
      return normalizeMetadata(stored);
    } catch {
      // Ignore damaged browser state and fall back to a safe public brief.
    }
  }
  return {
    title: campaign.title,
    location: "Location unavailable",
    startDate: "",
    endDate: "",
    propertyType: "Group purchase",
    description: "This room's financial state is live on Solana. Open the organizer's complete invite link to load its public purchase brief.",
    terms: "No off-chain inventory terms were included with this room link.",
    amenities: [`${campaign.targetQuantity} people needed`, "Private limits", "Goal range"],
  };
}

function defaultDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function Brand() {
  return <a className="brand" href="#home" aria-label="Compart overview"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>compart</span></a>;
}

function FlowSteps({ steps, activeIndex, error }: { steps: Array<{ label: string; detail?: string }>; activeIndex: number; error?: boolean }) {
  return <ol className="flow-steps">{steps.map((step, index) => <li className={index < activeIndex ? "complete" : index === activeIndex ? error ? "error" : "active" : ""} key={step.label}><span>{index < activeIndex ? <CheckIcon size={14} /> : index + 1}</span><div><strong>{step.label}</strong>{step.detail && <small>{step.detail}</small>}</div></li>)}</ol>;
}

function AppHeader({ view, connected, walletAddress, networkName, onNavigate, onWallet }: { view: AppView; connected: boolean; walletAddress: string; networkName: string; onNavigate: (view: AppView) => void; onWallet: () => void }) {
  return <header className="app-header app-shell"><Brand /><nav aria-label="Application navigation"><button className={view === "lobby" ? "active" : ""} onClick={() => onNavigate("lobby")}><HomeIcon size={15} /> My rooms</button><button className={view === "history" ? "active" : ""} onClick={() => onNavigate("history")}><ReceiptIcon size={15} /> Activity</button><button className="header-create" onClick={() => onNavigate("create")}><PlusIcon size={15} /> Create room</button></nav><div className="app-header-actions"><span className="app-network"><i />{networkName}</span><button className="app-wallet" onClick={onWallet}><WalletIcon size={15} />{connected ? shortAddress(walletAddress) : "Connect wallet"}</button></div></header>;
}

function DevnetWalletChecklist({ connected, usdcBalance }: { connected: boolean; usdcBalance: number | null }) {
  return <section className="getting-started devnet-checklist"><div><span className="app-kicker">DEVNET WALLET SETUP</span><h2>One Phantom wallet. Two free test assets.</h2><p>Keep Phantom on <strong>Solana Devnet</strong>. Devnet SOL pays transaction fees; devnet USDC is the test currency used by new Compart rooms. Neither has real-world value.</p><div className="faucet-actions"><a className="faucet-link" href={SOLANA_DEVNET_FAUCET} target="_blank" rel="noreferrer">1. Get devnet SOL ↗</a><a className="faucet-link subtle" href={CIRCLE_DEVNET_FAUCET} target="_blank" rel="noreferrer">2. Get devnet USDC ↗</a></div></div><ol><li><span>01</span><div><strong>Use Phantom — no new wallet</strong><p>Open Phantom’s network selector and choose Solana Devnet.</p></div></li><li><span>02</span><div><strong>Fund the same public address</strong><p>Request both faucets using the address shown in Phantom. Never share its recovery phrase.</p></div></li><li><span>03</span><div><strong>Confirm your test USDC</strong><p>{!connected ? "Connect Phantom to check it here." : usdcBalance === null ? "Checking your devnet USDC balance…" : usdcBalance > 0 ? `${usdcBalance.toLocaleString()} test USDC detected.` : <>No devnet USDC detected yet. If Phantom does not display it, add mint <code>{DEVNET_USDC_MINT.toBase58()}</code>.</>}</p></div></li></ol></section>;
}

function PrivacyProof({ campaignAddress }: { campaignAddress?: string }) {
  return <aside className="privacy-proof"><div className="proof-heading"><span><ShieldIcon size={19} /></span><div><small>LIVE PRIVACY MODEL</small><strong>Outcome-only by design</strong></div></div><div className="proof-boundary"><div><small>PUBLIC ON SOLANA</small><p>Deposit, quantity, deal options, allocation and refund.</p></div><div><small>PRIVATE IN MAGICBLOCK TEE</small><p>Your maximum and the values used during matching.</p></div></div><ul><li><CheckIcon size={14} /> Eligibility: commitment accounts delegate to MagicBlock ER</li><li><CheckIcon size={14} /> Theme: one private room lets a group coordinate together</li><li><CheckIcon size={14} /> Creativity: private group checkout, not another expense tracker</li><li><CheckIcon size={14} /> Technical depth: authenticated Private ER budgets and outcome-only matching</li><li><CheckIcon size={14} /> Solana showcase: deposits, results, refunds and receipts settle onchain</li></ul><div className="proof-actions"><a href={explorerPath("address", PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer">Program proof ↗</a>{campaignAddress && <a href={explorerPath("address", campaignAddress)} target="_blank" rel="noreferrer">Room account ↗</a>}<a href="https://github.com/Techkeyy/compart/blob/main/HOSTED_DEVNET_PROOF.md" target="_blank" rel="noreferrer">Two-wallet denial proof ↗</a></div></aside>;
}

export default function LiveApp() {
  const initialParams = new URLSearchParams(window.location.search);
  const roomFromUrl = initialParams.get("room");
  const detailsFromUrl = initialParams.get("details");
  const inviteRole = initialParams.get("role") === "host" ? "host" : "participant";
  const [view, setView] = useState<AppView>(roomFromUrl ? "room" : "lobby");
  const [selectedAddress, setSelectedAddress] = useState(roomFromUrl || "");
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [devnetUsdcBalance, setDevnetUsdcBalance] = useState<number | null>(null);
  const [programState, setProgramState] = useState<"checking" | "ready" | "unreachable">("checking");
  const [campaign, setCampaign] = useState<CampaignSnapshot | null>(null);
  const [offers, setOffers] = useState<SupplierOfferSnapshot[]>([]);
  const [position, setPosition] = useState<ParticipantPosition | null>(null);
  const [roomState, setRoomState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [roomError, setRoomError] = useState("");
  const [role, setRole] = useState<RoomRole>(inviteRole);
  const [joinCode, setJoinCode] = useState("");
  const [joinState, setJoinState] = useState<SubmitState>("idle");
  const [joinNotice, setJoinNotice] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [inviteState, setInviteState] = useState<"idle" | "copied" | "error">("idle");
  const [accessRole, setAccessRole] = useState<"participant" | "host">("participant");
  const [accessState, setAccessState] = useState<SubmitState>("idle");
  const [accessNotice, setAccessNotice] = useState("");
  const [maxBudget, setMaxBudget] = useState(0);
  const [commitState, setCommitState] = useState<SubmitState>("idle");
  const [commitProgress, setCommitProgress] = useState<CommitmentProgress | "wallet">("wallet");
  const [commitNotice, setCommitNotice] = useState("");
  const [commitSignature, setCommitSignature] = useState("");
  const [hostPrice, setHostPrice] = useState(0);
  const [hostQuantity, setHostQuantity] = useState(0);
  const [hostName, setHostName] = useState("");
  const [hostTerms, setHostTerms] = useState("");
  const [hostState, setHostState] = useState<SubmitState>("idle");
  const [hostNotice, setHostNotice] = useState("");
  const [hostSignature, setHostSignature] = useState("");
  const [organizerState, setOrganizerState] = useState<SubmitState>("idle");
  const [organizerProgress, setOrganizerProgress] = useState<OrganizerProgress>("selecting-offer");
  const [organizerNotice, setOrganizerNotice] = useState("");
  const [organizerSignatures, setOrganizerSignatures] = useState<string[]>([]);
  const [finalGoal, setFinalGoal] = useState(0);
  const [settlementState, setSettlementState] = useState<SubmitState>("idle");
  const [historyRooms, setHistoryRooms] = useState<string[]>([]);
  const [personalRooms, setPersonalRooms] = useState<CampaignSnapshot[]>([]);
  const [receipts, setReceipts] = useState<ReceiptSnapshot[]>([]);
  const [historyState, setHistoryState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [createState, setCreateState] = useState<SubmitState>("idle");
  const [createNotice, setCreateNotice] = useState("");
  const [createProgress, setCreateProgress] = useState(0);
  const [createForm, setCreateForm] = useState({
    title: "",
    location: "",
    propertyType: "Entire house",
    startDate: defaultDate(30),
    endDate: defaultDate(33),
    targetQuantity: 2,
    deposit: 0,
    minGoal: 0,
    maxGoal: 0,
    deadlineHours: 1,
    description: "",
    terms: "",
  });

  const connected = Boolean(walletAddress);
  const networkName = NETWORK === "mainnet-beta" ? "Solana mainnet" : "Solana devnet";

  const loadPersonalRooms = useCallback(async () => {
    setHistoryState("loading");
    try {
      let roomAddresses: string[] = [];
      let walletReceipts: ReceiptSnapshot[] = [];
      if (wallet?.publicKey) {
        const [buyerRooms, organizerRooms, nextReceipts] = await Promise.all([
          readBuyerRoomAddresses(wallet.publicKey),
          readOrganizerRoomAddresses(wallet.publicKey),
          readReceiptsForBuyer(wallet.publicKey),
        ]);
        roomAddresses = [...new Set([...organizerRooms, ...buyerRooms, ...nextReceipts.map((receipt) => receipt.campaign)])];
        walletReceipts = nextReceipts;
      }
      const rooms = await Promise.all(roomAddresses.map(async (address) => (await readCampaignRoom(address))?.campaign || null));
      setHistoryRooms(roomAddresses);
      setPersonalRooms(rooms.filter((room): room is CampaignSnapshot => Boolean(room)).sort((a, b) => b.deadline - a.deadline));
      setReceipts(walletReceipts);
      setHistoryState("ready");
    } catch {
      setHistoryState("error");
    }
  }, [wallet]);

  const refreshRoom = useCallback(async () => {
    if (!selectedAddress) return;
    try {
      const room = await readCampaignRoom(selectedAddress);
      if (!room) throw new Error("No Compart room exists at this address.");
      setCampaign(room.campaign);
      setOffers(room.offers);
      setRoomState("ready");
      setRoomError("");
      if (wallet?.publicKey) setPosition(await readParticipantPosition(wallet.publicKey, selectedAddress));
    } catch (error) {
      setRoomState("error");
      setRoomError(error instanceof Error ? error.message : "The room could not be loaded.");
    }
  }, [selectedAddress, wallet]);

  useEffect(() => {
    inspectProgram().then(({ deployed }) => setProgramState(deployed ? "ready" : "unreachable")).catch(() => setProgramState("unreachable"));
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!wallet?.publicKey || NETWORK !== "devnet") {
      setDevnetUsdcBalance(null);
      return;
    }
    let current = true;
    void readDevnetUsdcReadiness(wallet)
      .then((readiness) => { if (current) setDevnetUsdcBalance(readiness.amount); })
      .catch(() => { if (current) setDevnetUsdcBalance(0); });
    return () => { current = false; };
  }, [wallet]);

  useEffect(() => {
    if (!roomFromUrl || !detailsFromUrl) return;
    try {
      safeWrite(`compart:room:${normalizeCampaignAddress(roomFromUrl)}`, decodeMetadata(detailsFromUrl));
    } catch {
      // A malformed optional public brief never overrides authoritative onchain state.
    }
  }, [detailsFromUrl, roomFromUrl]);

  useEffect(() => {
    if (!selectedAddress || view !== "room") return;
    setRoomState("loading");
    void refreshRoom();
    const timer = window.setInterval(refreshRoom, 4_000);
    return () => window.clearInterval(timer);
  }, [refreshRoom, selectedAddress, view]);

  useEffect(() => {
    if (!campaign) return;
    setMaxBudget(displayAmount(campaign.depositCap));
    setHostQuantity(campaign.targetQuantity);
    setHostPrice(0);
    setHostTerms("");
    setFinalGoal(displayAmount(campaign.minGoal));
  }, [campaign?.address]);

  useEffect(() => {
    if (!campaign || !walletAddress) return;
    if (campaign.creator === walletAddress) setRole("organizer");
  }, [campaign, walletAddress]);

  useEffect(() => {
    if (view !== "history" && view !== "lobby") return;
    void loadPersonalRooms();
  }, [loadPersonalRooms, view]);

  async function connectWallet(): Promise<BrowserWallet | null> {
    try {
      const nextWallet = await connectBrowserWallet();
      setWallet(nextWallet);
      setWalletAddress(nextWallet.publicKey?.toBase58() || "");
      return nextWallet;
    } catch (error) {
      setCommitNotice(error instanceof Error ? error.message : "Wallet connection failed.");
      return null;
    }
  }

  async function toggleWallet() {
    if (connected) {
      await disconnectBrowserWallet();
      setWallet(null);
      setWalletAddress("");
      setPosition(null);
      return;
    }
    await connectWallet();
  }

  function navigate(nextView: AppView) {
    setView(nextView);
    if (nextView !== "room") {
      const url = new URL(window.location.href);
      url.searchParams.delete("room");
      url.searchParams.delete("details");
      url.hash = "app";
      window.history.replaceState({}, "", url);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openRoom(address: string) {
    const normalized = normalizeCampaignAddress(address);
    setSelectedAddress(normalized);
    const url = new URL(window.location.href);
    url.searchParams.set("room", normalized);
    url.searchParams.delete("details");
    url.hash = "app";
    window.history.replaceState({}, "", url);
    setView("room");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function joinRoom() {
    setJoinState("working");
    setJoinNotice("");
    try {
      const normalized = campaignFromInvite(joinCode);
      if (/^https?:\/\//i.test(joinCode.trim())) {
        const invite = new URL(joinCode.trim());
        const details = invite.searchParams.get("details");
        if (details) safeWrite(`compart:room:${normalized}`, decodeMetadata(details));
        setRole(invite.searchParams.get("role") === "host" ? "host" : "participant");
      }
      const room = await readCampaignRoom(normalized);
      if (!room) throw new Error("No Compart room was found for that invite code.");
      setJoinState("done");
      openRoom(normalized);
    } catch (error) {
      setJoinState("error");
      setJoinNotice(error instanceof Error ? error.message : "The invite code is invalid.");
    }
  }

  async function copyInvite(target: "participant" | "host" = "participant") {
    if (!selectedAddress || !wallet?.publicKey || !isOrganizer) {
      setInviteState("error");
      setAccessNotice("Connect the organizer wallet to create a claim link.");
      return;
    }
    setInviteState("idle");
    setAccessState("working");
    setAccessNotice("");
    try {
      const created = await createClaimableInvite(wallet, target, selectedAddress);
      const url = new URL(window.location.href);
      url.searchParams.set("room", selectedAddress);
      url.searchParams.set("role", target);
      url.searchParams.set("invite", created.invite);
      url.searchParams.set("claim", created.secret);
      if (selectedMeta) url.searchParams.set("details", encodeMetadata(selectedMeta));
      url.hash = "app";
      await navigator.clipboard.writeText(url.toString());
      setInviteState("copied");
      setAccessState("done");
      setAccessNotice(`One-time ${target === "participant" ? "participant" : "supplier"} link created and copied.`);
    } catch (error) {
      setInviteState("error");
      setAccessState("error");
      setAccessNotice(error instanceof Error ? error.message : "The claim link could not be created.");
    }
  }

  async function claimInviteIfPresent(activeWallet: BrowserWallet) {
    if (!selectedAddress) return;
    const url = new URL(window.location.href);
    const invite = url.searchParams.get("invite");
    const secret = url.searchParams.get("claim");
    if (!invite || !secret) return;
    const inviteAccount = await baseConnection.getAccountInfo(new PublicKey(invite), "confirmed");
    if (!inviteAccount || !inviteAccount.owner.equals(PROGRAM_ID) || inviteAccount.data.length < 40) {
      throw new Error("This invitation is no longer valid. Ask the organizer for a fresh participant link.");
    }
    const inviteCampaign = new PublicKey(inviteAccount.data.slice(8, 40)).toBase58();
    if (inviteCampaign !== selectedAddress) {
      throw new Error("This invitation belongs to a different room. Ask the organizer for a fresh participant link for this room.");
    }
    try {
      await claimRoomAccess(activeWallet, invite, secret, selectedAddress);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      // A prior attempt may have claimed the link before its following action
      // failed. The wallet already has access, so continue instead of trapping it.
      if (!message.includes("InviteAlreadyClaimed") && !message.includes("0x1776")) throw error;
    }
    url.searchParams.delete("invite");
    url.searchParams.delete("claim");
    window.history.replaceState({}, "", url);
  }

  async function submitCreateRoom(event: React.FormEvent) {
    event.preventDefault();
    setCreateState("working");
    setCreateNotice("");
    setCreateProgress(0);
    try {
      if (!createForm.description.trim()) throw new Error("Describe what the group is trying to secure.");
      if (!createForm.terms.trim()) throw new Error("Add the public refund and inventory terms.");
      if (createForm.endDate <= createForm.startDate) throw new Error("Check-out must be after check-in.");
      let activeWallet = wallet;
      if (!activeWallet?.publicKey) activeWallet = await connectWallet();
      if (!activeWallet?.publicKey) throw new Error("Connect a wallet to create the room.");
      setCreateProgress(1);
      const deadline = Math.floor(Date.now() / 1000) + Math.round(createForm.deadlineHours * 3_600);
      const result = await createCampaign(activeWallet, {
        title: createForm.title,
        targetQuantity: createForm.targetQuantity,
        depositCap: BigInt(Math.round(createForm.deposit * USDC_BASE_UNITS)),
        minGoal: BigInt(Math.round(createForm.minGoal * USDC_BASE_UNITS)),
        maxGoal: BigInt(Math.round(createForm.maxGoal * USDC_BASE_UNITS)),
        deadline,
      });
      setCreateProgress(2);
      const metadata = normalizeMetadata({
        title: createForm.title,
        location: createForm.location,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        propertyType: createForm.propertyType,
        description: createForm.description,
        terms: createForm.terms,
        amenities: [`${createForm.targetQuantity} guests`, `${createForm.propertyType}`, "Private limits", "Goal range"],
      });
      safeWrite(`compart:room:${result.campaign}`, metadata);
      setCreateProgress(3);
      setCreateState("done");
      setCreateNotice("Room created on Solana. Your invite link is ready.");
      await loadPersonalRooms();
      openRoom(result.campaign);
    } catch (error) {
      setCreateState("error");
      setCreateNotice(error instanceof Error ? error.message : "The room could not be created.");
    }
  }

  async function submitCommitment() {
    if (!selectedAddress || !campaign) return;
    setCommitState("working");
    setCommitNotice("");
    setCommitSignature("");
    try {
      let activeWallet = wallet;
      if (!activeWallet?.publicKey) activeWallet = await connectWallet();
      if (!activeWallet?.publicKey) throw new Error("Connect a wallet to continue.");
      const usdc = await readDevnetUsdcReadiness(activeWallet);
      if (usdc.amount < displayAmount(campaign.depositCap)) {
        throw new Error(`You need at least ${displayAmount(campaign.depositCap)} devnet USDC for this room's public escrow cap. Use the Circle faucet, then try again.`);
      }
      if (isOrganizer) {
        const selfInvite = await createClaimableInvite(activeWallet, "participant", selectedAddress);
        await claimRoomAccess(activeWallet, selfInvite.invite, selfInvite.secret, selectedAddress);
      } else {
        const url = new URL(window.location.href);
        const hasClaimLink = Boolean(url.searchParams.get("invite") && url.searchParams.get("claim"));
        if (!hasClaimLink && !await hasParticipantAccess(activeWallet.publicKey, selectedAddress)) {
          throw new Error("This is a private room. Open the one-time participant link sent by the organizer before committing.");
        }
      }
      await claimInviteIfPresent(activeWallet);
      const result = await createPrivateCommitment(
        activeWallet,
        BigInt(Math.round(maxBudget * USDC_BASE_UNITS)),
        1,
        selectedAddress,
        setCommitProgress,
      );
      setCommitSignature(result.baseSignature || result.privateSignature);
      setCommitState("done");
      setCommitNotice("Your USDC escrow cap is public; your maximum is protected inside the Private ER.");
      setPosition(await readParticipantPosition(activeWallet.publicKey, selectedAddress));
      await refreshRoom();
    } catch (error) {
      setCommitState("error");
      setCommitNotice(error instanceof Error ? error.message : "The commitment did not complete.");
    }
  }

  async function submitHostQuote() {
    if (!selectedAddress || !campaign || hostPrice <= 0 || !Number.isFinite(hostPrice)) return;
    setHostState("working");
    setHostNotice("");
    try {
      let activeWallet = wallet;
      if (!activeWallet?.publicKey) activeWallet = await connectWallet();
      if (!activeWallet?.publicKey) throw new Error("Connect a deal-publisher wallet to continue.");
      await claimInviteIfPresent(activeWallet);
      const signature = await postSupplierOffer(activeWallet, hostQuantity, BigInt(Math.round(hostPrice * USDC_BASE_UNITS)), selectedAddress);
      setHostSignature(signature);
      setHostState("done");
      setHostNotice("Your complete-group quote is now public on Solana.");
      safeWrite(`compart:offer:${selectedAddress}:${activeWallet.publicKey.toBase58()}`, { hostName, hostTerms });
      await refreshRoom();
    } catch (error) {
      setHostState("error");
      setHostNotice(error instanceof Error ? error.message : "The quote did not complete.");
    }
  }

  async function settleRoom() {
    if (!selectedAddress || !campaign || !wallet?.publicKey) return;
    setOrganizerState("working");
    setOrganizerNotice("");
    try {
      const result = await runOrganizerSettlement(wallet, selectedAddress, BigInt(Math.round(finalGoal * USDC_BASE_UNITS)), setOrganizerProgress);
      setOrganizerSignatures(result.signatures);
      setOrganizerState("done");
      setOrganizerNotice(result.finalStatus === "settled" ? "The group cleared. Organizer payout and participant refunds are ready." : "The group did not clear. Every participant can reclaim the full deposit.");
      await refreshRoom();
    } catch (error) {
      setOrganizerState("error");
      setOrganizerNotice(error instanceof Error ? error.message : "Settlement did not complete.");
    }
  }

  async function claim(kind: "refund" | "receipt") {
    if (!wallet?.publicKey || !selectedAddress) return;
    setSettlementState("working");
    setCommitNotice(kind === "refund" ? "Approve your refund claim." : "Approve the prototype receipt.");
    try {
      const signature = kind === "refund" ? await claimRefund(wallet, selectedAddress) : await claimPrototypeReceipt(wallet, selectedAddress);
      setCommitSignature(signature);
      setPosition(await readParticipantPosition(wallet.publicKey, selectedAddress));
      setSettlementState("done");
      setCommitNotice(kind === "refund" ? "USDC refund claimed on Solana." : "Prototype purchase receipt created on Solana.");
    } catch (error) {
      setSettlementState("error");
      setCommitNotice(error instanceof Error ? error.message : "The settlement action failed.");
    }
  }

  const selectedMeta = campaign ? metadataFor(campaign) : null;
  const selectedDates = selectedMeta?.startDate && selectedMeta.endDate
    ? `${formatDate(selectedMeta.startDate)} – ${formatDate(selectedMeta.endDate)}`
    : "Not included in this room link";
  const memberCount = campaign?.totalRequested || 0;
  const targetQuantity = campaign?.targetQuantity || 1;
  const progressPercent = Math.min(100, Math.round((memberCount / targetQuantity) * 100));
  const budgetCap = campaign ? displayAmount(campaign.depositCap) : 1;
  const budgetFloor = Math.min(0.001, budgetCap);
  const budgetPercent = budgetCap <= budgetFloor ? 100 : Math.round(((maxBudget - budgetFloor) / (budgetCap - budgetFloor)) * 100);
  const deadlineReached = campaign ? now >= campaign.deadline : false;
  const isOrganizer = Boolean(campaign && walletAddress === campaign.creator);
  const organizerStepIndex = Math.max(0, ORGANIZER_STEPS.findIndex((step) => step.key === organizerProgress));
  const commitStepIndex = Math.max(0, COMMIT_STEPS.findIndex((step) => step.key === commitProgress));
  const winningPrice = campaign ? displayAmount(campaign.clearingPrice) : 0;
  const winningOffer = campaign && campaign.winningSupplier !== "11111111111111111111111111111111" ? shortAddress(campaign.winningSupplier) : "Pending private match";
  const activeQuoteByWallet = offers.some((offer) => offer.supplier === walletAddress);
  const personalRoomByAddress = new Map(personalRooms.map((room) => [room.address, room]));
  const activePersonalRooms = personalRooms.filter((room) => room.status === "open" || room.status === "offer-selected" || room.status === "allocations-computed");

  return <main className="product-app">
    <AppHeader view={view} connected={connected} walletAddress={walletAddress} networkName={networkName} onNavigate={navigate} onWallet={toggleWallet} />

    {view === "lobby" && <div className="app-shell app-page lobby-page">
      <section className="lobby-hero"><div><span className="app-kicker"><SparkIcon size={15} /> PRIVATE GROUP PURCHASING</span><h1>What are you planning <em>together?</em></h1><p>Create an unlisted purchase room, or open an invitation from your group. Nobody needs to front the full bill or announce their budget.</p><div className="lobby-actions"><button className="app-primary" onClick={() => navigate("create")}><PlusIcon /> Create a room</button><button className="app-secondary" onClick={() => document.getElementById("join-room")?.focus()}><KeyIcon /> Open invitation</button></div></div><div className="lobby-system"><small>VERIFIED DEVNET SYSTEM</small><strong className={programState}>{programState === "ready" ? "Program live" : programState === "checking" ? "Checking program" : "Network unavailable"}</strong><ul><li><CheckIcon size={14} /> Real Solana rooms</li><li><CheckIcon size={14} /> MagicBlock Private ER</li><li><CheckIcon size={14} /> Outcome-only settlement</li></ul></div></section>

      <section className="entry-grid"><article className="entry-card create-entry"><span className="entry-icon"><PlusIcon /></span><small>FOR ORGANIZERS</small><h2>Start a purchase room</h2><p>Choose the group size, dates, equal deposit, deadline and public terms. Compart creates an unlisted room and gives you invitations to share.</p><button onClick={() => navigate("create")}>Configure room <ArrowIcon size={16} /></button></article><article className="entry-card join-entry"><span className="entry-icon"><KeyIcon /></span><small>HAVE AN INVITATION?</small><h2>Open your private room</h2><p>Paste the complete participant invitation you received. We verify the underlying room before opening it.</p><label><span>Invitation link</span><div><input id="join-room" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} placeholder="Paste invitation link" /><button onClick={joinRoom} disabled={joinState === "working"}>{joinState === "working" ? "Checking…" : "Open"}</button></div></label>{joinNotice && <p className="entry-notice error">{joinNotice}</p>}</article></section>

      <DevnetWalletChecklist connected={connected} usdcBalance={devnetUsdcBalance} />
      <section className="directory-section private-directory"><div className="app-section-heading"><div><span className="app-kicker">YOUR PRIVATE DASHBOARD</span><h2>Active rooms for this wallet</h2></div>{connected && <button className="text-button" onClick={() => void loadPersonalRooms()}>Refresh your rooms ↻</button>}</div>{!connected && <div className="empty-panel"><WalletIcon size={24} /><h3>Your rooms stay out of public view</h3><p>Connect the wallet you used to create or join a room to see only its active rooms and receipts.</p><button className="app-secondary" onClick={toggleWallet}>Connect wallet</button></div>}{connected && historyState === "loading" && <div className="directory-loading">Looking up active rooms connected to this wallet…</div>}{connected && historyState === "error" && <div className="empty-panel"><HomeIcon size={24} /><h3>We couldn’t load your rooms</h3><p>Refresh to try again. Other people’s rooms are never shown here.</p></div>}{connected && historyState === "ready" && activePersonalRooms.length === 0 && <div className="empty-panel"><HomeIcon size={24} /><h3>No active rooms for this wallet</h3><p>Create a room or open an invitation someone shared with you. Completed rooms stay in Activity.</p></div>}{connected && <div className="room-grid">{activePersonalRooms.map((room) => { const meta = metadataFor(room); const roomRole = room.creator === walletAddress ? "Organizer" : "Participant"; return <article className="room-card" key={room.address}><div className={`room-art tone-${room.address.charCodeAt(0) % 3}`}><span>{meta.propertyType}</span><BuildingIcon size={54} /></div><div className="room-card-body"><div className="room-card-status"><span className={`status-dot ${room.status}`} />{roomRole} · {statusLabel(room.status)}</div><h3>{room.title}</h3><p>{meta.location}</p><div className="room-card-meta"><span><UsersIcon size={14} /> {room.totalRequested}/{room.targetQuantity}</span><span><CalendarIcon size={14} /> {formatDeadline(room.deadline)}</span></div><button onClick={() => openRoom(room.address)}>Open room <ArrowIcon size={15} /></button></div></article>; })}</div>}</section>
      <PrivacyProof />
    </div>}

    {view === "create" && <div className="app-shell app-page create-page"><button className="back-button" onClick={() => navigate("lobby")}>← Back to rooms</button><div className="create-layout"><section><span className="app-kicker">ORGANIZER WORKFLOW</span><h1>Create a room that can actually clear.</h1><p className="page-lead">The room rules are public. Personal maximums are not. Creating the room requires one small devnet transaction. Amounts are shown in devnet USDC. SOL only pays the network fee.</p><form className="create-form" onSubmit={submitCreateRoom}><div className="form-section"><div className="form-section-title"><span>01</span><div><strong>Purchase brief</strong><small>What is the group trying to secure?</small></div></div><div className="field-grid"><label className="wide"><span>Room title</span><input maxLength={32} required value={createForm.title} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} /></label><label><span>Location</span><input required value={createForm.location} onChange={(event) => setCreateForm({ ...createForm, location: event.target.value })} /></label><label><span>Property type</span><select value={createForm.propertyType} onChange={(event) => setCreateForm({ ...createForm, propertyType: event.target.value })}><option>Entire house</option><option>Apartment</option><option>Hostel rooms</option><option>Retreat venue</option><option>Group purchase</option></select></label><label><span>Check-in</span><input type="date" required value={createForm.startDate} onChange={(event) => setCreateForm({ ...createForm, startDate: event.target.value })} /></label><label><span>Check-out</span><input type="date" required value={createForm.endDate} onChange={(event) => setCreateForm({ ...createForm, endDate: event.target.value })} /></label><label className="wide"><span>Public description</span><textarea rows={3} value={createForm.description} onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })} /></label></div></div><div className="form-section"><div className="form-section-title"><span>02</span><div><strong>Clearing rules</strong><small>Rules everyone agrees to before committing.</small></div></div><div className="field-grid three"><label><span>People needed</span><input type="number" min="2" max="25" value={createForm.targetQuantity} onChange={(event) => setCreateForm({ ...createForm, targetQuantity: Number(event.target.value) })} /></label><label><span>Equal deposit (USDC)</span><input type="number" min="0.001" step="0.001" value={createForm.deposit} onChange={(event) => setCreateForm({ ...createForm, deposit: Number(event.target.value) })} /></label><label><span>Minimum goal (USDC)</span><input type="number" min="0.001" step="0.001" value={createForm.minGoal || ""} onChange={(event) => setCreateForm({ ...createForm, minGoal: Number(event.target.value) })} /></label><label><span>Maximum approved goal (USDC)</span><input type="number" min="0.001" step="0.001" value={createForm.maxGoal || ""} onChange={(event) => setCreateForm({ ...createForm, maxGoal: Number(event.target.value) })} /></label><label><span>Commitment window</span><select value={createForm.deadlineHours} onChange={(event) => setCreateForm({ ...createForm, deadlineHours: Number(event.target.value) })}><option value={5 / 60}>5 minutes (demo)</option><option value={10 / 60}>10 minutes (demo)</option><option value={15 / 60}>15 minutes</option><option value={30 / 60}>30 minutes</option><option value={1}>1 hour</option><option value={6}>6 hours</option><option value={12}>12 hours</option><option value={24}>24 hours</option><option value={72}>3 days</option><option value={168}>7 days</option></select></label><label className="wide"><span>Refund and inventory terms</span><textarea rows={3} value={createForm.terms} onChange={(event) => setCreateForm({ ...createForm, terms: event.target.value })} /></label></div></div><div className="create-submit"><button className="app-primary" disabled={createState === "working"} type="submit">{createState === "working" ? "Creating room…" : connected ? "Create room on devnet" : "Connect and create room"} <ArrowIcon /></button><p>This creates prototype room state only. It does not reserve real accommodation inventory.</p></div>{createNotice && <p className={`submit-notice ${createState}`}>{createNotice}</p>}</form></section><aside className="create-preview"><small>LIVE PREVIEW</small><div className="preview-art"><BuildingIcon size={58} /><span>{createForm.location}</span></div><div className="preview-body"><span className="status-chip">Collecting commitments</span><h3>{createForm.title || "Untitled room"}</h3><p>{createForm.propertyType} · {formatDate(createForm.startDate)} – {formatDate(createForm.endDate)}</p><div><span><small>GROUP NEEDED</small><strong>{createForm.targetQuantity} people</strong></span><span><small>PUBLIC DEPOSIT</small><strong>USDC {createForm.deposit}</strong></span></div></div>{createState === "working" && <FlowSteps activeIndex={createProgress} steps={[{ label: "Wallet connected" }, { label: "Room account created" }, { label: "Details saved" }, { label: "Invite ready" }]} />}</aside></div></div>}

    {view === "history" && <div className="app-shell app-page history-page"><div className="history-heading"><div><span className="app-kicker">YOUR ACTIVITY</span><h1>Your rooms, refunds and receipts.</h1><p>Connect the wallet you used in Compart. We show only rooms this wallet created, joined, or received a receipt from.</p></div>{!connected && <button className="app-primary" onClick={toggleWallet}><WalletIcon /> Connect your wallet</button>}</div>{!connected && <div className="empty-panel"><WalletIcon size={24} /><h3>Connect to view your activity</h3><p>Compart does not show a public history of other people’s rooms.</p></div>}{connected && <><section className="history-section"><div className="app-section-heading"><div><span className="app-kicker">YOUR ROOMS</span><h2>Created or joined by this wallet</h2></div></div>{historyState === "loading" && <div className="directory-loading">Looking up your commitments and rooms…</div>}<div className="history-list">{historyRooms.map((address) => { const room = personalRoomByAddress.get(address); return <button key={address} onClick={() => openRoom(address)}><span className="history-icon"><HomeIcon /></span><div><strong>{room?.title || "Compart room"}</strong><small>{room ? statusLabel(room.status) : shortAddress(address)}</small></div><span>{room ? `${room.totalRequested}/${room.targetQuantity}` : "Open"} →</span></button>; })}</div>{historyRooms.length === 0 && historyState !== "loading" && <div className="empty-panel"><HomeIcon size={24} /><h3>No room history yet</h3><p>Create a room or open an invitation to begin.</p></div>}</section><section className="history-section"><div className="app-section-heading"><div><span className="app-kicker">ONCHAIN RECEIPTS</span><h2>Completed allocations</h2></div></div><div className="receipt-grid">{receipts.map((receipt) => <article key={receipt.address}><span><ReceiptIcon /></span><small>PROTOTYPE PURCHASE RECEIPT</small><h3>{personalRoomByAddress.get(receipt.campaign)?.title || "Compart allocation"}</h3><dl><div><dt>Quantity</dt><dd>{receipt.quantity}</dd></div><div><dt>Uniform price</dt><dd>USDC {displayAmount(receipt.unitPrice)}</dd></div><div><dt>Organizer</dt><dd>{shortAddress(receipt.supplier)}</dd></div></dl><a href={explorerPath("address", receipt.address)} target="_blank" rel="noreferrer">View receipt account ↗</a></article>)}</div>{receipts.length === 0 && <div className="empty-panel compact"><ReceiptIcon size={24} /><h3>No receipts found</h3><p>Receipts become available after a successful room settles.</p></div>}</section></>}</div>}

    {view === "room" && <div className="app-shell app-page room-page">{roomState === "loading" && <div className="room-loading"><span /><p>Reading room state and your position from Solana…</p></div>}{roomState === "error" && <div className="room-error"><HomeIcon size={28} /><h2>We couldn’t open this room</h2><p>{roomError}</p><button className="app-secondary" onClick={() => navigate("lobby")}>Return to your rooms</button></div>}{campaign && selectedMeta && roomState === "ready" && <>
      <button className="back-button" onClick={() => navigate("lobby")}>← Your rooms</button>
      <section className="room-hero"><div className={`room-hero-art tone-${campaign.address.charCodeAt(0) % 3}`}><div className="room-hero-overlay"><span>{selectedMeta.propertyType}</span><strong>{selectedMeta.location}</strong></div><BuildingIcon size={105} /></div><div className="room-hero-copy"><div className="room-title-line"><div><span className={`room-status ${campaign.status}`}><i />{statusLabel(campaign.status)}</span><h1>{campaign.title}</h1><p>{selectedMeta.description}</p></div><button className="invite-button" onClick={() => void copyInvite("participant")}><CopyIcon size={15} />{inviteState === "copied" ? "Invite copied" : inviteState === "error" ? "Copy failed" : "Copy participant invite"}</button></div><div className="room-detail-row"><span><CalendarIcon /><small>DATES</small><strong>{selectedDates}</strong></span><span><UsersIcon /><small>GROUP</small><strong>{campaign.totalRequested} of {campaign.targetQuantity} committed</strong></span><span><WalletIcon /><small>EQUAL DEPOSIT</small><strong>USDC {displayAmount(campaign.depositCap)} per person</strong></span><span><KeyIcon /><small>DEADLINE</small><strong>{formatCountdown(campaign.deadline - now)}</strong></span></div></div></section>

      <section className="lifecycle-panel"><div><span className="app-kicker">ROOM LIFECYCLE</span><strong>Every state has one clear next action.</strong></div><ol>{["Room open", "Commitments", "Private matching", "Solana settlement", campaign.status === "cancelled" ? "Full refunds" : "Complete"].map((label, index) => { const current = campaign.status === "open" ? 1 : campaign.status === "offer-selected" ? 2 : campaign.status === "allocations-computed" ? 3 : 4; return <li className={index < current ? "complete" : index === current ? "active" : ""} key={label}><span>{index < current ? <CheckIcon size={13} /> : index + 1}</span><small>{label}</small></li>; })}</ol></section>

      {(campaign.status === "settled" || campaign.status === "cancelled") && <section className={`outcome-banner ${campaign.status}`}><span>{campaign.status === "settled" ? <CheckIcon size={28} /> : <ArrowIcon size={28} />}</span><div><small>FINAL ROOM OUTCOME</small><h2>{campaign.status === "settled" ? "The group reached its approved goal." : "The room did not clear. Nobody is stuck with the bill."}</h2><p>{campaign.status === "settled" ? `${campaign.allocatedQuantity} participants were allocated at USDC ${winningPrice} each.` : "All participant allocations are zero and the complete public deposits are refundable."}</p></div>{position && <div className="personal-outcome"><small>YOUR OUTCOME</small><strong>{position.allocation > 0 ? `${position.allocation} allocation` : "Not allocated"}</strong><span>Refund: USDC {displayAmount(position.refundOwed)}</span></div>}</section>}

      <section className="role-switcher"><div><span className="app-kicker">CHOOSE YOUR VIEW</span><h2>One room. Two clear roles.</h2></div><div role="tablist" aria-label="Room role"><button className={role === "participant" ? "active" : ""} disabled={role !== "participant"} onClick={() => setRole("participant")} role="tab" aria-selected={role === "participant"}><UsersIcon /><span><strong>Participant</strong><small>Set a private limit</small></span></button><button className={role === "organizer" ? "active" : ""} disabled={role !== "organizer"} onClick={() => setRole("organizer")} role="tab" aria-selected={role === "organizer"}><ShieldIcon /><span><strong>Organizer</strong><small>Close, match and settle</small></span></button></div></section>

      <div className="room-workspace"><section className="role-panel" role="tabpanel">
        {role === "participant" && <div className="participant-panel">
          <div className="role-panel-heading"><div><span className="role-icon"><LockIcon /></span><div><small>PARTICIPANT WORKFLOW</small><h2>{position ? "Your commitment is in this room" : "Join without revealing your budget"}</h2></div></div><span className="role-badge">1 public deposit · 1 private limit</span></div>
          {campaign.status !== "open" && !position && <div className="closed-message"><LockIcon /><div><strong>Commitments are closed</strong><p>This room has moved to matching or settlement. You can still inspect the public outcome.</p></div></div>}
          {(!position || campaign.status === "open") && <div className="commit-layout"><div className="budget-control"><label>Maximum you would pay per person</label><div className="budget-number"><span>USDC </span>{maxBudget}</div><label className="manual-pledge"><span>Or enter your private maximum directly</span><input aria-label="Private maximum contribution" type="number" min={budgetFloor} max={budgetCap} step="0.001" value={maxBudget || ""} onChange={(event) => setMaxBudget(Math.max(budgetFloor, Math.min(budgetCap, Number(event.target.value) || 0)))} /></label><input aria-label="Maximum private budget" className="app-budget-range" type="range" min={budgetFloor} max={budgetCap} step="0.001" value={maxBudget} style={{ "--budget-fill": `${budgetPercent}%` } as React.CSSProperties} onChange={(event) => setMaxBudget(Number(event.target.value))} /><div className="range-labels"><span>USDC {budgetFloor}</span><span>Room cap USDC {budgetCap}</span></div><div className="private-callout"><ShieldIcon /><div><strong>This number never enters the public room account</strong><p>The group sees progress—not your private maximum.</p></div></div><button className="app-primary wide" disabled={commitState === "working" || campaign.status !== "open"} onClick={submitCommitment}>{commitState === "working" ? "Working through the private flow…" : connected ? position ? "Update private limit" : "Deposit and commit privately" : "Connect and commit"} <ArrowIcon /></button></div><div className="transaction-flow"><span className="app-kicker">TRANSACTION PROGRESS</span><FlowSteps activeIndex={commitState === "done" ? COMMIT_STEPS.length : commitStepIndex} error={commitState === "error"} steps={COMMIT_STEPS} /></div></div>}
          {position && <div className="position-card"><div><span><CheckIcon /></span><div><small>PUBLIC POSITION</small><strong>{position.settled ? "Settlement outcome ready" : "Commitment confirmed"}</strong></div></div><dl><div><dt>Private maximum</dt><dd>Protected in TEE</dd></div><div><dt>Allocation</dt><dd>{position.allocationComputed ? position.allocation : "Pending"}</dd></div><div><dt>Refund available</dt><dd>{position.settled ? `USDC ${displayAmount(position.refundOwed)}` : "After settlement"}</dd></div></dl><div className="settlement-actions">{position.settled && !position.refundClaimed && <button disabled={settlementState === "working"} onClick={() => claim("refund")}>Claim USDC {displayAmount(position.refundOwed)} refund</button>}{position.settled && position.allocation > 0 && !position.receiptClaimed && <button disabled={settlementState === "working"} onClick={() => claim("receipt")}>Create prototype receipt</button>}</div></div>}
          {commitNotice && <p className={`submit-notice ${commitState === "error" || settlementState === "error" ? "error" : "done"}`}>{commitNotice}</p>}{commitSignature && <a className="transaction-link" href={explorerPath("tx", commitSignature)} target="_blank" rel="noreferrer">View latest transaction ↗</a>}
        </div>}

        {role === "host" && <div className="host-panel">
          <div className="role-panel-heading"><div><span className="role-icon host"><BuildingIcon /></span><div><small>DEAL OPTION WORKFLOW</small><h2>Publish a group deal option—not one guest price.</h2></div></div><span className="role-badge">Public, comparable offers</span></div>
          <div className="host-layout"><form onSubmit={(event) => { event.preventDefault(); void submitHostQuote(); }}><label><span>Host or property name</span><input required value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="Enter the public supplier name" /></label><div className="field-grid"><label><span>Available places</span><input type="number" min={campaign.targetQuantity} value={hostQuantity} onChange={(event) => setHostQuantity(Number(event.target.value))} /></label><label><span>Price per person (USDC)</span><input type="number" min="0.001" step="0.001" value={hostPrice || ""} placeholder="Enter a price" onChange={(event) => setHostPrice(Number(event.target.value))} /></label></div><label><span>Prototype inventory and cancellation terms</span><textarea required rows={3} value={hostTerms} placeholder="Describe the inventory and cancellation terms" onChange={(event) => setHostTerms(event.target.value)} /></label><div className="quote-summary"><span><small>GROUP VALUE</small><strong>{hostPrice > 0 ? `USDC ${hostPrice * campaign.targetQuantity}` : "—"}</strong></span><span><small>PUBLIC QUOTE</small><strong>{hostPrice > 0 ? `USDC ${hostPrice} × ${campaign.targetQuantity}` : "—"}</strong></span></div><button className="app-primary wide" type="submit" disabled={hostState === "working" || activeQuoteByWallet || campaign.status !== "open"}>{activeQuoteByWallet ? "This wallet already quoted" : hostState === "working" ? "Publishing quote…" : connected ? "Publish group quote" : "Connect and quote"} <ArrowIcon /></button>{hostNotice && <p className={`submit-notice ${hostState}`}>{hostNotice}</p>}{hostSignature && <a className="transaction-link" href={explorerPath("tx", hostSignature)} target="_blank" rel="noreferrer">View quote transaction ↗</a>}</form><div className="quote-board"><div><span className="app-kicker">PUBLIC QUOTE BOARD</span><strong>{offers.length} active {offers.length === 1 ? "offer" : "offers"}</strong></div>{offers.length === 0 && <div className="empty-panel compact"><BuildingIcon size={22} /><h3>No host quote yet</h3><p>The first complete-group deal option will appear here.</p></div>}{offers.map((offer, index) => <article className={index === 0 ? "best" : ""} key={offer.address}><span className="quote-rank">{index + 1}</span><div><strong>{shortAddress(offer.supplier)}</strong><small>{offer.quantity} places · Public Solana offer</small></div>{index === 0 && <span className="best-badge">Best price</span>}<div><strong>USDC {displayAmount(offer.unitPrice)}</strong><small>per person</small></div></article>)}</div></div>
        </div>}

        {role === "organizer" && <div className="organizer-panel"><div className="role-panel-heading"><div><span className="role-icon organizer"><ShieldIcon /></span><div><small>ORGANIZER CONTROL ROOM</small><h2>Close, match privately and settle publicly.</h2></div></div><span className={`role-badge ${isOrganizer ? "verified" : ""}`}>{isOrganizer ? "Organizer wallet verified" : "Read-only organizer view"}</span></div><div className="organizer-kpis"><article><small>COMMITMENTS</small><strong>{campaign.bidCount}</strong><span>{campaign.totalRequested}/{campaign.targetQuantity} quantity</span></article><article><small>GOAL RANGE</small><strong>USDC {displayAmount(campaign.minGoal)}</strong><span>up to USDC {displayAmount(campaign.maxGoal)}</span></article><article><small>DEADLINE</small><strong>{deadlineReached ? "Reached" : "Open"}</strong><span>{formatDeadline(campaign.deadline)}</span></article><article><small>ROOM STATUS</small><strong>{statusLabel(campaign.status)}</strong><span>{shortAddress(campaign.address)}</span></article></div><div className="organizer-layout"><div className="settlement-console"><span className="app-kicker">YOUR CONTRIBUTION</span>{!position && campaign.status === "open" && <div className="organizer-contribution"><label><span>Private maximum contribution (USDC)</span><input type="number" min={budgetFloor} max={budgetCap} step="0.001" value={maxBudget || ""} onChange={(event) => setMaxBudget(Math.max(budgetFloor, Math.min(budgetCap, Number(event.target.value) || 0)))} /></label><p>Phantom will ask you to escrow <strong>USDC {budgetCap}</strong>. Your private maximum is <strong>USDC {maxBudget || budgetFloor}</strong> and is not shown to other participants.</p><button className="app-secondary wide" onClick={submitCommitment}>Add USDC {maxBudget || budgetFloor} contribution</button></div>}<span className="app-kicker">SETTLEMENT RUN</span><h3>One guided, verifiable sequence</h3><FlowSteps activeIndex={organizerState === "done" ? ORGANIZER_STEPS.length : organizerStepIndex} error={organizerState === "error"} steps={ORGANIZER_STEPS.map((step) => ({ label: step.label }))} />{!isOrganizer && <div className="organizer-warning"><WalletIcon /><p>Connect <strong>{shortAddress(campaign.creator)}</strong>, the wallet that created this room, to enable settlement.</p></div>}{isOrganizer && !deadlineReached && <div className="organizer-warning"><CalendarIcon /><p>Matching unlocks when the commitment deadline is reached. Until then, send participant claim links.</p></div>}<label className="goal-select"><span>Final group goal (USDC)</span><input type="number" min={displayAmount(campaign.minGoal)} max={displayAmount(campaign.maxGoal)} step="0.001" value={finalGoal || ""} onChange={(event) => setFinalGoal(Number(event.target.value))} /><small>Approved range: USDC {displayAmount(campaign.minGoal)} – {displayAmount(campaign.maxGoal)}</small></label><button className="app-primary wide" onClick={settleRoom} disabled={!isOrganizer || !deadlineReached || organizerState === "working" || campaign.status === "settled" || campaign.status === "cancelled"}>{organizerState === "working" ? "Running verified settlement…" : campaign.status === "settled" || campaign.status === "cancelled" ? "Room already complete" : "Close, match and settle"} <ArrowIcon /></button>{organizerNotice && <p className={`submit-notice ${organizerState}`}>{organizerNotice}</p>}{organizerSignatures.length > 0 && <a className="transaction-link" href={explorerPath("tx", organizerSignatures.at(-1)!)} target="_blank" rel="noreferrer">View final settlement transaction ↗</a>}</div><div className="organizer-actions"><span className="app-kicker">PRIVATE PARTICIPANT INVITATIONS</span><div className="access-grant"><span>One-time claim links</span><p>Create one-time participant links. Each person connects their own wallet and claims it once.</p><label><span>Invite role</span><select value={accessRole} onChange={(event) => setAccessRole(event.target.value as "participant" | "host")}><option value="participant">Participant</option></select></label><button type="button" disabled={accessState === "working" || !isOrganizer} onClick={() => void copyInvite(accessRole)}>{accessState === "working" ? "Creating secure link…" : "Create and copy claim link"}</button></div>{accessNotice && <p className={`submit-notice ${accessState}`}>{accessNotice}</p>}<button onClick={() => void copyInvite("participant")}><CopyIcon /><span><strong>{inviteState === "copied" ? "Invite copied" : "Copy participant invite"}</strong><small>Share with the people joining the group</small></span></button><a href={explorerPath("address", campaign.address)} target="_blank" rel="noreferrer"><ShieldIcon /><span><strong>Inspect public settlement state</strong><small>Campaign, progress and final outcome on Explorer</small></span></a><a href="https://github.com/Techkeyy/compart/blob/main/DEMO_SCRIPT.md" target="_blank" rel="noreferrer"><ReceiptIcon /><span><strong>Open organizer runbook</strong><small>Verified demo and recovery sequence</small></span></a></div></div></div>}
      </section><aside className="room-sidebar"><section className="public-progress"><span className="app-kicker">PUBLIC ROOM SIGNAL</span><div><strong>{campaign.totalRequested} of {campaign.targetQuantity}</strong><span>{progressPercent}%</span></div><div className="app-progress"><i style={{ width: `${progressPercent}%` }} /></div><p>Everyone can see whether the group is becoming viable. Nobody can see a participant’s ceiling.</p><ul><li><span><UsersIcon size={14} /> Public commitments</span><strong>{campaign.bidCount}</strong></li><li><span><WalletIcon size={14} /> Approved goal</span><strong>USDC {displayAmount(campaign.minGoal)}–{displayAmount(campaign.maxGoal)}</strong></li><li><span><LockIcon size={14} /> Private values exposed</span><strong>0</strong></li></ul></section><section className="room-terms"><span className="app-kicker">DETAILS & TERMS</span><h3>{selectedMeta.propertyType}</h3><p>{selectedMeta.location}</p><div className="amenity-list">{selectedMeta.amenities.map((amenity) => <span key={amenity}>{amenity}</span>)}</div><dl><div><dt>Commitment deadline</dt><dd>{formatDeadline(campaign.deadline)}</dd></div><div><dt>Equal public deposit</dt><dd>USDC {displayAmount(campaign.depositCap)}</dd></div><div><dt>Clearing rule</dt><dd>Goal must be met inside the approved range</dd></div><div><dt>Refund rule</dt><dd>Full deposit if the group fails; excess after a successful clearing</dd></div></dl><div className="terms-note"><strong>Prototype inventory terms</strong><p>{selectedMeta.terms}</p></div></section><PrivacyProof campaignAddress={campaign.address} /></aside></div>
    </>}</div>}
  </main>;
}
