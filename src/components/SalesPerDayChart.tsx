import { useMemo, useState } from 'react';
import type { DailySalesPoint } from '../types';

interface SalesPerDayChartProps {
  dailySales: DailySalesPoint[];
}

type RangeDays = 7 | 14 | 30;
type MetricMode = 'usd' | 'count';

function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function formatFullDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatUsdCompact(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

function formatYAxisTick(value: number, isUsd: boolean): string {
  if (value >= 1000) {
    const k = Math.round((value / 1000) * 10) / 10;
    const formatted = Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
    return isUsd ? `$${formatted}` : formatted;
  }
  return isUsd ? formatUsdCompact(value) : String(value);
}

function buildNiceTicks(maxValue: number, isCount: boolean): number[] {
  if (maxValue <= 0) {
    return isCount ? [0, 1, 2, 3, 4] : [0, 10, 20, 30, 40];
  }
  const rawStep = maxValue / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  let step = niceFactor * magnitude;
  if (isCount && step < 1) step = 1;
  return [0, step, step * 2, step * 3, step * 4];
}

const Y_TICK_POSITIONS = [
  'top-0 -translate-y-1/2',
  'top-1/4 -translate-y-1/2',
  'top-1/2 -translate-y-1/2',
  'top-3/4 -translate-y-1/2',
  'bottom-0 translate-y-1/2',
] as const;

export function SalesPerDayChart({ dailySales }: SalesPerDayChartProps) {
  const [rangeDays, setRangeDays] = useState<RangeDays>(14);
  const [metric, setMetric] = useState<MetricMode>('usd');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const series = useMemo(() => {
    const safe = Array.isArray(dailySales) ? dailySales : [];
    return safe.slice(-rangeDays);
  }, [dailySales, rangeDays]);

  const stats = useMemo(() => {
    const totalUsd = series.reduce((sum, p) => sum + p.usdTotal, 0);
    const totalCount = series.reduce((sum, p) => sum + p.salesCount, 0);
    const totalLtc = series.reduce((sum, p) => sum + p.ltcTotal, 0);
    const days = Math.max(1, series.length);

    let peak: DailySalesPoint | null = null;
    for (const point of series) {
      const val = metric === 'usd' ? point.usdTotal : point.salesCount;
      const peakVal = peak ? (metric === 'usd' ? peak.usdTotal : peak.salesCount) : 0;
      if (val > peakVal) peak = point;
    }

    return {
      totalUsd,
      totalCount,
      totalLtc,
      avgUsd: totalUsd / days,
      avgCount: totalCount / days,
      peak,
    };
  }, [series, metric]);

  const values = useMemo(
    () => series.map((p) => (metric === 'usd' ? p.usdTotal : p.salesCount)),
    [series, metric]
  );

  const maxDataValue = useMemo(() => Math.max(0, ...values), [values]);
  const yTicks = useMemo(
    () => buildNiceTicks(maxDataValue, metric === 'count'),
    [maxDataValue, metric]
  );
  const yMax = yTicks[yTicks.length - 1] || 1;
  // Descending order for top-to-bottom HTML Y-axis placement
  const yTicksDesc = useMemo(() => [...yTicks].reverse(), [yTicks]);

  // Evenly distributed X-axis ticks rendered in crisp HTML text (never scaled down by SVG viewBox)
  const xAxisTicks = useMemo(() => {
    const n = series.length;
    if (n === 0) return [];
    if (n <= 5) {
      return series.map((point, idx) => ({ idx, label: formatShortDate(point.date) }));
    }
    const tickCount = rangeDays === 7 ? 4 : 5;
    const indices = new Set<number>();
    for (let i = 0; i < tickCount; i += 1) {
      indices.add(Math.round((i * (n - 1)) / (tickCount - 1)));
    }
    return Array.from(indices)
      .sort((a, b) => a - b)
      .map((idx) => ({ idx, label: formatShortDate(series[idx].date) }));
  }, [series, rangeDays]);

  // Plot-only SVG coordinate space (pure geometry; all labels are crisp HTML)
  const plotWidth = 1000;
  const plotHeight = 200;
  const slotWidth = series.length > 0 ? plotWidth / series.length : plotWidth;
  const barWidth = Math.max(12, Math.min(72, slotWidth * 0.58));

  const selectedPoint =
    activeIndex !== null && series[activeIndex]
      ? series[activeIndex]
      : series.length > 0
        ? series[series.length - 1]
        : null;

  return (
    <section className="bg-white border border-[#E6E2DA] rounded-xl overflow-hidden">
      {/* Header & Controls */}
      <div className="px-4 sm:px-5 py-4 border-b border-[#EFECE6] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#181614]">Sales Per Day</h2>
          <p className="text-xs text-[#6B655E] mt-0.5">
            Confirmed Litecoin book purchases over the last {rangeDays} days (UTC)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric toggle */}
          <div className="inline-flex items-center p-0.5 bg-[#EFECE6] rounded-lg">
            {(
              [
                ['usd', 'Revenue ($)'],
                ['count', 'Books Sold'],
              ] as Array<[MetricMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMetric(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  metric === mode
                    ? 'bg-white text-[#181614] shadow-xs'
                    : 'text-[#6B655E] hover:text-[#181614]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Range toggle */}
          <div className="inline-flex items-center p-0.5 bg-[#EFECE6] rounded-lg">
            {([7, 14, 30] as RangeDays[]).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setRangeDays(days);
                  setActiveIndex(null);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  rangeDays === days
                    ? 'bg-white text-[#181614] shadow-xs'
                    : 'text-[#6B655E] hover:text-[#181614]'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period Summary Strip */}
      <div className="grid grid-cols-3 border-b border-[#EFECE6] bg-[#FAF9F6] divide-x divide-[#EFECE6]">
        <div className="px-3 sm:px-4 py-3">
          <div className="text-xs text-[#6B655E]">
            {rangeDays}-Day {metric === 'usd' ? 'Revenue' : 'Books Sold'}
          </div>
          <div className="font-mono text-sm sm:text-base font-semibold text-[#181614] tabular-nums mt-0.5">
            {metric === 'usd' ? formatUsdCompact(stats.totalUsd) : stats.totalCount}
          </div>
        </div>

        <div className="px-3 sm:px-4 py-3">
          <div className="text-xs text-[#6B655E]">Daily Average</div>
          <div className="font-mono text-sm sm:text-base font-semibold text-[#181614] tabular-nums mt-0.5">
            {metric === 'usd'
              ? `${formatUsdCompact(stats.avgUsd)}/day`
              : `${stats.avgCount.toFixed(1)}/day`}
          </div>
        </div>

        <div className="px-3 sm:px-4 py-3">
          <div className="text-xs text-[#6B655E]">Best Day</div>
          <div className="font-mono text-sm sm:text-base font-semibold text-[#1E40AF] tabular-nums mt-0.5 truncate">
            {stats.peak
              ? metric === 'usd'
                ? `${formatUsdCompact(stats.peak.usdTotal)} · ${formatShortDate(stats.peak.date)}`
                : `${stats.peak.salesCount} · ${formatShortDate(stats.peak.date)}`
              : '—'}
          </div>
        </div>
      </div>

      {/* Chart Area with Crisp HTML Y-Axis and X-Axis Typography */}
      <div className="px-4 sm:px-5 pt-5 pb-3.5 space-y-3">
        <div className="flex items-stretch">
          {/* Y-Axis Labels (always crisp 12px/13px HTML text) */}
          <div
            aria-hidden="true"
            className="relative w-12 sm:w-14 h-48 sm:h-56 shrink-0 pr-2.5 select-none"
          >
            {yTicksDesc.map((tick, idx) => (
              <span
                key={tick}
                className={`absolute right-2.5 ${Y_TICK_POSITIONS[idx]} font-mono text-xs sm:text-[13px] font-medium text-[#57534E] tabular-nums leading-none whitespace-nowrap`}
              >
                {formatYAxisTick(tick, metric === 'usd')}
              </span>
            ))}
          </div>

          {/* Plot Area + X-Axis */}
          <div className="flex-1 min-w-0">
            <div
              className="relative h-48 sm:h-56 w-full"
              onMouseLeave={() => setActiveIndex(null)}
            >
              {/* Horizontal Gridlines aligned pixel-for-pixel with Y-axis ticks */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                <div className="absolute inset-x-0 top-0 border-t border-[#EFECE6]" />
                <div className="absolute inset-x-0 top-1/4 border-t border-[#EFECE6]" />
                <div className="absolute inset-x-0 top-1/2 border-t border-[#EFECE6]" />
                <div className="absolute inset-x-0 top-3/4 border-t border-[#EFECE6]" />
                <div className="absolute inset-x-0 bottom-0 border-t border-[#DBD5CA]" />
              </div>

              {/* Plot-only SVG Bars (zero text inside SVG so nothing shrinks on mobile) */}
              <svg
                viewBox={`0 0 ${plotWidth} ${plotHeight}`}
                preserveAspectRatio="none"
                className="relative z-10 w-full h-full block select-none"
                role="img"
                aria-label={`Daily ${metric === 'usd' ? 'USD revenue' : 'book sales'} over the last ${rangeDays} days`}
              >
                {series.map((point, idx) => {
                  const val = metric === 'usd' ? point.usdTotal : point.salesCount;
                  const rawBarHeight = val > 0 ? Math.max(5, (val / yMax) * plotHeight) : 0;
                  const slotX = idx * slotWidth;
                  const barX = slotX + (slotWidth - barWidth) / 2;
                  const barY = plotHeight - rawBarHeight;
                  const isSelected = activeIndex === idx;

                  return (
                    <g
                      key={point.date}
                      className="cursor-pointer"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => setActiveIndex(idx)}
                    >
                      {/* Full-column hover/tap target */}
                      <rect
                        x={slotX}
                        y={0}
                        width={slotWidth}
                        height={plotHeight}
                        fill={isSelected ? '#1E40AF' : 'transparent'}
                        fillOpacity={isSelected ? 0.07 : 0}
                      />

                      {/* Zero-day baseline mark or data bar */}
                      {rawBarHeight > 0 ? (
                        <rect
                          x={barX}
                          y={barY}
                          width={barWidth}
                          height={rawBarHeight}
                          fill={
                            isSelected
                              ? '#1E40AF'
                              : metric === 'usd'
                                ? '#2563EB'
                                : '#0F766E'
                          }
                          fillOpacity={activeIndex === null || isSelected ? 0.92 : 0.45}
                        />
                      ) : (
                        <rect
                          x={barX}
                          y={plotHeight - 3}
                          width={barWidth}
                          height={3}
                          fill={isSelected ? '#1E40AF' : '#E6E2DA'}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* X-Axis Labels (always crisp 12px/13px HTML text, never scaled down) */}
            <div className="flex items-center justify-between gap-2 pt-2.5 select-none">
              {xAxisTicks.map((tick) => {
                const isSelected = activeIndex === tick.idx;
                return (
                  <button
                    key={tick.idx}
                    type="button"
                    onClick={() => setActiveIndex(tick.idx)}
                    className={`font-mono text-xs sm:text-[13px] tabular-nums whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'text-[#181614] font-semibold'
                        : 'text-[#57534E] font-medium hover:text-[#181614]'
                    }`}
                  >
                    {tick.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected / Latest Day Detail Readout */}
        <div className="pt-2.5 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          {selectedPoint ? (
            <>
              <span className="font-medium text-[#181614]">
                {formatFullDate(selectedPoint.date)}
                {activeIndex === null && (
                  <span className="text-[#857E75] font-normal text-xs">
                    {' '}
                    · Today (hover or tap any day)
                  </span>
                )}
              </span>
              <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-[#6B655E]">
                <span>
                  <strong className="text-[#181614]">{selectedPoint.salesCount}</strong>{' '}
                  {selectedPoint.salesCount === 1 ? 'book' : 'books'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#181614] font-semibold">
                  {formatUsdCompact(selectedPoint.usdTotal)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#1E40AF]">{selectedPoint.ltcTotal.toFixed(5)} LTC</span>
              </div>
            </>
          ) : (
            <span className="text-[#857E75]">No daily sales data available yet.</span>
          )}
        </div>

        {stats.totalCount === 0 && (
          <p className="text-xs text-[#857E75]">
            No confirmed sales in the last {rangeDays} days yet — confirmed Litecoin orders appear
            here automatically.
          </p>
        )}
      </div>
    </section>
  );
}
