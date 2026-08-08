import "./polyfills";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CAMPAIGN_ADDRESS,
  NETWORK,
  PROGRAM_ID,
  type BrowserWallet,
  type CampaignSnapshot,
  type ParticipantPosition,
  type SupplierOfferSnapshot,
  claimPrototypeReceipt,
  claimRefund,
  connectBrowserWallet,
  createPrivateCommitment,
  disconnectBrowserWallet,
  inspectProgram,
  postSupplierOffer,
  readCampaignRoom,
  readParticipantPosition,
} from "./chain";
import "./styles.css";

type IconProps = { size?: number };

function LockIcon({ size = 18 }: IconProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    </svg>
  );
}

function UsersIcon({ size = 18 }: IconProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 19c.4-3.5 2.2-5.3 5.5-5.3s5.1 1.8 5.5 5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15.5 6.2a2.7 2.7 0 0 1 0 5.2M16.5 14c2.3.5 3.6 2.2 3.9 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ size = 18 }: IconProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon({ size = 18 }: IconProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h13M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const baseMembers = [
  { initials: "AM", name: "Amara", status: "Committed", tone: "peach" },
  { initials: "JL", name: "Jon", status: "Committed", tone: "mint" },
  { initials: "SO", name: "Sofia", status: "Committed", tone: "yellow" },
  { initials: "DK", name: "Dami", status: "Committed", tone: "blue" },
];

const previewQuotes = [
  {
    host: "Casa Sol",
    detail: "Entire house · 6 guests · 3 nights",
    price: 142,
    badge: "Best fit",
    viable: true,
  },
  {
    host: "The Makers Loft",
    detail: "Loft · 6 guests · 3 nights",
    price: 158,
    badge: "New quote",
    viable: false,
  },
];

function displayAmount(value: bigint): number {
  return Number(value) / 10_000;
}

function shortAddress(value: string): string {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function LiveApp() {
  const [maxBudget, setMaxBudget] = useState(165);
  const [wallet, setWallet] = useState<BrowserWallet | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [committed, setCommitted] = useState(false);
  const [panel, setPanel] = useState<"group" | "hosts">("group");
  const [programState, setProgramState] = useState<
    "checking" | "ready" | "pending" | "unreachable"
  >("checking");
  const [commitState, setCommitState] = useState<
    "idle" | "signing" | "private" | "done" | "preview" | "error"
  >("idle");
  const [notice, setNotice] = useState("");
  const [baseSignature, setBaseSignature] = useState("");
  const [campaign, setCampaign] = useState<CampaignSnapshot | null>(null);
  const [liveOffers, setLiveOffers] = useState<SupplierOfferSnapshot[]>([]);
  const [position, setPosition] = useState<ParticipantPosition | null>(null);
  const [hostPrice, setHostPrice] = useState(142);
  const [hostState, setHostState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [hostNotice, setHostNotice] = useState("");
  const [hostSignature, setHostSignature] = useState("");
  const [settlementState, setSettlementState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const connected = Boolean(walletAddress);
  const liveCampaign = programState === "ready" && Boolean(CAMPAIGN_ADDRESS);
  const networkName = NETWORK === "mainnet-beta" ? "Solana mainnet" : "Solana devnet";

  useEffect(() => {
    let active = true;
    inspectProgram()
      .then(({ deployed }) => {
        if (active) setProgramState(deployed ? "ready" : "pending");
      })
      .catch(() => {
        if (active) setProgramState("unreachable");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!CAMPAIGN_ADDRESS) return;
    let active = true;
    const refresh = async () => {
      try {
        const room = await readCampaignRoom();
        if (!active || !room) return;
        setCampaign(room.campaign);
        setLiveOffers(room.offers);
        if (wallet?.publicKey) {
          const participant = await readParticipantPosition(wallet.publicKey);
          setPosition(participant);
          if (participant) {
            setCommitted(true);
            setCommitState((current) => current === "idle" ? "done" : current);
          }
        }
      } catch {
        // Keep the last confirmed snapshot visible during a short RPC or ER handoff.
      }
    };
    void refresh();
    const poller = window.setInterval(refresh, 4_000);
    return () => {
      active = false;
      window.clearInterval(poller);
    };
  }, [wallet, walletAddress]);

  const targetQuantity = campaign?.targetQuantity || 6;
  const memberCount = campaign?.totalRequested ?? (committed ? 5 : 4);
  const publicDeposit = campaign ? displayAmount(campaign.depositCap) : 180;
  const bestQuote = campaign?.clearingPrice
    ? displayAmount(campaign.clearingPrice)
    : liveOffers[0]
      ? displayAmount(liveOffers[0].unitPrice)
      : 142;
  const remaining = campaign
    ? Math.max(0, campaign.deadline - now)
    : 1 * 60 * 60 + 42 * 60 + 18;
  const timerText = [
    Math.floor(remaining / 3600),
    Math.floor((remaining % 3600) / 60),
    remaining % 60,
  ].map((part) => String(part).padStart(2, "0")).join(":");
  const progressPercent = Math.min(100, Math.round((memberCount / targetQuantity) * 100));
  const members = useMemo(
    () => campaign
      ? Array.from({ length: Math.min(campaign.bidCount, 8) }, (_, index) => ({
          initials: `P${index + 1}`,
          name: `Participant ${index + 1}`,
          status: "Committed",
          tone: ["peach", "mint", "yellow", "blue", "violet"][index % 5],
        }))
      : committed
        ? [...baseMembers, { initials: "YO", name: "You", status: "Private", tone: "violet" }]
        : baseMembers,
    [campaign, committed],
  );
  const quotes = liveCampaign && campaign
    ? liveOffers.map((offer, index) => ({
        host: shortAddress(offer.supplier),
        detail: `Onchain quote · ${offer.quantity} guests`,
        price: displayAmount(offer.unitPrice),
        badge: index === 0 ? "Best price" : "Live quote",
        viable: index === 0,
      }))
    : previewQuotes;

  async function connectWallet() {
    setNotice("");
    try {
      const connectedWallet = await connectBrowserWallet();
      setWallet(connectedWallet);
      setWalletAddress(connectedWallet.publicKey?.toBase58() || "");
      return connectedWallet;
    } catch (error) {
      setCommitState("error");
      setNotice(error instanceof Error ? error.message : "Wallet connection failed.");
      return null;
    }
  }

  async function toggleWallet() {
    if (connected) {
      await disconnectBrowserWallet();
      setWallet(null);
      setWalletAddress("");
      setCommitted(false);
      setCommitState("idle");
      setNotice("");
      return;
    }
    await connectWallet();
  }

  async function commitBudget() {
    if (!liveCampaign) {
      setCommitState("preview");
      setCommitted(true);
      setNotice("Preview mode — no funds moved. The live campaign is added after deployment.");
      return;
    }

    let activeWallet = wallet;
    if (!activeWallet?.publicKey) {
      activeWallet = await connectWallet();
      if (!activeWallet) return;
    }

    setNotice("Approve the public deposit and private-room handoff in your wallet.");
    setCommitState("signing");
    try {
      const result = await createPrivateCommitment(
        activeWallet,
        BigInt(maxBudget * 10_000),
      );
      setCommitState("private");
      setBaseSignature(result.baseSignature);
      setCommitted(true);
      setCommitState("done");
      setNotice("Deposit confirmed and your maximum is protected inside the Private ER.");
      setPosition(await readParticipantPosition(activeWallet.publicKey!));
    } catch (error) {
      setCommitState("error");
      setNotice(error instanceof Error ? error.message : "The commitment did not complete.");
    }
  }

  async function submitHostQuote() {
    if (!liveCampaign) {
      setHostState("done");
      setHostNotice("Preview mode — the quote was not sent and no funds moved.");
      return;
    }

    let activeWallet = wallet;
    if (!activeWallet?.publicKey) {
      activeWallet = await connectWallet();
      if (!activeWallet) return;
    }
    setHostState("sending");
    setHostNotice("Approve your public group quote in the wallet.");
    try {
      const signature = await postSupplierOffer(
        activeWallet,
        targetQuantity,
        BigInt(hostPrice * 10_000),
      );
      setHostSignature(signature);
      setHostState("done");
      setHostNotice("Your host quote is live on Solana.");
      const room = await readCampaignRoom();
      if (room) {
        setCampaign(room.campaign);
        setLiveOffers(room.offers);
      }
    } catch (error) {
      setHostState("error");
      setHostNotice(error instanceof Error ? error.message : "The quote did not complete.");
    }
  }

  async function claim(kind: "refund" | "receipt") {
    if (!wallet?.publicKey) return;
    setSettlementState("sending");
    setNotice(kind === "refund" ? "Approve your refund claim." : "Approve your prototype receipt.");
    try {
      const signature = kind === "refund"
        ? await claimRefund(wallet)
        : await claimPrototypeReceipt(wallet);
      setBaseSignature(signature);
      setPosition(await readParticipantPosition(wallet.publicKey));
      setSettlementState("done");
      setNotice(kind === "refund" ? "Refund claimed on Solana." : "Prototype booking receipt created on Solana.");
    } catch (error) {
      setSettlementState("error");
      setNotice(error instanceof Error ? error.message : "The settlement action did not complete.");
    }
  }

  return (
    <main>
      <header className="topbar shell">
        <a className="brand" href="#home" aria-label="Compart home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>compart</span>
        </a>
        <div className="top-actions">
          <span className={`network ${programState}`} title={`Program ${PROGRAM_ID.toBase58()}`}>
            <span /> {networkName}
          </span>
          <button className="wallet-button" onClick={toggleWallet}>
            {connected ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : "Connect wallet"}
          </button>
        </div>
      </header>

      <section className="intro shell" id="top">
        <div>
          <span className="eyebrow">Private group purchasing</span>
          <h1>Buy together.<br /><em>Budget privately.</em></h1>
        </div>
        <p>
          Everyone commits what they can afford. Hosts compete for the whole group.
          The booking happens only when the numbers work—without one friend becoming the bank.
        </p>
      </section>

      <section className="room-layout shell">
        <article className="stay-card">
          <div className="stay-art" role="img" aria-label="Stylized sunny festival house">
            <div className="sun" />
            <div className="cloud cloud-one" />
            <div className="cloud cloud-two" />
            <div className="house">
              <div className="roof" />
              <div className="house-body">
                <span className="window" /><span className="door" /><span className="window right" />
              </div>
            </div>
            <div className="plant plant-one" /><div className="plant plant-two" />
            <span className="art-label">Blitz builder house · Lisbon</span>
          </div>

          <div className="stay-content">
            <div className="stay-heading">
              <div>
                <span className="live-pill"><i /> {campaign ? campaign.status.replace("-", " ") : "Live room"}</span>
                <h2>{campaign?.title || "Solana Festival House"}</h2>
                <p>Alfama, Lisbon · September 18–21</p>
              </div>
              <button className="share-button" aria-label="Copy invitation link">Invite ↗</button>
            </div>

            <div className="room-stats">
              <div><small>Group needed</small><strong>{targetQuantity} people</strong></div>
              <div><small>Public deposit</small><strong>€{publicDeposit} each</strong></div>
              <div><small>Room closes in</small><strong className="timer">{timerText}</strong></div>
            </div>

            <div className="progress-block">
              <div className="progress-copy">
                <div>
                  <span className="icon-disc"><UsersIcon /></span>
                  <span><strong>{memberCount} of {targetQuantity}</strong><small>people committed</small></span>
                </div>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-track"><i style={{ width: `${progressPercent}%` }} /></div>
              <div className="member-row">
                <div className="avatars">
                  {members.map((member) => (
                    <span className={`avatar ${member.tone}`} key={member.name} title={`${member.name}: ${member.status}`}>
                      {member.initials}
                    </span>
                  ))}
                  {memberCount < targetQuantity && (
                    <span className="avatar empty">+{targetQuantity - memberCount}</span>
                  )}
                </div>
                <span className="privacy-note"><LockIcon size={15} /> Individual budgets stay hidden</span>
              </div>
            </div>

            <div className="tabs" role="tablist" aria-label="Room activity">
              <button className={panel === "group" ? "active" : ""} onClick={() => setPanel("group")}>Group</button>
              <button className={panel === "hosts" ? "active" : ""} onClick={() => setPanel("hosts")}>Host quotes <span>{quotes.length}</span></button>
            </div>

            {panel === "group" ? (
              <div className="activity-list">
                {members.slice().reverse().map((member, index) => (
                  <div className="activity" key={member.name}>
                    <span className={`avatar small ${member.tone}`}>{member.initials}</span>
                    <div><strong>{member.name} committed</strong><small>Budget visible only to {member.name}</small></div>
                    <time>{index === 0 ? "now" : `${index * 4 + 2}m`}</time>
                  </div>
                ))}
              </div>
            ) : (
              <div className="quote-list">
                {quotes.length === 0 && (
                  <p className="empty-quotes">No host quotes yet. Be the first to price the whole group.</p>
                )}
                {quotes.map((quote) => (
                  <div className={`quote ${quote.viable ? "selected" : ""}`} key={quote.host}>
                    <span className="quote-home" aria-hidden="true">⌂</span>
                    <div><strong>{quote.host}</strong><small>{quote.detail}</small></div>
                    <span className="quote-badge">{quote.badge}</span>
                    <div className="quote-price"><strong>€{quote.price}</strong><small>per person</small></div>
                  </div>
                ))}
                <div className="host-form">
                  <div>
                    <small>Quote the full group</small>
                    <strong>Host offer</strong>
                  </div>
                  <label>
                    <span>€</span>
                    <input
                      aria-label="Host price per person"
                      type="number"
                      min="1"
                      step="1"
                      value={hostPrice}
                      onChange={(event) => setHostPrice(Number(event.target.value))}
                    />
                  </label>
                  <button onClick={submitHostQuote} disabled={hostState === "sending"}>
                    {hostState === "sending" ? "Posting…" : liveCampaign ? "Post quote" : "Preview quote"}
                  </button>
                </div>
                {hostNotice && <p className={`host-notice ${hostState}`}>{hostNotice}</p>}
                {hostSignature && (
                  <a
                    className="proof-link host-proof"
                    href={`https://explorer.solana.com/tx/${hostSignature}${NETWORK === "devnet" ? "?cluster=devnet" : ""}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View host quote proof ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </article>

        <aside className="commit-card">
          <div className="commit-heading">
            <span className="icon-disc coral"><LockIcon /></span>
            <div><small>Your private commitment</small><strong>{committed ? "Commitment saved" : "Set your limit"}</strong></div>
          </div>

          {committed ? (
            <div className="success-state">
              <span className="success-icon"><CheckIcon size={28} /></span>
              <h3>{commitState === "preview" ? "Preview commitment ready" : "You’re in the room"}</h3>
              <p>
                {commitState === "preview"
                  ? `Your €${maxBudget} choice is staying in this browser preview; no transaction or deposit was sent.`
                  : `Your €${maxBudget} maximum is private. The public room only sees that one more person committed.`}
              </p>
              <div className="private-receipt">
                <span>Private maximum</span><strong>€{maxBudget}</strong>
                <span>Public deposit</span><strong>€{publicDeposit}</strong>
                <span>Current best quote</span><strong>€{bestQuote}</strong>
                {position?.allocationComputed && <><span>Your allocation</span><strong>{position.allocation}</strong></>}
                {position?.settled && <><span>Refund available</span><strong>€{displayAmount(position.refundOwed)}</strong></>}
              </div>
              {baseSignature && (
                <a
                  className="proof-link"
                  href={`https://explorer.solana.com/tx/${baseSignature}${NETWORK === "devnet" ? "?cluster=devnet" : ""}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View public deposit proof ↗
                </a>
              )}
              {position?.settled && position.refundOwed > 0n && !position.refundClaimed && (
                <button
                  className="primary-button settlement-button"
                  disabled={settlementState === "sending"}
                  onClick={() => claim("refund")}
                >
                  {settlementState === "sending" ? "Claiming…" : "Claim my refund"} <ArrowIcon />
                </button>
              )}
              {campaign?.status === "settled" && position && position.allocation > 0 && !position.receiptClaimed && (
                <button
                  className="secondary-button settlement-button"
                  disabled={settlementState === "sending"}
                  onClick={() => claim("receipt")}
                >Create prototype booking receipt</button>
              )}
              {(!position || !position.allocationComputed) && (
                <button className="secondary-button" onClick={() => {
                  setCommitted(false);
                  setCommitState("idle");
                  setNotice("");
                }}>Update my limit</button>
              )}
              {notice && <p className={`form-notice ${settlementState}`}>{notice}</p>}
            </div>
          ) : (
            <>
              <p className="commit-intro">What is the most you would pay per person for this stay?</p>
              <div className="budget-value"><span>€</span>{maxBudget}</div>
              <input
                aria-label="Maximum private budget"
                className="budget-range"
                type="range"
                min="80"
                max="220"
                step="5"
                value={maxBudget}
                onChange={(event) => setMaxBudget(Number(event.target.value))}
              />
              <div className="range-labels"><span>€80</span><span>€220</span></div>

              <div className="privacy-callout">
                <LockIcon size={20} />
                <div><strong>Only you can see this number</strong><p>Friends and hosts see group progress, never your personal limit.</p></div>
              </div>

              <div className="deposit-row">
                <span><small>Public deposit</small><strong>€{publicDeposit}</strong></span>
                <span className="refundable">Fully refundable</span>
              </div>

              <button className="primary-button" onClick={commitBudget}>
                {liveCampaign && !connected
                  ? "Connect to continue"
                  : commitState === "signing"
                    ? "Securing deposit…"
                    : liveCampaign
                      ? "Commit privately"
                      : "Preview private commitment"} <ArrowIcon />
              </button>
              <p className="microcopy">No booking unless at least {targetQuantity} compatible commitments clear one host quote.</p>
              <div className={`chain-proof ${programState}`}>
                <span><i /> {networkName}</span>
                <strong>
                  {programState === "checking" && "Checking program…"}
                  {programState === "ready" && CAMPAIGN_ADDRESS && "Live campaign ready"}
                  {programState === "ready" && !CAMPAIGN_ADDRESS && "Program live · campaign pending"}
                  {programState === "pending" && "Deployment pending · preview mode"}
                  {programState === "unreachable" && "Network unavailable · preview mode"}
                </strong>
              </div>
              {notice && <p className={`form-notice ${commitState}`}>{notice}</p>}
            </>
          )}
        </aside>
      </section>

      <section className="principles shell">
        <article><span>01</span><h3>Private limits</h3><p>Your group knows you committed—not how high you can go.</p></article>
        <article><span>02</span><h3>Shared leverage</h3><p>Hosts compete for the combined group instead of pricing everyone alone.</p></article>
        <article><span>03</span><h3>All or nothing</h3><p>If the required group cannot clear a quote, nobody pays and everyone can refund.</p></article>
      </section>

      <footer className="footer shell">
        <div><span className="brand-mark small-mark" aria-hidden="true"><i /><i /><i /></span><strong>Built for Solana Blitz v7</strong></div>
        <p>Accommodation is the first room. Private group purchasing is the protocol.</p>
      </footer>
    </main>
  );
}

function LandingPage() {
  return (
    <main className="landing-page" id="home">
      <header className="landing-nav shell">
        <a className="brand" href="#home" aria-label="Compart home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>compart</span>
        </a>
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#docs">Docs</a>
          <a className="landing-nav-cta" href="#app">Enter live app <ArrowIcon size={15} /></a>
        </nav>
      </header>

      <section className="landing-hero shell">
        <div className="landing-hero-copy">
          <span className="eyebrow">Private group purchasing on Solana</span>
          <h1>Make the plan.<br /><em>Keep your limit private.</em></h1>
          <p>
            Compart helps groups commit to a shared purchase without one person
            fronting the money or everyone revealing what they can afford.
          </p>
          <div className="landing-hero-actions">
            <a className="landing-primary" href="#app">Enter the live app <ArrowIcon size={17} /></a>
            <a className="landing-secondary" href="#how-it-works">See how it works <span>↓</span></a>
          </div>
          <div className="landing-trust-row">
            <span>+ PRIVATE LIMITS</span>
            <span>+ FAIR CLEARING</span>
            <span>+ REFUNDS IF IT DOESN’T CLEAR</span>
          </div>
        </div>

        <div className="landing-hero-visual" aria-label="A Compart live room preview">
          <img
            className="landing-hero-image"
            src={`${import.meta.env.BASE_URL}compart-collaboration.jpg`}
            alt="A group making a shared decision around a table"
          />
          <div className="hero-corner-mark" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="hero-image-caption"><span><i /> LIVE ROOM</span><strong>Solana Festival House</strong></div>
        </div>

        <div className="hero-frame-pips" aria-hidden="true"><i /><i /><i /><i /></div>
      </section>

      <section className="landing-statement shell">
        <span className="eyebrow">The simple idea</span>
        <p>Everyone brings a different budget to the group chat. Compart lets the group move forward without making anyone explain theirs.</p>
      </section>

      <section className="landing-section shell" id="how-it-works">
        <div className="section-heading"><span className="eyebrow">How it works</span><h2>One shared room.<br /><em>Three private moves.</em></h2></div>
        <div className="how-grid">
          <article className="how-card"><span className="how-number">01</span><span className="how-icon"><UsersIcon size={20} /></span><h3>Start a room</h3><p>Set the group size, dates, and the public deposit everyone can afford.</p></article>
          <article className="how-card"><span className="how-number">02</span><span className="how-icon orange"><LockIcon size={20} /></span><h3>Commit privately</h3><p>Each person sets their own maximum. The group sees progress, never personal limits.</p></article>
          <article className="how-card"><span className="how-number">03</span><span className="how-icon blue"><CheckIcon size={20} /></span><h3>Clear together</h3><p>Hosts compete for the whole group. If the numbers work, everyone settles at one fair price.</p></article>
        </div>
      </section>

      <section className="landing-section docs-section shell" id="docs">
        <div className="section-heading docs-heading"><span className="eyebrow">Learn the system</span><h2>Small surface.<br /><em>Serious guarantees.</em></h2><p>Start with the room, then go deeper into the protocol, privacy model, and verified devnet proof.</p></div>
        <div className="docs-grid">
          <a className="doc-card featured" href="https://github.com/Techkeyy/compart/blob/main/README.md" target="_blank" rel="noreferrer"><span className="doc-label">START HERE</span><strong>Product overview</strong><p>What Compart is, who it is for, and why the first room is group accommodation.</p><span className="doc-arrow">↗</span></a>
          <a className="doc-card" href="https://github.com/Techkeyy/compart/blob/main/ARCHITECTURE.md" target="_blank" rel="noreferrer"><span className="doc-label">PROTOCOL</span><strong>Architecture</strong><p>How public commitments and private budgets work together.</p><span className="doc-arrow">↗</span></a>
          <a className="doc-card" href="https://github.com/Techkeyy/compart/blob/main/HOSTED_DEVNET_PROOF.md" target="_blank" rel="noreferrer"><span className="doc-label">VERIFIED</span><strong>Hosted proof</strong><p>See the two-wallet privacy denial, settlement, refunds, and receipts.</p><span className="doc-arrow">↗</span></a>
          <a className="doc-card" href="https://docs.magicblock.gg/pages/ephemeral-rollups-ers/how-to-guide/quickstart" target="_blank" rel="noreferrer"><span className="doc-label">MAGICBLOCK</span><strong>Ephemeral Rollups</strong><p>The official MagicBlock guide behind the live room experience.</p><span className="doc-arrow">↗</span></a>
        </div>
      </section>

      <section className="landing-cta shell">
        <div><span className="eyebrow">Ready when you are</span><h2>Bring the group.<br /><em>Keep the number yours.</em></h2></div>
        <a className="landing-primary light" href="#app">Enter the live app <ArrowIcon size={17} /></a>
      </section>

      <footer className="footer shell"><div><span className="brand-mark small-mark" aria-hidden="true"><i /><i /><i /></span><strong>Built for Solana Blitz v7</strong></div><p>Accommodation is the first room. Private group purchasing is the protocol.</p></footer>
    </main>
  );
}

function App() {
  const [route, setRoute] = useState(() => window.location.hash === "#app" ? "app" : "home");

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash === "#app" ? "app" : "home");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route === "app" ? <LiveApp /> : <LandingPage />;
}

createRoot(document.getElementById("root")!).render(<App />);
