# dipi — Digital Bookstore Settled in Litecoin

dipi Storefront — Self-Hosted, Decentralized Litecoin Digital Bookstore
dipi Storefront is a 100% free, self-hosted digital bookstore built for independent authors, translators, and publishers who want full ownership over how their digital books are sold and delivered—without middlemen, platform fees, or centralized gatekeepers.
Designed from the ground up for zero-knowledge security, decentralization, and federation, dipi Storefront lets any publisher spin up an independent storefront on their own server, accept direct peer-to-peer Litecoin (LTC) payments, and automatically deliver single-use book activation codes the moment payment confirms on-chain.
Part of the dipi Ecosystem
dipi Storefront is the commerce and distribution layer of the broader dipi ecosystem—a 100% free, decentralized publishing stack built to protect intellectual property without sacrificing privacy or publisher independence:
Publisher Suite (Book Encrypter): A free encryption tool that lets publishers package their books into heavily encrypted formats tied to single-use access keys. Its source code is available for review by trusted parties and independent security auditors.
dipi Mobile App (Secure Reader): Encrypted books created with Publisher Suite run exclusively inside the dipi mobile application, which implements heavy-duty security and strict DRM enforcement. To protect its anti-tampering and DRM mechanisms, the mobile app is kept closed-source.
dipi Storefront (This Product): A standalone, self-hosted bookstore that any publisher can deploy independently to sell access codes for their encrypted dipi books directly to readers—forming a federated network of sovereign bookstores rather than one central marketplace.
Key Capabilities
Non-Custodial Litecoin Settlement
Direct-to-Wallet Payments: Funds settle straight to your own Litecoin Mainnet (or Testnet) address—no payment gateway holds your revenue or takes a cut.
Flexible Pricing & Quoting: Price books in USD with automatic live LTC/USD conversion or a manual fixed rate, complete with configurable volatility spread buffers, rate caching, and order reservation timers.
Automated Verification: Monitors on-chain confirmations automatically with configurable confirmation thresholds, plus optional HMAC-signed inbound webhook support for Litecoin Core (walletnotify) or BTCPay Server.
Atomic Single-Use Code Delivery
Zero Double-Selling: Each book connects to a pool of single-use redemption codes stored locally in codes.json. When payment confirms, the server acquires an atomic lock, assigns one unused code, binds it to the Order ID and Litecoin TXID, and delivers it immediately to the buyer.
Automatic Stock Management: Titles automatically display as out of stock once all single-use codes are claimed, and restocking takes seconds via bulk paste or JSON export/backup.
Privacy-First Buyer Experience: Readers purchase without creating accounts, sharing personal data, or leaving a trail across third-party processors. Buyers can retrieve confirmed orders and receipts anytime through Order Lookup.
Hardened, Invisible Admin Vault
Hidden From Shoppers: The public storefront contains no links or references to the admin interface. Admin Vault is reachable only through a customizable Secret Admin URL Path (starting at /admin on fresh install and renameable or randomizable to any private path). Visiting any invalid path silently displays the normal storefront with zero leakage.
Strong Local Security: Credentials are hashed with salted scrypt and stored with restricted permissions (0600), paired with short-lived in-memory Bearer sessions, rate limiting, and optional server environment variable overrides.
7-Step First-Time Guided Setup: A built-in onboarding walkthrough explains every parameter in detail—from account security and wallet setup to notifications and storefront appearance—with one-click skipping on every optional step.
Sovereign Branding & Store Operations
Bilingual LTR & RTL Storefront: Native support for English (LTR) and Persian (RTL), with full typography and directional layout adaptation.
Customizable Presentation: Tailor your store name, logo, page title, theme presets, desktop and mobile A4 cover grids, book detail modals, search, subject categories, sorting, support links, and maintenance/pause mode.
Promotions, Alerts & Analytics: Create percentage or fixed-discount promo codes with usage limits and expiry dates, track daily sales charts and order history, and receive instant sale notifications via Telegram, Discord, or signed outbound webhooks.
Lightweight, Portable & 100% Free
dipi Storefront requires no external database, cloud lock-in, or paid subscriptions—just Node.js. Every catalog entry, redemption code, order, and setting lives cleanly in local JSON storage under your full control, ready to host on a personal VPS, home server, or federated publishing node.

dipi is a full-stack Node.js + React application with an Express backend (`server.ts`) and local JSON storage (`data/`). Because it runs a backend server and TypeScript/React frontend, **do not open `index.html` directly by double-clicking it**—start the server using Node.js instead.

## Requirements

- [Node.js](https://nodejs.org/) **20 or newer** (22+ recommended)

## Run Locally

Open a terminal inside the project folder and run:

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** to view the public storefront.

Admin Vault is hidden from shoppers on the main page. To launch the **First-Time Guided Setup** (create your admin username and password, set an optional custom secret admin URL, add your Litecoin wallet, configure notifications/theme, and add your books & codes), visit:

- **http://localhost:3000/admin**

You can rename `/admin` to any secret path (for example `/vault-a3f89b12`) during Step 1 of setup or later under **Settings → Admin Vault Access**. Visiting any wrong path silently shows the normal storefront.

## Run in Production

```bash
npm install
npm run build
NODE_ENV=production npm start
```

> **Note:** On Node.js versions earlier than 22.6, run production with `NODE_ENV=production npx tsx server.ts`.

Set `PORT` (default `3000`) if your hosting provider requires a specific port. All store data is saved inside the `data/` directory (`codes.json`, `orders.json`, `promos.json`, `settings.json`, `admin.json`).
