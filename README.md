<div align="center">

<h1>dipi Storefront</h1>
<h3>Self-Hosted, Decentralized Litecoin Digital Bookstore</h3>

<p>
  <img src="https://img.shields.io/badge/Cost-100%25%20Free-2ea44f?style=flat-square" alt="100% Free" />
  <img src="https://img.shields.io/badge/Payments-Litecoin%20(LTC)-345d9d?style=flat-square" alt="Litecoin (LTC)" />
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/Storage-Local%20JSON-f59e0b?style=flat-square" alt="Local JSON Storage" />
  <img src="https://img.shields.io/badge/Languages-LTR%20%26%20RTL-6f42c1?style=flat-square" alt="LTR and RTL" />
</p>

<p>
  <a href="#part-of-the-dipi-ecosystem">Ecosystem</a> •
  <a href="#key-capabilities">Key Capabilities</a> •
  <a href="#requirements">Requirements</a> •
  <a href="#run-locally">Run Locally</a> •
  <a href="#run-in-production">Run in Production</a>
</p>

</div>

<hr />

<p>
  <strong>dipi Storefront</strong> is a 100% free, self-hosted digital bookstore built for independent authors, translators, and publishers who want full ownership over how their digital books are sold and delivered—without middlemen, platform fees, or centralized gatekeepers.
</p>

<p>
  Designed from the ground up for zero-knowledge security, decentralization, and federation, dipi Storefront lets any publisher spin up an independent storefront on their own server, accept direct peer-to-peer Litecoin (LTC) payments, and automatically deliver single-use book activation codes the moment payment confirms on-chain.
</p>

<h2 id="part-of-the-dipi-ecosystem">Part of the dipi Ecosystem</h2>

<p>
  dipi Storefront is the commerce and distribution layer of the broader dipi ecosystem—a 100% free, decentralized publishing stack built to protect intellectual property without sacrificing privacy or publisher independence:
</p>

<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Role</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Publisher Suite</strong></td>
      <td>Book Encrypter</td>
      <td>A free encryption tool that lets publishers package their books into heavily encrypted formats tied to single-use access keys. Its source code is available for review by trusted parties and independent security auditors.</td>
    </tr>
    <tr>
      <td><strong>dipi Mobile App</strong></td>
      <td>Secure Reader</td>
      <td>Encrypted books created with Publisher Suite run exclusively inside the dipi mobile application, which implements heavy-duty security and strict DRM enforcement. To protect its anti-tampering and DRM mechanisms, the mobile app is kept closed-source.</td>
    </tr>
    <tr>
      <td><strong>dipi Storefront</strong></td>
      <td><em>This Product</em></td>
      <td>A standalone, self-hosted bookstore that any publisher can deploy independently to sell access codes for their encrypted dipi books directly to readers—forming a federated network of sovereign bookstores rather than one central marketplace.</td>
    </tr>
  </tbody>
</table>

<h2 id="key-capabilities">Key Capabilities</h2>

<h3>Non-Custodial Litecoin Settlement</h3>
<ul>
  <li><strong>Direct-to-Wallet Payments:</strong> Funds settle straight to your own Litecoin Mainnet (or Testnet) address—no payment gateway holds your revenue or takes a cut.</li>
  <li><strong>Flexible Pricing &amp; Quoting:</strong> Price books in USD with automatic live LTC/USD conversion or a manual fixed rate, complete with configurable volatility spread buffers, rate caching, and order reservation timers.</li>
  <li><strong>Automated Verification:</strong> Monitors on-chain confirmations automatically with configurable confirmation thresholds, plus optional HMAC-signed inbound webhook support for Litecoin Core (<code>walletnotify</code>) or BTCPay Server.</li>
</ul>

<h3>Atomic Single-Use Code Delivery</h3>
<ul>
  <li><strong>Zero Double-Selling:</strong> Each book connects to a pool of single-use redemption codes stored locally in <code>codes.json</code>. When payment confirms, the server acquires an atomic lock, assigns one unused code, binds it to the Order ID and Litecoin TXID, and delivers it immediately to the buyer.</li>
  <li><strong>Automatic Stock Management:</strong> Titles automatically display as out of stock once all single-use codes are claimed, and restocking takes seconds via bulk paste or JSON export/backup.</li>
  <li><strong>Privacy-First Buyer Experience:</strong> Readers purchase without creating accounts, sharing personal data, or leaving a trail across third-party processors. Buyers
