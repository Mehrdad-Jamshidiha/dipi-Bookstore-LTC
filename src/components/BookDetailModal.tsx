import { useEffect, useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { STORE_COPY, type StoreLang } from '../i18n';
import { getCardRadiusClass } from '../theme';
import type { BookItem, CardRadiusChoice } from '../types';

function formatUsdPrice(priceUsd: number): string {
  const rounded = Math.round(priceUsd * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

interface BookDetailModalProps {
  book: BookItem;
  isCreatingOrder: boolean;
  storePaused?: boolean;
  lang: StoreLang;
  cardRadius: CardRadiusChoice;
  onBuyBook: (book: BookItem) => void;
  onClose: () => void;
}

export function BookDetailModal({
  book,
  isCreatingOrder,
  storePaused = false,
  lang,
  cardRadius,
  onBuyBook,
  onClose,
}: BookDetailModalProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isRtl = lang === 'fa';
  const tCard = STORE_COPY[lang].card;
  const tModal = STORE_COPY[lang].detailModal;
  const outOfStock = book.availableCount <= 0;
  const isDisabled = outOfStock || storePaused || isCreatingOrder;
  const radiusClass = getCardRadiusClass(cardRadius);

  useEffect(() => {
    setImageFailed(false);
  }, [book.id]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#181614]/55 backdrop-blur-[2px] overflow-y-auto ${
        isRtl ? 'font-fa' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-detail-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xl bg-[var(--store-surface)] text-[var(--store-text)] border border-[var(--store-border)] ${radiusClass} shadow-2xl overflow-hidden my-auto`}
      >
        {/* Header with A4 thumbnail, Title & Metadata */}
        <div className="p-5 sm:p-6 border-b border-[var(--store-border)] flex items-start gap-4 sm:gap-5">
          <div className="w-20 sm:w-24 shrink-0 aspect-[210/297] rounded-md overflow-hidden border border-[var(--store-border)] bg-[color-mix(in_srgb,var(--store-text)_6%,var(--store-surface))]">
            {!imageFailed ? (
              <img
                src={book.coverUrl}
                alt={tCard.coverAlt(book.title)}
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2 text-[var(--store-muted)]">
                <BookOpen className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1.5">
                {book.subject && (
                  <span
                    dir="auto"
                    className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-md border border-[var(--store-border)] bg-[color-mix(in_srgb,var(--store-text)_5%,transparent)] text-[var(--store-muted)]"
                  >
                    {book.subject}
                  </span>
                )}
                <h2
                  id="book-detail-modal-title"
                  dir={isRtl ? 'rtl' : 'auto'}
                  className="storefront-title text-xl sm:text-2xl font-bold text-[var(--store-text)] leading-snug break-words"
                >
                  {book.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={tModal.closeLabel}
                className="p-1.5 text-[var(--store-muted)] hover:text-[var(--store-text)] hover:bg-[color-mix(in_srgb,var(--store-text)_7%,transparent)] rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="space-y-1 text-xs sm:text-sm text-[var(--store-muted)]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] sm:text-xs text-[var(--store-subtle)] shrink-0">
                  {tCard.writer}
                </dt>
                <dd dir={isRtl ? 'rtl' : 'auto'} className="font-medium text-[var(--store-text)] text-end truncate">
                  {book.writer}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] sm:text-xs text-[var(--store-subtle)] shrink-0">
                  {tCard.translator}
                </dt>
                <dd dir={isRtl ? 'rtl' : 'auto'} className="text-end truncate">
                  {book.translator}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[11px] sm:text-xs text-[var(--store-subtle)] shrink-0">
                  {tCard.publication}
                </dt>
                <dd dir={isRtl ? 'rtl' : 'auto'} className="text-end truncate">
                  {book.publication}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Scrollable Book Description */}
        {book.description.trim() && (
          <div className="px-5 sm:px-6 py-4 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--store-subtle)]">
              {tModal.aboutBook}
            </div>
            <p
              dir="auto"
              className="text-sm text-[var(--store-muted)] leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto pe-1"
            >
              {book.description}
            </p>
          </div>
        )}

        {/* Footer with Price & Direct Buy CTA */}
        <div className="px-5 sm:px-6 py-4 border-t border-[var(--store-border)] bg-[color-mix(in_srgb,var(--store-text)_3%,var(--store-surface))] flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span
              dir="ltr"
              className="font-mono text-lg font-semibold text-[var(--store-text)] tabular-nums shrink-0"
            >
              {formatUsdPrice(book.priceUsd)}
            </span>
            <span className="text-xs text-[var(--store-subtle)] truncate">{tCard.paidByLtc}</span>
          </div>

          <button
            type="button"
            disabled={isDisabled}
            onClick={() => {
              onClose();
              onBuyBook(book);
            }}
            className={`inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
              outOfStock
                ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] cursor-not-allowed'
                : storePaused
                  ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] cursor-not-allowed'
                  : isCreatingOrder
                    ? 'bg-[var(--store-accent)] text-white opacity-75 cursor-wait'
                    : 'bg-[var(--store-accent)] text-white shadow-xs hover:opacity-90 cursor-pointer'
            }`}
          >
            {outOfStock
              ? tCard.outOfStock
              : storePaused
                ? tCard.paused
                : isCreatingOrder
                  ? tCard.opening
                  : tCard.buy}
          </button>
        </div>
      </div>
    </div>
  );
}
