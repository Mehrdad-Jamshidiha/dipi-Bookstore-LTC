import { useEffect, useState } from 'react';
import { BookOpen, Building2, Info, Languages, PenLine, RotateCcw, RotateCw } from 'lucide-react';
import { STORE_COPY, type StoreLang } from '../i18n';
import { getCardRadiusClass, getCardRowMarginClass } from '../theme';
import type {
  BookDescriptionMode,
  BookItem,
  CardRadiusChoice,
  MobileCardStyle,
  MobileGridGap,
} from '../types';

function formatUsdPrice(priceUsd: number): string {
  const rounded = Math.round(priceUsd * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

interface BookCardProps {
  book: BookItem;
  isCreatingOrder: boolean;
  storePaused?: boolean;
  onBuyBook: (book: BookItem) => void;
  onInspectBook?: (book: BookItem) => void;
  descriptionDisplayMode: BookDescriptionMode;
  lang: StoreLang;
  cardRadius: CardRadiusChoice;
  mobileCardStyle: MobileCardStyle;
  mobileGridColumns: 1 | 2;
  mobileGridGap: MobileGridGap;
  mobileShowMetadata: boolean;
}

export function BookCard({
  book,
  isCreatingOrder,
  storePaused = false,
  onBuyBook,
  onInspectBook,
  descriptionDisplayMode,
  lang,
  cardRadius,
  mobileCardStyle,
  mobileGridColumns,
  mobileGridGap,
  mobileShowMetadata,
}: BookCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const hasDescription = Boolean(book.description?.trim());
  const isDetailModalMode = descriptionDisplayMode === 'detail-modal' && hasDescription;
  const isCoverFlipMode = descriptionDisplayMode === 'cover-flip' && hasDescription;
  const isInteractiveArticle = isDetailModalMode || isCoverFlipMode;

  useEffect(() => {
    if (!isCoverFlipMode) {
      setIsFlipped(false);
    }
  }, [isCoverFlipMode, book.id]);

  const outOfStock = book.availableCount <= 0;
  const isDisabled = outOfStock || storePaused || isCreatingOrder;
  const t = STORE_COPY[lang].card;
  const radiusClass = getCardRadiusClass(cardRadius);
  const rowMarginClass = getCardRowMarginClass(mobileGridGap);

  const isHorizontal = mobileCardStyle === 'horizontal';
  const isCompact = mobileCardStyle === 'compact';
  const isCoverFocus = mobileCardStyle === 'cover-focus';
  const isStandardTwoCol = mobileCardStyle === 'standard' && mobileGridColumns === 2;
  const useMobileMetaIcons =
    mobileGridColumns === 2 && (mobileCardStyle === 'standard' || mobileCardStyle === 'compact');

  const cardLayoutClass = isHorizontal
    ? 'flex flex-row sm:grid sm:grid-cols-1 sm:grid-rows-subgrid sm:row-span-4 sm:gap-y-0 sm:items-stretch min-w-0'
    : 'grid grid-cols-1 grid-rows-subgrid row-span-4 gap-y-0 items-stretch min-w-0';

  const coverContainerClass = isHorizontal
    ? 'relative w-28 shrink-0 aspect-[210/297] border-e border-[var(--store-border)] sm:w-full sm:min-w-0 sm:border-e-0 sm:border-b'
    : 'relative w-full min-w-0 aspect-[210/297] border-b border-[var(--store-border)]';

  const horizontalPadClass =
    isCompact || isCoverFocus
      ? 'px-3 sm:px-6'
      : isHorizontal || isStandardTwoCol
        ? 'px-3.5 sm:px-6'
        : 'px-5 sm:px-6';

  const titleDividerClass = isCoverFocus
    ? 'sm:border-b border-[color-mix(in_srgb,var(--store-text)_10%,transparent)]'
    : 'border-b border-[color-mix(in_srgb,var(--store-text)_10%,transparent)]';

  const titleContainerClass = isHorizontal
    ? `${horizontalPadClass} py-1.5 sm:py-2 w-full flex items-center ${titleDividerClass} min-w-0 overflow-hidden`
    : isCompact || isCoverFocus
      ? `${horizontalPadClass} py-1.5 sm:py-2 w-full flex items-center ${titleDividerClass} min-w-0 overflow-hidden`
      : isStandardTwoCol
        ? `${horizontalPadClass} py-1.5 sm:py-2 w-full flex items-center ${titleDividerClass} min-w-0 overflow-hidden`
        : `${horizontalPadClass} py-2 sm:py-2 w-full flex items-center ${titleDividerClass} min-w-0 overflow-hidden`;

  const titleClass = isHorizontal
    ? 'text-lg/[1.05] sm:text-[1.6rem]/[1.05] line-clamp-2 sm:line-clamp-none'
    : isCompact
      ? 'text-base/[1.05] sm:text-[1.6rem]/[1.05] line-clamp-2 sm:line-clamp-none'
      : isCoverFocus
        ? 'text-base/[1.05] sm:text-[1.6rem]/[1.05] line-clamp-2 sm:line-clamp-none'
        : isStandardTwoCol
          ? 'text-lg/[1.05] sm:text-[1.6rem]/[1.05] line-clamp-2 sm:line-clamp-none'
          : 'text-2xl/[1.05] sm:text-[1.6rem]/[1.05]';

  const metaWrapperClass = isCoverFocus
    ? 'h-0 overflow-hidden p-0 sm:h-auto sm:px-6 sm:py-2.5 space-y-1 text-sm text-[var(--store-muted)] w-full min-w-0'
    : isCompact || isStandardTwoCol
      ? `${horizontalPadClass} py-1.5 sm:py-2.5 space-y-1 text-xs sm:text-sm text-[var(--store-muted)] w-full min-w-0 overflow-hidden`
      : isHorizontal
        ? `${horizontalPadClass} py-1.5 sm:py-2.5 space-y-1 text-xs sm:text-sm text-[var(--store-muted)] w-full min-w-0 overflow-hidden flex-1 sm:flex-none`
        : `${horizontalPadClass} py-2 sm:py-2.5 space-y-1 text-sm text-[var(--store-muted)] w-full min-w-0 overflow-hidden`;

  const footerPaddingClass =
    isCompact || isCoverFocus
      ? `${horizontalPadClass} py-2 sm:py-3`
      : isHorizontal || isStandardTwoCol
        ? `${horizontalPadClass} py-2 sm:py-3`
        : `${horizontalPadClass} py-2.5 sm:py-3`;

  const primaryMetaRowClass = useMobileMetaIcons
    ? 'flex items-center justify-start gap-1.5 sm:items-baseline sm:justify-between sm:gap-3 min-w-0'
    : 'flex items-baseline justify-between gap-2 sm:gap-3 min-w-0';

  const extraMetaRowClass = mobileShowMetadata
    ? primaryMetaRowClass
    : 'hidden sm:flex items-baseline justify-between gap-3 min-w-0';

  const metaValueAlignClass = useMobileMetaIcons
    ? 'text-start sm:text-end truncate min-w-0'
    : 'text-end truncate min-w-0';

  const buyButtonClass = `inline-flex items-center justify-center rounded-md font-semibold whitespace-nowrap shrink-0 transition-all ${
    isCompact || isCoverFocus || isStandardTwoCol
      ? 'px-2.5 py-1 text-[11px] sm:px-3.5 sm:py-1.5 sm:text-xs'
      : 'px-3.5 py-1.5 text-xs'
  } ${
    outOfStock
      ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
      : storePaused
        ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
        : isCreatingOrder
          ? 'bg-[var(--store-accent)] text-white opacity-75'
          : 'bg-[var(--store-accent)] text-white shadow-xs group-hover:opacity-90'
  }`;

  const buyLabel = outOfStock
    ? t.outOfStock
    : storePaused
      ? t.paused
      : isCreatingOrder
        ? t.opening
        : t.buy;

  const coverArtwork = !imageFailed ? (
    <img
      src={book.coverUrl}
      alt={t.coverAlt(book.title)}
      referrerPolicy="no-referrer"
      onError={() => setImageFailed(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
    />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 sm:gap-3 p-3 sm:p-6 text-[var(--store-muted)]">
      <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--store-text)]" />
      <span
        className="storefront-title text-sm/[1.18] sm:text-xl/[1.18] font-bold text-[var(--store-text)] text-center"
        dir={lang === 'fa' ? 'rtl' : 'auto'}
      >
        {book.title}
      </span>
    </div>
  );

  const metadataBlock = (
    <dl
      onClick={isDetailModalMode ? () => onInspectBook?.(book) : undefined}
      className={`${metaWrapperClass} ${isDetailModalMode ? 'cursor-pointer' : ''}`}
    >
      <div className={primaryMetaRowClass}>
        <dt
          title={t.writer}
          className="text-[11px] sm:text-xs text-[var(--store-subtle)] shrink-0 flex items-center"
        >
          {useMobileMetaIcons && (
            <PenLine className="w-3.5 h-3.5 sm:hidden" aria-hidden="true" />
          )}
          <span className={useMobileMetaIcons ? 'sr-only sm:not-sr-only' : undefined}>
            {t.writer}
          </span>
        </dt>
        <dd
          dir={lang === 'fa' ? 'rtl' : 'auto'}
          className={`font-medium text-[var(--store-text)] ${metaValueAlignClass}`}
        >
          {book.writer}
        </dd>
      </div>
      <div className={extraMetaRowClass}>
        <dt
          title={t.translator}
          className="text-[11px] sm:text-xs text-[var(--store-subtle)] shrink-0 flex items-center"
        >
          {useMobileMetaIcons && (
            <Languages className="w-3.5 h-3.5 sm:hidden" aria-hidden="true" />
          )}
          <span className={useMobileMetaIcons ? 'sr-only sm:not-sr-only' : undefined}>
            {t.translator}
          </span>
        </dt>
        <dd
          dir={lang === 'fa' ? 'rtl' : 'auto'}
          className={`text-[var(--store-muted)] ${metaValueAlignClass}`}
        >
          {book.translator}
        </dd>
      </div>
      <div className={extraMetaRowClass}>
        <dt
          title={t.publication}
          className="text-[11px] sm:text-xs text-[var(--store-subtle)] shrink-0 flex items-center"
        >
          {useMobileMetaIcons && (
            <Building2 className="w-3.5 h-3.5 sm:hidden" aria-hidden="true" />
          )}
          <span className={useMobileMetaIcons ? 'sr-only sm:not-sr-only' : undefined}>
            {t.publication}
          </span>
        </dt>
        <dd
          dir={lang === 'fa' ? 'rtl' : 'auto'}
          className={`text-[var(--store-muted)] ${metaValueAlignClass}`}
        >
          {book.publication}
        </dd>
      </div>
    </dl>
  );

  const footerBlock = (
    <div
      className={`${footerPaddingClass} border-t border-[var(--store-border)] flex items-center justify-between gap-2 w-full min-w-0 ${
        isHorizontal ? 'mt-auto sm:mt-0' : ''
      }`}
    >
      <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
        <span
          dir="ltr"
          className={`font-mono font-semibold text-[var(--store-text)] tabular-nums shrink-0 ${
            isCompact || isCoverFocus || isStandardTwoCol
              ? 'text-sm sm:text-base'
              : 'text-base'
          }`}
        >
          {formatUsdPrice(book.priceUsd)}
        </span>
        <span className="text-[10px] sm:text-[11px] text-[var(--store-subtle)] truncate">
          {t.paidByLtc}
        </span>
      </div>

      {isInteractiveArticle ? (
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => onBuyBook(book)}
          className={`${buyButtonClass} ${
            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
          }`}
        >
          {buyLabel}
        </button>
      ) : (
        <span className={buyButtonClass}>{buyLabel}</span>
      )}
    </div>
  );

  const bodyContent = (
    <>
      {/* Track 2: Vertically centered Title Compartment with subtle divider */}
      {isDetailModalMode ? (
        <button
          type="button"
          onClick={() => onInspectBook?.(book)}
          aria-label={t.viewDetails}
          className={`${titleContainerClass} text-start cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--store-accent)]`}
        >
          <h2
            dir={lang === 'fa' ? 'rtl' : 'auto'}
            className={`storefront-title font-bold text-[var(--store-text)] group-hover:text-[var(--store-accent)] transition-colors w-full min-w-0 break-words ${titleClass}`}
          >
            {book.title}
          </h2>
        </button>
      ) : isCoverFlipMode ? (
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => onBuyBook(book)}
          className={`${titleContainerClass} text-start ${
            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
          } focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--store-accent)]`}
        >
          <h2
            dir={lang === 'fa' ? 'rtl' : 'auto'}
            className={`storefront-title font-bold text-[var(--store-text)] group-hover:text-[var(--store-accent)] transition-colors w-full min-w-0 break-words ${titleClass}`}
          >
            {book.title}
          </h2>
        </button>
      ) : (
        <div className={titleContainerClass}>
          <h2
            dir={lang === 'fa' ? 'rtl' : 'auto'}
            className={`storefront-title font-bold text-[var(--store-text)] group-hover:text-[var(--store-accent)] transition-colors w-full min-w-0 break-words ${titleClass}`}
          >
            {book.title}
          </h2>
        </div>
      )}

      {/* Track 3: Writer, Translator, Publication Compartment */}
      {metadataBlock}

      {/* Track 4: Clean USD Price, Paid by LTC notice & Buy Button */}
      {footerBlock}
    </>
  );

  // Mode 2 (detail-modal) or Mode 3 (cover-flip) with a non-empty description
  if (isInteractiveArticle) {
    return (
      <article
        className={`group w-full text-start ${cardLayoutClass} ${rowMarginClass} bg-[var(--store-surface)] border border-[var(--store-border)] ${radiusClass} overflow-hidden transition-all duration-200 ${
          outOfStock || storePaused
            ? 'opacity-80'
            : 'hover:-translate-y-1 hover:border-[var(--store-accent)] hover:shadow-md'
        }`}
      >
        {/* Track 1: Book Cover — strict A4 portrait aspect ratio (210:297) */}
        <div
          className={`${coverContainerClass} bg-[color-mix(in_srgb,var(--store-text)_6%,var(--store-surface))] overflow-hidden`}
        >
          {isDetailModalMode ? (
            <button
              type="button"
              onClick={() => onInspectBook?.(book)}
              aria-label={t.viewDetails}
              title={t.viewDetails}
              className="relative w-full h-full block cursor-pointer text-start focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--store-accent)]"
            >
              {coverArtwork}
              <span
                aria-hidden="true"
                className="absolute top-2 end-2 inline-flex items-center justify-center p-1.5 rounded-md bg-[var(--store-surface)]/90 text-[var(--store-text)] border border-[var(--store-border)] shadow-xs backdrop-blur-[2px] group-hover:text-[var(--store-accent)] transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </span>
            </button>
          ) : isFlipped ? (
            /* Cover-Flip Back-of-Book Panel — strictly contained in the A4 aspect box (0px height shift) */
            <div className="w-full h-full flex flex-col bg-[var(--store-surface)] text-[var(--store-text)] p-2.5 sm:p-4">
              <div className="flex items-center justify-between gap-1.5 pb-1.5 sm:pb-2 mb-1.5 sm:mb-2 border-b border-[var(--store-border)] shrink-0">
                <span
                  dir={lang === 'fa' ? 'rtl' : 'auto'}
                  className="text-[10px] sm:text-xs font-semibold text-[var(--store-subtle)] truncate"
                >
                  {book.subject || book.title}
                </span>
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  aria-label={t.showCover}
                  title={t.showCover}
                  className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] sm:text-[11px] font-medium text-[var(--store-text)] bg-[color-mix(in_srgb,var(--store-text)_6%,transparent)] hover:bg-[color-mix(in_srgb,var(--store-text)_12%,transparent)] border border-[var(--store-border)] shrink-0 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3 shrink-0" />
                  <span className={isHorizontal ? 'hidden sm:inline' : undefined}>
                    {t.showCover}
                  </span>
                </button>
              </div>
              <div
                dir="auto"
                className={`flex-1 min-h-0 overflow-y-auto text-[var(--store-muted)] whitespace-pre-line pe-1 ${
                  isHorizontal
                    ? 'text-[10px] leading-snug sm:text-xs sm:leading-relaxed'
                    : isCompact || isCoverFocus || isStandardTwoCol
                      ? 'text-[11px] leading-snug sm:text-xs sm:leading-relaxed'
                      : 'text-xs sm:text-sm leading-relaxed'
                }`}
              >
                {book.description}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              aria-label={t.showBlurb}
              title={t.showBlurb}
              className="relative w-full h-full block cursor-pointer text-start focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--store-accent)]"
            >
              {coverArtwork}
              <span
                aria-hidden="true"
                className="absolute top-2 end-2 inline-flex items-center justify-center p-1.5 rounded-md bg-[var(--store-surface)]/90 text-[var(--store-text)] border border-[var(--store-border)] shadow-xs backdrop-blur-[2px] group-hover:text-[var(--store-accent)] transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </span>
            </button>
          )}
        </div>

        {isHorizontal ? (
          <div className="flex flex-col flex-1 min-w-0 sm:contents">{bodyContent}</div>
        ) : (
          bodyContent
        )}
      </article>
    );
  }

  // Mode 1 (none), Mode 4 (checkout-accordion), or book without description: 100% instant tap-to-buy card
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onBuyBook(book)}
      className={`group w-full text-start ${cardLayoutClass} ${rowMarginClass} bg-[var(--store-surface)] border border-[var(--store-border)] ${radiusClass} overflow-hidden transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-accent)] ${
        outOfStock || storePaused
          ? 'opacity-70 cursor-not-allowed'
          : 'cursor-pointer hover:-translate-y-1 hover:border-[var(--store-accent)] hover:shadow-md active:translate-y-0'
      }`}
    >
      {/* Track 1: Book Cover — strict A4 portrait aspect ratio (210:297) */}
      <div
        className={`${coverContainerClass} bg-[color-mix(in_srgb,var(--store-text)_6%,var(--store-surface))] overflow-hidden`}
      >
        {coverArtwork}
      </div>

      {isHorizontal ? (
        <div className="flex flex-col flex-1 min-w-0 sm:contents">{bodyContent}</div>
      ) : (
        bodyContent
      )}
    </button>
  );
}

