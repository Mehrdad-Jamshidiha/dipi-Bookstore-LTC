<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>dipi Storefront — Self-Hosted, Decentralized Litecoin Digital Bookstore</title>
  <meta name="description" content="A 100% free, self-hosted digital bookstore with non-custodial Litecoin (LTC) payments and atomic single-use book activation code delivery." />
  <style>
    :root {
      --bg: #ffffff;
      --bg-subtle: #f6f8fa;
      --bg-card: #ffffff;
      --border: #d0d7de;
      --text: #1f2328;
      --text-muted: #656d76;
      --accent: #0969da;
      --accent-subtle: #ddf4ff;
      --warn-bg: #fff8c5;
      --warn-border: #d4a72c;
      --warn-text: #4d2d00;
      --code-bg: #f6f8fa;
      --badge-bg: #eff1f3;
      --shadow: 0 1px 3px rgba(31, 35, 40, 0.06);
      --radius: 8px;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117;
        --bg-subtle: #161b22;
        --bg-card: #161b22;
        --border: #30363d;
        --text: #e6edf3;
        --text-muted: #8b949e;
        --accent: #58a6ff;
        --accent-subtle: rgba(56, 139, 253, 0.15);
        --warn-bg: rgba(187, 128, 9, 0.15);
        --warn-border: #9e6a03;
        --warn-text: #e3b341;
        --code-bg: #161b22;
        --badge-bg: #21262d;
        --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.65;
      color: var(--text);
      background-color: var(--bg);
    }

    .container {
      max-width: 920px;
      margin: 0 auto;
      padding: 40px 24px 72px;
    }

    /* Header / Hero */
    header.hero {
      padding-bottom: 28px;
      margin-bottom: 32px;
      border-bottom: 1px solid var(--border);
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .badge {
      display: inline-block;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 999px;
      background: var(--badge-bg);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }

    .badge.accent {
      background: var(--accent-subtle);
      border-color: transparent;
      color: var(--accent);
    }

    h1 {
      margin: 0 0 16px;
      font-size: 2rem;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    h2 {
      margin: 40px 0 16px;
      padding-bottom: 8px;
      font-size: 1.45rem;
      line-height: 1.3;
      border-bottom: 1px solid var(--border);
    }

    h3 {
      margin: 24px 0 10px;
      font-size: 1.1rem;
      line-height: 1.35;
    }

    p {
      margin: 0 0 16px;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    /* Quick Nav */
    nav.toc {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      padding: 14px 18px;
      margin-bottom: 32px;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 14px;
    }

    nav.toc span {
      font-weight: 600;
      color: var(--text-muted);
    }

    /* Cards & Grids */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin: 18px 0 24px;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
      box-shadow: var(--shadow);
    }

    .card h3 {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 1.05rem;
    }

    .card p {
      margin-bottom: 0;
      font-size: 0.95rem;
      color: var(--text-muted);
    }

    .capability-block {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 22px;
      margin-bottom: 16px;
      box-shadow: var(--shadow);
    }

    .capability-block h3 {
      margin-top: 0;
      margin-bottom: 12px;
    }

    ul {
      margin: 0 0 16px;
      padding-left: 22px;
    }

    .capability-block ul {
      margin-bottom: 0;
    }

    li {
      margin-bottom: 8px;
    }

    li:last-child {
      margin-bottom: 0;
    }

    /* Callouts */
    .callout {
      padding: 14px 18px;
      margin: 18px 0;
      border-radius: var(--radius);
      border-left: 4px solid var(--accent);
      background: var(--bg-subtle);
      border-top: 1px solid var(--border);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      font-size: 0.95rem;
    }

    .callout.warning {
      border-left-color: var(--warn-border);
      background: var(--warn-bg);
      color: var(--text);
    }

    .callout.warning strong {
      color: var(--warn-text);
    }

    /* Code */
    code {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 0.875em;
      padding: 0.2em 0.45em;
      border-radius: 6px;
      background: var(--code-bg);
      border: 1px solid var(--border);
    }

    .code-wrapper {
      position: relative;
      margin: 14px 0 18px;
    }

    pre {
      margin: 0;
      padding: 16px 18px;
      overflow-x: auto;
      border-radius: var(--radius);
      background: var(--code-bg);
      border: 1px solid var(--border);
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 0.9rem;
      line-height: 1.55;
    }

    pre code {
      padding: 0;
      border: none;
      background: transparent;
      font-size: inherit;
    }

    .copy-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      cursor: pointer;
    }

    .copy-btn:hover {
      color: var(--text);
      border-color: var(--accent);
    }

    footer {
      margin-top: 56px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      font-size: 0.875rem;
      color: var(--text-muted);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
    }
  </style>
</head>
<body>
  <main class="container">
    <header class="hero">
      <div class="badges">
        <span class="badge accent">100% Free &amp; Self-Hosted</span>
        <span class="badge">Litecoin (LTC)</span>
        <span class="badge">Zero-Knowledge</span>
        <span class="badge">Node.js 20+</span>
        <span class="badge">LTR &amp; RTL</span>
      </div>
      <h1>dipi Storefront — Self-Hosted, Decentralized Litecoin Digital Bookstore</h1>
      <p>
        <strong>dipi Storefront</strong> is a 100% free, self-hosted digital bookstore built for independent authors,
        translators, and publishers who want full ownership over how their digital books are sold and delivered—without
        middlemen, platform fees, or centralized gatekeepers.
      </p>
      <p>
        Designed from the ground up for zero-knowledge security, decentralization, and federation, dipi Storefront lets
        any publisher spin up an independent storefront on their own server, accept direct peer-to-peer Litecoin (LTC)
        payments, and automatically deliver single-use book activation codes the moment payment confirms on-chain.
      </p>
    </header>

    <nav class="toc" aria-label="Table of contents">
      <span>Jump to:</span>
      <a href="#ecosystem">dipi Ecosystem</a>
      <a href="#capabilities">Key Capabilities</a>
      <a href="#lightweight">Architecture</a>
      <a href="#requirements">Requirements</a>
      <a href="#run-locally">Run Locally</a>
      <a href="#run-production">Run in Production</a>
    </nav>

    <section id="ecosystem">
      <h2>Part of the dipi Ecosystem</h2>
      <p>
        dipi Storefront is the commerce and distribution layer of the broader dipi ecosystem—a 100% free, decentralized
        publishing stack built to protect intellectual property without sacrificing privacy or publisher independence:
      </p>
      <div class="grid">
        <article class="card">
          <h3>Publisher Suite (Book Encrypter)</h3>
          <p>
            A free encryption tool that lets publishers package their books into heavily encrypted formats tied to
            single-use access keys. Its source code is available for review by trusted parties and independent security
            auditors.
          </p>
        </article>
        <article class="card">
          <h3>dipi Mobile App (Secure Reader)</h3>
          <p>
            Encrypted books created with Publisher Suite run exclusively inside the dipi mobile application, which
            implements heavy-duty security and strict DRM enforcement. To protect its anti-tampering and DRM
            mechanisms, the mobile app is kept closed-source.
          </p>
        </article>
        <article class="card">
          <h3>dipi Storefront (This Product)</h3>
          <p>
            A standalone, self-hosted bookstore that any publisher can deploy independently to sell access codes for
            their encrypted dipi books directly to readers—forming a federated network of sovereign bookstores rather
            than one central marketplace.
          </p>
        </article>
      </div>
    </section>

    <section id="capabilities">
      <h2>Key Capabilities</h2>

      <div class="capability-block">
        <h3>Non-Custodial Litecoin Settlement</h3>
        <ul>
          <li>
            <strong>Direct-to-Wallet Payments:</strong> Funds settle straight to your own Litecoin Mainnet (or Testnet)
            address—no payment gateway holds your revenue or takes a cut.
          </li>
          <li>
            <strong>Flexible Pricing &amp; Quoting:</strong> Price books in USD with automatic live LTC/USD conversion
            or a manual fixed rate, complete with configurable volatility spread buffers, rate caching, and order
            reservation timers.
          </li>
          <li>
            <strong>Automated Verification:</strong> Monitors on-chain confirmations automatically with configurable
            confirmation thresholds, plus optional HMAC-signed inbound webhook support for Litecoin Core
            (<code>walletnotify</code>) or BTCPay Server.
          </li>
        </ul>
      </div>

      <div class="capability-block">
        <h3>Atomic Single-Use Code Delivery</h3>
        <ul>
          <li>
            <strong>Zero Double-Selling:</strong> Each book connects to a pool of single-use redemption codes stored
            locally in <code>codes.json</code>. When payment confirms, the server acquires an atomic lock, assigns one
            unused code, binds it to the Order ID and Litecoin TXID, and delivers it immediately to the buyer.
          </li>
          <li>
            <strong>Automatic Stock Management:</strong> Titles automatically display as out of stock once all
            single-use codes are claimed, and restocking takes seconds via bulk paste or JSON export/backup.
          </li>
          <li>
            <strong>Privacy-First Buyer Experience:</strong> Readers purchase without creating accounts, sharing
            personal data, or leaving a trail across third-party processors. Buyers can retrieve confirmed orders and
            receipts anytime through Order Lookup.
          </li>
        </ul>
      </div>

      <div class="capability-block">
        <h3>Hardened, Invisible Admin Vault</h3>
        <ul>
          <li>
            <strong>Hidden From Shoppers:</strong> The public storefront contains no links or references to the admin
            interface. Admin Vault is reachable only through a customizable Secret Admin URL Path (starting at
            <code>/admin</code> on fresh install and renameable or randomizable to any private path). Visiting any
            invalid path silently displays the normal storefront with zero leakage.
          </li>
          <li>
            <strong>Strong Local Security:</strong> Credentials are hashed with salted <code>scrypt</code> and stored
            with restricted permissions (<code>0600</code>), paired with short-lived in-memory Bearer sessions, rate
            limiting, and optional server environment variable overrides.
          </li>
          <li>
            <strong>7-Step First-Time Guided Setup:</strong> A built-in onboarding walkthrough explains every parameter
            in detail—from account security and wallet setup to notifications and storefront appearance—with one-click
            skipping on every optional step.
          </li>
        </ul>
      </div>

      <div class="capability-block">
        <h3>Sovereign Branding &amp; Store Operations</h3>
        <ul>
          <li>
            <strong>Bilingual LTR &amp; RTL Storefront:</strong> Native support for English (LTR) and Persian (RTL),
            with full typography and directional layout adaptation.
          </li>
          <li>
            <strong>Customizable Presentation:</strong> Tailor your store name, logo, page title, theme presets, desktop
            and mobile A4 cover grids, book detail modals, search, subject categories, sorting, support links, and
            maintenance/pause mode.
          </li>
          <li>
            <strong>Promotions, Alerts &amp; Analytics:</strong> Create percentage or fixed-discount promo codes with
            usage limits and expiry dates, track daily sales charts and order history, and receive instant sale
            notifications via Telegram, Discord, or signed outbound webhooks.
          </li>
        </ul>
      </div>
    </section>

    <section id="lightweight">
      <h2>Lightweight, Portable &amp; 100% Free</h2>
      <p>
        dipi Storefront requires no external database, cloud lock-in, or paid subscriptions—just Node.js. Every catalog
        entry, redemption code, order, and setting lives cleanly in local JSON storage under your full control, ready
        to host on a personal VPS, home server, or federated publishing node.
      </p>
      <div class="callout warning">
        <strong>Important:</strong> dipi is a full-stack Node.js + React application with an Express backend
        (<code>server.ts</code>) and local JSON storage (<code>data/</code>). Because it runs a backend server and
        TypeScript/React frontend, <strong>do not open <code>index.html</code> directly by double-clicking it</strong>—start
        the server using Node.js instead.
      </div>
    </section>

    <section id="requirements">
      <h2>Requirements</h2>
      <ul>
        <li>
          <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">Node.js</a>
          <strong>20 or newer</strong> (22+ recommended)
        </li>
      </ul>
    </section>

    <section id="run-locally">
      <h2>Run Locally</h2>
      <p>Open a terminal inside the project folder and run:</p>
      <div class="code-wrapper">
        <button class="copy-btn" type="button" onclick="copyCode(this)">Copy</button>
