import type {
  AdminAuthStatus,
  AdminBookRecord,
  AdminOverviewResponse,
  CatalogResponse,
  OpenOrderSummary,
  OrderStatus,
  OrderView,
  PromoCodeRecord,
  PromoDiscountType,
  SaleNotificationSummary,
  StorefrontPreferences,
} from './types';

// Kept strictly in JS memory as a fallback when third-party cookies are restricted
let buyerSessionToken: string | null = null;

export class OpenOrderConflictError extends Error {
  readonly openOrder: OpenOrderSummary;

  constructor(message: string, openOrder: OpenOrderSummary) {
    super(message);
    this.name = 'OpenOrderConflictError';
    this.openOrder = openOrder;
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchCatalog(): Promise<CatalogResponse> {
  const res = await fetch('/api/products');
  return parseJsonResponse<CatalogResponse>(res);
}

export async function createOrder(params: {
  productId: string;
  customerEmail?: string;
}): Promise<{ order: OrderView; orderToken: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'dipi',
  };
  if (buyerSessionToken) {
    headers['X-Buyer-Session'] = buyerSessionToken;
  }

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = (await res.json().catch(() => ({}))) as {
    order?: OrderView;
    orderToken?: string;
    buyerSession?: string;
    code?: string;
    openOrder?: OpenOrderSummary;
    error?: string;
  };

  if (typeof data.buyerSession === 'string' && data.buyerSession) {
    buyerSessionToken = data.buyerSession;
  }

  if (res.status === 409 && data.code === 'OPEN_ORDER_EXISTS' && data.openOrder) {
    throw new OpenOrderConflictError(
      data.error || 'You already have an open order. Cancel it before starting a new order.',
      data.openOrder
    );
  }

  if (!res.ok || !data.order || !data.orderToken) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return { order: data.order, orderToken: data.orderToken };
}

export async function cancelOrder(
  orderId: string,
  orderToken?: string
): Promise<{ cancelled: boolean; order: OrderView }> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'dipi',
  };
  if (orderToken) {
    headers['X-Order-Token'] = orderToken;
  }
  if (buyerSessionToken) {
    headers['X-Buyer-Session'] = buyerSessionToken;
  }

  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    headers,
  });
  return parseJsonResponse<{ cancelled: boolean; order: OrderView }>(res);
}

export async function applyOrderPromo(
  orderId: string,
  orderToken: string,
  code: string
): Promise<{ order: OrderView }> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/promo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Order-Token': orderToken,
    },
    body: JSON.stringify({ code }),
  });
  return parseJsonResponse<{ order: OrderView }>(res);
}

export async function removeOrderPromo(
  orderId: string,
  orderToken: string
): Promise<{ order: OrderView }> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/promo`, {
    method: 'DELETE',
    headers: {
      'X-Order-Token': orderToken,
    },
  });
  return parseJsonResponse<{ order: OrderView }>(res);
}

export async function fetchOrder(orderId: string, orderToken: string): Promise<{ order: OrderView }> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    headers: { 'X-Order-Token': orderToken },
  });
  return parseJsonResponse<{ order: OrderView }>(res);
}

export async function pollOrderStatus(
  orderId: string,
  orderToken: string
): Promise<{
  status: OrderStatus;
  message: string;
  detectedTxid?: string | null;
  confirmations?: number;
  order: OrderView;
}> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/poll`, {
    headers: { 'X-Order-Token': orderToken },
  });
  return parseJsonResponse(res);
}

export async function verifyOrderTxid(
  orderId: string,
  orderToken: string,
  txid: string
): Promise<{ verified: boolean; message: string; order: OrderView }> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/verify-tx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Order-Token': orderToken,
    },
    body: JSON.stringify({ txid }),
  });
  return parseJsonResponse(res);
}

export async function sandboxConfirmOrder(
  orderId: string,
  orderToken: string
): Promise<{ verified: boolean; message: string; order: OrderView }> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/sandbox-confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Order-Token': orderToken,
    },
  });
  return parseJsonResponse(res);
}

export async function downloadOrderFile(
  orderId: string,
  orderToken: string,
  format: 'txt' | 'json'
): Promise<void> {
  const res = await fetch(
    `/api/orders/${encodeURIComponent(orderId)}/download?format=${format}`,
    {
      headers: { 'X-Order-Token': orderToken },
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'Could not download file.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `dipi-${orderId.toLowerCase()}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// --- Admin Vault API ---

function adminHeaders(token?: string | null, includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function checkAdminRoute(candidatePath: string): Promise<{ valid: boolean }> {
  const res = await fetch('/api/admin/route-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: candidatePath }),
  });
  if (!res.ok) {
    return { valid: false };
  }
  return parseJsonResponse<{ valid: boolean }>(res);
}

export async function fetchAdminStatus(): Promise<AdminAuthStatus> {
  const res = await fetch('/api/admin/status');
  return parseJsonResponse<AdminAuthStatus>(res);
}

export async function bootstrapAdmin(payload: {
  username: string;
  password: string;
  adminPath?: string;
  requirePasscode?: boolean;
  completeSetupNow?: boolean;
}): Promise<{ token: string; authStatus: AdminAuthStatus; adminPath: string }> {
  const res = await fetch('/api/admin/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<{ token: string; authStatus: AdminAuthStatus; adminPath: string }>(res);
}

export async function loginAdmin(payload: {
  username?: string;
  password: string;
}): Promise<{ token: string; authStatus: AdminAuthStatus }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<{ token: string; authStatus: AdminAuthStatus }>(res);
}

export async function completeAdminSetup(
  token: string | null
): Promise<{ ok: boolean; authStatus: AdminAuthStatus }> {
  const res = await fetch('/api/admin/setup/complete', {
    method: 'POST',
    headers: adminHeaders(token, true),
  });
  return parseJsonResponse<{ ok: boolean; authStatus: AdminAuthStatus }>(res);
}

export async function logoutAdmin(token: string): Promise<void> {
  await fetch('/api/admin/logout', {
    method: 'POST',
    headers: adminHeaders(token),
  }).catch(() => {});
}

export async function fetchAdminOverview(token?: string | null): Promise<AdminOverviewResponse> {
  const res = await fetch('/api/admin/overview', {
    headers: adminHeaders(token),
  });
  return parseJsonResponse<AdminOverviewResponse>(res);
}

export async function addAdminCodes(
  token: string | null,
  productId: string,
  codes: string[]
): Promise<{ addedCount: number; skippedDuplicates: number }> {
  const res = await fetch('/api/admin/codes', {
    method: 'POST',
    headers: adminHeaders(token, true),
    body: JSON.stringify({ productId, codes }),
  });
  return parseJsonResponse(res);
}

export async function deleteAdminCode(token: string | null, codeId: string): Promise<void> {
  const res = await fetch(`/api/admin/codes/${encodeURIComponent(codeId)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  await parseJsonResponse(res);
}

export async function uploadAdminCover(
  token: string | null,
  file: File
): Promise<{ coverUrl: string }> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, or WebP image file.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Cover image must be 5 MB or smaller.');
  }

  const headers: Record<string, string> = {
    'Content-Type': file.type,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch('/api/admin/covers', {
    method: 'POST',
    headers,
    body: file,
  });
  return parseJsonResponse<{ coverUrl: string }>(res);
}

export async function createAdminBook(
  token: string | null,
  payload: {
    title: string;
    subject?: string;
    description?: string;
    writer: string;
    translator: string;
    publication: string;
    priceUsd: number;
    coverUrl: string;
    redemptionInstructions?: string;
  }
): Promise<{ book: AdminBookRecord }> {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: adminHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<{ book: AdminBookRecord }>(res);
}

export async function updateAdminBook(
  token: string | null,
  bookId: string,
  payload: {
    title: string;
    subject?: string;
    description?: string;
    writer: string;
    translator: string;
    publication: string;
    priceUsd: number;
    coverUrl?: string;
    redemptionInstructions?: string;
  }
): Promise<void> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(bookId)}`, {
    method: 'PUT',
    headers: adminHeaders(token, true),
    body: JSON.stringify(payload),
  });
  await parseJsonResponse(res);
}

export async function deleteAdminBook(
  token: string | null,
  bookId: string
): Promise<{ deleted: boolean; removedUnusedCodes: number }> {
  const res = await fetch(`/api/admin/products/${encodeURIComponent(bookId)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  return parseJsonResponse(res);
}

export async function updateAdminSettings(
  token: string | null,
  payload: {
    receivingAddress?: string;
    network?: 'mainnet' | 'testnet';
    minConfirmations?: number;
    allowSandbox?: boolean;
    autoDownloadReceipt?: boolean;
    orderExpiryMinutes?: number;
    ltcRateMode?: 'live' | 'manual';
    manualLtcRateUsd?: number;
    quoteSpreadPercent?: number;
    quoteCacheSeconds?: number;
    webhookSecret?: string;
    clearWebhookSecret?: boolean;
  }
): Promise<void> {
  const res = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: adminHeaders(token, true),
    body: JSON.stringify(payload),
  });
  await parseJsonResponse(res);
}

export async function updateAdminSecurity(
  token: string | null,
  payload: {
    username?: string;
    password?: string;
    adminPath?: string;
    requirePasscode?: boolean;
  }
): Promise<{
  authStatus: AdminAuthStatus;
  adminUsername: string | null;
  adminPath: string;
  token?: string;
}> {
  const res = await fetch('/api/admin/security', {
    method: 'PUT',
    headers: adminHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

export async function updateAdminNotifications(
  token: string | null,
  payload: {
    telegramEnabled?: boolean;
    telegramBotToken?: string;
    clearTelegramBotToken?: boolean;
    telegramChatId?: string;
    discordEnabled?: boolean;
    discordWebhookUrl?: string;
    clearDiscordWebhookUrl?: boolean;
    webhookEnabled?: boolean;
    webhookUrl?: string;
    webhookSigningSecret?: string;
    clearWebhookSigningSecret?: boolean;
    includeSandboxSales?: boolean;
  }
): Promise<{ saleNotifications: SaleNotificationSummary }> {
  const res = await fetch('/api/admin/notifications', {
    method: 'PUT',
    headers: adminHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res);
}

export async function sendAdminTestNotification(
  token: string | null,
  channel: 'telegram' | 'discord' | 'webhook'
): Promise<{ ok: boolean; result: { channel: string; ok: boolean; message: string } }> {
  const res = await fetch('/api/admin/notifications/test', {
    method: 'POST',
    headers: adminHeaders(token, true),
    body: JSON.stringify({ channel }),
  });
  return parseJsonResponse(res);
}

export async function updateAdminPreferences(
  token: string | null,
  payload: StorefrontPreferences
): Promise<{ preferences: StorefrontPreferences }> {
  const res = await fetch('/api/admin/preferences', {
    method: 'PUT',
    headers: adminHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<{ preferences: StorefrontPreferences }>(res);
}

export async function uploadAdminBackground(
  token: string | null,
  file: File
): Promise<{ backgroundImageUrl: string }> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, or WebP image file.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Background image must be 5 MB or smaller.');
  }

  const headers: Record<string, string> = {
    'Content-Type': file.type,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch('/api/admin/backgrounds', {
    method: 'POST',
    headers,
    body: file,
  });
  return parseJsonResponse<{ backgroundImageUrl: string }>(res);
}

export async function uploadAdminLogo(
  token: string | null,
  file: File
): Promise<{ logoUrl: string }> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG, or WebP logo file.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Logo image must be 5 MB or smaller.');
  }

  const headers: Record<string, string> = {
    'Content-Type': file.type,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch('/api/admin/logos', {
    method: 'POST',
    headers,
    body: file,
  });
  return parseJsonResponse<{ logoUrl: string }>(res);
}

export async function adminConfirmOrder(
  token: string | null,
  orderId: string,
  txid?: string
): Promise<void> {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/confirm`, {
    method: 'POST',
    headers: adminHeaders(token, true),
    body: JSON.stringify({ txid }),
  });
  await parseJsonResponse(res);
}

export async function createAdminPromo(
  token: string | null,
  payload: {
    code: string;
    discountType: PromoDiscountType;
    discountValue: number;
    productId: string | null;
    maxUses: number | null;
    expiresAt: string | null;
  }
): Promise<{ promo: PromoCodeRecord }> {
  const res = await fetch('/api/admin/promos', {
    method: 'POST',
    headers: adminHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<{ promo: PromoCodeRecord }>(res);
}

export async function toggleAdminPromo(
  token: string | null,
  promoId: string,
  active: boolean
): Promise<{ promo: PromoCodeRecord }> {
  const res = await fetch(`/api/admin/promos/${encodeURIComponent(promoId)}`, {
    method: 'PATCH',
    headers: adminHeaders(token, true),
    body: JSON.stringify({ active }),
  });
  return parseJsonResponse<{ promo: PromoCodeRecord }>(res);
}

export async function deleteAdminPromo(token: string | null, promoId: string): Promise<void> {
  const res = await fetch(`/api/admin/promos/${encodeURIComponent(promoId)}`, {
    method: 'DELETE',
    headers: adminHeaders(token),
  });
  await parseJsonResponse(res);
}

export async function downloadAdminCodesJson(token?: string | null): Promise<void> {
  const res = await fetch('/api/admin/codes-json', {
    headers: adminHeaders(token),
  });
  if (!res.ok) {
    throw new Error('Could not export codes.json');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'codes.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
