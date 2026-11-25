import type {
  BodyFontChoice,
  CardRadiusChoice,
  MobileCardStyle,
  MobileGridGap,
  StorefrontPreferences,
  TitleFontChoice,
} from './types';

export const DEFAULT_PREFERENCES: StorefrontPreferences = {
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

export function isExternalWebUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ThemePreset {
  id: string;
  label: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  accentColor: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'warm-paper',
    label: 'Warm Paper',
    backgroundColor: '#FAF9F6',
    surfaceColor: '#FFFFFF',
    textColor: '#181614',
    accentColor: '#1E40AF',
  },
  {
    id: 'pure-gallery',
    label: 'Pure White',
    backgroundColor: '#FFFFFF',
    surfaceColor: '#F8F8F7',
    textColor: '#111111',
    accentColor: '#0F766E',
  },
  {
    id: 'parchment',
    label: 'Parchment',
    backgroundColor: '#F3ECE0',
    surfaceColor: '#FBF7F0',
    textColor: '#2B2118',
    accentColor: '#9A3412',
  },
  {
    id: 'midnight-ink',
    label: 'Midnight Ink',
    backgroundColor: '#111317',
    surfaceColor: '#1A1E25',
    textColor: '#F4F1EA',
    accentColor: '#60A5FA',
  },
  {
    id: 'forest-study',
    label: 'Forest Study',
    backgroundColor: '#0F1A17',
    surfaceColor: '#172622',
    textColor: '#ECFDF5',
    accentColor: '#34D399',
  },
];

export function resolveTitleFontStack(choice: TitleFontChoice): string {
  switch (choice) {
    case 'lalezar':
      return '"Lalezar", "B Titr", "Playfair Display", Georgia, serif';
    case 'playfair':
      return '"Playfair Display", "B Titr", Georgia, serif';
    case 'vazirmatn':
      return '"Vazirmatn", "DM Sans", ui-sans-serif, system-ui, sans-serif';
    case 'dm-sans':
      return '"DM Sans", "Vazirmatn", ui-sans-serif, system-ui, sans-serif';
    case 'b-titr':
    default:
      return '"B Titr", "Lalezar", "Playfair Display", Georgia, serif';
  }
}

export function resolveBodyFontStack(choice: BodyFontChoice, lang: 'en' | 'fa'): string {
  switch (choice) {
    case 'vazirmatn':
      return '"Vazirmatn", "DM Sans", ui-sans-serif, system-ui, sans-serif';
    case 'dm-sans':
      return '"DM Sans", "Vazirmatn", ui-sans-serif, system-ui, sans-serif';
    case 'serif':
      return 'Georgia, "Playfair Display", "Vazirmatn", serif';
    case 'mono':
      return '"IBM Plex Mono", "Vazirmatn", ui-monospace, monospace';
    case 'default':
    default:
      return lang === 'fa'
        ? '"Vazirmatn", "DM Sans", ui-sans-serif, system-ui, sans-serif'
        : '"DM Sans", "Vazirmatn", ui-sans-serif, system-ui, sans-serif';
  }
}

export function getCardRadiusClass(radius: CardRadiusChoice): string {
  switch (radius) {
    case 'sharp':
      return 'rounded';
    case 'soft':
      return 'rounded-2xl';
    case 'rounded':
    default:
      return 'rounded-xl';
  }
}

export function getGridColumnsClass(
  desktopColumns: 2 | 3 | 4,
  mobileColumns: 1 | 2 = 1,
  mobileCardStyle: MobileCardStyle = 'standard'
): string {
  const mobileClass =
    mobileCardStyle === 'horizontal' || mobileColumns === 1 ? 'grid-cols-1' : 'grid-cols-2';
  switch (desktopColumns) {
    case 2:
      return `${mobileClass} sm:grid-cols-2 lg:grid-cols-2`;
    case 4:
      return `${mobileClass} sm:grid-cols-2 lg:grid-cols-4`;
    case 3:
    default:
      return `${mobileClass} sm:grid-cols-2 lg:grid-cols-3`;
  }
}

export function getGridGapClass(mobileGap: MobileGridGap = 'normal'): string {
  switch (mobileGap) {
    case 'tight':
      return 'gap-x-3 sm:gap-x-7 gap-y-0';
    case 'airy':
      return 'gap-x-7 sm:gap-x-7 gap-y-0';
    case 'normal':
    default:
      return 'gap-x-5 sm:gap-x-7 gap-y-0';
  }
}

export function getCardRowMarginClass(mobileGap: MobileGridGap = 'normal'): string {
  switch (mobileGap) {
    case 'tight':
      return 'mb-3 sm:mb-7';
    case 'airy':
      return 'mb-7 sm:mb-7';
    case 'normal':
    default:
      return 'mb-5 sm:mb-7';
  }
}

export function getGridTrailingOffsetClass(mobileGap: MobileGridGap = 'normal'): string {
  switch (mobileGap) {
    case 'tight':
      return '-mb-3 sm:-mb-7';
    case 'airy':
      return '-mb-7 sm:-mb-7';
    case 'normal':
    default:
      return '-mb-5 sm:-mb-7';
  }
}

const SAFE_BG_PATH = /^\/api\/backgrounds\/bg_[a-f0-9]{16}\.(jpg|png|webp)$/;

export function applyStorefrontVars(
  element: HTMLElement,
  prefs: StorefrontPreferences,
  prefix: 'store' | 'preview' = 'store'
): void {
  const bgImageCss =
    prefs.backgroundImageUrl && SAFE_BG_PATH.test(prefs.backgroundImageUrl)
      ? `url("${prefs.backgroundImageUrl}")`
      : 'none';
  const overlayPct =
    bgImageCss !== 'none' ? `${Math.round(prefs.backgroundOverlayOpacity * 100)}%` : '0%';

  element.style.setProperty(`--${prefix}-bg`, prefs.backgroundColor);
  element.style.setProperty(`--${prefix}-surface`, prefs.surfaceColor);
  element.style.setProperty(`--${prefix}-text`, prefs.textColor);
  element.style.setProperty(`--${prefix}-accent`, prefs.accentColor);
  element.style.setProperty(`--${prefix}-title-font`, resolveTitleFontStack(prefs.titleFont));
  element.style.setProperty(
    `--${prefix}-body-font`,
    resolveBodyFontStack(prefs.bodyFont, prefs.language)
  );
  element.style.setProperty(`--${prefix}-bg-image`, bgImageCss);
  if (prefix === 'store') {
    element.style.setProperty('--store-bg-overlay-pct', overlayPct);
  } else {
    element.style.setProperty('--preview-overlay-pct', overlayPct);
  }
}
