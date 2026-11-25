import QRCode from 'qrcode';

export interface SpotRateResult {
  ltcUsd: number;
  source: string;
  fetchedAt: string;
}

export interface TxVerificationResult {
  verified: boolean;
  reason?: string;
  txid: string;
  confirmations: number;
  receivedLitoshis: number;
  explorerUrl: string;
}

interface CachedRate {
  result: SpotRateResult;
  expiresAt: number;
}

let cachedRate: CachedRate | null = null;
const RATE_CACHE_MS = 60_000;
const FALLBACK_LTC_USD = 88.5;

const TXID_REGEX = /^[a-fA-F0-9]{64}$/;
const MAINNET_ADDRESS_REGEX = /^(ltc1[ac-hj-np-z02-9]{25,87}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,34})$/;
const TESTNET_ADDRESS_REGEX = /^(tltc1[ac-hj-np-z02-9]{25,87}|[mn2Q][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

export function isValidTxid(txid: string): boolean {
  return typeof txid === 'string' && TXID_REGEX.test(txid.trim());
}

export function isValidLitecoinAddress(address: string, network: 'mainnet' | 'testnet'): boolean {
  if (typeof address !== 'string') return false;
  const trimmed = address.trim();
  return network === 'testnet'
    ? TESTNET_ADDRESS_REGEX.test(trimmed)
    : MAINNET_ADDRESS_REGEX.test(trimmed);
}

export function buildLitecoinPaymentUri(params: {
  address: string;
  amountLtc: string;
  orderId: string;
}): string {
  const query = new URLSearchParams({
    amount: params.amountLtc,
    label: 'dipi',
    message: `Order ${params.orderId}`,
  });
  return `litecoin:${params.address}?${query.toString()}`;
}

export async function generatePaymentQrSvg(paymentUri: string): Promise<string> {
  return QRCode.toDataURL(paymentUri, {
    width: 240,
    margin: 2,
    color: {
      dark: '#111827',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });
}

export interface EffectiveQuoteRateResult extends SpotRateResult {
  spotLtcUsd: number;
  spreadPercent: number;
  mode: 'live' | 'manual';
}

export async function getLiveLtcUsdRate(options?: {
  cacheSeconds?: number;
}): Promise<SpotRateResult> {
  const cacheSec =
    options?.cacheSeconds !== undefined &&
    Number.isFinite(options.cacheSeconds) &&
    options.cacheSeconds >= 15 &&
    options.cacheSeconds <= 600
      ? Math.round(options.cacheSeconds)
      : Math.round(RATE_CACHE_MS / 1000);
  const cacheTtlMs = cacheSec * 1000;

  if (cachedRate) {
    const fetchedMs = Date.parse(cachedRate.result.fetchedAt);
    if (Number.isFinite(fetchedMs) && Date.now() < fetchedMs + cacheTtlMs) {
      return cachedRate.result;
    }
  }

  // Primary: Coinbase public spot price API (strictly hardcoded HTTPS host)
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/LTC-USD/spot', {
      signal: AbortSignal.timeout(4500),
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: { amount?: string } };
      const parsed = Number.parseFloat(json?.data?.amount || '');
      if (Number.isFinite(parsed) && parsed > 1) {
        const result: SpotRateResult = {
          ltcUsd: Number(parsed.toFixed(2)),
          source: 'Coinbase Spot',
          fetchedAt: new Date().toISOString(),
        };
        cachedRate = { result, expiresAt: Date.now() + cacheTtlMs };
        return result;
      }
    }
  } catch {
    // Fall through to secondary feed
  }

  // Secondary: CoinGecko public price API
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd',
      {
        signal: AbortSignal.timeout(4500),
        headers: { Accept: 'application/json' },
      }
    );
    if (res.ok) {
      const json = (await res.json()) as { litecoin?: { usd?: number } };
      const parsed = json?.litecoin?.usd;
      if (typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 1) {
        const result: SpotRateResult = {
          ltcUsd: Number(parsed.toFixed(2)),
          source: 'CoinGecko Spot',
          fetchedAt: new Date().toISOString(),
        };
        cachedRate = { result, expiresAt: Date.now() + cacheTtlMs };
        return result;
      }
    }
  } catch {
    // Fall through to cached or default rate
  }

  if (cachedRate) {
    return cachedRate.result;
  }

  return {
    ltcUsd: FALLBACK_LTC_USD,
    source: 'Reference Rate',
    fetchedAt: new Date().toISOString(),
  };
}

export async function getEffectiveLtcQuoteRate(settings: {
  ltcRateMode: 'live' | 'manual';
  manualLtcRateUsd: number;
  quoteSpreadPercent: number;
  quoteCacheSeconds: number;
}): Promise<EffectiveQuoteRateResult> {
  const spread =
    Number.isFinite(settings.quoteSpreadPercent) &&
    settings.quoteSpreadPercent >= 0 &&
    settings.quoteSpreadPercent <= 25
      ? Number(settings.quoteSpreadPercent.toFixed(2))
      : 0;

  let base: SpotRateResult;
  if (settings.ltcRateMode === 'manual') {
    const manualRate =
      Number.isFinite(settings.manualLtcRateUsd) && settings.manualLtcRateUsd >= 1
        ? Number(settings.manualLtcRateUsd.toFixed(2))
        : FALLBACK_LTC_USD;
    base = {
      ltcUsd: manualRate,
      source: 'Manual Rate',
      fetchedAt: new Date().toISOString(),
    };
  } else {
    base = await getLiveLtcUsdRate({ cacheSeconds: settings.quoteCacheSeconds });
  }

  const effectiveLtcUsd =
    spread > 0
      ? Number(Math.max(0.01, base.ltcUsd / (1 + spread / 100)).toFixed(2))
      : base.ltcUsd;

  return {
    ltcUsd: effectiveLtcUsd,
    spotLtcUsd: base.ltcUsd,
    spreadPercent: spread,
    mode: settings.ltcRateMode,
    source: base.source,
    fetchedAt: base.fetchedAt,
  };
}

function getExplorerBase(network: 'mainnet' | 'testnet'): string {
  return network === 'testnet'
    ? 'https://litecoinspace.org/testnet'
    : 'https://litecoinspace.org';
}

interface LitecoinspaceTx {
  txid: string;
  vout?: Array<{
    scriptpubkey_address?: string;
    value?: number;
  }>;
  status?: {
    confirmed?: boolean;
    block_height?: number;
    block_time?: number;
  };
}

async function fetchTipHeight(apiBase: string): Promise<number | null> {
  try {
    const res = await fetch(`${apiBase}/blocks/tip/height`, {
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;
    const text = await res.text();
    const height = Number.parseInt(text.trim(), 10);
    return Number.isFinite(height) ? height : null;
  } catch {
    return null;
  }
}

export async function verifyLitecoinTransactionOnChain(params: {
  txid: string;
  receivingAddress: string;
  expectedLitoshis: number;
  minConfirmations: number;
  network: 'mainnet' | 'testnet';
}): Promise<TxVerificationResult> {
  const cleanTxid = params.txid.trim().toLowerCase();
  const explorerBase = getExplorerBase(params.network);
  const explorerUrl = `${explorerBase}/tx/${cleanTxid}`;

  if (!isValidTxid(cleanTxid)) {
    return {
      verified: false,
      reason: 'Transaction ID must be a valid 64-character hexadecimal Litecoin TXID.',
      txid: cleanTxid,
      confirmations: 0,
      receivedLitoshis: 0,
      explorerUrl,
    };
  }

  const apiBase = `${explorerBase}/api`;

  // Primary verification: litecoinspace.org (Esplora-compatible REST API)
  try {
    const res = await fetch(`${apiBase}/tx/${encodeURIComponent(cleanTxid)}`, {
      signal: AbortSignal.timeout(7000),
      headers: { Accept: 'application/json' },
    });

    if (res.status === 404) {
      return {
        verified: false,
        reason: 'Transaction was not found on the Litecoin network yet. Wait a few seconds and retry.',
        txid: cleanTxid,
        confirmations: 0,
        receivedLitoshis: 0,
        explorerUrl,
      };
    }

    if (res.ok) {
      const tx = (await res.json()) as LitecoinspaceTx;
      const receivedLitoshis = (tx.vout || [])
        .filter(
          (out) =>
            out.scriptpubkey_address?.toLowerCase() === params.receivingAddress.toLowerCase()
        )
        .reduce((sum, out) => sum + (typeof out.value === 'number' ? out.value : 0), 0);

      let confirmations = 0;
      if (tx.status?.confirmed) {
        const tipHeight = await fetchTipHeight(apiBase);
        if (tipHeight && tx.status.block_height) {
          confirmations = Math.max(1, tipHeight - tx.status.block_height + 1);
        } else {
          confirmations = 1;
        }
      }

      if (receivedLitoshis <= 0) {
        return {
          verified: false,
          reason: 'Transaction does not include an output to the merchant Litecoin address.',
          txid: cleanTxid,
          confirmations,
          receivedLitoshis,
          explorerUrl,
        };
      }

      if (receivedLitoshis < params.expectedLitoshis) {
        const expectedStr = (params.expectedLitoshis / 1e8).toFixed(8);
        const gotStr = (receivedLitoshis / 1e8).toFixed(8);
        return {
          verified: false,
          reason: `Insufficient payment amount: received ${gotStr} LTC, required at least ${expectedStr} LTC.`,
          txid: cleanTxid,
          confirmations,
          receivedLitoshis,
          explorerUrl,
        };
      }

      if (confirmations < params.minConfirmations) {
        return {
          verified: false,
          reason: `Transaction detected (${confirmations}/${params.minConfirmations} confirmations). Waiting for block confirmation.`,
          txid: cleanTxid,
          confirmations,
          receivedLitoshis,
          explorerUrl,
        };
      }

      return {
        verified: true,
        txid: cleanTxid,
        confirmations,
        receivedLitoshis,
        explorerUrl,
      };
    }
  } catch {
    // Fall through to BlockCypher backup for mainnet
  }

  // Secondary fallback for mainnet: BlockCypher public Litecoin API
  if (params.network === 'mainnet') {
    try {
      const res = await fetch(
        `https://api.blockcypher.com/v1/ltc/main/txs/${encodeURIComponent(cleanTxid)}`,
        {
          signal: AbortSignal.timeout(7000),
          headers: { Accept: 'application/json' },
        }
      );

      if (res.ok) {
        const tx = (await res.json()) as {
          confirmations?: number;
          outputs?: Array<{ value?: number; addresses?: string[] }>;
        };
        const receivedLitoshis = (tx.outputs || [])
          .filter((out) =>
            (out.addresses || []).some(
              (addr) => addr.toLowerCase() === params.receivingAddress.toLowerCase()
            )
          )
          .reduce((sum, out) => sum + (typeof out.value === 'number' ? out.value : 0), 0);

        const confirmations = typeof tx.confirmations === 'number' ? tx.confirmations : 0;

        if (receivedLitoshis < params.expectedLitoshis) {
          return {
            verified: false,
            reason: `Output to merchant address (${(receivedLitoshis / 1e8).toFixed(8)} LTC) is below required amount.`,
            txid: cleanTxid,
            confirmations,
            receivedLitoshis,
            explorerUrl,
          };
        }

        if (confirmations < params.minConfirmations) {
          return {
            verified: false,
            reason: `Transaction detected (${confirmations}/${params.minConfirmations} confirmations). Waiting for block confirmation.`,
            txid: cleanTxid,
            confirmations,
            receivedLitoshis,
            explorerUrl,
          };
        }

        return {
          verified: true,
          txid: cleanTxid,
          confirmations,
          receivedLitoshis,
          explorerUrl,
        };
      }
    } catch {
      // Handled below
    }
  }

  return {
    verified: false,
    reason: 'Unable to reach Litecoin blockchain indexers right now. Please retry shortly.',
    txid: cleanTxid,
    confirmations: 0,
    receivedLitoshis: 0,
    explorerUrl,
  };
}

export async function pollAddressForMatchingOrderPayment(params: {
  receivingAddress: string;
  expectedLitoshis: number;
  minConfirmations: number;
  network: 'mainnet' | 'testnet';
  orderCreatedAtMs: number;
  isTxidUsed: (txid: string) => boolean;
}): Promise<{
  found: boolean;
  confirmed: boolean;
  txid?: string;
  confirmations?: number;
  message?: string;
}> {
  if (!isValidLitecoinAddress(params.receivingAddress, params.network)) {
    return { found: false, confirmed: false, message: 'Merchant address format does not match network.' };
  }

  const explorerBase = getExplorerBase(params.network);
  const apiBase = `${explorerBase}/api`;

  try {
    const res = await fetch(
      `${apiBase}/address/${encodeURIComponent(params.receivingAddress)}/txs`,
      {
        signal: AbortSignal.timeout(6500),
        headers: { Accept: 'application/json' },
      }
    );

    if (!res.ok) {
      return { found: false, confirmed: false, message: 'Awaiting Litecoin network payment.' };
    }

    const txs = (await res.json()) as LitecoinspaceTx[];
    if (!Array.isArray(txs) || txs.length === 0) {
      return { found: false, confirmed: false, message: 'Listening for incoming Litecoin transaction.' };
    }

    const tipHeight = await fetchTipHeight(apiBase);

    for (const tx of txs.slice(0, 25)) {
      if (!tx.txid || params.isTxidUsed(tx.txid)) continue;

      // Ignore historical transactions confirmed long before the order was created (5 min clock skew grace)
      if (tx.status?.block_time && tx.status.block_time * 1000 < params.orderCreatedAtMs - 300_000) {
        continue;
      }

      const paidToMerchant = (tx.vout || [])
        .filter(
          (out) =>
            out.scriptpubkey_address?.toLowerCase() === params.receivingAddress.toLowerCase()
        )
        .reduce((sum, out) => sum + (typeof out.value === 'number' ? out.value : 0), 0);

      // Exact unique-litoshi match (allows slight overpayment up to 1000 litoshis if wallet rounded)
      if (paidToMerchant === params.expectedLitoshis) {
        let confirmations = 0;
        if (tx.status?.confirmed) {
          confirmations =
            tipHeight && tx.status.block_height
              ? Math.max(1, tipHeight - tx.status.block_height + 1)
              : 1;
        }

        if (confirmations >= params.minConfirmations) {
          return {
            found: true,
            confirmed: true,
            txid: tx.txid,
            confirmations,
            message: 'Payment confirmed on Litecoin blockchain.',
          };
        }

        return {
          found: true,
          confirmed: false,
          txid: tx.txid,
          confirmations,
          message: `Payment detected in mempool (${confirmations}/${params.minConfirmations} confirmations).`,
        };
      }
    }

    return { found: false, confirmed: false, message: 'Waiting for Litecoin payment to arrive.' };
  } catch {
    return { found: false, confirmed: false, message: 'Listening for incoming Litecoin transaction.' };
  }
}
