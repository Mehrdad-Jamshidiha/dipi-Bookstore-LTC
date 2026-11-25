import { useEffect } from 'react';
import { AlertCircle, ArrowRightLeft, ExternalLink, X } from 'lucide-react';
import { STORE_COPY, type StoreLang } from '../i18n';
import type { BookItem, OpenOrderSummary } from '../types';

interface OpenOrderConflictModalProps {
  openOrder: OpenOrderSummary;
  requestedBook: BookItem;
  canResumeExisting: boolean;
  isProcessing: boolean;
  errorMessage: string | null;
  lang: StoreLang;
  onCancelAndOpenNew: () => void;
  onResumeExisting: () => void;
  onClose: () => void;
}

function formatUsdPrice(priceUsd: number): string {
  const rounded = Math.round(priceUsd * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

export function OpenOrderConflictModal({
  openOrder,
  requestedBook,
  canResumeExisting,
  isProcessing,
  errorMessage,
  lang,
  onCancelAndOpenNew,
  onResumeExisting,
  onClose,
}: OpenOrderConflictModalProps) {
  const t = STORE_COPY[lang].openOrderPrompt;
  const isRtl = lang === 'fa';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isProcessing, onClose]);

  const isDifferentBook = requestedBook.id !== openOrder.productId;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-[#181614]/55 backdrop-blur-[2px] overflow-y-auto ${
        isRtl ? 'font-fa' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-order-conflict-title"
    >
      <div className="relative w-full max-w-md bg-white border border-[#E6E2DA] rounded-2xl shadow-2xl my-auto overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-[#E6E2DA] bg-[#FAF9F6]">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-[#B45309] shrink-0" />
            <h2
              id="open-order-conflict-title"
              className="text-sm sm:text-base font-semibold text-[#181614] leading-snug"
            >
              {t.title}
            </h2>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            aria-label={t.closeLabel}
            className="p-1.5 text-[#6B655E] hover:text-[#181614] hover:bg-[#EFECE6] rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5">
          <p className="text-xs sm:text-sm text-[#6B655E] leading-relaxed">{t.description}</p>

          {errorMessage && (
            <div className="px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-start gap-2 text-xs text-[#991B1B]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3 bg-[#FAF9F6] border border-[#E6E2DA] rounded-xl space-y-2">
            <div className="text-[11px] font-medium text-[#6B655E]">{t.currentOrderLabel}</div>
            <div className="flex items-center gap-3">
              <img
                src={openOrder.coverUrl}
                alt={openOrder.bookTitle}
                referrerPolicy="no-referrer"
                className="w-10 aspect-[210/297] object-cover rounded border border-[#E6E2DA] shrink-0 bg-[#F2EFE9]"
              />
              <div className="min-w-0 flex-1">
                <div
                  dir={isRtl ? 'rtl' : 'auto'}
                  className="font-titr text-base font-bold text-[#181614] leading-snug break-words"
                >
                  {openOrder.bookTitle}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6B655E] mt-0.5 tabular-nums">
                  <span dir="ltr" className="font-mono font-medium text-[#181614]">
                    {openOrder.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span dir="ltr" className="font-mono">
                    {formatUsdPrice(openOrder.priceUsd)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isDifferentBook && (
            <div className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-2 text-xs">
              <span className="text-[#64748B] shrink-0">{t.newBookLabel}:</span>
              <span
                dir={isRtl ? 'rtl' : 'auto'}
                className="font-medium text-[#181614] truncate"
              >
                {requestedBook.title}
              </span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onCancelAndOpenNew}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              <span>{isProcessing ? t.cancellingAndOpening : t.cancelAndOpenNew}</span>
            </button>

            <div className={`grid gap-2 ${canResumeExisting ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {canResumeExisting && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={onResumeExisting}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.openExistingOrder}</span>
                </button>
              )}

              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white hover:bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {t.keepCurrentOrder}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
