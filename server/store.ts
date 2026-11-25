import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface BookProductRecord {
  id: string;
  title: string;
  subject: string;
  description: string;
  writer: string;
  translator: string;
  publication: string;
  priceUsd: number;
  coverUrl: string;
  deliveryFormat: string;
  redemptionInstructions: string;
}

export interface DigitalCodeRecord {
  id: string;
  productId: string;
  code: string;
  used: boolean;
  usedAt: string | null;
  orderId: string | null;
  txid: string | null;
  createdAt: string;
}

export interface CodesJsonFile {
  schemaVersion: number;
  updatedAt: string;
  products: BookProductRecord[];
  codes: DigitalCodeRecord[];
}

export type OrderStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled';

export type PromoDiscountType = 'percent' | 'fixed';

export interface PromoCodeRecord {
  id: string;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  productId: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface PromosJsonFile {
  updatedAt: string;
  promos: PromoCodeRecord[];
}

export interface OrderRecord {
  id: string;
  orderTokenHash: string;
  buyerId?: string | null;
  productId: string;
  bookTitle: string;
  bookWriter: string;
  bookTranslator: string;
  bookPublication: string;
  originalPriceUsd?: number;
  discountUsd?: number;
  promoCodeId?: string | null;
  promoCode?: string | null;
  priceUsd: number;
  ltcRateUsd: number;
  expectedLtc: string;
  expectedLitoshis: number;
  receivingAddress: string;
  network: 'mainnet' | 'testnet';
  minConfirmations: number;
  status: OrderStatus;
  customerEmail: string | null;
  reservedCodeId: string | null;
  deliveredCodeId: string | null;
  deliveredCode: string | null;
  txid: string | null;
  confirmations: number;
  verificationMethod: 'onchain_poll' | 'onchain_txid' | 'webhook' | 'sandbox' | 'admin' | null;
  createdAt: string;
  expiresAt: string;
  confirmedAt: string | null;
}

export class OpenOrderExistsError extends Error {
  readonly openOrder: OrderRecord;

  constructor(openOrder: OrderRecord) {
    super('OPEN_ORDER_EXISTS');
    this.name = 'OpenOrderExistsError';
    this.openOrder = openOrder;
  }
}

export interface OrdersJsonFile {
  updatedAt: string;
  orders: OrderRecord[];
}

export type TitleFontChoice = 'b-titr' | 'lalezar' | 'playfair' | 'vazirmatn' | 'dm-sans';
export type BodyFontChoice = 'default' | 'vazirmatn' | 'dm-sans' | 'serif' | 'mono';
export type CardRadiusChoice = 'sharp' | 'rounded' | 'soft';
export type LogoDisplayMode = 'logo-and-text' | 'logo-only' | 'text-only';
export type MobileCardStyle = 'standard' | 'horizontal' | 'compact' | 'cover-focus';
export type MobileGridGap = 'tight' | 'normal' | 'airy';
export type BookDescriptionMode = 'none' | 'detail-modal' | 'cover-flip' | 'checkout-accordion';

export interface StorefrontPreferences {
  storeName: string;
  pageTitle: string;
  logoUrl: string;
  logoDisplayMode: LogoDisplayMode;
  language: 'en' | 'fa';
  backgroundColor: string;
  backgroundImageUrl: string;
  backgroundOverlayOpacity: number;
  surfaceColor: string;
  textColor: string;
  accentColor: string;
  titleFont: TitleFontChoice;
  bodyFont: BodyFontChoice;
  gridColumns: 2 | 3 | 4;
  cardRadius: CardRadiusChoice;
  mobileGridColumns: 1 | 2;
  mobileCardStyle: MobileCardStyle;
  mobileGridGap: MobileGridGap;
  mobileShowMetadata: boolean;
  showSearchBar: boolean;
  showCategoryFilter: boolean;
  showSortControl: boolean;
  descriptionDisplayMode: BookDescriptionMode;
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceHideCatalog: boolean;
  supportLinkEnabled: boolean;
  supportLinkTitle: string;
  supportLinkUrl: string;
}

export const DEFAULT_STOREFRONT_PREFERENCES: StorefrontPreferences = {
  storeName: 'dipi',
  pageTitle: 'dipi — Digital Bookstore Settled in Litecoin',
  logoUrl: '',
  logoDisplayMode: 'logo-and-text',
  language: 'en',
  backgroundColor: '#FAF9F6',
  backgroundImageUrl: '',
  backgroundOverlayOpacity: 0.72,
  surfaceColor: '#FFFFFF',
  textColor: '#181614',
  accentColor: '#1E40AF',
  titleFont: 'b-titr',
  bodyFont: 'default',
  gridColumns: 3,
  cardRadius: 'rounded',
  mobileGridColumns: 1,
  mobileCardStyle: 'standard',
  mobileGridGap: 'normal',
  mobileShowMetadata: true,
  showSearchBar: true,
  showCategoryFilter: true,
  showSortControl: true,
  descriptionDisplayMode: 'detail-modal',
  maintenanceMode: false,
  maintenanceTitle: '',
  maintenanceMessage: '',
  maintenanceHideCatalog: false,
  supportLinkEnabled: false,
  supportLinkTitle: '',
  supportLinkUrl: '',
};

const SAFE_SUPPORT_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tg:']);

export function isSafeSupportLinkUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 300) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    if (!SAFE_SUPPORT_PROTOCOLS.has(parsed.protocol)) {
      return false;
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return Boolean(parsed.hostname);
    }
    if (parsed.protocol === 'mailto:') {
      return parsed.pathname.trim().length > 0;
    }
    if (parsed.protocol === 'tg:') {
      return Boolean(parsed.hostname || parsed.pathname.replace(/^\/+/, ''));
    }
    return false;
  } catch {
    return false;
  }
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const SAFE_BG_URL_REGEX = /^\/api\/backgrounds\/bg_[a-f0-9]{16}\.(jpg|png|webp)$/;
const SAFE_LOGO_URL_REGEX = /^\/api\/logos\/logo_[a-f0-9]{16}\.(jpg|png|webp)$/;
const VALID_LOGO_MODES: ReadonlySet<LogoDisplayMode> = new Set([
  'logo-and-text',
  'logo-only',
  'text-only',
]);
const VALID_MOBILE_STYLES: ReadonlySet<MobileCardStyle> = new Set([
  'standard',
  'horizontal',
  'compact',
  'cover-focus',
]);
const VALID_MOBILE_GAPS: ReadonlySet<MobileGridGap> = new Set(['tight', 'normal', 'airy']);
const VALID_TITLE_FONTS: ReadonlySet<TitleFontChoice> = new Set([
  'b-titr',
  'lalezar',
  'playfair',
  'vazirmatn',
  'dm-sans',
]);
const VALID_BODY_FONTS: ReadonlySet<BodyFontChoice> = new Set([
  'default',
  'vazirmatn',
  'dm-sans',
  'serif',
  'mono',
]);
const VALID_RADII: ReadonlySet<CardRadiusChoice> = new Set(['sharp', 'rounded', 'soft']);
const VALID_DESCRIPTION_MODES: ReadonlySet<BookDescriptionMode> = new Set([
  'none',
  'detail-modal',
  'cover-flip',
  'checkout-accordion',
]);

export function sanitizeStorefrontPreferences(
  raw: unknown,
  fallback: StorefrontPreferences = DEFAULT_STOREFRONT_PREFERENCES
): StorefrontPreferences {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const storeNameRaw = typeof input.storeName === 'string' ? input.storeName.trim().slice(0, 40) : '';
  const storeName = storeNameRaw || fallback.storeName;

  const pageTitleRaw =
    typeof input.pageTitle === 'string' ? input.pageTitle.trim().slice(0, 120) : '';
  const pageTitle = pageTitleRaw || fallback.pageTitle;

  let logoUrl = fallback.logoUrl;
  if (typeof input.logoUrl === 'string') {
    const trimmed = input.logoUrl.trim();
    if (trimmed === '' || SAFE_LOGO_URL_REGEX.test(trimmed)) {
      logoUrl = trimmed;
    }
  }

  const logoDisplayMode: LogoDisplayMode =
    typeof input.logoDisplayMode === 'string' &&
    VALID_LOGO_MODES.has(input.logoDisplayMode as LogoDisplayMode)
      ? (input.logoDisplayMode as LogoDisplayMode)
      : fallback.logoDisplayMode;

  const language: 'en' | 'fa' =
    input.language === 'fa' ? 'fa' : input.language === 'en' ? 'en' : fallback.language;

  const pickHex = (val: unknown, fb: string): string =>
    typeof val === 'string' && HEX_COLOR_REGEX.test(val.trim()) ? val.trim().toUpperCase() : fb;

  const backgroundColor = pickHex(input.backgroundColor, fallback.backgroundColor);
  const surfaceColor = pickHex(input.surfaceColor, fallback.surfaceColor);
  const textColor = pickHex(input.textColor, fallback.textColor);
  const accentColor = pickHex(input.accentColor, fallback.accentColor);

  let backgroundImageUrl = fallback.backgroundImageUrl;
  if (typeof input.backgroundImageUrl === 'string') {
    const trimmed = input.backgroundImageUrl.trim();
    if (trimmed === '' || SAFE_BG_URL_REGEX.test(trimmed)) {
      backgroundImageUrl = trimmed;
    }
  }

  let backgroundOverlayOpacity = fallback.backgroundOverlayOpacity;
  if (input.backgroundOverlayOpacity !== undefined) {
    const num = Number(input.backgroundOverlayOpacity);
    if (Number.isFinite(num)) {
      backgroundOverlayOpacity = Math.round(Math.min(0.92, Math.max(0, num)) * 100) / 100;
    }
  }

  const titleFont: TitleFontChoice =
    typeof input.titleFont === 'string' && VALID_TITLE_FONTS.has(input.titleFont as TitleFontChoice)
      ? (input.titleFont as TitleFontChoice)
      : fallback.titleFont;

  const bodyFont: BodyFontChoice =
    typeof input.bodyFont === 'string' && VALID_BODY_FONTS.has(input.bodyFont as BodyFontChoice)
      ? (input.bodyFont as BodyFontChoice)
      : fallback.bodyFont;

  const colsNum = Number(input.gridColumns);
  const gridColumns: 2 | 3 | 4 =
    colsNum === 2 || colsNum === 3 || colsNum === 4 ? colsNum : fallback.gridColumns;

  const cardRadius: CardRadiusChoice =
    typeof input.cardRadius === 'string' && VALID_RADII.has(input.cardRadius as CardRadiusChoice)
      ? (input.cardRadius as CardRadiusChoice)
      : fallback.cardRadius;

  const mobileCardStyle: MobileCardStyle =
    typeof input.mobileCardStyle === 'string' &&
    VALID_MOBILE_STYLES.has(input.mobileCardStyle as MobileCardStyle)
      ? (input.mobileCardStyle as MobileCardStyle)
      : fallback.mobileCardStyle;

  const mobileColsNum = Number(input.mobileGridColumns);
  const rawMobileGridColumns: 1 | 2 =
    mobileColsNum === 1 || mobileColsNum === 2 ? mobileColsNum : fallback.mobileGridColumns;
  const mobileGridColumns: 1 | 2 = mobileCardStyle === 'horizontal' ? 1 : rawMobileGridColumns;

  const mobileGridGap: MobileGridGap =
    typeof input.mobileGridGap === 'string' &&
    VALID_MOBILE_GAPS.has(input.mobileGridGap as MobileGridGap)
      ? (input.mobileGridGap as MobileGridGap)
      : fallback.mobileGridGap;

  const mobileShowMetadata =
    typeof input.mobileShowMetadata === 'boolean'
      ? input.mobileShowMetadata
      : fallback.mobileShowMetadata;

  const showSearchBar =
    typeof input.showSearchBar === 'boolean' ? input.showSearchBar : fallback.showSearchBar;

  const showCategoryFilter =
    typeof input.showCategoryFilter === 'boolean'
      ? input.showCategoryFilter
      : fallback.showCategoryFilter;

  const showSortControl =
    typeof input.showSortControl === 'boolean'
      ? input.showSortControl
      : fallback.showSortControl;

  const descriptionDisplayMode: BookDescriptionMode =
    typeof input.descriptionDisplayMode === 'string' &&
    VALID_DESCRIPTION_MODES.has(input.descriptionDisplayMode as BookDescriptionMode)
      ? (input.descriptionDisplayMode as BookDescriptionMode)
      : fallback.descriptionDisplayMode;

  const maintenanceMode =
    typeof input.maintenanceMode === 'boolean' ? input.maintenanceMode : fallback.maintenanceMode;

  const maintenanceTitle =
    typeof input.maintenanceTitle === 'string'
      ? input.maintenanceTitle.trim().slice(0, 80)
      : fallback.maintenanceTitle;

  const maintenanceMessage =
    typeof input.maintenanceMessage === 'string'
      ? input.maintenanceMessage.trim().slice(0, 320)
      : fallback.maintenanceMessage;

  const maintenanceHideCatalog =
    typeof input.maintenanceHideCatalog === 'boolean'
      ? input.maintenanceHideCatalog
      : fallback.maintenanceHideCatalog;

  const supportLinkEnabled =
    typeof input.supportLinkEnabled === 'boolean'
      ? input.supportLinkEnabled
      : fallback.supportLinkEnabled;

  const supportLinkTitle =
    typeof input.supportLinkTitle === 'string'
      ? input.supportLinkTitle.trim().slice(0, 60)
      : fallback.supportLinkTitle;

  let supportLinkUrl = fallback.supportLinkUrl;
  if (typeof input.supportLinkUrl === 'string') {
    const trimmed = input.supportLinkUrl.trim();
    if (trimmed === '') {
      supportLinkUrl = '';
    } else if (isSafeSupportLinkUrl(trimmed)) {
      supportLinkUrl = trimmed;
    }
  } else if (supportLinkUrl && !isSafeSupportLinkUrl(supportLinkUrl)) {
    supportLinkUrl = '';
  }

  return {
    storeName,
    pageTitle,
    logoUrl,
    logoDisplayMode,
    language,
    backgroundColor,
    backgroundImageUrl,
    backgroundOverlayOpacity,
    surfaceColor,
    textColor,
    accentColor,
    titleFont,
    bodyFont,
    gridColumns,
    cardRadius,
    mobileGridColumns,
    mobileCardStyle,
    mobileGridGap,
    mobileShowMetadata,
    showSearchBar,
    showCategoryFilter,
    showSortControl,
    descriptionDisplayMode,
    maintenanceMode,
    maintenanceTitle,
    maintenanceMessage,
    maintenanceHideCatalog,
    supportLinkEnabled,
    supportLinkTitle,
    supportLinkUrl,
  };
}

export type LtcRateMode = 'live' | 'manual';

export interface SaleNotificationSettings {
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  discordEnabled: boolean;
  discordWebhookUrl: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSigningSecret: string;
  includeSandboxSales: boolean;
}

export const DEFAULT_SALE_NOTIFICATION_SETTINGS: SaleNotificationSettings = {
  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
  discordEnabled: false,
  discordWebhookUrl: '',
  webhookEnabled: false,
  webhookUrl: '',
  webhookSigningSecret: '',
  includeSandboxSales: true,
};

export interface MerchantSettings {
  receivingAddress: string;
  network: 'mainnet' | 'testnet';
  minConfirmations: number;
  allowSandbox: boolean;
  autoDownloadReceipt: boolean;
  orderExpiryMinutes: number;
  ltcRateMode: LtcRateMode;
  manualLtcRateUsd: number;
  quoteSpreadPercent: number;
  quoteCacheSeconds: number;
  saleNotifications: SaleNotificationSettings;
  webhookSecret?: string;
  adminOpenAccess?: boolean;
  adminPath?: string;
  setupCompleted?: boolean;
  setupCompletedAt?: string | null;
  storefrontLanguage: 'en' | 'fa';
  preferences: StorefrontPreferences;
  updatedAt: string;
}

export const DEFAULT_ADMIN_PATH = 'admin';
const ADMIN_PATH_REGEX = /^[a-z0-9][a-z0-9_-]{2,47}$/;
const RESERVED_ADMIN_PATHS = new Set([
  'api',
  'assets',
  'src',
  'data',
  'uploads',
  'covers',
  'logos',
  'backgrounds',
  'orders',
  'order',
  'lookup',
  'books',
  'checkout',
  'webhooks',
  'health',
  'favicon',
  'robots',
  'sitemap',
]);

export function normalizeAdminPath(raw: string): string {
  return raw.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
}

export function isValidAdminPath(raw: string): boolean {
  const normalized = normalizeAdminPath(raw);
  if (!ADMIN_PATH_REGEX.test(normalized)) {
    return false;
  }
  return !RESERVED_ADMIN_PATHS.has(normalized);
}

export interface AdminCredentialFile {
  username?: string;
  saltHex: string;
  hashHex: string;
  claimedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_ORDER_EXPIRY_MINUTES = 20;
const DEFAULT_MANUAL_LTC_RATE_USD = 88.5;
const DEFAULT_QUOTE_SPREAD_PERCENT = 0;
const DEFAULT_QUOTE_CACHE_SECONDS = 60;
const BOOKSTORE_SCHEMA_VERSION = 2;

let lockChain: Promise<void> = Promise.resolve();

export async function withStoreLock<T>(task: () => Promise<T> | T): Promise<T> {
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = lockChain;
  lockChain = previous.then(() => next);
  await previous;
  try {
    return await task();
  } finally {
    release();
  }
}

function resolveDataFile(filename: string): string {
  const safeName = path.basename(filename);
  const resolved = path.resolve(DATA_DIR, safeName);
  if (!resolved.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid storage path');
  }
  return resolved;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function atomicWriteJson(filename: string, payload: unknown): void {
  ensureDataDir();
  const target = resolveDataFile(filename);
  const tempPath = resolveDataFile(`${filename}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  const serialized = JSON.stringify(payload, null, 2) + '\n';
  fs.writeFileSync(tempPath, serialized, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempPath, target);
}

function readJsonFile<T>(filename: string): T | null {
  const target = resolveDataFile(filename);
  if (!fs.existsSync(target)) {
    return null;
  }
  const raw = fs.readFileSync(target, 'utf8');
  return JSON.parse(raw) as T;
}

export const FALLBACK_BOOK_COVER_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297"><rect width="210" height="297" fill="#F2EFE9"/><rect x="18" y="18" width="174" height="261" rx="6" fill="#FAF9F6" stroke="#DBD5CA" stroke-width="2"/><line x1="44" y1="118" x2="166" y2="118" stroke="#D6D0C5" stroke-width="3" stroke-linecap="round"/><line x1="64" y1="140" x2="146" y2="140" stroke="#E6E2DA" stroke-width="3" stroke-linecap="round"/><line x1="78" y1="162" x2="132" y2="162" stroke="#E6E2DA" stroke-width="3" stroke-linecap="round"/></svg>'
  );

function createInitialBookstoreData(): CodesJsonFile {
  const now = new Date().toISOString();
  return {
    schemaVersion: BOOKSTORE_SCHEMA_VERSION,
    updatedAt: now,
    products: [],
    codes: [],
  };
}

export function initializeStore(): void {
  ensureDataDir();
  const existingCodes = readJsonFile<CodesJsonFile>('codes.json');
  if (!existingCodes || existingCodes.schemaVersion !== BOOKSTORE_SCHEMA_VERSION) {
    atomicWriteJson('codes.json', createInitialBookstoreData());
  }
  if (!readJsonFile<OrdersJsonFile>('orders.json')) {
    atomicWriteJson('orders.json', {
      updatedAt: new Date().toISOString(),
      orders: [],
    } satisfies OrdersJsonFile);
  }
  if (!readJsonFile<PromosJsonFile>('promos.json')) {
    atomicWriteJson('promos.json', {
      updatedAt: new Date().toISOString(),
      promos: [],
    } satisfies PromosJsonFile);
  }
  if (!readJsonFile<MerchantSettings>('settings.json')) {
    const defaultAddress = process.env.LTC_RECEIVING_ADDRESS?.trim() || '';
    const envNetwork = process.env.LTC_NETWORK === 'testnet' ? 'testnet' : 'mainnet';
    const parsedConfs = Number.parseInt(process.env.LTC_MIN_CONFIRMATIONS || '1', 10);
    const minConfirmations = Number.isFinite(parsedConfs) && parsedConfs >= 0 ? parsedConfs : 1;
    const allowSandbox = process.env.LTC_ALLOW_SANDBOX === 'true';
    const webhookSecret = process.env.WEBHOOK_SECRET?.trim() || '';
    const adminOpenAccess = process.env.ADMIN_OPEN_ACCESS === 'true';
    atomicWriteJson('settings.json', {
      receivingAddress: defaultAddress,
      network: envNetwork,
      minConfirmations,
      allowSandbox,
      autoDownloadReceipt: false,
      orderExpiryMinutes: DEFAULT_ORDER_EXPIRY_MINUTES,
      ltcRateMode: 'live',
      manualLtcRateUsd: DEFAULT_MANUAL_LTC_RATE_USD,
      quoteSpreadPercent: DEFAULT_QUOTE_SPREAD_PERCENT,
      quoteCacheSeconds: DEFAULT_QUOTE_CACHE_SECONDS,
      saleNotifications: { ...DEFAULT_SALE_NOTIFICATION_SETTINGS },
      webhookSecret,
      adminOpenAccess,
      adminPath: DEFAULT_ADMIN_PATH,
      setupCompleted: false,
      setupCompletedAt: null,
      storefrontLanguage: 'en',
      preferences: { ...DEFAULT_STOREFRONT_PREFERENCES },
      updatedAt: new Date().toISOString(),
    } satisfies MerchantSettings);
  }
}

export function readCodesFile(): CodesJsonFile {
  const data = readJsonFile<CodesJsonFile>('codes.json');
  if (!data || data.schemaVersion !== BOOKSTORE_SCHEMA_VERSION) {
    const fresh = createInitialBookstoreData();
    atomicWriteJson('codes.json', fresh);
    return fresh;
  }
  data.products = data.products.map((product) => ({
    ...product,
    subject: typeof product.subject === 'string' ? product.subject.trim().slice(0, 60) : '',
    description:
      typeof product.description === 'string' ? product.description.trim().slice(0, 1200) : '',
  }));
  return data;
}

export function writeCodesFile(data: CodesJsonFile): void {
  data.updatedAt = new Date().toISOString();
  atomicWriteJson('codes.json', data);
}

export function readOrdersFile(): OrdersJsonFile {
  const data = readJsonFile<OrdersJsonFile>('orders.json');
  if (!data) {
    const fresh: OrdersJsonFile = { updatedAt: new Date().toISOString(), orders: [] };
    atomicWriteJson('orders.json', fresh);
    return fresh;
  }
  return data;
}

export function writeOrdersFile(data: OrdersJsonFile): void {
  data.updatedAt = new Date().toISOString();
  atomicWriteJson('orders.json', data);
}

export function readPromosFile(): PromosJsonFile {
  const data = readJsonFile<PromosJsonFile>('promos.json');
  if (!data || !Array.isArray(data.promos)) {
    const fresh: PromosJsonFile = { updatedAt: new Date().toISOString(), promos: [] };
    atomicWriteJson('promos.json', fresh);
    return fresh;
  }
  return data;
}

export function writePromosFile(data: PromosJsonFile): void {
  data.updatedAt = new Date().toISOString();
  atomicWriteJson('promos.json', data);
}

export function readSettings(): MerchantSettings {
  const saved = readJsonFile<MerchantSettings>('settings.json');
  const allowSandboxEnvForcedOff = process.env.LTC_ALLOW_SANDBOX === 'false';
  if (!saved) {
    initializeStore();
    return readSettings();
  }
  const legacyLang: 'en' | 'fa' = saved.storefrontLanguage === 'fa' ? 'fa' : 'en';
  const preferences = sanitizeStorefrontPreferences(saved.preferences, {
    ...DEFAULT_STOREFRONT_PREFERENCES,
    language: legacyLang,
  });

  const webhookSecret =
    typeof saved.webhookSecret === 'string'
      ? saved.webhookSecret.trim()
      : process.env.WEBHOOK_SECRET?.trim() || '';
  const adminOpenAccess =
    typeof saved.adminOpenAccess === 'boolean'
      ? saved.adminOpenAccess
      : process.env.ADMIN_OPEN_ACCESS === 'true';

  const rawExpiry = Number(saved.orderExpiryMinutes);
  const orderExpiryMinutes =
    Number.isFinite(rawExpiry) && rawExpiry >= 5 && rawExpiry <= 120
      ? Math.round(rawExpiry)
      : DEFAULT_ORDER_EXPIRY_MINUTES;

  const ltcRateMode: LtcRateMode = saved.ltcRateMode === 'manual' ? 'manual' : 'live';

  const rawManualRate = Number(saved.manualLtcRateUsd);
  const manualLtcRateUsd =
    Number.isFinite(rawManualRate) && rawManualRate >= 1 && rawManualRate <= 100000
      ? Number(rawManualRate.toFixed(2))
      : DEFAULT_MANUAL_LTC_RATE_USD;

  const rawSpread = Number(saved.quoteSpreadPercent);
  const quoteSpreadPercent =
    Number.isFinite(rawSpread) && rawSpread >= 0 && rawSpread <= 25
      ? Number(rawSpread.toFixed(2))
      : DEFAULT_QUOTE_SPREAD_PERCENT;

  const rawCache = Number(saved.quoteCacheSeconds);
  const quoteCacheSeconds =
    Number.isFinite(rawCache) && rawCache >= 15 && rawCache <= 600
      ? Math.round(rawCache)
      : DEFAULT_QUOTE_CACHE_SECONDS;

  const rawNotif = (
    saved.saleNotifications && typeof saved.saleNotifications === 'object'
      ? saved.saleNotifications
      : {}
  ) as Partial<SaleNotificationSettings>;
  const saleNotifications: SaleNotificationSettings = {
    telegramEnabled: Boolean(rawNotif.telegramEnabled),
    telegramBotToken:
      typeof rawNotif.telegramBotToken === 'string' ? rawNotif.telegramBotToken.trim() : '',
    telegramChatId:
      typeof rawNotif.telegramChatId === 'string' ? rawNotif.telegramChatId.trim() : '',
    discordEnabled: Boolean(rawNotif.discordEnabled),
    discordWebhookUrl:
      typeof rawNotif.discordWebhookUrl === 'string' ? rawNotif.discordWebhookUrl.trim() : '',
    webhookEnabled: Boolean(rawNotif.webhookEnabled),
    webhookUrl: typeof rawNotif.webhookUrl === 'string' ? rawNotif.webhookUrl.trim() : '',
    webhookSigningSecret:
      typeof rawNotif.webhookSigningSecret === 'string'
        ? rawNotif.webhookSigningSecret.trim()
        : '',
    includeSandboxSales:
      typeof rawNotif.includeSandboxSales === 'boolean' ? rawNotif.includeSandboxSales : true,
  };

  const adminPath =
    typeof saved.adminPath === 'string' && isValidAdminPath(saved.adminPath)
      ? normalizeAdminPath(saved.adminPath)
      : DEFAULT_ADMIN_PATH;

  return {
    ...saved,
    autoDownloadReceipt: Boolean(saved.autoDownloadReceipt),
    orderExpiryMinutes,
    ltcRateMode,
    manualLtcRateUsd,
    quoteSpreadPercent,
    quoteCacheSeconds,
    saleNotifications,
    webhookSecret,
    adminOpenAccess,
    adminPath,
    setupCompleted: Boolean(saved.setupCompleted),
    setupCompletedAt: typeof saved.setupCompletedAt === 'string' ? saved.setupCompletedAt : null,
    storefrontLanguage: preferences.language,
    preferences,
    allowSandbox: allowSandboxEnvForcedOff ? false : saved.allowSandbox,
  };
}

export function writeSettings(settings: MerchantSettings): MerchantSettings {
  const next: MerchantSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  atomicWriteJson('settings.json', next);
  return next;
}

export function readAdminCredential(): AdminCredentialFile | null {
  return readJsonFile<AdminCredentialFile>('admin.json');
}

export function writeAdminCredential(cred: AdminCredentialFile): void {
  atomicWriteJson('admin.json', cred);
}

export function hashOrderToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function verifyOrderToken(order: OrderRecord, candidateToken: string): boolean {
  if (!candidateToken || typeof candidateToken !== 'string') {
    return false;
  }
  const expected = Buffer.from(order.orderTokenHash, 'hex');
  const actual = Buffer.from(hashOrderToken(candidateToken), 'hex');
  if (expected.length !== actual.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, actual);
}

export function expireStaleOrdersInMemory(ordersFile: OrdersJsonFile): boolean {
  const nowMs = Date.now();
  let changed = false;
  for (const order of ordersFile.orders) {
    if (order.status === 'pending' && Date.parse(order.expiresAt) <= nowMs) {
      order.status = 'expired';
      order.reservedCodeId = null;
      changed = true;
    }
  }
  return changed;
}

export function getReservedCodeIds(ordersFile: OrdersJsonFile): Set<string> {
  const nowMs = Date.now();
  const reserved = new Set<string>();
  for (const order of ordersFile.orders) {
    if (
      order.status === 'pending' &&
      order.reservedCodeId &&
      Date.parse(order.expiresAt) > nowMs
    ) {
      reserved.add(order.reservedCodeId);
    }
  }
  return reserved;
}

export function getPublicCatalog(): Array<
  BookProductRecord & { availableCount: number; usedCount: number; totalCount: number }
> {
  const codesFile = readCodesFile();
  const ordersFile = readOrdersFile();
  const reserved = getReservedCodeIds(ordersFile);

  return codesFile.products.map((book) => {
    const bookCodes = codesFile.codes.filter((c) => c.productId === book.id);
    const usedCount = bookCodes.filter((c) => c.used).length;
    const availableCount = bookCodes.filter((c) => !c.used && !reserved.has(c.id)).length;
    return {
      ...book,
      availableCount,
      usedCount,
      totalCount: bookCodes.length,
    };
  });
}

function pickUniqueLitoshis(
  baseLitoshis: number,
  ordersFile: OrdersJsonFile,
  excludeOrderId?: string
): number {
  const activeAmounts = new Set(
    ordersFile.orders
      .filter((o) => o.status === 'pending' && o.id !== excludeOrderId)
      .map((o) => o.expectedLitoshis)
  );

  let expectedLitoshis = Math.max(10000, baseLitoshis);
  for (let attempt = 0; attempt < 50; attempt++) {
    const fingerprint = crypto.randomInt(1001, 9999);
    const candidate = Math.floor(expectedLitoshis / 10000) * 10000 + fingerprint;
    if (candidate > 0 && !activeAmounts.has(candidate)) {
      return candidate;
    }
  }
  return expectedLitoshis;
}

export async function createOrderRecord(params: {
  productId: string;
  ltcRateUsd: number;
  customerEmail: string | null;
  buyerId: string;
}): Promise<{ order: OrderRecord; orderToken: string }> {
  return withStoreLock(() => {
    const codesFile = readCodesFile();
    const ordersFile = readOrdersFile();
    const settings = readSettings();

    const expiredAny = expireStaleOrdersInMemory(ordersFile);

    const nowMs = Date.now();
    const existingOpenOrder = ordersFile.orders.find(
      (o) =>
        o.status === 'pending' &&
        o.buyerId === params.buyerId &&
        Date.parse(o.expiresAt) > nowMs
    );
    if (existingOpenOrder) {
      if (expiredAny) {
        writeOrdersFile(ordersFile);
      }
      throw new OpenOrderExistsError(existingOpenOrder);
    }

    const book = codesFile.products.find((p) => p.id === params.productId);
    if (!book) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const reserved = getReservedCodeIds(ordersFile);
    const candidateCode = codesFile.codes.find(
      (c) => c.productId === book.id && !c.used && !reserved.has(c.id)
    );

    if (!candidateCode) {
      throw new Error('OUT_OF_STOCK');
    }

    const baseLitoshis = Math.round((book.priceUsd / params.ltcRateUsd) * 1e8);
    const expectedLitoshis = pickUniqueLitoshis(baseLitoshis, ordersFile);
    const expectedLtc = (expectedLitoshis / 1e8).toFixed(8);
    const now = new Date();
    const orderTtlMs = settings.orderExpiryMinutes * 60 * 1000;
    const expiresAt = new Date(now.getTime() + orderTtlMs);
    const orderId = `SK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const orderToken = crypto.randomBytes(18).toString('base64url');

    const order: OrderRecord = {
      id: orderId,
      orderTokenHash: hashOrderToken(orderToken),
      buyerId: params.buyerId,
      productId: book.id,
      bookTitle: book.title,
      bookWriter: book.writer,
      bookTranslator: book.translator,
      bookPublication: book.publication,
      originalPriceUsd: book.priceUsd,
      discountUsd: 0,
      promoCodeId: null,
      promoCode: null,
      priceUsd: book.priceUsd,
      ltcRateUsd: params.ltcRateUsd,
      expectedLtc,
      expectedLitoshis,
      receivingAddress: settings.receivingAddress,
      network: settings.network,
      minConfirmations: settings.minConfirmations,
      status: 'pending',
      customerEmail: params.customerEmail,
      reservedCodeId: candidateCode.id,
      deliveredCodeId: null,
      deliveredCode: null,
      txid: null,
      confirmations: 0,
      verificationMethod: null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      confirmedAt: null,
    };

    ordersFile.orders.unshift(order);
    writeOrdersFile(ordersFile);

    return { order, orderToken };
  });
}

export async function applyPromoToOrder(orderId: string, rawCode: string): Promise<OrderRecord> {
  return withStoreLock(() => {
    const ordersFile = readOrdersFile();
    const promosFile = readPromosFile();
    const expiredAny = expireStaleOrdersInMemory(ordersFile);

    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order) {
      if (expiredAny) writeOrdersFile(ordersFile);
      throw new Error('ORDER_NOT_FOUND');
    }

    const nowMs = Date.now();
    if (order.status !== 'pending' || Date.parse(order.expiresAt) <= nowMs) {
      if (expiredAny) writeOrdersFile(ordersFile);
      throw new Error('ORDER_NOT_PENDING');
    }

    const cleanCode = rawCode.trim().toUpperCase();
    const promo = promosFile.promos.find((p) => p.code.toUpperCase() === cleanCode);
    if (!promo) {
      throw new Error('PROMO_NOT_FOUND');
    }
    if (!promo.active) {
      throw new Error('PROMO_INACTIVE');
    }
    if (promo.expiresAt && Date.parse(promo.expiresAt) <= nowMs) {
      throw new Error('PROMO_EXPIRED');
    }
    if (promo.productId && promo.productId !== order.productId) {
      throw new Error('PROMO_WRONG_BOOK');
    }

    if (promo.maxUses !== null) {
      const pendingReservedCount = ordersFile.orders.filter(
        (o) =>
          o.id !== order.id &&
          o.status === 'pending' &&
          o.promoCodeId === promo.id &&
          Date.parse(o.expiresAt) > nowMs
      ).length;
      if (promo.usedCount + pendingReservedCount >= promo.maxUses) {
        throw new Error('PROMO_LIMIT_REACHED');
      }
    }

    const basePrice = order.originalPriceUsd ?? order.priceUsd;
    const rawDiscount =
      promo.discountType === 'percent'
        ? (basePrice * promo.discountValue) / 100
        : promo.discountValue;
    const finalPrice = Math.max(0.5, Number((basePrice - rawDiscount).toFixed(2)));
    const actualDiscount = Number(Math.max(0, basePrice - finalPrice).toFixed(2));

    if (actualDiscount <= 0) {
      throw new Error('PROMO_NO_DISCOUNT');
    }

    const baseLitoshis = Math.round((finalPrice / order.ltcRateUsd) * 1e8);
    const expectedLitoshis = pickUniqueLitoshis(baseLitoshis, ordersFile, order.id);

    order.originalPriceUsd = basePrice;
    order.discountUsd = actualDiscount;
    order.priceUsd = finalPrice;
    order.promoCodeId = promo.id;
    order.promoCode = promo.code;
    order.expectedLitoshis = expectedLitoshis;
    order.expectedLtc = (expectedLitoshis / 1e8).toFixed(8);

    writeOrdersFile(ordersFile);
    return order;
  });
}

export async function removePromoFromOrder(orderId: string): Promise<OrderRecord> {
  return withStoreLock(() => {
    const ordersFile = readOrdersFile();
    const expiredAny = expireStaleOrdersInMemory(ordersFile);

    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order) {
      if (expiredAny) writeOrdersFile(ordersFile);
      throw new Error('ORDER_NOT_FOUND');
    }

    const nowMs = Date.now();
    if (order.status !== 'pending' || Date.parse(order.expiresAt) <= nowMs) {
      if (expiredAny) writeOrdersFile(ordersFile);
      throw new Error('ORDER_NOT_PENDING');
    }

    const basePrice = order.originalPriceUsd ?? order.priceUsd;
    if (order.promoCodeId || (order.discountUsd ?? 0) > 0) {
      const baseLitoshis = Math.round((basePrice / order.ltcRateUsd) * 1e8);
      const expectedLitoshis = pickUniqueLitoshis(baseLitoshis, ordersFile, order.id);

      order.originalPriceUsd = basePrice;
      order.priceUsd = basePrice;
      order.discountUsd = 0;
      order.promoCodeId = null;
      order.promoCode = null;
      order.expectedLitoshis = expectedLitoshis;
      order.expectedLtc = (expectedLitoshis / 1e8).toFixed(8);
      writeOrdersFile(ordersFile);
    } else if (expiredAny) {
      writeOrdersFile(ordersFile);
    }

    return order;
  });
}

export async function createPromoCodeRecord(input: {
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  productId: string | null;
  maxUses: number | null;
  expiresAt: string | null;
}): Promise<PromoCodeRecord> {
  return withStoreLock(() => {
    const promosFile = readPromosFile();
    const codesFile = readCodesFile();
    const cleanCode = input.code.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{2,32}$/.test(cleanCode)) {
      throw new Error('INVALID_PROMO_CODE');
    }
    if (promosFile.promos.some((p) => p.code.toUpperCase() === cleanCode)) {
      throw new Error('DUPLICATE_PROMO_CODE');
    }
    if (input.productId && !codesFile.products.some((p) => p.id === input.productId)) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const promo: PromoCodeRecord = {
      id: `promo_${crypto.randomBytes(4).toString('hex')}`,
      code: cleanCode,
      discountType: input.discountType,
      discountValue: Number(input.discountValue.toFixed(2)),
      productId: input.productId || null,
      maxUses: input.maxUses,
      usedCount: 0,
      expiresAt: input.expiresAt,
      active: true,
      createdAt: new Date().toISOString(),
    };

    promosFile.promos.unshift(promo);
    writePromosFile(promosFile);
    return promo;
  });
}

export async function togglePromoCodeActive(
  promoId: string,
  active: boolean
): Promise<PromoCodeRecord | null> {
  return withStoreLock(() => {
    const promosFile = readPromosFile();
    const promo = promosFile.promos.find((p) => p.id === promoId);
    if (!promo) return null;
    promo.active = active;
    writePromosFile(promosFile);
    return promo;
  });
}

export async function deletePromoCodeRecord(promoId: string): Promise<boolean> {
  return withStoreLock(() => {
    const promosFile = readPromosFile();
    const idx = promosFile.promos.findIndex((p) => p.id === promoId);
    if (idx === -1) return false;
    promosFile.promos.splice(idx, 1);
    writePromosFile(promosFile);
    return true;
  });
}

export async function cancelOrderRecord(orderId: string): Promise<OrderRecord> {
  return withStoreLock(() => {
    const ordersFile = readOrdersFile();
    const expiredAny = expireStaleOrdersInMemory(ordersFile);

    const order = ordersFile.orders.find((o) => o.id === orderId);
    if (!order) {
      if (expiredAny) {
        writeOrdersFile(ordersFile);
      }
      throw new Error('ORDER_NOT_FOUND');
    }

    if (order.status === 'confirmed') {
      throw new Error('ORDER_ALREADY_CONFIRMED');
    }

    if (order.status === 'pending') {
      order.status = 'cancelled';
      order.reservedCodeId = null;
      writeOrdersFile(ordersFile);
    } else if (expiredAny) {
      writeOrdersFile(ordersFile);
    }

    return order;
  });
}

export async function confirmOrderAndMarkCodeUsed(params: {
  orderId: string;
  txid: string;
  confirmations: number;
  verificationMethod: NonNullable<OrderRecord['verificationMethod']>;
}): Promise<{
  order: OrderRecord;
  codeRecord: DigitalCodeRecord;
  newlyConfirmed: boolean;
  remainingBookStock: number;
}> {
  return withStoreLock(() => {
    const codesFile = readCodesFile();
    const ordersFile = readOrdersFile();
    expireStaleOrdersInMemory(ordersFile);

    const order = ordersFile.orders.find((o) => o.id === params.orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    if (order.status === 'cancelled') {
      throw new Error('ORDER_CANCELLED');
    }

    if (order.status === 'confirmed' && order.deliveredCodeId) {
      const existingCode = codesFile.codes.find((c) => c.id === order.deliveredCodeId);
      if (existingCode) {
        const remainingBookStock = codesFile.codes.filter(
          (c) => c.productId === order.productId && !c.used
        ).length;
        return { order, codeRecord: existingCode, newlyConfirmed: false, remainingBookStock };
      }
    }

    const normalizedTxid = params.txid.trim().toLowerCase();
    const duplicateTxOrder = ordersFile.orders.find(
      (o) => o.id !== order.id && o.txid?.toLowerCase() === normalizedTxid
    );
    if (duplicateTxOrder) {
      throw new Error('TXID_ALREADY_CLAIMED');
    }

    let codeRecord = order.reservedCodeId
      ? codesFile.codes.find((c) => c.id === order.reservedCodeId && !c.used)
      : undefined;

    if (!codeRecord) {
      const reserved = getReservedCodeIds(ordersFile);
      codeRecord = codesFile.codes.find(
        (c) => c.productId === order.productId && !c.used && !reserved.has(c.id)
      );
    }

    if (!codeRecord) {
      codeRecord = codesFile.codes.find(
        (c) => c.productId === order.productId && !c.used
      );
    }

    if (!codeRecord) {
      throw new Error('OUT_OF_STOCK');
    }

    const now = new Date().toISOString();

    codeRecord.used = true;
    codeRecord.usedAt = now;
    codeRecord.orderId = order.id;
    codeRecord.txid = normalizedTxid;

    order.status = 'confirmed';
    order.txid = normalizedTxid;
    order.confirmations = params.confirmations;
    order.confirmedAt = now;
    order.deliveredCodeId = codeRecord.id;
    order.deliveredCode = codeRecord.code;
    order.reservedCodeId = null;
    order.verificationMethod = params.verificationMethod;

    writeCodesFile(codesFile);
    writeOrdersFile(ordersFile);

    if (order.promoCodeId) {
      const promosFile = readPromosFile();
      const promo = promosFile.promos.find((p) => p.id === order.promoCodeId);
      if (promo) {
        promo.usedCount += 1;
        writePromosFile(promosFile);
      }
    }

    const remainingBookStock = codesFile.codes.filter(
      (c) => c.productId === order.productId && !c.used
    ).length;

    return { order, codeRecord, newlyConfirmed: true, remainingBookStock };
  });
}

export async function addCodesBulk(params: {
  productId: string;
  codes: string[];
}): Promise<{ addedCount: number; skippedDuplicates: number; codes: DigitalCodeRecord[] }> {
  return withStoreLock(() => {
    const codesFile = readCodesFile();
    const book = codesFile.products.find((p) => p.id === params.productId);
    if (!book) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const existingSet = new Set(codesFile.codes.map((c) => c.code.trim().toLowerCase()));
    const now = new Date().toISOString();
    const added: DigitalCodeRecord[] = [];
    let skippedDuplicates = 0;

    for (const raw of params.codes) {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.length > 128) continue;
      if (existingSet.has(trimmed.toLowerCase())) {
        skippedDuplicates++;
        continue;
      }
      existingSet.add(trimmed.toLowerCase());
      const rec: DigitalCodeRecord = {
        id: `code_${crypto.randomBytes(4).toString('hex')}`,
        productId: book.id,
        code: trimmed,
        used: false,
        usedAt: null,
        orderId: null,
        txid: null,
        createdAt: now,
      };
      codesFile.codes.push(rec);
      added.push(rec);
    }

    if (added.length > 0) {
      writeCodesFile(codesFile);
    }

    return { addedCount: added.length, skippedDuplicates, codes: added };
  });
}

export async function deleteUnusedCode(codeId: string): Promise<boolean> {
  return withStoreLock(() => {
    const codesFile = readCodesFile();
    const idx = codesFile.codes.findIndex((c) => c.id === codeId);
    if (idx === -1) return false;
    if (codesFile.codes[idx].used) {
      throw new Error('CANNOT_DELETE_USED_CODE');
    }
    codesFile.codes.splice(idx, 1);
    writeCodesFile(codesFile);
    return true;
  });
}

function isValidBookCoverUrl(url?: string): url is string {
  return Boolean(url && /^\/api\/covers\/cover_[a-f0-9]{16}\.(jpg|png|webp)$/.test(url));
}

export async function createBookProductRecord(input: {
  title: string;
  subject?: string;
  description?: string;
  writer: string;
  translator: string;
  publication: string;
  priceUsd: number;
  coverUrl?: string;
  redemptionInstructions?: string;
}): Promise<BookProductRecord> {
  return withStoreLock(() => {
    const codesFile = readCodesFile();
    const slugBase = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const id = `${slugBase || 'book'}-${crypto.randomBytes(2).toString('hex')}`;

    const book: BookProductRecord = {
      id,
      title: input.title.trim(),
      subject: typeof input.subject === 'string' ? input.subject.trim().slice(0, 60) : '',
      description:
        typeof input.description === 'string' ? input.description.trim().slice(0, 1200) : '',
      writer: input.writer.trim(),
      translator: input.translator.trim() || 'Original Edition',
      publication: input.publication.trim(),
      priceUsd: Number(input.priceUsd.toFixed(2)),
      coverUrl: isValidBookCoverUrl(input.coverUrl)
        ? input.coverUrl
        : FALLBACK_BOOK_COVER_DATA_URL,
      deliveryFormat: 'Digital Edition Code (EPUB & PDF)',
      redemptionInstructions:
        input.redemptionInstructions?.trim() ||
        'Open your reader library, choose Redeem Edition Code, and enter this key to download your book.',
    };

    codesFile.products.push(book);
    writeCodesFile(codesFile);
    return book;
  });
}

export async function updateBookProductRecord(
  productId: string,
  input: {
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
): Promise<BookProductRecord | null> {
  return withStoreLock(() => {
    const codesFile = readCodesFile();
    const book = codesFile.products.find((p) => p.id === productId);
    if (!book) return null;

    book.title = input.title.trim();
    if (typeof input.subject === 'string') {
      book.subject = input.subject.trim().slice(0, 60);
    }
    if (typeof input.description === 'string') {
      book.description = input.description.trim().slice(0, 1200);
    }
    book.writer = input.writer.trim();
    book.translator = input.translator.trim() || 'Original Edition';
    book.publication = input.publication.trim();
    book.priceUsd = Number(input.priceUsd.toFixed(2));
    if (isValidBookCoverUrl(input.coverUrl)) {
      book.coverUrl = input.coverUrl;
    }
    if (typeof input.redemptionInstructions === 'string' && input.redemptionInstructions.trim()) {
      book.redemptionInstructions = input.redemptionInstructions.trim();
    }

    writeCodesFile(codesFile);
    return book;
  });
}

export async function deleteBookProductRecord(
  productId: string
): Promise<{ deleted: boolean; removedUnusedCodes: number }> {
  return withStoreLock(() => {
    const codesFile = readCodesFile();
    const idx = codesFile.products.findIndex((p) => p.id === productId);
    if (idx === -1) {
      return { deleted: false, removedUnusedCodes: 0 };
    }

    codesFile.products.splice(idx, 1);

    // Remove unused codes belonging to this deleted book while preserving used audit records
    const beforeCodes = codesFile.codes.length;
    codesFile.codes = codesFile.codes.filter(
      (c) => !(c.productId === productId && !c.used)
    );
    const removedUnusedCodes = beforeCodes - codesFile.codes.length;

    writeCodesFile(codesFile);

    // Expire any pending orders targeting the removed book
    const ordersFile = readOrdersFile();
    let ordersChanged = false;
    for (const order of ordersFile.orders) {
      if (order.productId === productId && order.status === 'pending') {
        order.status = 'expired';
        order.reservedCodeId = null;
        ordersChanged = true;
      }
    }
    if (ordersChanged) {
      writeOrdersFile(ordersFile);
    }

    return { deleted: true, removedUnusedCodes };
  });
}

export function isTxidAlreadyClaimed(txid: string, excludeOrderId?: string): boolean {
  const ordersFile = readOrdersFile();
  const normalized = txid.trim().toLowerCase();
  return ordersFile.orders.some(
    (o) => o.id !== excludeOrderId && o.txid?.toLowerCase() === normalized
  );
}
