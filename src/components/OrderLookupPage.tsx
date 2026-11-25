import { useState } from 'react';
import { AlertCircle, ArrowUpRight, Eye, EyeOff, ReceiptText, Search } from 'lucide-react';
import { fetchOrder } from '../api';
import { STORE_COPY, type StoreLang } from '../i18n';
import { getCardRadiusClass } from '../theme';
import type { CardRadiusChoice, OrderView, SessionOrderRef } from '../types';

interface OrderLookupPageProps {
  sessionOrders: SessionOrderRef[];
  onOpenOrder: (order: OrderView, token: string) => void;
  lang: StoreLang;
  cardRadius: CardRadiusChoice;
}

export function OrderLookupPage({
  sessionOrders,
  onOpenOrder,
  lang,
  cardRadius,
}: OrderLookupPageProps) {
  const t = STORE_COPY[lang].lookup;
  const isRtl = lang === 'fa';
  const radiusClass = getCardRadiusClass(cardRadius);

  const [orderIdInput, setOrderIdInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanId = orderIdInput.trim().toUpperCase();
    const cleanToken = tokenInput.trim();
    if (!cleanId || !cleanToken) {
      setError(t.missingFieldsError);
      return;
    }

    setIsLoading(true);
    try {
      const { order } = await fetchOrder(cleanId, cleanToken);
      onOpenOrder(order, cleanToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.notFoundError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopenSessionOrder = async (ref: SessionOrderRef) => {
    setError(null);
    setIsLoading(true);
    try {
      const { order } = await fetchOrder(ref.orderId, ref.orderToken);
      onOpenOrder(order, ref.orderToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reopenError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-6xl w-full mx-auto px-6 pt-8 pb-4 space-y-7">
      {/* Page Header */}
      <div>
        <h1 className="storefront-title text-2xl sm:text-3xl font-bold text-[var(--store-text)]">
          {t.title}
        </h1>
        <p className="text-sm text-[var(--store-muted)] mt-1">{t.subtitle}</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-center gap-2.5 text-sm text-[#991B1B]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lookup Form Card */}
        <section
          className={`lg:col-span-7 bg-[var(--store-surface)] border border-[var(--store-border)] ${radiusClass} p-6 space-y-5`}
        >
          <h2 className="text-sm font-semibold text-[var(--store-text)]">{t.formTitle}</h2>

          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="lookup-order-id"
                className="block text-xs font-medium text-[var(--store-muted)]"
              >
                {t.orderIdLabel}
              </label>
              <input
                id="lookup-order-id"
                type="text"
                dir="ltr"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="SK-A1B2C3D4"
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-[var(--store-surface)] border border-[var(--store-border)] rounded-lg text-[var(--store-text)] placeholder:text-[var(--store-subtle)] focus:outline-none focus:border-[var(--store-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="lookup-order-key"
                className="block text-xs font-medium text-[var(--store-muted)]"
              >
                {t.orderKeyLabel}
              </label>
              <div className="relative">
                <input
                  id="lookup-order-key"
                  type={showKey ? 'text' : 'password'}
                  dir="ltr"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={t.orderKeyPlaceholder}
                  className="w-full ps-3.5 pe-10 py-2.5 text-sm font-mono bg-[var(--store-surface)] border border-[var(--store-border)] rounded-lg text-[var(--store-text)] placeholder:text-[var(--store-subtle)] focus:outline-none focus:border-[var(--store-accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  aria-label={showKey ? t.hideKeyLabel : t.showKeyLabel}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--store-subtle)] hover:text-[var(--store-text)] transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[var(--store-accent)] hover:opacity-95 rounded-lg transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{isLoading ? t.loading : t.openOrder}</span>
            </button>
          </form>
        </section>

        {/* Recent Session Orders Card */}
        <section
          className={`lg:col-span-5 bg-[var(--store-surface)] border border-[var(--store-border)] ${radiusClass} overflow-hidden`}
        >
          <div className="px-6 py-4 border-b border-[var(--store-border)] flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--store-text)]">
              {t.recentThisSession}
            </h2>
            {sessionOrders.length > 0 && (
              <span className="text-xs font-mono text-[var(--store-subtle)] tabular-nums">
                {sessionOrders.length}
              </span>
            )}
          </div>

          {sessionOrders.length > 0 ? (
            <ul className="divide-y divide-[var(--store-border)]">
              {sessionOrders.map((item) => (
                <li key={item.orderId}>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleReopenSessionOrder(item)}
                    className="w-full px-6 py-3.5 flex items-center justify-between gap-3 text-start hover:bg-[color-mix(in_srgb,var(--store-text)_4%,transparent)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <div
                        dir={isRtl ? 'rtl' : 'auto'}
                        className="storefront-title text-base font-bold text-[var(--store-text)] truncate"
                      >
                        {item.bookTitle}
                      </div>
                      <div className="text-xs text-[var(--store-muted)] tabular-nums flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span dir="ltr" className="font-mono">
                          {item.orderId}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span dir="ltr" className="font-mono">
                          {item.expectedLtc} LTC
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{t.statusLabel(item.status)}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--store-subtle)] shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center space-y-2">
              <ReceiptText className="w-7 h-7 text-[var(--store-subtle)] mx-auto" />
              <div className="text-sm font-medium text-[var(--store-text)]">
                {t.emptySessionTitle}
              </div>
              <p className="text-xs text-[var(--store-muted)] leading-relaxed">
                {t.emptySessionDesc}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
