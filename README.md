# dipi — Digital Bookstore Settled in Litecoin

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
