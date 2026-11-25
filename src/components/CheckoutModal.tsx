import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Tag,
  X,
  XCircle,
} from 'lucide-react';
import {
  applyOrderPromo,
  cancelOrder,
  downloadOrderFile,
  pollOrderStatus,
  removeOrderPromo,
  sandboxConfirmOrder,
  verifyOrderTxid,
} from '../api';
import { STORE_COPY, type StoreLang } from '../i18n';
import type { BookDescriptionMode, OrderView } from '../types';

interface CheckoutModalProps {
  order: OrderView;
  orderToken: string;
  onOrderUpdated: (updated: OrderView) => void;
  onClose: () => void;
  lang: StoreLang;
  descriptionDisplayMode: BookDescriptionMode;
}

function formatRemainingTime(expiresAtIso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.parse(expiresAtIso) - nowMs) / 1000));
  const hrs = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CheckoutModal({
  order,
  orderToken,
  onOrderUpdated,
  onClose,
  lang,
  descriptionDisplayMode,
}: CheckoutModalProps) {
  const t = STORE_COPY[lang].checkout;
  const isRtl = lang === 'fa';

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [txidInput, setTxidInput] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [isVerifyingTx, setIsVerifyingTx] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showMobileQr, setShowMobileQr] = useState(false);
  const [showTxidForm, setShowTxidForm] = useState(false);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [showHowToRedeem, setShowHowToRedeem] = useState(false);
  const [showBookDescription, setShowBookDescription] = useState(false);

  const prevStatusRef = useRef(order.status);
  const autoDownloadedOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    setShowBookDescription(false);
  }, [order.id]);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = order.status;

    if (
      order.status === 'confirmed' &&
      prevStatus !== 'confirmed' &&
      order.deliveredCode &&
      order.autoDownloadReceipt &&
      autoDownloadedOrderIdRef.current !== order.id
    ) {
      autoDownloadedOrderIdRef.current = order.id;
      setIsDownloading(true);
      downloadOrderFile(order.id, orderToken, 'txt')
        .catch(() => {
          // Buyer can still manually click Download Receipt if browser blocks automatic downloads
        })
        .finally(() => {
          setIsDownloading(false);
        });
    }
  }, [order.autoDownloadReceipt, order.deliveredCode, order.id, order.status, orderToken]);

  useEffect(() => {
    if (order.status !== 'pending') return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [order.status]);

  useEffect(() => {
    if (order.status !== 'pending') return;
    let cancelled = false;

    const runPoll = async () => {
      setIsPolling(true);
      try {
        const result = await pollOrderStatus(order.id, orderToken);
        if (cancelled) return;
        if (result.order.status !== order.status) {
          onOrderUpdated(result.order);
        }
      } catch {
        // Silent background poll retry
      } finally {
        if (!cancelled) setIsPolling(false);
      }
    };

    const intervalId = window.setInterval(runPoll, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [order.id, order.status, orderToken, onOrderUpdated]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      window.setTimeout(() => setCopiedField((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      setErrorMessage(t.copyFailed);
    }
  };

  const handleManualPoll = async () => {
    setErrorMessage(null);
    setIsPolling(true);
    try {
      const result = await pollOrderStatus(order.id, orderToken);
      onOrderUpdated(result.order);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.pollError);
    } finally {
      setIsPolling(false);
    }
  };

  const handleVerifyTxid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmed = txidInput.trim();
    if (!trimmed) {
      setErrorMessage(t.enterTxidError);
      return;
    }
    setIsVerifyingTx(true);
    try {
      const result = await verifyOrderTxid(order.id, orderToken, trimmed);
      onOrderUpdated(result.order);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.verifyFailed);
    } finally {
      setIsVerifyingTx(false);
    }
  };

  const handleSandboxConfirm = async () => {
    setErrorMessage(null);
    setIsSimulating(true);
    try {
      const result = await sandboxConfirmOrder(order.id, orderToken);
      onOrderUpdated(result.order);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.sandboxFailed);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDownloadTxt = async () => {
    setErrorMessage(null);
    setIsDownloading(true);
    try {
      await downloadOrderFile(order.id, orderToken, 'txt');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.downloadFailed);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCancelOrder = async () => {
    setErrorMessage(null);
    setIsCancelling(true);
    try {
      const result = await cancelOrder(order.id, orderToken);
      onOrderUpdated(result.order);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.cancelFailed);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmed = promoInput.trim();
    if (!trimmed) {
      setErrorMessage(t.enterPromoError);
      return;
    }
    setIsApplyingPromo(true);
    try {
      const result = await applyOrderPromo(order.id, orderToken, trimmed);
      onOrderUpdated(result.order);
      setPromoInput('');
      setShowPromoForm(false);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.promoFailed);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = async () => {
    setErrorMessage(null);
    setIsApplyingPromo(true);
    try {
      const result = await removeOrderPromo(order.id, orderToken);
      onOrderUpdated(result.order);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.promoFailed);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const formatUsdClean = (amount: number) => {
    const rounded = Math.round(amount * 100) / 100;
    return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
  };

  const remaining = formatRemainingTime(order.expiresAt, nowMs);
  const isConfirmed = order.status === 'confirmed';
  const isExpired = order.status === 'expired';
  const isCancelled = order.status === 'cancelled';
  const isInactive = isExpired || isCancelled;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-[#181614]/55 backdrop-blur-[2px] overflow-y-auto ${
        isRtl ? 'font-fa' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div
        className={`relative w-full ${
          isConfirmed && order.deliveredCode ? 'max-w-xl' : 'max-w-4xl'
        } bg-white border border-[#E6E2DA] rounded-2xl shadow-2xl my-auto overflow-hidden`}
      >
        {/* Book Header */}
        <div
          className={`flex items-start justify-between gap-3 sm:gap-4 border-b border-[#E6E2DA] bg-[#FAF9F6] ${
            isConfirmed && order.deliveredCode
              ? 'px-4 sm:px-5 py-3.5'
              : 'px-4 sm:px-6 py-4 sm:py-5'
          }`}
        >
          <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <img
              src={order.coverUrl}
              alt={order.bookTitle}
              referrerPolicy="no-referrer"
              className="w-11 sm:w-12 aspect-[210/297] object-cover rounded border border-[#E6E2DA] shrink-0 bg-[#F2EFE9]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6B655E] mb-1">
                <span dir="ltr" className="font-mono font-medium text-[#181614]">
                  {order.id}
                </span>
                <span aria-hidden="true">·</span>
                {isConfirmed ? (
                  <span className="inline-flex items-center gap-1 font-medium text-[#0F766E]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t.confirmedUnlocked}
                  </span>
                ) : isCancelled ? (
                  <span className="inline-flex items-center gap-1 font-medium text-[#B91C1C]">
                    <XCircle className="w-3.5 h-3.5" />
                    {t.orderCancelled}
                  </span>
                ) : isExpired ? (
                  <span className="inline-flex items-center gap-1 font-medium text-[#B91C1C]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t.quoteExpired}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-[#1E40AF]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{t.awaitingLtc}</span>
                    <span aria-hidden="true">·</span>
                    <span dir="ltr" className="font-mono tabular-nums">
                      {remaining}
                    </span>
                  </span>
                )}
              </div>

              <h2
                id="checkout-modal-title"
                dir={isRtl ? 'rtl' : 'auto'}
                className="font-titr text-lg sm:text-2xl font-bold text-[#181614] leading-snug break-words"
              >
                {order.bookTitle}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeLabel}
            className="p-2 text-[#6B655E] hover:text-[#181614] hover:bg-[#EFECE6] rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {descriptionDisplayMode === 'checkout-accordion' && order.bookDescription?.trim() && (
          <div className="border-b border-[#E6E2DA] bg-[#FAF9F6]/70">
            <button
              type="button"
              onClick={() => setShowBookDescription((prev) => !prev)}
              aria-expanded={showBookDescription}
              className="w-full flex items-center justify-between gap-2 px-4 sm:px-6 py-2.5 text-xs font-medium text-[#4A453F] hover:text-[#181614] hover:bg-[#EFECE6]/60 transition-colors cursor-pointer"
            >
              <span>{t.aboutBook}</span>
              <ChevronDown
                className={`w-4 h-4 text-[#6B655E] transition-transform shrink-0 ${
                  showBookDescription ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showBookDescription && (
              <div className="px-4 sm:px-6 pb-3.5 pt-0.5">
                <p
                  dir="auto"
                  className="text-xs sm:text-sm text-[#4A453F] leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto"
                >
                  {order.bookDescription}
                </p>
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-5 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-start gap-2.5 text-sm text-[#991B1B]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* CONFIRMED & INSTANT DOWNLOAD VIEW */}
        {isConfirmed && order.deliveredCode ? (
          <div className="p-4 sm:p-5 space-y-3">
            <div className="p-3.5 sm:p-4 bg-[#F0FDF9] border border-[#99F6E4] rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
                  <span className="text-xs sm:text-sm font-semibold text-[#115E59] leading-snug">
                    {t.verifiedBanner}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#0F766E] tabular-nums shrink-0">
                  {t.confirmations(order.confirmations)}
                </span>
              </div>

              <div className="space-y-2">
                <div
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg font-mono text-base sm:text-lg font-semibold tracking-wider text-[#181614] select-all break-all text-left"
                >
                  {order.deliveredCode}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => copyValue('code', order.deliveredCode || '')}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#181614] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {copiedField === 'code' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t.copyCode}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={handleDownloadTxt}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isDownloading ? t.downloading : t.downloadTxt}</span>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-[#E6E2DA] rounded-xl overflow-hidden bg-[#FAF9F6]">
              <button
                type="button"
                onClick={() => setShowHowToRedeem((prev) => !prev)}
                aria-expanded={showHowToRedeem}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-[#181614] hover:bg-[#EFECE6] transition-colors cursor-pointer"
              >
                <span>{t.howToRedeem}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#6B655E] transition-transform ${
                    showHowToRedeem ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {showHowToRedeem && (
                <div className="px-3.5 py-2.5 border-t border-[#E6E2DA] bg-white">
                  <p dir="auto" className="text-xs sm:text-sm text-[#6B655E] leading-relaxed">
                    {order.redemptionInstructions}
                  </p>
                </div>
              )}
            </div>

            <div className="px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E6E2DA] rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#6B655E] shrink-0">{t.amountSettled}</span>
                <span dir="ltr" className="font-mono font-medium text-[#181614] tabular-nums">
                  {order.expectedLtc} LTC ({formatUsdClean(order.priceUsd)})
                </span>
              </div>
              {order.promoCode && order.discountUsd > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#6B655E] shrink-0">{t.promoCodeLabel}</span>
                  <span dir="ltr" className="font-mono font-medium text-[#0F766E] tabular-nums">
                    {order.promoCode} (-{formatUsdClean(order.discountUsd)})
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#6B655E] shrink-0">{t.txidLabel}</span>
                <span dir="ltr" className="font-mono text-[#181614] truncate max-w-[210px]">
                  {order.txid}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#6B655E] shrink-0">{t.orderAccessKey}</span>
                <button
                  type="button"
                  dir="ltr"
                  onClick={() => copyValue('token', `${order.id} / ${orderToken}`)}
                  className="font-mono text-[#1E40AF] hover:underline cursor-pointer"
                >
                  {copiedField === 'token' ? t.copiedBang : orderToken}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* PENDING LITECOIN PAYMENT VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-4 sm:p-6 bg-[#FAF9F6] border-b lg:border-b-0 lg:border-e border-[#E6E2DA] flex flex-col items-center text-center gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-medium text-[#6B655E]">
                  <span className="hidden sm:inline">{t.scanToPay}</span>
                  <span className="sm:hidden">
                    {showMobileQr ? t.scanToPay : t.payWithLitecoin}
                  </span>
                </div>
                <div dir="ltr" className="font-mono text-2xl font-bold text-[#181614] tabular-nums">
                  {order.expectedLtc} LTC
                </div>
                <div
                  dir="ltr"
                  className="text-xs text-[#6B655E] tabular-nums flex flex-wrap items-center justify-center gap-1.5"
                >
                  {order.promoCode && order.discountUsd > 0 && (
                    <span className="line-through text-[#A8A095]">
                      {formatUsdClean(order.originalPriceUsd)}
                    </span>
                  )}
                  <span className={order.promoCode && order.discountUsd > 0 ? 'font-semibold text-[#0F766E]' : ''}>
                    {formatUsdClean(order.priceUsd)} USD
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>${order.ltcRateUsd.toFixed(2)}/LTC</span>
                </div>
                {order.promoCode && order.discountUsd > 0 && (
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium text-[#0F766E] bg-[#F0FDF9] border border-[#99F6E4] rounded-md">
                      <Tag className="w-3 h-3" />
                      <span dir="ltr" className="font-mono font-semibold">
                        {order.promoCode}
                      </span>
                      <span>· {t.promoSaved(formatUsdClean(order.discountUsd))}</span>
                    </span>
                  </div>
                )}
              </div>

              <div
                className={`p-2.5 bg-white border border-[#E6E2DA] rounded-xl ${
                  showMobileQr ? 'block' : 'hidden sm:block'
                }`}
              >
                <img
                  src={order.qrDataUrl}
                  alt={t.qrAlt(order.expectedLtc)}
                  className="w-44 h-44 block"
                />
              </div>

              {/* Compact Exact Amount & Receiving Address — below QR (when shown), above Open Wallet */}
              <div className="w-full bg-white border border-[#E6E2DA] rounded-xl divide-y divide-[#EFECE6] text-start">
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-[#6B655E] leading-tight">
                      {t.exactAmount}
                    </div>
                    <div
                      dir="ltr"
                      className="font-mono text-xs sm:text-sm font-semibold text-[#181614] tabular-nums text-left mt-0.5"
                    >
                      {order.expectedLtc} LTC
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue('amount', order.expectedLtc)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedField === 'amount' ? (
                      <Check className="w-3 h-3 text-[#0F766E]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedField === 'amount' ? t.copied : t.copy}</span>
                  </button>
                </div>

                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-[#6B655E] leading-tight">
                      {t.ltcAddress(order.network)}
                    </div>
                    <div
                      dir="ltr"
                      className="font-mono text-[11px] sm:text-xs text-[#181614] break-all leading-snug text-left mt-0.5"
                    >
                      {order.receivingAddress}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue('address', order.receivingAddress)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedField === 'address' ? (
                      <Check className="w-3 h-3 text-[#0F766E]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedField === 'address' ? t.copied : t.copy}</span>
                  </button>
                </div>
              </div>

              <div className="w-full space-y-2">
                <a
                  href={order.paymentUri}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors"
                >
                  <span>{t.openWallet}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => setShowMobileQr((prev) => !prev)}
                  className="sm:hidden w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white/70 hover:bg-[#EFECE6] border border-[#E6E2DA] rounded-lg transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{showMobileQr ? t.hideQrCode : t.showQrCode}</span>
                </button>

                <button
                  type="button"
                  disabled={isPolling || isInactive}
                  onClick={handleManualPoll}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium text-[#1E40AF] hover:text-[#1D4ED8] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
                  <span>{isPolling ? t.checkingBlockchain : t.checkPaymentNow}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between gap-5">
              <div className="space-y-3.5">
                {/* Promo Code Section */}
                {!isInactive && (
                  <div className="space-y-2">
                    {order.promoCode && order.discountUsd > 0 ? (
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#F0FDF9] border border-[#99F6E4] rounded-lg text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                          <span dir="ltr" className="font-mono font-semibold text-[#115E59] truncate">
                            {order.promoCode}
                          </span>
                          <span className="text-[#0F766E] shrink-0">
                            (-{formatUsdClean(order.discountUsd)})
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isApplyingPromo}
                          onClick={handleRemovePromo}
                          className="text-[#B91C1C] hover:underline font-medium shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          {t.removePromo}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowPromoForm((prev) => !prev)}
                          aria-expanded={showPromoForm}
                          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#E6E2DA] rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-[#6B655E]" />
                            <span>{t.havePromoCode}</span>
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-[#6B655E] transition-transform ${
                              showPromoForm ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {showPromoForm && (
                          <form onSubmit={handleApplyPromo} className="flex items-stretch gap-2">
                            <input
                              id="promo-code-checkout-input"
                              type="text"
                              dir="ltr"
                              value={promoInput}
                              onChange={(e) =>
                                setPromoInput(
                                  e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                                )
                              }
                              disabled={isApplyingPromo}
                              maxLength={32}
                              placeholder={t.promoPlaceholder}
                              className="flex-1 min-w-0 px-3 py-2 text-sm font-mono uppercase bg-white border border-[#DBD5CA] rounded-lg text-[#181614] placeholder:text-[#A8A095] placeholder:normal-case focus:outline-none focus:border-[#1E40AF]"
                            />
                            <button
                              type="submit"
                              disabled={isApplyingPromo}
                              className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#181614] hover:bg-[#1E40AF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              {isApplyingPromo ? t.applyingPromo : t.applyPromo}
                            </button>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setShowTxidForm((prev) => !prev)}
                    aria-expanded={showTxidForm}
                    className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#E6E2DA] rounded-lg transition-colors cursor-pointer"
                  >
                    <span>{t.pasteTxidLabel}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#6B655E] transition-transform ${
                        showTxidForm ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showTxidForm && (
                    <form onSubmit={handleVerifyTxid} className="flex flex-col gap-2">
                      <input
                        id="txid-verify-input"
                        type="text"
                        dir="ltr"
                        value={txidInput}
                        onChange={(e) => setTxidInput(e.target.value)}
                        disabled={isInactive || isVerifyingTx}
                        placeholder={t.txidPlaceholder}
                        className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#DBD5CA] rounded-lg text-[#181614] placeholder:text-[#A8A095] focus:outline-none focus:border-[#1E40AF]"
                      />
                      <button
                        type="submit"
                        disabled={isInactive || isVerifyingTx}
                        className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        {isVerifyingTx ? t.verifying : t.verifyTxid}
                      </button>
                    </form>
                  )}
                </div>

                {order.sandboxAvailable && !isInactive && (
                  <div className="pt-4 border-t border-[#EFECE6] space-y-2.5">
                    <div className="text-xs text-[#6B655E] leading-relaxed">
                      <span className="font-semibold text-[#181614]">{t.sandboxTitle}</span> —{' '}
                      {t.sandboxDesc}
                    </div>
                    <button
                      type="button"
                      disabled={isSimulating}
                      onClick={handleSandboxConfirm}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-[#181614] bg-[#F2EFE9] hover:bg-[#E6E2DA] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-[#1E40AF]" />
                      <span>{isSimulating ? t.simulating : t.simulatePayment}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#EFECE6] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B655E]">
                  <span className="inline-flex items-center gap-1.5">
                    <span>{t.accessKeyLabel}</span>
                    <code
                      dir="ltr"
                      className="font-mono text-[#181614] bg-[#F2EFE9] px-1.5 py-0.5 rounded"
                    >
                      {orderToken}
                    </code>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyValue('access', `${order.id} | ${orderToken}`)}
                    className="text-[#1E40AF] hover:underline font-medium cursor-pointer"
                  >
                    {copiedField === 'access' ? t.copied : t.copyOrderAndKey}
                  </button>
                </div>

                {!isInactive && (
                  <button
                    type="button"
                    disabled={isCancelling || isSimulating || isVerifyingTx}
                    onClick={handleCancelOrder}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#B91C1C] bg-[#FEF2F2]/70 hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{isCancelling ? t.cancellingOrder : t.cancelOrder}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
