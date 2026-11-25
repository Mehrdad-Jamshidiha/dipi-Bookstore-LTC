import { STORE_COPY, type StoreLang } from '../i18n';
import type { LogoDisplayMode } from '../types';

export type AppView = 'books' | 'lookup' | 'admin';

interface NavbarProps {
  activeView: AppView;
  lang: StoreLang;
  storeName: string;
  logoUrl: string;
  logoDisplayMode: LogoDisplayMode;
  onShowBooks: () => void;
  onShowLookup: () => void;
  onShowAdmin: () => void;
}

export function Navbar({
  activeView,
  lang,
  storeName,
  logoUrl,
  logoDisplayMode,
  onShowBooks,
  onShowLookup,
  onShowAdmin,
}: NavbarProps) {
  const isStore = activeView !== 'admin';
  const effectiveLang: StoreLang = isStore ? lang : 'en';
  const t = STORE_COPY[effectiveLang].nav;
  const displayName = storeName.trim() || 'dipi';
  const showLogoImg = isStore && Boolean(logoUrl) && logoDisplayMode !== 'text-only';
  const showLogoText = !isStore || !logoUrl || logoDisplayMode !== 'logo-only';

  const navItemClass = (isActive: boolean) => {
    if (isActive) {
      return isStore
        ? 'text-[var(--store-accent)] underline underline-offset-8 decoration-2'
        : 'text-[#1E40AF] underline underline-offset-8 decoration-2';
    }
    return isStore
      ? 'text-[var(--store-muted)] hover:text-[var(--store-text)]'
      : 'text-[#6B655E] hover:text-[#181614]';
  };

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-sm border-b ${
        isStore
          ? 'bg-[color-mix(in_srgb,var(--store-bg)_92%,transparent)] border-[var(--store-border)]'
          : 'bg-[#FAF9F6]/95 border-[#E6E2DA]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Storefront Logo / Wordmark */}
        <button
          type="button"
          onClick={onShowBooks}
          aria-label={isStore ? displayName : 'dipi'}
          className={`inline-flex items-center gap-2.5 text-xl font-bold tracking-tight transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 ${
            isStore
              ? 'storefront-title text-[var(--store-text)] hover:text-[var(--store-accent)] focus-visible:outline-[var(--store-accent)]'
              : 'font-titr text-[#181614] hover:text-[#1E40AF] focus-visible:outline-[#1E40AF]'
          }`}
        >
          {showLogoImg && (
            <img
              src={logoUrl}
              alt={displayName}
              className="h-8 w-auto max-w-[140px] object-contain shrink-0"
            />
          )}
          {showLogoText && <span dir="auto">{isStore ? displayName : 'dipi'}</span>}
        </button>

        {/* Zone 2: Unified primary page navigation */}
        <nav
          aria-label={t.primaryNavLabel}
          className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium"
        >
          <button
            type="button"
            onClick={onShowBooks}
            aria-current={activeView === 'books' ? 'page' : undefined}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${navItemClass(
              activeView === 'books'
            )}`}
          >
            {t.books}
          </button>
          <button
            type="button"
            onClick={onShowLookup}
            aria-current={activeView === 'lookup' ? 'page' : undefined}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${navItemClass(
              activeView === 'lookup'
            )}`}
          >
            {t.orderLookup}
          </button>
          {activeView === 'admin' && (
            <button
              type="button"
              onClick={onShowAdmin}
              aria-current="page"
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${navItemClass(
                true
              )}`}
            >
              {t.adminVault}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
