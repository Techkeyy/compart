import { ArrowIcon, CheckIcon, LockIcon, UsersIcon } from "./icons";

export default function LandingPage() {
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

        <div className="landing-hero-visual" aria-label="A Compart collaboration scene">
          <img className="landing-hero-image" src={`${import.meta.env.BASE_URL}compart-collaboration.jpg`} alt="A group making a shared decision around a table" />
        </div>
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

      <footer className="footer shell"><div><span className="brand-mark small-mark" aria-hidden="true"><i /><i /><i /></span><strong>Built for Solana Blitz v7</strong></div><p>Accommodation is the first room. Private group purchasing is the protocol.</p></footer>
    </main>
  );
}
