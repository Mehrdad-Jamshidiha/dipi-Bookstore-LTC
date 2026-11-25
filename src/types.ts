export interface BookItem {
  id: string;
  title: string;
  subject: string;
  description: string;
  writer: string;
  translator: string;
  publication: string;
  priceUsd: number;
  estimatedLtc: string;
  coverUrl: string;
  deliveryFormat: string;
  redemptionInstructions: string;
  availableCount: number;
  usedCount: number;
  totalCount: number;
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

export interface CatalogResponse {
  ltcRateUsd: number;
  rateSource: string;
  storefrontLanguage: 'en' | 'fa';
  preferences: StorefrontPreferences;
  books: BookItem[];
}

export type OrderStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled';

export interface OpenOrderSummary {
  id: string;
  productId: string;
  bookTitle: string;
  coverUrl: string;
  priceUsd: number;
  expectedLtc: string;
  status: OrderStatus;
  createdAt: string;
  expiresAt: string;
}

export interface OrderView {
  id: string;
  productId: string;
  bookTitle: string;
  bookDescription: string;
  bookWriter: string;
  bookTranslator: string;
  bookPublication: string;
  coverUrl: string;
  deliveryFormat: string;
  redemptionInstructions: string;
  originalPriceUsd: number;
  discountUsd: number;
  promoCode: string | null;
  priceUsd: number;
  ltcRateUsd: number;
  expectedLtc: string;
  expectedLitoshis: number;
  receivingAddress: string;
  network: 'mainnet' | 'testnet';
  minConfirmations: number;
  status: OrderStatus;
  customerEmail: string | null;
  txid: string | null;
  confirmations: number;
  verificationMethod: 'onchain_poll' | 'onchain_txid' | 'webhook' | 'sandbox' | 'admin' | null;
  createdAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  paymentUri: string;
  qrDataUrl: string;
  sandboxAvailable: boolean;
  autoDownloadReceipt: boolean;
  explorerTxUrl: string | null;
  deliveredCode: string | null;
  deliveredCodeId: string | null;
}

export interface SessionOrderRef {
  orderId: string;
  orderToken: string;
  bookTitle: string;
  status: OrderStatus;
  expectedLtc: string;
  createdAt: string;
}

export interface AdminCodeRecord {
  id: string;
  productId: string;
  code: string;
  used: boolean;
  usedAt: string | null;
  orderId: string | null;
  txid: string | null;
  createdAt: string;
}

export interface AdminBookRecord {
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

export interface AdminOrderSummary {
  id: string;
  productId: string;
  bookTitle: string;
  priceUsd: number;
  originalPriceUsd?: number;
  discountUsd?: number;
  promoCode?: string | null;
  expectedLtc: string;
  status: OrderStatus;
  txid: string | null;
  confirmations: number;
  deliveredCodeId: string | null;
  verificationMethod: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export type LtcRateMode = 'live' | 'manual';

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
  adminOpenAccess?: boolean;
  storefrontLanguage: 'en' | 'fa';
  preferences: StorefrontPreferences;
  updatedAt: string;
}

export interface AdminQuoteSnapshot {
  spotLtcUsd: number;
  effectiveLtcUsd: number;
  spreadPercent: number;
  mode: LtcRateMode;
  source: string;
  fetchedAt: string;
}

export interface DailySalesPoint {
  date: string;
  salesCount: number;
  usdTotal: number;
  ltcTotal: number;
}

export interface SaleNotificationSummary {
  telegramEnabled: boolean;
  telegramBotTokenConfigured: boolean;
  telegramBotTokenHint: string | null;
  telegramChatId: string;
  discordEnabled: boolean;
  discordWebhookConfigured: boolean;
  discordWebhookHint: string | null;
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSigningSecretConfigured: boolean;
  webhookSigningSecretHint: string | null;
  includeSandboxSales: boolean;
}

export interface AdminAuthStatus {
  needsSetup: boolean;
  setupCompleted: boolean;
  managedByEnv: boolean;
  debugOpenAccess: boolean;
  hasPasscode: boolean;
  hasUsername: boolean;
}

export interface AdminOverviewResponse {
  stats: {
    totalCodes: number;
    availableCodes: number;
    usedCodes: number;
    confirmedOrderCount: number;
    pendingOrderCount: number;
    totalLtcSettled: number;
    totalUsdSettled: number;
  };
  dailySales: DailySalesPoint[];
  products: AdminBookRecord[];
  codes: AdminCodeRecord[];
  promos: PromoCodeRecord[];
  orders: AdminOrderSummary[];
  settings: MerchantSettings;
  currentQuote: AdminQuoteSnapshot;
  saleNotifications: SaleNotificationSummary;
  webhookConfigured: boolean;
  webhookSecretHint: string | null;
  hasAdminPasscode: boolean;
  adminUsername: string | null;
  adminPath: string;
  setupCompleted: boolean;
  sandboxLockedOffByEnv: boolean;
}
