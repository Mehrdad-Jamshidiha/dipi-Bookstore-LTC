import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import type { MerchantSettings, OrderRecord, SaleNotificationSettings } from './store.ts';

export type NotificationChannel = 'telegram' | 'discord' | 'webhook';

export interface SaleNotificationContext {
  order: OrderRecord;
  storeName: string;
  remainingBookStock: number;
  isTest?: boolean;
}

export interface ChannelDispatchResult {
  channel: NotificationChannel;
  ok: boolean;
  statusCode?: number;
  message: string;
}

const TELEGRAM_BOT_TOKEN_REGEX = /^\d{5,16}:[A-Za-z0-9_-]{20,80}$/;
const TELEGRAM_CHAT_ID_REGEX = /^(-?\d{5,20}|@[A-Za-z0-9_]{4,64})$/;
const DISCORD_ALLOWED_HOSTS = new Set([
  'discord.com',
  'discordapp.com',
  'canary.discord.com',
  'ptb.discord.com',
]);
const DISCORD_WEBHOOK_PATH_REGEX = /^\/api\/(v\d+\/)?webhooks\/\d{15,22}\/[A-Za-z0-9_-]{40,120}$/;

export function isValidTelegramBotToken(token: string): boolean {
  return TELEGRAM_BOT_TOKEN_REGEX.test(token.trim());
}

export function isValidTelegramChatId(chatId: string): boolean {
  return TELEGRAM_CHAT_ID_REGEX.test(chatId.trim());
}

export function isValidDiscordWebhookUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 320) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password || parsed.port) return false;
    if (!DISCORD_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) return false;
    return DISCORD_WEBHOOK_PATH_REGEX.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local & cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a >= 224) return true; // multicast & reserved
  return false;
}

function isPrivateOrReservedIp(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase();
  const family = net.isIP(ip);
  if (family === 4) {
    return isPrivateOrReservedIpv4(ip);
  }
  if (family === 6) {
    if (ip === '::' || ip === '::1') return true;
    // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (ip.startsWith('::ffff:')) {
      const mapped = ip.slice('::ffff:'.length);
      if (net.isIP(mapped) === 4) {
        return isPrivateOrReservedIpv4(mapped);
      }
      return true;
    }
    // Unique local (fc00::/7) and link-local (fe80::/10) and multicast (ff00::/8)
    const firstHextet = Number.parseInt(ip.split(':')[0] || '0', 16);
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7
    if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10
    if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8
    return false;
  }
  return true;
}

export function isValidOutboundWebhookUrlSyntax(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 400) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) return false;
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host === 'metadata.google.internal'
    ) {
      return false;
    }
    if (net.isIP(host) !== 0 && isPrivateOrReservedIp(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function assertPublicDnsResolution(rawUrl: string): Promise<void> {
  const parsed = new URL(rawUrl);
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIP(host) !== 0) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error('Webhook target resolves to a private or reserved IP address.');
    }
    return;
  }
  const records = await dns.lookup(host, { all: true });
  if (!records || records.length === 0) {
    throw new Error('Could not resolve webhook hostname.');
  }
  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error('Webhook target resolves to a private or reserved network address.');
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUsd(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

function formatMethodLabel(method: OrderRecord['verificationMethod']): string {
  switch (method) {
    case 'onchain_poll':
      return 'On-chain auto-poll';
    case 'onchain_txid':
      return 'On-chain TxID';
    case 'webhook':
      return 'Incoming LTC webhook';
    case 'sandbox':
      return 'Sandbox simulation';
    case 'admin':
      return 'Manual admin confirm';
    default:
      return 'Verified';
  }
}

function buildSalePayload(ctx: SaleNotificationContext) {
  const { order, storeName, remainingBookStock, isTest = false } = ctx;
  return {
    event: isTest ? 'order.test' : 'order.confirmed',
    test: isTest,
    timestamp: new Date().toISOString(),
    storeName,
    order: {
      id: order.id,
      productId: order.productId,
      bookTitle: order.bookTitle,
      originalPriceUsd: order.originalPriceUsd ?? order.priceUsd,
      discountUsd: order.discountUsd ?? 0,
      promoCode: order.promoCode ?? null,
      priceUsd: order.priceUsd,
      expectedLtc: order.expectedLtc,
      ltcRateUsd: order.ltcRateUsd,
      network: order.network,
      txid: order.txid,
      confirmations: order.confirmations,
      verificationMethod: order.verificationMethod,
      deliveredCodeId: order.deliveredCodeId,
      remainingBookStock,
      confirmedAt: order.confirmedAt,
    },
  };
}

async function sendTelegramNotification(
  cfg: SaleNotificationSettings,
  ctx: SaleNotificationContext
): Promise<ChannelDispatchResult> {
  const token = cfg.telegramBotToken.trim();
  const chatId = cfg.telegramChatId.trim();
  if (!isValidTelegramBotToken(token) || !isValidTelegramChatId(chatId)) {
    return {
      channel: 'telegram',
      ok: false,
      message: 'Telegram Bot Token or Chat ID is missing or invalid.',
    };
  }

  const { order, storeName, remainingBookStock, isTest = false } = ctx;
  const lines = [
    isTest
      ? `<b>🧪 Test Sale Alert — ${escapeHtml(storeName)}</b>`
      : `<b>✅ New Litecoin Sale — ${escapeHtml(storeName)}</b>`,
    '',
    `<b>Book:</b> ${escapeHtml(order.bookTitle)}`,
    `<b>Amount:</b> ${escapeHtml(formatUsd(order.priceUsd))} USD (${escapeHtml(order.expectedLtc)} LTC)`,
  ];

  if (order.promoCode && (order.discountUsd ?? 0) > 0) {
    lines.push(
      `<b>Promo:</b> <code>${escapeHtml(order.promoCode)}</code> (-${escapeHtml(formatUsd(order.discountUsd ?? 0))})`
    );
  }

  lines.push(
    `<b>Order:</b> <code>${escapeHtml(order.id)}</code>`,
    `<b>Method:</b> ${escapeHtml(formatMethodLabel(order.verificationMethod))}`,
    `<b>Remaining Stock:</b> ${remainingBookStock} code${remainingBookStock === 1 ? '' : 's'}`
  );

  if (order.txid) {
    const shortTx =
      order.txid.length > 20
        ? `${order.txid.slice(0, 10)}…${order.txid.slice(-8)}`
        : order.txid;
    lines.push(`<b>TxID:</b> <code>${escapeHtml(shortTx)}</code>`);
  }

  try {
    // Hardcoded Telegram API host — never accepts user-supplied URLs
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(6000),
    });

    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
    } | null;

    if (!res.ok || data?.ok === false) {
      const desc = data?.description ? `: ${data.description}` : '';
      return {
        channel: 'telegram',
        ok: false,
        statusCode: res.status,
        message: `Telegram API returned HTTP ${res.status}${desc}`,
      };
    }

    return {
      channel: 'telegram',
      ok: true,
      statusCode: res.status,
      message: 'Telegram notification delivered.',
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Request failed';
    return {
      channel: 'telegram',
      ok: false,
      message: `Telegram delivery failed (${reason}).`,
    };
  }
}

async function sendDiscordNotification(
  cfg: SaleNotificationSettings,
  ctx: SaleNotificationContext
): Promise<ChannelDispatchResult> {
  const url = cfg.discordWebhookUrl.trim();
  if (!isValidDiscordWebhookUrl(url)) {
    return {
      channel: 'discord',
      ok: false,
      message: 'Discord Webhook URL is missing or invalid.',
    };
  }

  const { order, storeName, remainingBookStock, isTest = false } = ctx;
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Book', value: order.bookTitle.slice(0, 256), inline: false },
    {
      name: 'Amount',
      value: `${formatUsd(order.priceUsd)} USD (${order.expectedLtc} LTC)`,
      inline: true,
    },
    { name: 'Order ID', value: `\`${order.id}\``, inline: true },
    {
      name: 'Verification',
      value: formatMethodLabel(order.verificationMethod),
      inline: true,
    },
    {
      name: 'Remaining Stock',
      value: `${remainingBookStock} code${remainingBookStock === 1 ? '' : 's'}`,
      inline: true,
    },
  ];

  if (order.promoCode && (order.discountUsd ?? 0) > 0) {
    fields.push({
      name: 'Promo Code',
      value: `\`${order.promoCode}\` (-${formatUsd(order.discountUsd ?? 0)})`,
      inline: true,
    });
  }

  if (order.txid) {
    const shortTx =
      order.txid.length > 20
        ? `${order.txid.slice(0, 12)}…${order.txid.slice(-8)}`
        : order.txid;
    fields.push({ name: 'TxID', value: `\`${shortTx}\``, inline: false });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: isTest
              ? `Test Sale Alert — ${storeName}`
              : `New Litecoin Sale — ${storeName}`,
            color: isTest ? 0x1e40af : 0x0f766e,
            fields,
            footer: { text: `${storeName} · Litecoin ${order.network}` },
            timestamp: order.confirmedAt || new Date().toISOString(),
          },
        ],
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return {
        channel: 'discord',
        ok: false,
        statusCode: res.status,
        message: `Discord webhook returned HTTP ${res.status}.`,
      };
    }

    return {
      channel: 'discord',
      ok: true,
      statusCode: res.status,
      message: `Discord notification delivered (HTTP ${res.status}).`,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Request failed';
    return {
      channel: 'discord',
      ok: false,
      message: `Discord delivery failed (${reason}).`,
    };
  }
}

async function sendGenericWebhookNotification(
  cfg: SaleNotificationSettings,
  ctx: SaleNotificationContext
): Promise<ChannelDispatchResult> {
  const url = cfg.webhookUrl.trim();
  if (!isValidOutboundWebhookUrlSyntax(url)) {
    return {
      channel: 'webhook',
      ok: false,
      message: 'Outbound webhook URL must be a public HTTPS URL.',
    };
  }

  try {
    await assertPublicDnsResolution(url);
  } catch (err) {
    return {
      channel: 'webhook',
      ok: false,
      message: err instanceof Error ? err.message : 'Webhook target blocked by network policy.',
    };
  }

  const payloadObj = buildSalePayload(ctx);
  const rawBody = JSON.stringify(payloadObj);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'dipi-SaleNotifier/1.0',
    'X-dipi-Event': payloadObj.event,
  };

  const secret = cfg.webhookSigningSecret.trim();
  if (secret) {
    const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    headers['X-dipi-Signature'] = `sha256=${sig}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: rawBody,
      redirect: 'error',
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return {
        channel: 'webhook',
        ok: false,
        statusCode: res.status,
        message: `Webhook endpoint returned HTTP ${res.status}.`,
      };
    }

    return {
      channel: 'webhook',
      ok: true,
      statusCode: res.status,
      message: `Outbound webhook delivered (HTTP ${res.status}).`,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Request failed';
    return {
      channel: 'webhook',
      ok: false,
      message: `Outbound webhook failed (${reason}).`,
    };
  }
}

export async function sendTestSaleNotification(
  channel: NotificationChannel,
  settings: MerchantSettings
): Promise<ChannelDispatchResult> {
  const nowIso = new Date().toISOString();
  const sampleOrder: OrderRecord = {
    id: 'SK-TEST0001',
    orderTokenHash: '',
    buyerId: null,
    productId: 'book_sample',
    bookTitle: 'Sample Digital Edition',
    bookWriter: 'Demo Author',
    bookTranslator: '',
    bookPublication: 'dipi Press',
    originalPriceUsd: 12.0,
    discountUsd: 2.0,
    promoCodeId: null,
    promoCode: 'WELCOME2',
    priceUsd: 10.0,
    ltcRateUsd: 88.5,
    expectedLtc: '0.11299435',
    expectedLitoshis: 11299435,
    receivingAddress: settings.receivingAddress,
    network: settings.network,
    minConfirmations: settings.minConfirmations,
    status: 'confirmed',
    customerEmail: null,
    reservedCodeId: null,
    deliveredCodeId: 'code_test',
    deliveredCode: null,
    txid: '0'.repeat(56) + 'deadbeef',
    confirmations: settings.minConfirmations,
    verificationMethod: 'sandbox',
    createdAt: nowIso,
    expiresAt: nowIso,
    confirmedAt: nowIso,
  };

  const ctx: SaleNotificationContext = {
    order: sampleOrder,
    storeName: settings.preferences.storeName || 'dipi',
    remainingBookStock: 7,
    isTest: true,
  };

  switch (channel) {
    case 'telegram':
      return sendTelegramNotification(settings.saleNotifications, ctx);
    case 'discord':
      return sendDiscordNotification(settings.saleNotifications, ctx);
    case 'webhook':
      return sendGenericWebhookNotification(settings.saleNotifications, ctx);
  }
}

export async function dispatchSaleNotifications(
  settings: MerchantSettings,
  ctx: SaleNotificationContext
): Promise<ChannelDispatchResult[]> {
  const cfg = settings.saleNotifications;
  if (!cfg) return [];

  if (ctx.order.verificationMethod === 'sandbox' && !cfg.includeSandboxSales) {
    return [];
  }

  const tasks: Array<Promise<ChannelDispatchResult>> = [];
  if (cfg.telegramEnabled) {
    tasks.push(sendTelegramNotification(cfg, ctx));
  }
  if (cfg.discordEnabled) {
    tasks.push(sendDiscordNotification(cfg, ctx));
  }
  if (cfg.webhookEnabled) {
    tasks.push(sendGenericWebhookNotification(cfg, ctx));
  }

  if (tasks.length === 0) {
    return [];
  }

  return Promise.all(tasks);
}

export function maskSecretTail(secret: string): string | null {
  const trimmed = secret.trim();
  if (!trimmed) return null;
  return trimmed.length >= 4 ? `••••${trimmed.slice(-4)}` : '••••';
}
