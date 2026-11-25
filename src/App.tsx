import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowUpDown, LifeBuoy, PauseCircle, ReceiptText, Search } from 'lucide-react';
import {
  cancelOrder,
  checkAdminRoute,
  createOrder,
  fetchCatalog,
  fetchOrder,
  OpenOrderConflictError,
} from './api';
import { AdminVault } from './components/AdminVault';
import { BookCard } from './components/BookCard';
import { BookDetailModal } from './components/BookDetailModal';
import { CheckoutModal } from './components/CheckoutModal';
import { Navbar, type AppView } from './components/Navbar';
import { OpenOrderConflictModal } from './components/OpenOrderConflictModal';
import { OrderLookupPage } from './components/OrderLookupPage';
import { STORE_COPY, type StoreLang } from './i18n';
import {
  applyStorefrontVars,
  DEFAULT_PREFERENCES,
  getCardRadiusClass,
  getCardRowMarginClass,
  getGridColumnsClass,
  getGridGapClass,
  getGridTrailingOffsetClass,
  isExternalWebUrl,
  isSafeSupportLinkUrl,
} from './theme';
import type {
  BookItem,
  OpenOrderSummary,
  OrderView,
  SessionOrderRef,
  StorefrontPreferences,
} from './types';

function extractCandidateSlug(pathname: string): string {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  if (!trimmed || trimmed.includes('/')) return '';
  return trimmed.toLowerCase();
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('books');
  const [isResolvingRoute, setIsResolvingRoute] = useState<boolean>(() =>
    Boolean(extractCandidateSlug(window.location.pathname))
  );
  const [preferences, setPreferences] = useState<StorefrontPreferences>(DEFAULT_PREFERENCES);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'title-asc'>(
    'featured'
  );

  // Admin Vault always stays English & LTR with its default palette
  const isStoreView = activeView !== 'admin';
  const effectiveLang: StoreLang = isStoreView ? preferences.language : 'en';
  const isRtl = effectiveLang === 'fa';
  const tCatalog = STORE_COPY[effectiveLang].catalog;
  const tLookup = STORE_COPY[effectiveLang].lookup;
  const tMaintenance = STORE_COPY[effectiveLang].maintenance;

  useEffect(() => {
    applyStorefrontVars(document.documentElement, preferences, 'store');
  }, [preferences]);

  useEffect(() => {
    const storeName = preferences.storeName.trim() || 'dipi';
    document.title =
      activeView === 'admin'
        ? 'Admin Vault — dipi'
        : activeView === 'lookup'
          ? `${tLookup.title} — ${storeName}`
          : preferences.pageTitle || 'dipi — Digital Bookstore Settled in Litecoin';
  }, [activeView, preferences.pageTitle, preferences.storeName, tLookup.title]);

  // Checkout & detail modal state
  const [creatingBookId, setCreatingBookId] = useState<string | null>(null);
  const [inspectingBook, setInspectingBook] = useState<BookItem | null>(null);
  const [activeCheckout, setActiveCheckout] = useState<{
    order: OrderView;
    token: string;
  } | null>(null);
  const [openOrderConflict, setOpenOrderConflict] = useState<{
    openOrder: OpenOrderSummary;
    requestedBook: BookItem;
  } | null>(null);
  const [isReplacingOrder, setIsReplacingOrder] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  useEffect(() => {
    if (preferences.descriptionDisplayMode !== 'detail-modal') {
      setInspectingBook(null);
    }
  }, [preferences.descriptionDisplayMode]);

  // Kept strictly in React memory
  const [sessionOrders, setSessionOrders] = useState<SessionOrderRef[]>([]);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await fetchCatalog();
      setBooks(data.books);
      if (data.preferences) {
        setPreferences(data.preferences);
      } else {
        setPreferences((prev) => ({
          ...prev,
          language: data.storefrontLanguage === 'fa' ? 'fa' : 'en',
        }));
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : tCatalog.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [tCatalog.loadError]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const resolveRouteFromLocation = useCallback(async () => {
    const candidate = extractCandidateSlug(window.location.pathname);
    if (!candidate) {
      setActiveView((prev) => (prev === 'admin' ? 'books' : prev));
      setIsResolvingRoute(false);
      return;
    }

    try {
      const { valid } = await checkAdminRoute(candidate);
      if (valid) {
        setActiveView('admin');
      } else {
        setActiveView('books');
      }
    } catch {
      setActiveView('books');
    } finally {
      setIsResolvingRoute(false);
    }
  }, []);

  useEffect(() => {
    void resolveRouteFromLocation();
    const handlePopState = () => {
      void resolveRouteFromLocation();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolveRouteFromLocation]);

  const handleLeaveAdminPath = useCallback(() => {
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  }, []);

  const handleAdminPathChanged = useCallback((nextPath: string) => {
    const clean = nextPath.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (!clean) return;
    const target = `/${clean}`;
    if (window.location.pathname !== target) {
      window.history.replaceState(null, '', target);
    }
  }, []);

  const subjectCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      const subject = (book.subject || '').trim();
      if (!subject) continue;
      counts.set(subject, (counts.get(subject) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, effectiveLang === 'fa' ? 'fa' : 'en'));
  }, [books, effectiveLang]);

  const activeSubject =
    preferences.showCategoryFilter &&
    selectedSubject !== 'all' &&
    subjectCategories.some((item) => item.name === selectedSubject)
      ? selectedSubject
      : 'all';

  const filteredBooks = useMemo(() => {
    const q = preferences.showSearchBar ? searchQuery.trim().toLowerCase() : '';
    const list = books.filter((b) => {
      if (activeSubject !== 'all' && (b.subject || '').trim() !== activeSubject) {
        return false;
      }
      if (!q) return true;
      return `${b.title} ${b.subject || ''} ${b.writer} ${b.translator} ${b.publication}`
        .toLowerCase()
        .includes(q);
    });

    if (!preferences.showSortControl || sortBy === 'featured') {
      return list;
    }

    const sorted = [...list];
    const locale = effectiveLang === 'fa' ? 'fa' : 'en';
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.priceUsd - b.priceUsd || a.title.localeCompare(b.title, locale));
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.priceUsd - a.priceUsd || a.title.localeCompare(b.title, locale));
    } else if (sortBy === 'title-asc') {
      sorted.sort((a, b) => a.title.localeCompare(b.title, locale));
    }
    return sorted;
  }, [
    books,
    preferences.showSearchBar,
    searchQuery,
    activeSubject,
    preferences.showSortControl,
    sortBy,
    effectiveLang,
  ]);

  const upsertSessionOrder = useCallback((order: OrderView, token: string) => {
    setSessionOrders((prev) => {
      const next: SessionOrderRef = {
        orderId: order.id,
        orderToken: token,
        bookTitle: order.bookTitle,
        status: order.status,
        expectedLtc: order.expectedLtc,
        createdAt: order.createdAt,
      };
      const filtered = prev.filter((item) => item.orderId !== order.id);
      return [next, ...filtered].slice(0, 8);
    });
  }, []);

  const handleBuyBook = async (book: BookItem) => {
    if (preferences.maintenanceMode) {
      return;
    }
    setErrorMessage(null);
    setConflictError(null);
    setCreatingBookId(book.id);
    try {
      const { order, orderToken } = await createOrder({ productId: book.id });
      setActiveCheckout({ order, token: orderToken });
      upsertSessionOrder(order, orderToken);
      loadCatalog();
    } catch (err) {
      if (err instanceof OpenOrderConflictError) {
        setOpenOrderConflict({
          openOrder: err.openOrder,
          requestedBook: book,
        });
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : tCatalog.checkoutError);
    } finally {
      setCreatingBookId(null);
    }
  };

  const handleCancelAndOpenNew = async () => {
    if (!openOrderConflict) return;
    const { openOrder, requestedBook } = openOrderConflict;
    const existingRef = sessionOrders.find((item) => item.orderId === openOrder.id);

    setConflictError(null);
    setIsReplacingOrder(true);
    try {
      await cancelOrder(openOrder.id, existingRef?.orderToken);
      setSessionOrders((prev) =>
        prev.map((item) =>
          item.orderId === openOrder.id ? { ...item, status: 'cancelled' } : item
        )
      );

      const { order, orderToken } = await createOrder({ productId: requestedBook.id });
      setOpenOrderConflict(null);
      setActiveCheckout({ order, token: orderToken });
      upsertSessionOrder(order, orderToken);
      loadCatalog();
    } catch (err) {
      setConflictError(err instanceof Error ? err.message : tCatalog.checkoutError);
    } finally {
      setIsReplacingOrder(false);
    }
  };

  const handleResumeOpenOrder = async () => {
    if (!openOrderConflict) return;
    const existingRef = sessionOrders.find((item) => item.orderId === openOrderConflict.openOrder.id);
    if (!existingRef) return;

    setConflictError(null);
    setIsReplacingOrder(true);
    try {
      const { order } = await fetchOrder(existingRef.orderId, existingRef.orderToken);
      setOpenOrderConflict(null);
      setActiveCheckout({ order, token: existingRef.orderToken });
      upsertSessionOrder(order, existingRef.orderToken);
    } catch (err) {
      setConflictError(err instanceof Error ? err.message : tCatalog.checkoutError);
    } finally {
      setIsReplacingOrder(false);
    }
  };

  const handleOrderUpdated = useCallback(
    (updated: OrderView) => {
      setActiveCheckout((prev) => {
        if (!prev || prev.order.id !== updated.id) return prev;
        upsertSessionOrder(updated, prev.token);
        return { order: updated, token: prev.token };
      });
      if (
        updated.status === 'confirmed' ||
        updated.status === 'expired' ||
        updated.status === 'cancelled'
      ) {
        loadCatalog();
      }
    },
    [loadCatalog, upsertSessionOrder]
  );

  const handleOpenExistingOrder = useCallback(
    (order: OrderView, token: string) => {
      setActiveCheckout({ order, token });
      upsertSessionOrder(order, token);
    },
    [upsertSessionOrder]
  );

  const gridColsClass = getGridColumnsClass(
    preferences.gridColumns,
    preferences.mobileGridColumns,
    preferences.mobileCardStyle
  );
  const gridGapClass = getGridGapClass(preferences.mobileGridGap);
  const cardRowMarginClass = getCardRowMarginClass(preferences.mobileGridGap);
  const gridTrailingOffsetClass = getGridTrailingOffsetClass(preferences.mobileGridGap);

  if (isResolvingRoute) {
    return <div className="min-h-screen bg-[#FAF9F6]" aria-busy="true" />;
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={effectiveLang}
      className={`min-h-screen flex flex-col ${
        isStoreView ? 'storefront-themed' : 'bg-[#FAF9F6] text-[#181614]'
      }`}
    >
      <div className={`min-h-screen flex flex-col ${isStoreView ? 'storefront-themed-overlay' : ''}`}>
        <Navbar
          activeView={activeView}
          lang={effectiveLang}
          storeName={preferences.storeName}
          logoUrl={preferences.logoUrl}
          logoDisplayMode={preferences.logoDisplayMode}
          onShowBooks={() => {
            handleLeaveAdminPath();
            setActiveView('books');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onShowLookup={() => {
            handleLeaveAdminPath();
            setActiveView('lookup');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onShowAdmin={() => {
            setActiveView('admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {activeView === 'admin' ? (
          <div dir="ltr" lang="en">
            <AdminVault
              adminToken={adminToken}
              onAdminTokenChange={setAdminToken}
              onCatalogMutated={loadCatalog}
              onAdminPathChanged={handleAdminPathChanged}
            />
          </div>
        ) : activeView === 'lookup' ? (
          <OrderLookupPage
            sessionOrders={sessionOrders}
            onOpenOrder={handleOpenExistingOrder}
            lang={effectiveLang}
            cardRadius={preferences.cardRadius}
          />
        ) : preferences.maintenanceMode && preferences.maintenanceHideCatalog ? (
          <main className="max-w-2xl w-full mx-auto px-6 py-14 flex-1 flex items-center justify-center">
            <div
              className={`w-full bg-[var(--store-surface)] border border-[var(--store-border)] ${getCardRadiusClass(
                preferences.cardRadius
              )} p-8 sm:p-10 text-center space-y-5 shadow-xs`}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{tMaintenance.badge}</span>
              </div>

              <h1
                dir="auto"
                className="storefront-title text-2xl sm:text-3xl font-bold text-[var(--store-text)]"
              >
                {preferences.maintenanceTitle.trim() || tMaintenance.defaultTitle}
              </h1>

              <p
                dir="auto"
                className="text-sm sm:text-base text-[var(--store-muted)] leading-relaxed max-w-lg mx-auto whitespace-pre-line"
              >
                {preferences.maintenanceMessage.trim() || tMaintenance.defaultMessage}
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('lookup');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[var(--store-accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <ReceiptText className="w-4 h-4 shrink-0" />
                  <span>{tMaintenance.orderLookupCta}</span>
                </button>
              </div>
            </div>
          </main>
        ) : (
          <main className="max-w-6xl w-full mx-auto px-6 pt-8 pb-4 space-y-7">
            {/* Browse-Only Store Pause / Maintenance Notice */}
            {preferences.maintenanceMode && (
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <PauseCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#B45309]" />
                  <div className="space-y-0.5 min-w-0">
                    <div dir="auto" className="text-sm font-semibold text-[#78350F]">
                      {preferences.maintenanceTitle.trim() || tMaintenance.defaultTitle}
                    </div>
                    <p
                      dir="auto"
                      className="text-xs sm:text-sm text-[#92400E] leading-relaxed whitespace-pre-line"
                    >
                      {preferences.maintenanceMessage.trim() || tMaintenance.defaultMessage}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('lookup');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#78350F] bg-white hover:bg-[#FEF3C7] border border-[#FCD34D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ReceiptText className="w-3.5 h-3.5 shrink-0" />
                  <span>{tMaintenance.orderLookupCta}</span>
                </button>
              </div>
            )}

            {/* Optional Search, Sort & Subject Categories */}
            {books.length > 0 &&
              (preferences.showSearchBar ||
                preferences.showSortControl ||
                (preferences.showCategoryFilter && subjectCategories.length > 0)) && (
              <div className="space-y-3">
                {(preferences.showSearchBar || preferences.showSortControl) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {preferences.showSearchBar && (
                      <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-[var(--store-subtle)] absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={tCatalog.searchPlaceholder}
                          className="w-full ps-10 pe-4 py-2 text-sm bg-[var(--store-surface)] border border-[var(--store-border)] rounded-lg text-[var(--store-text)] placeholder:text-[var(--store-subtle)] focus:outline-none focus:border-[var(--store-accent)]"
                        />
                      </div>
                    )}

                    {preferences.showSortControl && (
                      <div className="relative w-full sm:w-auto sm:min-w-[195px]">
                        <ArrowUpDown className="w-3.5 h-3.5 text-[var(--store-subtle)] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          aria-label={tCatalog.sortLabel}
                          value={sortBy}
                          onChange={(e) =>
                            setSortBy(
                              e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'title-asc'
                            )
                          }
                          className="w-full ps-9 pe-3 py-2 text-sm bg-[var(--store-surface)] border border-[var(--store-border)] rounded-lg text-[var(--store-text)] focus:outline-none focus:border-[var(--store-accent)] cursor-pointer"
                        >
                          <option value="featured">{tCatalog.sortFeatured}</option>
                          <option value="price-asc">{tCatalog.sortPriceAsc}</option>
                          <option value="price-desc">{tCatalog.sortPriceDesc}</option>
                          <option value="title-asc">{tCatalog.sortTitleAsc}</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {preferences.showCategoryFilter && subjectCategories.length > 0 && (
                  <div
                    role="tablist"
                    aria-label={tCatalog.categoriesLabel}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeSubject === 'all'}
                      onClick={() => setSelectedSubject('all')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        activeSubject === 'all'
                          ? 'bg-[var(--store-accent)] text-white border-[var(--store-accent)]'
                          : 'bg-[var(--store-surface)] text-[var(--store-text)] border-[var(--store-border)] hover:border-[var(--store-accent)]'
                      }`}
                    >
                      <span>{tCatalog.allCategories}</span>
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          activeSubject === 'all' ? 'text-white/80' : 'text-[var(--store-subtle)]'
                        }`}
                      >
                        {books.length}
                      </span>
                    </button>

                    {subjectCategories.map((item) => {
                      const isSelected = activeSubject === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          role="tab"
                          aria-selected={isSelected}
                          onClick={() => setSelectedSubject(item.name)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--store-accent)] text-white border-[var(--store-accent)]'
                              : 'bg-[var(--store-surface)] text-[var(--store-text)] border-[var(--store-border)] hover:border-[var(--store-accent)]'
                          }`}
                        >
                          <span dir="auto">{item.name}</span>
                          <span
                            className={`text-[11px] font-mono tabular-nums ${
                              isSelected ? 'text-white/80' : 'text-[var(--store-subtle)]'
                            }`}
                          >
                            {item.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-center gap-2.5 text-sm text-[#991B1B]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Direct Tap-to-Buy A4 Book Grid */}
            {isLoading ? (
              <div className={`grid ${gridColsClass} ${gridGapClass} ${gridTrailingOffsetClass}`}>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`bg-[var(--store-surface)] border border-[var(--store-border)] rounded-xl overflow-hidden animate-pulse ${cardRowMarginClass}`}
                  >
                    <div className="aspect-[210/297] bg-[color-mix(in_srgb,var(--store-text)_8%,transparent)]" />
                    <div className="p-6 space-y-3">
                      <div className="h-6 bg-[color-mix(in_srgb,var(--store-text)_8%,transparent)] rounded w-3/4" />
                      <div className="h-4 bg-[color-mix(in_srgb,var(--store-text)_8%,transparent)] rounded w-1/2" />
                      <div className="h-4 bg-[color-mix(in_srgb,var(--store-text)_8%,transparent)] rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div
                className={`py-20 px-6 text-center bg-[var(--store-surface)] border border-[var(--store-border)] ${getCardRadiusClass(
                  preferences.cardRadius
                )} space-y-2`}
              >
                <div className="storefront-title text-lg font-semibold text-[var(--store-text)]">
                  {tCatalog.emptyCatalogTitle}
                </div>
                <p className="text-sm text-[var(--store-muted)] max-w-md mx-auto">
                  {tCatalog.emptyCatalogDesc}
                </p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="py-16 text-center bg-[var(--store-surface)] border border-[var(--store-border)] rounded-xl text-sm text-[var(--store-muted)]">
                {tCatalog.noBooksMatch}
              </div>
            ) : (
              <div className={`grid ${gridColsClass} ${gridGapClass} ${gridTrailingOffsetClass}`}>
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    isCreatingOrder={creatingBookId === book.id}
                    storePaused={preferences.maintenanceMode}
                    onBuyBook={handleBuyBook}
                    onInspectBook={(selected) => setInspectingBook(selected)}
                    descriptionDisplayMode={preferences.descriptionDisplayMode}
                    lang={effectiveLang}
                    cardRadius={preferences.cardRadius}
                    mobileCardStyle={preferences.mobileCardStyle}
                    mobileGridColumns={preferences.mobileGridColumns}
                    mobileGridGap={preferences.mobileGridGap}
                    mobileShowMetadata={preferences.mobileShowMetadata}
                  />
                ))}
              </div>
            )}
          </main>
        )}

        <footer dir="ltr" className="pt-2 pb-6 px-6 text-center space-y-1.5">
          {isStoreView &&
            preferences.supportLinkEnabled &&
            preferences.supportLinkTitle.trim().length > 0 &&
            isSafeSupportLinkUrl(preferences.supportLinkUrl) && (
              <div>
                <a
                  href={preferences.supportLinkUrl.trim()}
                  target={isExternalWebUrl(preferences.supportLinkUrl) ? '_blank' : undefined}
                  rel={
                    isExternalWebUrl(preferences.supportLinkUrl) ? 'noopener noreferrer' : undefined
                  }
                  dir="auto"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--store-muted)] hover:text-[var(--store-accent)] transition-colors"
                >
                  <LifeBuoy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{preferences.supportLinkTitle.trim()}</span>
                </a>
              </div>
            )}
          <p
            className={`text-xs ${
              isStoreView ? 'text-[var(--store-subtle)]' : 'text-[#857E75]'
            }`}
          >
            Powered By <span className="font-aguafina text-lg leading-none">dipi</span>
          </p>
        </footer>
      </div>

      {preferences.descriptionDisplayMode === 'detail-modal' && inspectingBook && (
        <BookDetailModal
          book={inspectingBook}
          isCreatingOrder={creatingBookId === inspectingBook.id}
          storePaused={preferences.maintenanceMode}
          lang={effectiveLang}
          cardRadius={preferences.cardRadius}
          onBuyBook={handleBuyBook}
          onClose={() => setInspectingBook(null)}
        />
      )}

      {activeCheckout && (
        <CheckoutModal
          order={activeCheckout.order}
          orderToken={activeCheckout.token}
          onOrderUpdated={handleOrderUpdated}
          onClose={() => setActiveCheckout(null)}
          lang={effectiveLang}
          descriptionDisplayMode={preferences.descriptionDisplayMode}
        />
      )}

      {openOrderConflict && (
        <OpenOrderConflictModal
          openOrder={openOrderConflict.openOrder}
          requestedBook={openOrderConflict.requestedBook}
          canResumeExisting={sessionOrders.some(
            (item) => item.orderId === openOrderConflict.openOrder.id
          )}
          isProcessing={isReplacingOrder}
          errorMessage={conflictError}
          lang={effectiveLang}
          onCancelAndOpenNew={handleCancelAndOpenNew}
          onResumeExisting={handleResumeOpenOrder}
          onClose={() => {
            if (!isReplacingOrder) {
              setConflictError(null);
              setOpenOrderConflict(null);
            }
          }}
        />
      )}
    </div>
  );
}
