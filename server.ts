import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import {
  bootstrapAdminCredentials,
  createAdminSession,
  extractBearerToken,
  getAdminAuthStatus,
  getStoredAdminUsername,
  requireAdmin,
  revokeAdminSession,
  setAdminCredentials,
  verifyAdminLogin,
} from './server/auth.ts';
import {
  buildLitecoinPaymentUri,
  generatePaymentQrSvg,
  getEffectiveLtcQuoteRate,
  isValidLitecoinAddress,
  isValidTxid,
  pollAddressForMatchingOrderPayment,
  verifyLitecoinTransactionOnChain,
} from './server/litecoin.ts';
import {
  dispatchSaleNotifications,
  isValidDiscordWebhookUrl,
  isValidOutboundWebhookUrlSyntax,
  isValidTelegramBotToken,
  isValidTelegramChatId,
  maskSecretTail,
  type NotificationChannel,
  sendTestSaleNotification,
} from './server/notifications.ts';
import {
  addCodesBulk,
  applyPromoToOrder,
  cancelOrderRecord,
  confirmOrderAndMarkCodeUsed,
  createBookProductRecord,
  createOrderRecord,
  createPromoCodeRecord,
  DEFAULT_ADMIN_PATH,
  deleteBookProductRecord,
  deletePromoCodeRecord,
  deleteUnusedCode,
  expireStaleOrdersInMemory,
  FALLBACK_BOOK_COVER_DATA_URL,
  getPublicCatalog,
  initializeStore,
  isSafeSupportLinkUrl,
  isTxidAlreadyClaimed,
  isValidAdminPath,
  type MerchantSettings,
  normalizeAdminPath,
  OpenOrderExistsError,
  type OrderRecord,
  readCodesFile,
  readOrdersFile,
  readPromosFile,
  readSettings,
  removePromoFromOrder,
  sanitizeStorefrontPreferences,
  togglePromoCodeActive,
  updateBookProductRecord,
  verifyOrderToken,
  withStoreLock,
  writeOrdersFile,
  writeSettings,
} from './server/store.ts';

dotenv.config();
initializeStore();

function buildSaleNotificationsSummary(settings: MerchantSettings) {
  const n = settings.saleNotifications;
  return {
    telegramEnabled: Boolean(n.telegramEnabled),
    telegramBotTokenConfigured: Boolean(n.telegramBotToken),
    telegramBotTokenHint: maskSecretTail(n.telegramBotToken),
    telegramChatId: n.telegramChatId,
    discordEnabled: Boolean(n.discordEnabled),
    discordWebhookConfigured: Boolean(n.discordWebhookUrl),
    discordWebhookHint: maskSecretTail(n.discordWebhookUrl),
    webhookEnabled: Boolean(n.webhookEnabled),
    webhookUrl: n.webhookUrl,
    webhookSigningSecretConfigured: Boolean(n.webhookSigningSecret),
    webhookSigningSecretHint: maskSecretTail(n.webhookSigningSecret),
    includeSandboxSales: n.includeSandboxSales,
  };
}

async function confirmAndNotify(params: {
  orderId: string;
  txid: string;
  confirmations: number;
  verificationMethod: NonNullable<OrderRecord['verificationMethod']>;
}) {
  const result = await confirmOrderAndMarkCodeUsed(params);
  if (result.newlyConfirmed) {
    const settings = readSettings();
    void dispatchSaleNotifications(settings, {
      order: result.order,
      storeName: settings.preferences.storeName || 'dipi',
      remainingBookStock: result.remainingBookStock,
    }).catch(() => {
      // Never allow outbound notification failures to affect order confirmation
    });
  }
  return result;
}

const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const IS_PROD = process.env.NODE_ENV === 'production';
const COVERS_DIR = path.resolve(process.cwd(), 'data', 'covers');
const BACKGROUNDS_DIR = path.resolve(process.cwd(), 'data', 'backgrounds');
const LOGOS_DIR = path.resolve(process.cwd(), 'data', 'logos');
const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB
const COVER_FILENAME_REGEX = /^cover_[a-f0-9]{16}\.(jpg|png|webp)$/;
const BG_FILENAME_REGEX = /^bg_[a-f0-9]{16}\.(jpg|png|webp)$/;
const LOGO_FILENAME_REGEX = /^logo_[a-f0-9]{16}\.(jpg|png|webp)$/;

function detectValidatedImageType(buf: Buffer): { ext: 'jpg' | 'png' | 'webp'; mime: string } | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

async function buildOrderResponse(order: OrderRecord) {
  const paymentUri = buildLitecoinPaymentUri({
    address: order.receivingAddress,
    amountLtc: order.expectedLtc,
    orderId: order.id,
  });
  const qrDataUrl = await generatePaymentQrSvg(paymentUri);
  const codesFile = readCodesFile();
  const book = codesFile.products.find((p) => p.id === order.productId);
  const settings = readSettings();

  return {
    id: order.id,
    productId: order.productId,
    bookTitle: order.bookTitle || book?.title || 'Digital Book',
    bookDescription: book?.description || '',
    bookWriter: order.bookWriter || book?.writer || '',
    bookTranslator: order.bookTranslator || book?.translator || '',
    bookPublication: order.bookPublication || book?.publication || '',
    coverUrl: book?.coverUrl || FALLBACK_BOOK_COVER_DATA_URL,
    deliveryFormat: book?.deliveryFormat || 'Digital Edition Code (EPUB & PDF)',
    redemptionInstructions:
      book?.redemptionInstructions ||
      'Enter this code in your reader library to download your book.',
    originalPriceUsd: order.originalPriceUsd ?? order.priceUsd,
    discountUsd: order.discountUsd ?? 0,
    promoCode: order.promoCode ?? null,
    priceUsd: order.priceUsd,
    ltcRateUsd: order.ltcRateUsd,
    expectedLtc: order.expectedLtc,
    expectedLitoshis: order.expectedLitoshis,
    receivingAddress: order.receivingAddress,
    network: order.network,
    minConfirmations: order.minConfirmations,
    status: order.status,
    customerEmail: order.customerEmail,
    txid: order.txid,
    confirmations: order.confirmations,
    verificationMethod: order.verificationMethod,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    confirmedAt: order.confirmedAt,
    paymentUri,
    qrDataUrl,
    sandboxAvailable: settings.allowSandbox,
    autoDownloadReceipt: settings.autoDownloadReceipt,
    explorerTxUrl: order.txid
      ? `${order.network === 'testnet' ? 'https://litecoinspace.org/testnet' : 'https://litecoinspace.org'}/tx/${order.txid}`
      : null,
    deliveredCode: order.status === 'confirmed' ? order.deliveredCode : null,
    deliveredCodeId: order.status === 'confirmed' ? order.deliveredCodeId : null,
  };
}

const BUYER_SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const BUYER_COOKIE_NAME = 'sk_buyer';
const BUYER_ID_REGEX = /^b_[a-f0-9]{32}$/;
const HEX_SHA256_REGEX = /^[a-f0-9]{64}$/;

function signBuyerId(buyerId: string): string {
  const sig = crypto
    .createHmac('sha256', BUYER_SESSION_SECRET)
    .update(buyerId)
    .digest('hex');
  return `${buyerId}.${sig}`;
}

function verifySignedBuyerToken(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const dotIdx = trimmed.indexOf('.');
  if (dotIdx <= 0) return null;
  const buyerId = trimmed.slice(0, dotIdx);
  const sig = trimmed.slice(dotIdx + 1);
  if (!BUYER_ID_REGEX.test(buyerId) || !HEX_SHA256_REGEX.test(sig)) {
    return null;
  }
  const expected = crypto
    .createHmac('sha256', BUYER_SESSION_SECRET)
    .update(buyerId)
    .digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  return buyerId;
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) {
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

function setBuyerSessionCookie(res: Response, signedToken: string): void {
  res.append(
    'Set-Cookie',
    `${BUYER_COOKIE_NAME}=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=86400`
  );
}

function resolveBuyerSession(
  req: Request,
  res: Response,
  createIfMissing: boolean
): { buyerId: string; signedToken: string } | null {
  const cookies = parseCookieHeader(req.headers.cookie);
  const cookieToken = cookies[BUYER_COOKIE_NAME];
  const cookieBuyerId = verifySignedBuyerToken(cookieToken);
  if (cookieBuyerId && cookieToken) {
    return { buyerId: cookieBuyerId, signedToken: cookieToken };
  }

  const headerToken = req.header('x-buyer-session');
  const headerBuyerId = verifySignedBuyerToken(headerToken);
  if (headerBuyerId && headerToken) {
    setBuyerSessionCookie(res, headerToken.trim());
    return { buyerId: headerBuyerId, signedToken: headerToken.trim() };
  }

  if (!createIfMissing) {
    return null;
  }

  const freshBuyerId = `b_${crypto.randomBytes(16).toString('hex')}`;
  const signedToken = signBuyerId(freshBuyerId);
  setBuyerSessionCookie(res, signedToken);
  return { buyerId: freshBuyerId, signedToken };
}

function isSameOriginOrCustomHeader(req: Request): boolean {
  if (req.header('x-requested-with') === 'dipi') {
    return true;
  }
  const origin = req.header('origin');
  const host = req.header('x-forwarded-host') || req.header('host');
  if (!origin || !host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function buildOpenOrderSummary(order: OrderRecord) {
  const codesFile = readCodesFile();
  const book = codesFile.products.find((p) => p.id === order.productId);
  return {
    id: order.id,
    productId: order.productId,
    bookTitle: order.bookTitle || book?.title || 'Digital Book',
    coverUrl: book?.coverUrl || FALLBACK_BOOK_COVER_DATA_URL,
    priceUsd: order.priceUsd,
    expectedLtc: order.expectedLtc,
    status: order.status,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
  };
}

function getOrderTokenFromRequest(req: Request): string {
  const headerToken = req.header('x-order-token');
  if (headerToken) return headerToken.trim();
  const bearer = extractBearerToken(req);
  if (bearer) return bearer;
  return '';
}

function sanitizeFilenameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'order';
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  // Secure binary upload for A4 Book Cover Artwork (JPG, PNG, WebP up to 5 MB)
  app.post(
    '/api/admin/covers',
    requireAdmin,
    express.raw({
      type: ['image/jpeg', 'image/png', 'image/webp'],
      limit: '5mb',
    }),
    (req: Request, res: Response) => {
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: 'Please upload a valid JPG, PNG, or WebP image file.' });
        return;
      }
      if (body.length > MAX_COVER_BYTES) {
        res.status(413).json({ error: 'Cover image must be 5 MB or smaller.' });
        return;
      }

      const detected = detectValidatedImageType(body);
      if (!detected) {
        res.status(400).json({
          error: 'Unsupported image format. Only valid JPG, PNG, and WebP images are accepted.',
        });
        return;
      }

      if (!fs.existsSync(COVERS_DIR)) {
        fs.mkdirSync(COVERS_DIR, { recursive: true });
      }

      const filename = `cover_${crypto.randomBytes(8).toString('hex')}.${detected.ext}`;
      const targetPath = path.resolve(COVERS_DIR, filename);
      if (!targetPath.startsWith(COVERS_DIR + path.sep)) {
        res.status(400).json({ error: 'Invalid upload path.' });
        return;
      }

      fs.writeFileSync(targetPath, body, { mode: 0o644 });
      res.status(201).json({ coverUrl: `/api/covers/${filename}` });
    }
  );

  // Serve uploaded book cover images with strict filename allowlist
  app.get('/api/covers/:filename', (req: Request, res: Response) => {
    const filename = String(req.params.filename || '');
    if (!COVER_FILENAME_REGEX.test(filename)) {
      res.status(404).end();
      return;
    }

    const filePath = path.resolve(COVERS_DIR, filename);
    if (!filePath.startsWith(COVERS_DIR + path.sep) || !fs.existsSync(filePath)) {
      res.status(404).end();
      return;
    }

    const mime = filename.endsWith('.png')
      ? 'image/png'
      : filename.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';

    res.setHeader('Content-Type', mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  });

  // Secure binary upload for Storefront Background Image (JPG, PNG, WebP up to 5 MB)
  app.post(
    '/api/admin/backgrounds',
    requireAdmin,
    express.raw({
      type: ['image/jpeg', 'image/png', 'image/webp'],
      limit: '5mb',
    }),
    (req: Request, res: Response) => {
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: 'Please upload a valid JPG, PNG, or WebP image file.' });
        return;
      }
      if (body.length > MAX_COVER_BYTES) {
        res.status(413).json({ error: 'Background image must be 5 MB or smaller.' });
        return;
      }

      const detected = detectValidatedImageType(body);
      if (!detected) {
        res.status(400).json({
          error: 'Unsupported image format. Only valid JPG, PNG, and WebP images are accepted.',
        });
        return;
      }

      if (!fs.existsSync(BACKGROUNDS_DIR)) {
        fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
      }

      const filename = `bg_${crypto.randomBytes(8).toString('hex')}.${detected.ext}`;
      const targetPath = path.resolve(BACKGROUNDS_DIR, filename);
      if (!targetPath.startsWith(BACKGROUNDS_DIR + path.sep)) {
        res.status(400).json({ error: 'Invalid upload path.' });
        return;
      }

      fs.writeFileSync(targetPath, body, { mode: 0o644 });
      res.status(201).json({ backgroundImageUrl: `/api/backgrounds/${filename}` });
    }
  );

  // Serve uploaded storefront background images with strict filename allowlist
  app.get('/api/backgrounds/:filename', (req: Request, res: Response) => {
    const filename = String(req.params.filename || '');
    if (!BG_FILENAME_REGEX.test(filename)) {
      res.status(404).end();
      return;
    }

    const filePath = path.resolve(BACKGROUNDS_DIR, filename);
    if (!filePath.startsWith(BACKGROUNDS_DIR + path.sep) || !fs.existsSync(filePath)) {
      res.status(404).end();
      return;
    }

    const mime = filename.endsWith('.png')
      ? 'image/png'
      : filename.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';

    res.setHeader('Content-Type', mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  });

  // Secure binary upload for Storefront Logo (JPG, PNG, WebP up to 5 MB)
  app.post(
    '/api/admin/logos',
    requireAdmin,
    express.raw({
      type: ['image/jpeg', 'image/png', 'image/webp'],
      limit: '5mb',
    }),
    (req: Request, res: Response) => {
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: 'Please upload a valid JPG, PNG, or WebP logo file.' });
        return;
      }
      if (body.length > MAX_COVER_BYTES) {
        res.status(413).json({ error: 'Logo image must be 5 MB or smaller.' });
        return;
      }

      const detected = detectValidatedImageType(body);
      if (!detected) {
        res.status(400).json({
          error: 'Unsupported image format. Only valid JPG, PNG, and WebP images are accepted.',
        });
        return;
      }

      if (!fs.existsSync(LOGOS_DIR)) {
        fs.mkdirSync(LOGOS_DIR, { recursive: true });
      }

      const filename = `logo_${crypto.randomBytes(8).toString('hex')}.${detected.ext}`;
      const targetPath = path.resolve(LOGOS_DIR, filename);
      if (!targetPath.startsWith(LOGOS_DIR + path.sep)) {
        res.status(400).json({ error: 'Invalid upload path.' });
        return;
      }

      fs.writeFileSync(targetPath, body, { mode: 0o644 });
      res.status(201).json({ logoUrl: `/api/logos/${filename}` });
    }
  );

  // Serve uploaded storefront logo images with strict filename allowlist
  app.get('/api/logos/:filename', (req: Request, res: Response) => {
    const filename = String(req.params.filename || '');
    if (!LOGO_FILENAME_REGEX.test(filename)) {
      res.status(404).end();
      return;
    }

    const filePath = path.resolve(LOGOS_DIR, filename);
    if (!filePath.startsWith(LOGOS_DIR + path.sep) || !fs.existsSync(filePath)) {
      res.status(404).end();
      return;
    }

    const mime = filename.endsWith('.png')
      ? 'image/png'
      : filename.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';

    res.setHeader('Content-Type', mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  });

  app.use(
    express.json({
      limit: '256kb',
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // --- Public Bookstore Catalog & Live LTC Rate ---

  app.get('/api/rate', async (_req: Request, res: Response) => {
    const settings = readSettings();
    const rate = await getEffectiveLtcQuoteRate(settings);
    res.json({
      ...rate,
      network: settings.network,
      minConfirmations: settings.minConfirmations,
      orderExpiryMinutes: settings.orderExpiryMinutes,
      ltcRateMode: settings.ltcRateMode,
      quoteSpreadPercent: settings.quoteSpreadPercent,
      quoteCacheSeconds: settings.quoteCacheSeconds,
      sandboxAvailable: settings.allowSandbox,
    });
  });

  app.get('/api/products', async (_req: Request, res: Response) => {
    const settings = readSettings();
    const [rate, books] = await Promise.all([
      getEffectiveLtcQuoteRate(settings),
      Promise.resolve(getPublicCatalog()),
    ]);

    // Use the fewest LTC decimal places whose maximum rounding difference stays within $0.01
    const cardLtcDecimals =
      Number.isFinite(rate.ltcUsd) && rate.ltcUsd > 0
        ? Math.max(2, Math.min(8, Math.ceil(Math.log10((rate.ltcUsd * 0.5) / 0.01))))
        : 2;

    const enriched = books.map((book) => ({
      ...book,
      estimatedLtc: (book.priceUsd / rate.ltcUsd).toFixed(cardLtcDecimals),
    }));

    res.json({
      ltcRateUsd: rate.ltcUsd,
      rateSource: rate.source,
      storefrontLanguage: settings.preferences.language,
      preferences: settings.preferences,
      books: enriched,
    });
  });

  // --- Order Creation, Verification & Instant Download ---

  app.post('/api/orders', async (req: Request, res: Response) => {
    if (!isSameOriginOrCustomHeader(req)) {
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    }

    const buyerSession = resolveBuyerSession(req, res, true)!;

    try {
      const { productId, customerEmail } = req.body as {
        productId?: unknown;
        customerEmail?: unknown;
      };

      if (typeof productId !== 'string' || !productId.trim()) {
        res.status(400).json({ error: 'A valid book ID is required.' });
        return;
      }

      let cleanEmail: string | null = null;
      if (typeof customerEmail === 'string' && customerEmail.trim()) {
        const candidate = customerEmail.trim().slice(0, 120);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
          res.status(400).json({ error: 'Please enter a valid email address or leave it blank.' });
          return;
        }
        cleanEmail = candidate;
      }

      const settings = readSettings();
      if (settings.preferences.maintenanceMode) {
        const customMessage = settings.preferences.maintenanceMessage.trim();
        res.status(503).json({
          error:
            customMessage ||
            'Store checkout is temporarily paused for maintenance. Existing buyers can still use Order Lookup.',
          code: 'STORE_PAUSED',
        });
        return;
      }

      if (
        !settings.receivingAddress ||
        !isValidLitecoinAddress(settings.receivingAddress, settings.network)
      ) {
        res.status(503).json({
          error:
            'Litecoin receiving address is not configured yet. Set a valid wallet address in Admin Vault Settings.',
          code: 'WALLET_NOT_CONFIGURED',
        });
        return;
      }

      const rate = await getEffectiveLtcQuoteRate(settings);
      const { order, orderToken } = await createOrderRecord({
        productId: productId.trim(),
        ltcRateUsd: rate.ltcUsd,
        customerEmail: cleanEmail,
        buyerId: buyerSession.buyerId,
      });

      const orderView = await buildOrderResponse(order);
      res.status(201).json({
        order: orderView,
        orderToken,
        buyerSession: buyerSession.signedToken,
      });
    } catch (err) {
      if (err instanceof OpenOrderExistsError) {
        res.status(409).json({
          error: 'You already have an open order. Cancel it before starting a new order.',
          code: 'OPEN_ORDER_EXISTS',
          openOrder: buildOpenOrderSummary(err.openOrder),
          buyerSession: buyerSession.signedToken,
        });
        return;
      }
      const code = err instanceof Error ? err.message : 'UNKNOWN';
      if (code === 'PRODUCT_NOT_FOUND') {
        res.status(404).json({ error: 'Book not found.' });
        return;
      }
      if (code === 'OUT_OF_STOCK') {
        res.status(409).json({
          error: 'All digital codes for this book are currently sold out or reserved.',
        });
        return;
      }
      res.status(500).json({ error: 'Could not create Litecoin order.' });
    }
  });

  app.post('/api/orders/:orderId/cancel', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const token = getOrderTokenFromRequest(req);
    const buyerSession = resolveBuyerSession(req, res, false);

    const ordersFile = readOrdersFile();
    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    const hasValidOrderToken = verifyOrderToken(order, token);
    const hasValidBuyerSession =
      Boolean(buyerSession && order.buyerId && order.buyerId === buyerSession.buyerId) &&
      isSameOriginOrCustomHeader(req);

    if (!hasValidOrderToken && !hasValidBuyerSession) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    try {
      const cancelledOrder = await cancelOrderRecord(order.id);
      res.json({
        cancelled: true,
        order: await buildOrderResponse(cancelledOrder),
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'UNKNOWN';
      if (code === 'ORDER_ALREADY_CONFIRMED') {
        res.status(409).json({ error: 'Confirmed orders cannot be cancelled.' });
        return;
      }
      if (code === 'ORDER_NOT_FOUND') {
        res.status(404).json({ error: 'Order not found or invalid access key.' });
        return;
      }
      res.status(500).json({ error: 'Could not cancel order.' });
    }
  });

  app.post('/api/orders/:orderId/promo', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const token = getOrderTokenFromRequest(req);
    const { code } = req.body as { code?: unknown };

    const ordersFile = readOrdersFile();
    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order || !verifyOrderToken(order, token)) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    if (typeof code !== 'string' || !code.trim() || code.trim().length > 32) {
      res.status(400).json({ error: 'Please enter a valid promo code.' });
      return;
    }

    try {
      const updated = await applyPromoToOrder(order.id, code);
      res.json({ order: await buildOrderResponse(updated) });
    } catch (err) {
      const errCode = err instanceof Error ? err.message : 'UNKNOWN';
      if (errCode === 'PROMO_NOT_FOUND') {
        res.status(404).json({ error: 'Promo code not found.' });
        return;
      }
      if (errCode === 'PROMO_INACTIVE') {
        res.status(400).json({ error: 'This promo code is currently disabled.' });
        return;
      }
      if (errCode === 'PROMO_EXPIRED') {
        res.status(400).json({ error: 'This promo code has expired.' });
        return;
      }
      if (errCode === 'PROMO_WRONG_BOOK') {
        res.status(400).json({ error: 'This promo code does not apply to this book.' });
        return;
      }
      if (errCode === 'PROMO_LIMIT_REACHED') {
        res.status(409).json({ error: 'This promo code has reached its usage limit.' });
        return;
      }
      if (errCode === 'PROMO_NO_DISCOUNT') {
        res.status(400).json({ error: 'This book is already at the minimum order amount.' });
        return;
      }
      if (errCode === 'ORDER_NOT_PENDING') {
        res.status(409).json({ error: 'Promo codes can only be applied to open pending orders.' });
        return;
      }
      res.status(500).json({ error: 'Could not apply promo code.' });
    }
  });

  app.delete('/api/orders/:orderId/promo', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const token = getOrderTokenFromRequest(req);

    const ordersFile = readOrdersFile();
    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order || !verifyOrderToken(order, token)) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    try {
      const updated = await removePromoFromOrder(order.id);
      res.json({ order: await buildOrderResponse(updated) });
    } catch (err) {
      const errCode = err instanceof Error ? err.message : 'UNKNOWN';
      if (errCode === 'ORDER_NOT_PENDING') {
        res.status(409).json({ error: 'Promo codes can only be removed from open pending orders.' });
        return;
      }
      res.status(500).json({ error: 'Could not remove promo code.' });
    }
  });

  app.get('/api/orders/:orderId', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const token = getOrderTokenFromRequest(req);

    const ordersFile = readOrdersFile();
    const changed = expireStaleOrdersInMemory(ordersFile);
    if (changed) {
      await withStoreLock(() => {
        const fresh = readOrdersFile();
        if (expireStaleOrdersInMemory(fresh)) {
          writeOrdersFile(fresh);
        }
      });
    }

    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order || !verifyOrderToken(order, token)) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    res.json({ order: await buildOrderResponse(order) });
  });

  app.get('/api/orders/:orderId/poll', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const token = getOrderTokenFromRequest(req);

    const ordersFile = readOrdersFile();
    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order || !verifyOrderToken(order, token)) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    if (order.status === 'confirmed') {
      res.json({
        status: 'confirmed',
        message: 'Payment verified and book code unlocked.',
        order: await buildOrderResponse(order),
      });
      return;
    }

    if (order.status === 'cancelled') {
      res.json({
        status: 'cancelled',
        message: 'This order was cancelled.',
        order: await buildOrderResponse(order),
      });
      return;
    }

    if (order.status === 'expired' || Date.parse(order.expiresAt) <= Date.now()) {
      await withStoreLock(() => {
        const fresh = readOrdersFile();
        if (expireStaleOrdersInMemory(fresh)) {
          writeOrdersFile(fresh);
        }
      });
      res.json({
        status: 'expired',
        message: 'Payment window expired. Tap the book again for a fresh LTC quote.',
        order: await buildOrderResponse({ ...order, status: 'expired' }),
      });
      return;
    }

    const pollResult = await pollAddressForMatchingOrderPayment({
      receivingAddress: order.receivingAddress,
      expectedLitoshis: order.expectedLitoshis,
      minConfirmations: order.minConfirmations,
      network: order.network,
      orderCreatedAtMs: Date.parse(order.createdAt),
      isTxidUsed: (txid) => isTxidAlreadyClaimed(txid, order.id),
    });

    if (pollResult.found && pollResult.confirmed && pollResult.txid) {
      try {
        const { order: confirmedOrder } = await confirmAndNotify({
          orderId: order.id,
          txid: pollResult.txid,
          confirmations: pollResult.confirmations ?? order.minConfirmations,
          verificationMethod: 'onchain_poll',
        });

        res.json({
          status: 'confirmed',
          message: 'Litecoin payment confirmed. Code marked used and unlocked.',
          order: await buildOrderResponse(confirmedOrder),
        });
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'CONFIRMATION_FAILED';
        res.status(409).json({ error: `Could not finalize code assignment: ${message}` });
        return;
      }
    }

    res.json({
      status: 'pending',
      detectedTxid: pollResult.txid || null,
      confirmations: pollResult.confirmations || 0,
      message: pollResult.message || 'Listening for Litecoin payment.',
      order: await buildOrderResponse(order),
    });
  });

  app.post('/api/orders/:orderId/verify-tx', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const token = getOrderTokenFromRequest(req);
    const { txid } = req.body as { txid?: unknown };

    const ordersFile = readOrdersFile();
    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order || !verifyOrderToken(order, token)) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    if (order.status === 'cancelled') {
      res.status(409).json({
        error: 'This order was cancelled and can no longer be confirmed.',
      });
      return;
    }

    if (order.status === 'confirmed') {
      res.json({
        verified: true,
        message: 'Order is already verified and unlocked.',
        order: await buildOrderResponse(order),
      });
      return;
    }

    if (typeof txid !== 'string' || !isValidTxid(txid)) {
      res.status(400).json({
        error: 'Please enter a valid 64-character hexadecimal Litecoin Transaction ID (TXID).',
      });
      return;
    }

    if (isTxidAlreadyClaimed(txid, order.id)) {
      res.status(409).json({
        error: 'This Litecoin transaction ID has already been claimed by another order.',
      });
      return;
    }

    const verification = await verifyLitecoinTransactionOnChain({
      txid,
      receivingAddress: order.receivingAddress,
      expectedLitoshis: order.expectedLitoshis,
      minConfirmations: order.minConfirmations,
      network: order.network,
    });

    if (!verification.verified) {
      res.status(400).json({
        verified: false,
        error: verification.reason || 'Transaction could not be verified on-chain.',
        confirmations: verification.confirmations,
        receivedLitoshis: verification.receivedLitoshis,
        explorerUrl: verification.explorerUrl,
      });
      return;
    }

    try {
      const { order: confirmedOrder } = await confirmAndNotify({
        orderId: order.id,
        txid: verification.txid,
        confirmations: verification.confirmations,
        verificationMethod: 'onchain_txid',
      });

      res.json({
        verified: true,
        message: 'Transaction verified. Code marked used in codes.json and unlocked.',
        order: await buildOrderResponse(confirmedOrder),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ERROR';
      if (msg === 'TXID_ALREADY_CLAIMED') {
        res.status(409).json({ error: 'This transaction ID was already claimed.' });
        return;
      }
      res.status(409).json({ error: 'No available codes remain for this book.' });
    }
  });

  app.post('/api/orders/:orderId/sandbox-confirm', async (req: Request, res: Response) => {
    const settings = readSettings();
    if (!settings.allowSandbox) {
      res.status(403).json({
        error: 'Sandbox confirmation is disabled in production mode.',
      });
      return;
    }

    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const token = getOrderTokenFromRequest(req);

    const ordersFile = readOrdersFile();
    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order || !verifyOrderToken(order, token)) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    if (order.status === 'cancelled') {
      res.status(409).json({
        error: 'This order was cancelled and can no longer be confirmed.',
      });
      return;
    }

    const simulatedTxid = crypto.randomBytes(32).toString('hex');

    try {
      const { order: confirmedOrder } = await confirmAndNotify({
        orderId: order.id,
        txid: simulatedTxid,
        confirmations: Math.max(1, order.minConfirmations),
        verificationMethod: 'sandbox',
      });

      res.json({
        verified: true,
        message: 'Sandbox payment settled. Code marked used in codes.json and unlocked.',
        order: await buildOrderResponse(confirmedOrder),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ERROR';
      res.status(409).json({ error: `Unable to settle order: ${msg}` });
    }
  });

  app.get('/api/orders/:orderId/download', (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const token = getOrderTokenFromRequest(req);
    const format = req.query.format === 'json' ? 'json' : 'txt';

    const ordersFile = readOrdersFile();
    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order || !verifyOrderToken(order, token)) {
      res.status(404).json({ error: 'Order not found or invalid access key.' });
      return;
    }

    if (order.status !== 'confirmed' || !order.deliveredCode) {
      res.status(403).json({ error: 'Payment must be confirmed before downloading your code.' });
      return;
    }

    const codesFile = readCodesFile();
    const book = codesFile.products.find((p) => p.id === order.productId);
    const safeOrderId = sanitizeFilenameSegment(order.id);

    if (format === 'json') {
      const receipt = {
        store: 'dipi Bookstore',
        orderId: order.id,
        status: 'confirmed',
        book: {
          id: order.productId,
          title: order.bookTitle,
          writer: order.bookWriter,
          translator: order.bookTranslator,
          publication: order.bookPublication,
          redemptionInstructions: book?.redemptionInstructions || '',
        },
        payment: {
          currency: 'LTC',
          network: order.network,
          amountLtc: order.expectedLtc,
          amountUsd: order.priceUsd,
          receivingAddress: order.receivingAddress,
          txid: order.txid,
          confirmations: order.confirmations,
          verificationMethod: order.verificationMethod,
          confirmedAt: order.confirmedAt,
        },
        digitalCode: {
          id: order.deliveredCodeId,
          code: order.deliveredCode,
          usedStatusInBackend: true,
        },
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="dipi-${safeOrderId}.json"`
      );
      res.send(JSON.stringify(receipt, null, 2) + '\n');
      return;
    }

    const certificateText = [
      '====================================================================',
      '  DIPI BOOKSTORE — VERIFIED EDITION CODE',
      '====================================================================',
      '',
      `  Order ID:         ${order.id}`,
      `  Book Title:       ${order.bookTitle}`,
      `  Writer:           ${order.bookWriter}`,
      `  Translator:       ${order.bookTranslator}`,
      `  Publication:      ${order.bookPublication}`,
      `  Confirmed At:     ${order.confirmedAt}`,
      '',
      '--------------------------------------------------------------------',
      '  YOUR DIGITAL CODE',
      '--------------------------------------------------------------------',
      '',
      `  ${order.deliveredCode}`,
      '',
      '--------------------------------------------------------------------',
      '  LITECOIN SETTLEMENT RECEIPT',
      '--------------------------------------------------------------------',
      `  Amount Settled:   ${order.expectedLtc} LTC ($${order.priceUsd.toFixed(2)} USD)`,
      ...(order.promoCode && (order.discountUsd ?? 0) > 0
        ? [
            `  Promo Code:       ${order.promoCode} (-$${(order.discountUsd ?? 0).toFixed(2)} USD)`,
          ]
        : []),
      `  Network:          Litecoin (${order.network})`,
      `  Transaction ID:   ${order.txid}`,
      `  Confirmations:    ${order.confirmations}`,
      `  Code Record ID:   ${order.deliveredCodeId} (backend status: used=true)`,
      '',
      '--------------------------------------------------------------------',
      '  HOW TO REDEEM',
      '--------------------------------------------------------------------',
      `  ${book?.redemptionInstructions || 'Enter the code above in your reader library.'}`,
      '',
      '====================================================================',
      '',
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="dipi-${safeOrderId}.txt"`
    );
    res.send(certificateText);
  });

  // --- Automated Payment Webhook ---

  app.post('/api/webhooks/ltc', async (req: Request, res: Response) => {
    const secret = readSettings().webhookSecret?.trim() || process.env.WEBHOOK_SECRET?.trim();
    if (!secret) {
      res
        .status(503)
        .json({ error: 'Webhook signing secret is not configured in Admin Vault Settings.' });
      return;
    }

    const providedSig = (req.header('x-webhook-signature') || '').trim();
    const rawBody =
      (req as Request & { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(providedSig, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).json({ error: 'Invalid webhook HMAC signature.' });
      return;
    }

    const { orderId, txid } = req.body as { orderId?: unknown; txid?: unknown };
    if (typeof orderId !== 'string' || typeof txid !== 'string' || !isValidTxid(txid)) {
      res.status(400).json({ error: 'orderId and valid 64-char hex txid are required.' });
      return;
    }

    const ordersFile = readOrdersFile();
    const order = ordersFile.orders.find((o) => o.id === orderId.trim().toUpperCase());
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const verification = await verifyLitecoinTransactionOnChain({
      txid,
      receivingAddress: order.receivingAddress,
      expectedLitoshis: order.expectedLitoshis,
      minConfirmations: order.minConfirmations,
      network: order.network,
    });

    if (!verification.verified) {
      res.status(400).json({ error: verification.reason || 'On-chain verification failed.' });
      return;
    }

    try {
      const { order: confirmedOrder, codeRecord } = await confirmAndNotify({
        orderId: order.id,
        txid: verification.txid,
        confirmations: verification.confirmations,
        verificationMethod: 'webhook',
      });

      res.json({
        fulfilled: true,
        orderId: confirmedOrder.id,
        codeId: codeRecord.id,
        codeMarkedUsed: codeRecord.used,
        confirmedAt: confirmedOrder.confirmedAt,
      });
    } catch (err) {
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Unable to fulfill order.',
      });
    }
  });

  // --- Admin Vault Authentication & Backend JSON Management ---

  const routeCheckAttempts = new Map<string, { count: number; resetAt: number }>();

  app.post('/api/admin/route-check', (req: Request, res: Response) => {
    const now = Date.now();
    const clientIp = (req.ip || req.socket.remoteAddress || 'unknown').slice(0, 64);
    const bucket = routeCheckAttempts.get(clientIp);
    if (bucket && bucket.resetAt > now) {
      if (bucket.count >= 30) {
        res.status(429).json({ valid: false });
        return;
      }
      bucket.count += 1;
    } else {
      if (routeCheckAttempts.size > 500) {
        for (const [key, entry] of routeCheckAttempts.entries()) {
          if (entry.resetAt <= now) routeCheckAttempts.delete(key);
        }
      }
      routeCheckAttempts.set(clientIp, { count: 1, resetAt: now + 60_000 });
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as { path?: unknown };
    const candidate = typeof body.path === 'string' ? normalizeAdminPath(body.path) : '';
    const configured = normalizeAdminPath(readSettings().adminPath || DEFAULT_ADMIN_PATH);

    if (!candidate || candidate.length > 64) {
      res.json({ valid: false });
      return;
    }

    const a = Buffer.from(candidate, 'utf8');
    const b = Buffer.from(configured, 'utf8');
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    res.json({ valid });
  });

  app.get('/api/admin/status', (_req: Request, res: Response) => {
    res.json(getAdminAuthStatus());
  });

  app.post('/api/admin/bootstrap', async (req: Request, res: Response) => {
    try {
      const { username, password, requirePasscode, completeSetupNow, adminPath } = (
        req.body && typeof req.body === 'object' ? req.body : {}
      ) as {
        username?: unknown;
        password?: unknown;
        requirePasscode?: unknown;
        completeSetupNow?: unknown;
        adminPath?: unknown;
      };
      if (typeof username !== 'string' || !username.trim()) {
        res.status(400).json({ error: 'Username is required.' });
        return;
      }
      if (typeof password !== 'string') {
        res.status(400).json({ error: 'Password is required.' });
        return;
      }
      let nextAdminPath: string | undefined;
      if (typeof adminPath === 'string' && adminPath.trim().length > 0) {
        if (!isValidAdminPath(adminPath)) {
          res.status(400).json({
            error:
              'Admin URL path must be 3–48 characters using lowercase letters, numbers, dashes, or underscores, and cannot use reserved words like api, books, or lookup.',
          });
          return;
        }
        nextAdminPath = normalizeAdminPath(adminPath);
      }

      const token = await bootstrapAdminCredentials(username, password);
      const shouldLock = requirePasscode !== false;

      const updatedSettings = await withStoreLock(() => {
        const current = readSettings();
        return writeSettings({
          ...current,
          adminOpenAccess: !shouldLock,
          adminPath: nextAdminPath ?? current.adminPath ?? DEFAULT_ADMIN_PATH,
          ...(completeSetupNow === true
            ? {
                setupCompleted: true,
                setupCompletedAt: new Date().toISOString(),
              }
            : {}),
          updatedAt: new Date().toISOString(),
        });
      });

      res.status(201).json({
        token,
        authStatus: getAdminAuthStatus(),
        adminPath: updatedSettings.adminPath || DEFAULT_ADMIN_PATH,
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : 'ERROR';
      if (code === 'INVALID_USERNAME') {
        res.status(400).json({
          error: 'Username must be 3–32 characters using letters, numbers, dots, dashes, or underscores.',
        });
        return;
      }
      if (code === 'PASSWORD_TOO_SHORT') {
        res.status(400).json({ error: 'Admin password must be between 8 and 128 characters.' });
        return;
      }
      if (code === 'ALREADY_CLAIMED' || code === 'MANAGED_BY_ENV') {
        res.status(409).json({ error: 'Admin credentials are already configured.' });
        return;
      }
      res.status(500).json({ error: 'Could not initialize admin credentials.' });
    }
  });

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    const { username, password } = (
      req.body && typeof req.body === 'object' ? req.body : {}
    ) as { username?: unknown; password?: unknown };
    if (typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }
    const token = await verifyAdminLogin(
      typeof username === 'string' ? username : undefined,
      password
    );
    if (!token) {
      res.status(401).json({ error: 'Invalid admin username or password.' });
      return;
    }
    res.json({ token, authStatus: getAdminAuthStatus() });
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token) {
      revokeAdminSession(token);
    }
    res.json({ ok: true });
  });

  app.post('/api/admin/setup/complete', requireAdmin, async (_req: Request, res: Response) => {
    const authStatus = getAdminAuthStatus();
    if (authStatus.needsSetup && !authStatus.managedByEnv) {
      res.status(400).json({
        error: 'Define an admin username and password before completing setup.',
      });
      return;
    }
    await withStoreLock(() => {
      const current = readSettings();
      return writeSettings({
        ...current,
        setupCompleted: true,
        setupCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    res.json({ ok: true, authStatus: getAdminAuthStatus() });
  });

  app.get('/api/admin/overview', requireAdmin, async (_req: Request, res: Response) => {
    const codesFile = readCodesFile();
    const ordersFile = readOrdersFile();
    expireStaleOrdersInMemory(ordersFile);
    const settings = readSettings();
    const currentQuote = await getEffectiveLtcQuoteRate(settings);

    const totalCodes = codesFile.codes.length;
    const usedCodes = codesFile.codes.filter((c) => c.used).length;
    const availableCodes = totalCodes - usedCodes;
    const confirmedOrders = ordersFile.orders.filter((o) => o.status === 'confirmed');
    const totalLtcSettled = confirmedOrders.reduce(
      (sum, o) => sum + o.expectedLitoshis / 1e8,
      0
    );
    const totalUsdSettled = confirmedOrders.reduce((sum, o) => sum + o.priceUsd, 0);

    // Aggregate confirmed sales per day across the last 30 calendar days (UTC YYYY-MM-DD)
    const salesByDay = new Map<string, { salesCount: number; usdTotal: number; ltcTotal: number }>();
    for (const o of confirmedOrders) {
      const iso = o.confirmedAt || o.createdAt;
      const dayKey = typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : '';
      if (!dayKey) continue;
      const bucket = salesByDay.get(dayKey) ?? { salesCount: 0, usdTotal: 0, ltcTotal: 0 };
      bucket.salesCount += 1;
      bucket.usdTotal += o.priceUsd;
      bucket.ltcTotal += o.expectedLitoshis / 1e8;
      salesByDay.set(dayKey, bucket);
    }

    const dailySales: Array<{
      date: string;
      salesCount: number;
      usdTotal: number;
      ltcTotal: number;
    }> = [];
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);
    for (let offset = 29; offset >= 0; offset -= 1) {
      const d = new Date(todayUtc.getTime() - offset * 86_400_000);
      const dateKey = d.toISOString().slice(0, 10);
      const bucket = salesByDay.get(dateKey);
      dailySales.push({
        date: dateKey,
        salesCount: bucket?.salesCount ?? 0,
        usdTotal: Number((bucket?.usdTotal ?? 0).toFixed(2)),
        ltcTotal: Number((bucket?.ltcTotal ?? 0).toFixed(6)),
      });
    }

    res.json({
      stats: {
        totalCodes,
        availableCodes,
        usedCodes,
        confirmedOrderCount: confirmedOrders.length,
        pendingOrderCount: ordersFile.orders.filter((o) => o.status === 'pending').length,
        totalLtcSettled: Number(totalLtcSettled.toFixed(6)),
        totalUsdSettled: Number(totalUsdSettled.toFixed(2)),
      },
      dailySales,
      products: codesFile.products,
      codes: codesFile.codes,
      promos: readPromosFile().promos,
      orders: ordersFile.orders.slice(0, 50).map((o) => ({
        id: o.id,
        productId: o.productId,
        bookTitle: o.bookTitle,
        priceUsd: o.priceUsd,
        originalPriceUsd: o.originalPriceUsd ?? o.priceUsd,
        discountUsd: o.discountUsd ?? 0,
        promoCode: o.promoCode ?? null,
        expectedLtc: o.expectedLtc,
        status: o.status,
        txid: o.txid,
        confirmations: o.confirmations,
        deliveredCodeId: o.deliveredCodeId,
        verificationMethod: o.verificationMethod,
        createdAt: o.createdAt,
        confirmedAt: o.confirmedAt,
      })),
      settings: {
        receivingAddress: settings.receivingAddress,
        network: settings.network,
        minConfirmations: settings.minConfirmations,
        allowSandbox: settings.allowSandbox,
        autoDownloadReceipt: settings.autoDownloadReceipt,
        orderExpiryMinutes: settings.orderExpiryMinutes,
        ltcRateMode: settings.ltcRateMode,
        manualLtcRateUsd: settings.manualLtcRateUsd,
        quoteSpreadPercent: settings.quoteSpreadPercent,
        quoteCacheSeconds: settings.quoteCacheSeconds,
        adminOpenAccess: settings.adminOpenAccess !== false,
        storefrontLanguage: settings.storefrontLanguage,
        preferences: settings.preferences,
        updatedAt: settings.updatedAt,
      },
      currentQuote: {
        spotLtcUsd: currentQuote.spotLtcUsd,
        effectiveLtcUsd: currentQuote.ltcUsd,
        spreadPercent: currentQuote.spreadPercent,
        mode: currentQuote.mode,
        source: currentQuote.source,
        fetchedAt: currentQuote.fetchedAt,
      },
      saleNotifications: buildSaleNotificationsSummary(settings),
      webhookConfigured: Boolean(
        settings.webhookSecret?.trim() || process.env.WEBHOOK_SECRET?.trim()
      ),
      webhookSecretHint: (() => {
        const active = settings.webhookSecret?.trim() || process.env.WEBHOOK_SECRET?.trim() || '';
        return active.length >= 4 ? `••••${active.slice(-4)}` : active ? '••••' : null;
      })(),
      hasAdminPasscode: getAdminAuthStatus().hasPasscode,
      adminUsername: getStoredAdminUsername(),
      adminPath: settings.adminPath || DEFAULT_ADMIN_PATH,
      setupCompleted: Boolean(settings.setupCompleted),
      sandboxLockedOffByEnv: process.env.LTC_ALLOW_SANDBOX === 'false',
    });
  });

  app.get('/api/admin/codes-json', requireAdmin, (_req: Request, res: Response) => {
    const codesFile = readCodesFile();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="codes.json"');
    res.send(JSON.stringify(codesFile, null, 2) + '\n');
  });

  app.post('/api/admin/codes', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { productId, codes } = req.body as {
        productId?: unknown;
        codes?: unknown;
      };

      if (typeof productId !== 'string' || !productId.trim()) {
        res.status(400).json({ error: 'productId is required.' });
        return;
      }

      if (!Array.isArray(codes) || codes.length === 0 || codes.length > 500) {
        res.status(400).json({ error: 'Provide between 1 and 500 codes.' });
        return;
      }

      const cleanList = codes.filter((item): item is string => typeof item === 'string');
      const result = await addCodesBulk({
        productId: productId.trim(),
        codes: cleanList,
      });

      res.status(201).json(result);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'ERROR';
      if (code === 'PRODUCT_NOT_FOUND') {
        res.status(404).json({ error: 'Selected book does not exist.' });
        return;
      }
      res.status(500).json({ error: 'Failed to append codes to codes.json.' });
    }
  });

  app.delete('/api/admin/codes/:codeId', requireAdmin, async (req: Request, res: Response) => {
    try {
      const codeId = String(req.params.codeId || '').trim();
      const deleted = await deleteUnusedCode(codeId);
      if (!deleted) {
        res.status(404).json({ error: 'Code not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ERROR';
      if (msg === 'CANNOT_DELETE_USED_CODE') {
        res.status(409).json({ error: 'Used codes are preserved as permanent audit records.' });
        return;
      }
      res.status(500).json({ error: 'Failed to delete code.' });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 60) : '';
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 1200) : '';
    const writer = typeof body.writer === 'string' ? body.writer.trim() : '';
    const translator = typeof body.translator === 'string' ? body.translator.trim() : '';
    const publication = typeof body.publication === 'string' ? body.publication.trim() : '';
    const priceUsd = typeof body.priceUsd === 'number' ? body.priceUsd : Number(body.priceUsd);
    const redemptionInstructions =
      typeof body.redemptionInstructions === 'string'
        ? body.redemptionInstructions.trim()
        : '';
    const coverUrl = typeof body.coverUrl === 'string' ? body.coverUrl.trim() : undefined;

    if (!title || !writer || !publication || !Number.isFinite(priceUsd) || priceUsd <= 0 || priceUsd > 10000) {
      res
        .status(400)
        .json({ error: 'Please fill in Book Title, Writer, Publication, and a valid USD price.' });
      return;
    }

    const book = await createBookProductRecord({
      title,
      subject,
      description,
      writer,
      translator,
      publication,
      priceUsd,
      coverUrl,
      redemptionInstructions,
    });

    res.status(201).json({ book });
  });

  app.put('/api/admin/products/:productId', requireAdmin, async (req: Request, res: Response) => {
    const productId = String(req.params.productId || '').trim();
    const body = req.body as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const subject =
      typeof body.subject === 'string' ? body.subject.trim().slice(0, 60) : undefined;
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 1200) : undefined;
    const writer = typeof body.writer === 'string' ? body.writer.trim() : '';
    const translator = typeof body.translator === 'string' ? body.translator.trim() : '';
    const publication = typeof body.publication === 'string' ? body.publication.trim() : '';
    const priceUsd = typeof body.priceUsd === 'number' ? body.priceUsd : Number(body.priceUsd);
    const redemptionInstructions =
      typeof body.redemptionInstructions === 'string'
        ? body.redemptionInstructions.trim()
        : undefined;
    const coverUrl = typeof body.coverUrl === 'string' ? body.coverUrl.trim() : undefined;

    if (
      !productId ||
      !title ||
      !writer ||
      !publication ||
      !Number.isFinite(priceUsd) ||
      priceUsd <= 0 ||
      priceUsd > 10000
    ) {
      res
        .status(400)
        .json({ error: 'Please fill in Book Title, Writer, Publication, and a valid USD price.' });
      return;
    }

    const updated = await updateBookProductRecord(productId, {
      title,
      subject,
      description,
      writer,
      translator,
      publication,
      priceUsd,
      coverUrl,
      redemptionInstructions,
    });

    if (!updated) {
      res.status(404).json({ error: 'Book not found.' });
      return;
    }

    res.json({ book: updated });
  });

  app.delete('/api/admin/products/:productId', requireAdmin, async (req: Request, res: Response) => {
    const productId = String(req.params.productId || '').trim();
    if (!productId) {
      res.status(400).json({ error: 'Book ID is required.' });
      return;
    }

    const result = await deleteBookProductRecord(productId);
    if (!result.deleted) {
      res.status(404).json({ error: 'Book not found.' });
      return;
    }

    res.json(result);
  });

  app.put('/api/admin/settings', requireAdmin, async (req: Request, res: Response) => {
    const body = req.body as {
      receivingAddress?: unknown;
      network?: unknown;
      minConfirmations?: unknown;
      allowSandbox?: unknown;
      autoDownloadReceipt?: unknown;
      orderExpiryMinutes?: unknown;
      ltcRateMode?: unknown;
      manualLtcRateUsd?: unknown;
      quoteSpreadPercent?: unknown;
      quoteCacheSeconds?: unknown;
      storefrontLanguage?: unknown;
      webhookSecret?: unknown;
      clearWebhookSecret?: unknown;
    };

    const currentBefore = readSettings();
    const network =
      body.network === 'testnet'
        ? 'testnet'
        : body.network === 'mainnet'
          ? 'mainnet'
          : currentBefore.network;
    const receivingAddress =
      typeof body.receivingAddress === 'string'
        ? body.receivingAddress.trim()
        : currentBefore.receivingAddress;
    const minConfirmations =
      body.minConfirmations === undefined
        ? currentBefore.minConfirmations
        : Number.parseInt(String(body.minConfirmations), 10);
    const allowSandbox =
      body.allowSandbox === undefined ? currentBefore.allowSandbox : Boolean(body.allowSandbox);

    const orderExpiryMinutes =
      body.orderExpiryMinutes === undefined
        ? currentBefore.orderExpiryMinutes
        : Number.parseInt(String(body.orderExpiryMinutes), 10);
    const ltcRateMode: 'live' | 'manual' =
      body.ltcRateMode === 'manual'
        ? 'manual'
        : body.ltcRateMode === 'live'
          ? 'live'
          : currentBefore.ltcRateMode;
    const manualLtcRateUsd =
      body.manualLtcRateUsd === undefined
        ? currentBefore.manualLtcRateUsd
        : Number(body.manualLtcRateUsd);
    const quoteSpreadPercent =
      body.quoteSpreadPercent === undefined
        ? currentBefore.quoteSpreadPercent
        : Number(body.quoteSpreadPercent);
    const quoteCacheSeconds =
      body.quoteCacheSeconds === undefined
        ? currentBefore.quoteCacheSeconds
        : Number.parseInt(String(body.quoteCacheSeconds), 10);

    const isUpdatingAddress = body.receivingAddress !== undefined;
    if ((isUpdatingAddress || receivingAddress.length > 0) && !isValidLitecoinAddress(receivingAddress, network)) {
      res.status(400).json({
        error:
          network === 'testnet'
            ? 'Enter a valid Litecoin testnet address (tltc1..., m..., n..., or Q...).'
            : 'Enter a valid Litecoin mainnet address (ltc1..., L..., or M...).',
      });
      return;
    }

    if (!Number.isFinite(minConfirmations) || minConfirmations < 0 || minConfirmations > 12) {
      res.status(400).json({ error: 'Minimum confirmations must be between 0 and 12.' });
      return;
    }

    if (!Number.isFinite(orderExpiryMinutes) || orderExpiryMinutes < 5 || orderExpiryMinutes > 120) {
      res.status(400).json({ error: 'Order expiry window must be between 5 and 120 minutes.' });
      return;
    }

    if (!Number.isFinite(manualLtcRateUsd) || manualLtcRateUsd < 1 || manualLtcRateUsd > 100000) {
      res.status(400).json({ error: 'Manual LTC/USD rate must be between $1 and $100,000.' });
      return;
    }

    if (!Number.isFinite(quoteSpreadPercent) || quoteSpreadPercent < 0 || quoteSpreadPercent > 25) {
      res.status(400).json({ error: 'Quote volatility buffer must be between 0% and 25%.' });
      return;
    }

    if (!Number.isFinite(quoteCacheSeconds) || quoteCacheSeconds < 15 || quoteCacheSeconds > 600) {
      res.status(400).json({ error: 'Spot quote cache interval must be between 15 and 600 seconds.' });
      return;
    }

    if (typeof body.webhookSecret === 'string' && body.webhookSecret.trim().length > 256) {
      res.status(400).json({ error: 'Webhook signing secret must be 256 characters or fewer.' });
      return;
    }

    const updated = await withStoreLock(() => {
      const current = readSettings();
      const autoDownloadReceipt =
        body.autoDownloadReceipt === undefined
          ? current.autoDownloadReceipt
          : Boolean(body.autoDownloadReceipt);
      const nextLang =
        body.storefrontLanguage === 'fa'
          ? 'fa'
          : body.storefrontLanguage === 'en'
            ? 'en'
            : current.preferences.language;

      let nextWebhookSecret = current.webhookSecret ?? '';
      if (body.clearWebhookSecret === true) {
        nextWebhookSecret = '';
      } else if (typeof body.webhookSecret === 'string' && body.webhookSecret.trim().length > 0) {
        nextWebhookSecret = body.webhookSecret.trim();
      }

      return writeSettings({
        ...current,
        receivingAddress,
        network,
        minConfirmations,
        allowSandbox: process.env.LTC_ALLOW_SANDBOX === 'false' ? false : allowSandbox,
        autoDownloadReceipt,
        orderExpiryMinutes: Math.round(orderExpiryMinutes),
        ltcRateMode,
        manualLtcRateUsd: Number(manualLtcRateUsd.toFixed(2)),
        quoteSpreadPercent: Number(quoteSpreadPercent.toFixed(2)),
        quoteCacheSeconds: Math.round(quoteCacheSeconds),
        saleNotifications: current.saleNotifications,
        webhookSecret: nextWebhookSecret,
        adminOpenAccess: current.adminOpenAccess === true,
        storefrontLanguage: nextLang,
        preferences: {
          ...current.preferences,
          language: nextLang,
        },
        updatedAt: new Date().toISOString(),
      });
    });

    const activeSecret = updated.webhookSecret?.trim() || process.env.WEBHOOK_SECRET?.trim() || '';
    res.json({
      settings: {
        receivingAddress: updated.receivingAddress,
        network: updated.network,
        minConfirmations: updated.minConfirmations,
        allowSandbox: updated.allowSandbox,
        autoDownloadReceipt: updated.autoDownloadReceipt,
        orderExpiryMinutes: updated.orderExpiryMinutes,
        ltcRateMode: updated.ltcRateMode,
        manualLtcRateUsd: updated.manualLtcRateUsd,
        quoteSpreadPercent: updated.quoteSpreadPercent,
        quoteCacheSeconds: updated.quoteCacheSeconds,
        adminOpenAccess: updated.adminOpenAccess !== false,
        storefrontLanguage: updated.storefrontLanguage,
        preferences: updated.preferences,
        updatedAt: updated.updatedAt,
      },
      webhookConfigured: Boolean(activeSecret),
      webhookSecretHint:
        activeSecret.length >= 4 ? `••••${activeSecret.slice(-4)}` : activeSecret ? '••••' : null,
    });
  });

  app.put('/api/admin/notifications', requireAdmin, async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const current = readSettings().saleNotifications;

    const telegramEnabled =
      typeof body.telegramEnabled === 'boolean' ? body.telegramEnabled : current.telegramEnabled;
    const telegramChatId =
      typeof body.telegramChatId === 'string'
        ? body.telegramChatId.trim()
        : current.telegramChatId;
    let telegramBotToken = current.telegramBotToken;
    if (body.clearTelegramBotToken === true) {
      telegramBotToken = '';
    } else if (typeof body.telegramBotToken === 'string' && body.telegramBotToken.trim()) {
      telegramBotToken = body.telegramBotToken.trim();
    }

    const discordEnabled =
      typeof body.discordEnabled === 'boolean' ? body.discordEnabled : current.discordEnabled;
    let discordWebhookUrl = current.discordWebhookUrl;
    if (body.clearDiscordWebhookUrl === true) {
      discordWebhookUrl = '';
    } else if (typeof body.discordWebhookUrl === 'string' && body.discordWebhookUrl.trim()) {
      discordWebhookUrl = body.discordWebhookUrl.trim();
    }

    const webhookEnabled =
      typeof body.webhookEnabled === 'boolean' ? body.webhookEnabled : current.webhookEnabled;
    const webhookUrl =
      typeof body.webhookUrl === 'string' ? body.webhookUrl.trim() : current.webhookUrl;
    let webhookSigningSecret = current.webhookSigningSecret;
    if (body.clearWebhookSigningSecret === true) {
      webhookSigningSecret = '';
    } else if (typeof body.webhookSigningSecret === 'string' && body.webhookSigningSecret.trim()) {
      webhookSigningSecret = body.webhookSigningSecret.trim();
    }

    const includeSandboxSales =
      typeof body.includeSandboxSales === 'boolean'
        ? body.includeSandboxSales
        : current.includeSandboxSales;

    if (telegramBotToken && !isValidTelegramBotToken(telegramBotToken)) {
      res.status(400).json({
        error: 'Enter a valid Telegram Bot Token from @BotFather (e.g. 123456789:AAH...).',
      });
      return;
    }
    if (telegramChatId && !isValidTelegramChatId(telegramChatId)) {
      res.status(400).json({
        error: 'Enter a valid numeric Telegram Chat ID (e.g. -1001234567890) or @channelusername.',
      });
      return;
    }
    if (telegramEnabled && (!telegramBotToken || !telegramChatId)) {
      res.status(400).json({
        error: 'Enter both a Telegram Bot Token and Chat ID before enabling Telegram alerts.',
      });
      return;
    }

    if (discordWebhookUrl && !isValidDiscordWebhookUrl(discordWebhookUrl)) {
      res.status(400).json({
        error:
          'Discord Webhook URL must be a valid https://discord.com/api/webhooks/... URL.',
      });
      return;
    }
    if (discordEnabled && !discordWebhookUrl) {
      res.status(400).json({
        error: 'Enter a Discord Webhook URL before enabling Discord alerts.',
      });
      return;
    }

    if (webhookUrl && !isValidOutboundWebhookUrlSyntax(webhookUrl)) {
      res.status(400).json({
        error:
          'Outbound Webhook URL must be a public https:// endpoint (localhost and private IPs are blocked).',
      });
      return;
    }
    if (webhookEnabled && !webhookUrl) {
      res.status(400).json({
        error: 'Enter a public HTTPS URL before enabling Outbound Webhook alerts.',
      });
      return;
    }
    if (webhookSigningSecret.length > 256) {
      res.status(400).json({
        error: 'Outbound webhook signing secret must be 256 characters or fewer.',
      });
      return;
    }

    const updated = await withStoreLock(() => {
      const latest = readSettings();
      return writeSettings({
        ...latest,
        saleNotifications: {
          telegramEnabled,
          telegramBotToken,
          telegramChatId,
          discordEnabled,
          discordWebhookUrl,
          webhookEnabled,
          webhookUrl,
          webhookSigningSecret,
          includeSandboxSales,
        },
        updatedAt: new Date().toISOString(),
      });
    });

    res.json({ saleNotifications: buildSaleNotificationsSummary(updated) });
  });

  app.post('/api/admin/notifications/test', requireAdmin, async (req: Request, res: Response) => {
    const { channel } = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      channel?: unknown;
    };
    if (channel !== 'telegram' && channel !== 'discord' && channel !== 'webhook') {
      res.status(400).json({ error: 'Channel must be telegram, discord, or webhook.' });
      return;
    }

    const result = await sendTestSaleNotification(channel as NotificationChannel, readSettings());
    if (!result.ok) {
      res.status(400).json({ error: result.message, result });
      return;
    }

    res.json({ ok: true, result });
  });

  app.put('/api/admin/security', requireAdmin, async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
      username?: unknown;
      password?: unknown;
      requirePasscode?: unknown;
      adminPath?: unknown;
    };

    const rawUsername = typeof body.username === 'string' ? body.username.trim() : '';
    const rawPassword = typeof body.password === 'string' ? body.password.trim() : '';
    const hasAdminPathUpdate =
      typeof body.adminPath === 'string' && body.adminPath.trim().length > 0;
    const normalizedAdminPath = hasAdminPathUpdate
      ? normalizeAdminPath(body.adminPath as string)
      : undefined;

    if (hasAdminPathUpdate && (!normalizedAdminPath || !isValidAdminPath(normalizedAdminPath))) {
      res.status(400).json({
        error:
          'Secret Admin URL path must be 3–48 lowercase letters, numbers, dashes, or underscores, and cannot use reserved words like api, assets, or orders.',
      });
      return;
    }

    let issuedToken: string | undefined;

    if (rawUsername.length > 0 || rawPassword.length > 0) {
      try {
        issuedToken = await setAdminCredentials({
          username: rawUsername || undefined,
          password: rawPassword || undefined,
        });
      } catch (err) {
        const code = err instanceof Error ? err.message : 'ERROR';
        if (code === 'INVALID_USERNAME') {
          res.status(400).json({
            error:
              'Username must be 3–32 characters using letters, numbers, dots, dashes, or underscores.',
          });
          return;
        }
        if (code === 'PASSWORD_TOO_SHORT') {
          res.status(400).json({ error: 'Admin password must be between 8 and 128 characters.' });
          return;
        }
        if (code === 'PASSWORD_REQUIRED') {
          res.status(400).json({
            error: 'Set an admin password (at least 8 characters) alongside your username.',
          });
          return;
        }
        if (code === 'MANAGED_BY_ENV') {
          res.status(409).json({ error: 'Admin credentials are managed by server configuration.' });
          return;
        }
        res.status(400).json({ error: 'Could not update admin credentials.' });
        return;
      }
    }

    if (typeof body.requirePasscode === 'boolean') {
      const statusAfterPw = getAdminAuthStatus();
      if (body.requirePasscode && !statusAfterPw.hasPasscode) {
        res.status(400).json({
          error: 'Set an admin password (at least 8 characters) before requiring login.',
        });
        return;
      }
    }

    let latestSettings = readSettings();
    if (typeof body.requirePasscode === 'boolean' || normalizedAdminPath) {
      latestSettings = await withStoreLock(() => {
        const current = readSettings();
        return writeSettings({
          ...current,
          adminOpenAccess:
            typeof body.requirePasscode === 'boolean'
              ? !body.requirePasscode
              : current.adminOpenAccess,
          adminPath: normalizedAdminPath || current.adminPath || DEFAULT_ADMIN_PATH,
          updatedAt: new Date().toISOString(),
        });
      });

      if (body.requirePasscode === true && !issuedToken && !extractBearerToken(req)) {
        issuedToken = createAdminSession();
      }
    }

    res.json({
      authStatus: getAdminAuthStatus(),
      adminUsername: getStoredAdminUsername(),
      adminPath: latestSettings.adminPath || DEFAULT_ADMIN_PATH,
      token: issuedToken,
    });
  });

  app.put('/api/admin/preferences', requireAdmin, async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;

    const currentSettings = readSettings();
    const effectiveEnabled =
      typeof body.supportLinkEnabled === 'boolean'
        ? body.supportLinkEnabled
        : currentSettings.preferences.supportLinkEnabled;
    const effectiveTitle =
      typeof body.supportLinkTitle === 'string'
        ? body.supportLinkTitle.trim()
        : currentSettings.preferences.supportLinkTitle;
    const effectiveUrl =
      typeof body.supportLinkUrl === 'string'
        ? body.supportLinkUrl.trim()
        : currentSettings.preferences.supportLinkUrl;

    if (effectiveEnabled) {
      if (effectiveUrl !== '' && !isSafeSupportLinkUrl(effectiveUrl)) {
        res.status(400).json({
          error: 'Support link URL must start with https://, http://, mailto:, or tg: and be valid.',
        });
        return;
      }
      if (!effectiveTitle || !isSafeSupportLinkUrl(effectiveUrl)) {
        res.status(400).json({
          error:
            'Please enter both a Support Link Title and a valid URL (https://, http://, mailto:, or tg:), or deactivate the support link.',
        });
        return;
      }
    }

    const updated = await withStoreLock(() => {
      const current = readSettings();
      const nextPreferences = sanitizeStorefrontPreferences(req.body, current.preferences);
      return writeSettings({
        ...current,
        storefrontLanguage: nextPreferences.language,
        preferences: nextPreferences,
        updatedAt: new Date().toISOString(),
      });
    });

    const {
      webhookSecret: _omitSecret,
      saleNotifications: _omitNotif,
      ...safeSettings
    } = updated;
    res.json({ preferences: updated.preferences, settings: safeSettings });
  });

  app.post('/api/admin/orders/:orderId/confirm', requireAdmin, async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId || '').trim().toUpperCase();
    const { txid } = req.body as { txid?: unknown };
    const cleanTxid =
      typeof txid === 'string' && isValidTxid(txid)
        ? txid.trim().toLowerCase()
        : crypto.randomBytes(32).toString('hex');

    try {
      const { order } = await confirmAndNotify({
        orderId,
        txid: cleanTxid,
        confirmations: 1,
        verificationMethod: 'admin',
      });
      res.json({ confirmed: true, orderId: order.id, deliveredCodeId: order.deliveredCodeId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ERROR';
      res.status(409).json({ error: `Could not confirm order: ${msg}` });
    }
  });

  app.post('/api/admin/promos', requireAdmin, async (req: Request, res: Response) => {
    const body = req.body as {
      code?: unknown;
      discountType?: unknown;
      discountValue?: unknown;
      productId?: unknown;
      maxUses?: unknown;
      expiresAt?: unknown;
    };

    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const discountType = body.discountType === 'fixed' ? 'fixed' : 'percent';
    const discountValue =
      typeof body.discountValue === 'number' ? body.discountValue : Number(body.discountValue);

    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
      res.status(400).json({
        error: 'Promo code must be 2–32 characters using letters, numbers, dashes, or underscores.',
      });
      return;
    }

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      (discountType === 'percent' && discountValue > 99) ||
      (discountType === 'fixed' && discountValue > 10000)
    ) {
      res.status(400).json({
        error:
          discountType === 'percent'
            ? 'Percentage discount must be between 1 and 99.'
            : 'Fixed USD discount must be between $0.01 and $10,000.',
      });
      return;
    }

    const productId =
      typeof body.productId === 'string' && body.productId.trim() ? body.productId.trim() : null;

    let maxUses: number | null = null;
    if (body.maxUses !== null && body.maxUses !== undefined && body.maxUses !== '') {
      const parsedMax = Number.parseInt(String(body.maxUses), 10);
      if (!Number.isFinite(parsedMax) || parsedMax < 1 || parsedMax > 1000000) {
        res.status(400).json({ error: 'Max uses must be a positive whole number or left blank.' });
        return;
      }
      maxUses = parsedMax;
    }

    let expiresAt: string | null = null;
    if (typeof body.expiresAt === 'string' && body.expiresAt.trim()) {
      const parsedMs = Date.parse(body.expiresAt.trim());
      if (!Number.isFinite(parsedMs) || parsedMs <= Date.now()) {
        res.status(400).json({ error: 'Expiry date must be a valid future date.' });
        return;
      }
      expiresAt = new Date(parsedMs).toISOString();
    }

    try {
      const promo = await createPromoCodeRecord({
        code,
        discountType,
        discountValue,
        productId,
        maxUses,
        expiresAt,
      });
      res.status(201).json({ promo });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ERROR';
      if (msg === 'DUPLICATE_PROMO_CODE') {
        res.status(409).json({ error: 'A promo code with that name already exists.' });
        return;
      }
      if (msg === 'PRODUCT_NOT_FOUND') {
        res.status(404).json({ error: 'Selected book does not exist.' });
        return;
      }
      res.status(500).json({ error: 'Could not create promo code.' });
    }
  });

  app.patch('/api/admin/promos/:promoId', requireAdmin, async (req: Request, res: Response) => {
    const promoId = String(req.params.promoId || '').trim();
    const { active } = req.body as { active?: unknown };
    if (!promoId || typeof active !== 'boolean') {
      res.status(400).json({ error: 'promoId and boolean active flag are required.' });
      return;
    }
    const updated = await togglePromoCodeActive(promoId, active);
    if (!updated) {
      res.status(404).json({ error: 'Promo code not found.' });
      return;
    }
    res.json({ promo: updated });
  });

  app.delete('/api/admin/promos/:promoId', requireAdmin, async (req: Request, res: Response) => {
    const promoId = String(req.params.promoId || '').trim();
    if (!promoId) {
      res.status(400).json({ error: 'promoId is required.' });
      return;
    }
    const deleted = await deletePromoCodeRecord(promoId);
    if (!deleted) {
      res.status(404).json({ error: 'Promo code not found.' });
      return;
    }
    res.json({ deleted: true });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`dipi Bookstore server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start dipi server:', err);
  process.exit(1);
});
