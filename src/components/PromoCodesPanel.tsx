import { useState } from 'react';
import { Check, Copy, Plus, Sparkles, Tag, Trash2 } from 'lucide-react';
import { createAdminPromo, deleteAdminPromo, toggleAdminPromo } from '../api';
import type { AdminBookRecord, PromoCodeRecord, PromoDiscountType } from '../types';

interface PromoCodesPanelProps {
  adminToken: string | null;
  promos: PromoCodeRecord[];
  products: AdminBookRecord[];
  onMutated: () => Promise<void>;
  onFeedback: (feedback: { type: 'success' | 'error'; text: string } | null) => void;
}

function formatUsdCompact(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

function generateRandomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BOOK-${suffix}`;
}

export function PromoCodesPanel({
  adminToken,
  promos,
  products,
  onMutated,
  onFeedback,
}: PromoCodesPanelProps) {
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<PromoDiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('15');
  const [productId, setProductId] = useState<string>('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bookMap = new Map(products.map((p) => [p.id, p.title]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    onFeedback(null);

    const cleanCode = code.trim().toUpperCase();
    const numericVal = Number.parseFloat(discountValue);
    if (!cleanCode) {
      onFeedback({ type: 'error', text: 'Enter a promo code name (e.g. WELCOME20).' });
      return;
    }
    if (!Number.isFinite(numericVal) || numericVal <= 0) {
      onFeedback({ type: 'error', text: 'Enter a valid positive discount amount.' });
      return;
    }

    const parsedMaxUses = maxUses.trim() ? Number.parseInt(maxUses.trim(), 10) : null;
    if (parsedMaxUses !== null && (!Number.isFinite(parsedMaxUses) || parsedMaxUses < 1)) {
      onFeedback({ type: 'error', text: 'Max uses must be a positive whole number or blank.' });
      return;
    }

    const isoExpiry = expiresAt.trim() ? new Date(expiresAt.trim()).toISOString() : null;

    setIsCreating(true);
    try {
      const { promo } = await createAdminPromo(adminToken, {
        code: cleanCode,
        discountType,
        discountValue: numericVal,
        productId: productId || null,
        maxUses: parsedMaxUses,
        expiresAt: isoExpiry,
      });
      setCode('');
      setMaxUses('');
      setExpiresAt('');
      onFeedback({ type: 'success', text: `Promo code "${promo.code}" created.` });
      await onMutated();
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not create promo code.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (promo: PromoCodeRecord) => {
    onFeedback(null);
    setBusyId(promo.id);
    try {
      await toggleAdminPromo(adminToken, promo.id, !promo.active);
      onFeedback({
        type: 'success',
        text: `Promo "${promo.code}" ${promo.active ? 'paused' : 'activated'}.`,
      });
      await onMutated();
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update promo code.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (promo: PromoCodeRecord) => {
    onFeedback(null);
    setBusyId(promo.id);
    try {
      await deleteAdminPromo(adminToken, promo.id);
      onFeedback({ type: 'success', text: `Promo "${promo.code}" deleted.` });
      await onMutated();
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not delete promo code.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = async (promo: PromoCodeRecord) => {
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopiedId(promo.id);
      window.setTimeout(() => setCopiedId((prev) => (prev === promo.id ? null : prev)), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const nowMs = Date.now();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Create Promo Form */}
      <form
        onSubmit={handleCreate}
        className="lg:col-span-5 bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-4"
      >
        <div>
          <h2 className="font-titr text-xl font-bold text-[#181614]">Create Promo Code</h2>
          <p className="text-xs text-[#6B655E] mt-1">
            Buyers can apply active promo codes directly inside Litecoin checkout before paying.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="promo-code-input" className="text-xs font-medium text-[#6B655E]">
              Promo Code
            </label>
            <button
              type="button"
              onClick={() => setCode(generateRandomCode())}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1E40AF] hover:underline cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Generate</span>
            </button>
          </div>
          <input
            id="promo-code-input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
            placeholder="WELCOME20"
            maxLength={32}
            className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="promo-type" className="block text-xs font-medium text-[#6B655E]">
              Discount Type
            </label>
            <select
              id="promo-type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value === 'fixed' ? 'fixed' : 'percent')}
              className="w-full px-3 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg"
            >
              <option value="percent">Percentage (%)</option>
              <option value="fixed">Fixed USD ($)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="promo-value" className="block text-xs font-medium text-[#6B655E]">
              {discountType === 'percent' ? 'Percent Off (1–99%)' : 'Amount Off ($ USD)'}
            </label>
            <input
              id="promo-value"
              type="number"
              step={discountType === 'percent' ? '1' : '0.01'}
              min={discountType === 'percent' ? '1' : '0.01'}
              max={discountType === 'percent' ? '99' : '10000'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-mono border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="promo-book-scope" className="block text-xs font-medium text-[#6B655E]">
            Applies To
          </label>
          <select
            id="promo-book-scope"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg"
          >
            <option value="">All Books</option>
            {products.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} ({formatUsdCompact(book.priceUsd)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="promo-max-uses" className="block text-xs font-medium text-[#6B655E]">
              Max Uses <span className="text-[#A8A095]">(optional)</span>
            </label>
            <input
              id="promo-max-uses"
              type="number"
              min="1"
              step="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className="w-full px-3 py-2.5 text-sm font-mono border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="promo-expiry" className="block text-xs font-medium text-[#6B655E]">
              Expires <span className="text-[#A8A095]">(optional)</span>
            </label>
            <input
              id="promo-expiry"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-2.5 py-2.5 text-xs font-mono border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? 'Creating...' : 'Create Promo Code'}</span>
        </button>
      </form>

      {/* Promo Codes Table */}
      <div className="lg:col-span-7 bg-white border border-[#E6E2DA] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EFECE6] flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#181614]">Promo & Discount Codes</h2>
            <p className="text-xs text-[#6B655E] mt-0.5">
              {promos.length} {promos.length === 1 ? 'code' : 'codes'} configured in promos.json
            </p>
          </div>
        </div>

        {promos.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Tag className="w-7 h-7 text-[#A8A095] mx-auto" />
            <div className="text-sm font-medium text-[#181614]">No promo codes yet</div>
            <p className="text-xs text-[#6B655E]">
              Create a percentage or fixed USD coupon to share with readers.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EFECE6]">
            {promos.map((promo) => {
              const isExpired = Boolean(promo.expiresAt && Date.parse(promo.expiresAt) <= nowMs);
              const isLimitReached = promo.maxUses !== null && promo.usedCount >= promo.maxUses;
              const statusLabel = !promo.active
                ? 'Paused'
                : isExpired
                  ? 'Expired'
                  : isLimitReached
                    ? 'Used Up'
                    : 'Active';
              const statusClass =
                statusLabel === 'Active'
                  ? 'text-[#0F766E] bg-[#F0FDF9] border-[#99F6E4]'
                  : statusLabel === 'Paused'
                    ? 'text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]'
                    : 'text-[#857E75] bg-[#FAF9F6] border-[#E6E2DA]';

              const discountText =
                promo.discountType === 'percent'
                  ? `${promo.discountValue}% OFF`
                  : `${formatUsdCompact(promo.discountValue)} OFF`;

              const scopeLabel = promo.productId
                ? bookMap.get(promo.productId) || 'Deleted Book'
                : 'All Books';

              return (
                <div
                  key={promo.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6]/60"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(promo)}
                        className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[#181614] hover:text-[#1E40AF] cursor-pointer"
                        title="Click to copy promo code"
                      >
                        <span>{promo.code}</span>
                        {copiedId === promo.id ? (
                          <Check className="w-3.5 h-3.5 text-[#0F766E]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#A8A095]" />
                        )}
                      </button>

                      <span className="font-mono text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded">
                        {discountText}
                      </span>

                      <span
                        className={`text-[11px] font-medium border px-2 py-0.5 rounded ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#6B655E]">
                      <span dir="auto" className="truncate max-w-[240px]">
                        Scope: <strong className="text-[#181614] font-medium">{scopeLabel}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Used: {promo.usedCount}
                        {promo.maxUses !== null ? ` / ${promo.maxUses}` : ' / ∞'}
                      </span>
                      {promo.expiresAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            Exp: {new Date(promo.expiresAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === promo.id}
                      onClick={() => handleToggle(promo)}
                      className="px-3 py-1.5 text-xs font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {promo.active ? 'Pause' : 'Enable'}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === promo.id}
                      onClick={() => handleDelete(promo)}
                      aria-label={`Delete ${promo.code}`}
                      className="p-1.5 text-[#857E75] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
