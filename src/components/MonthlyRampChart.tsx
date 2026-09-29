import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CapacityRampMode,
  GlobalSimConfig,
  LotConfig,
  PtSizingMode,
} from '../data/rfqDefaults';
import {
  FullSimulationOutput,
  MonthlySimulationPoint,
} from '../engine/simulator';
import {
  formatCurrencyMillions as formatCurrencyUsd,
  formatTokensMillions,
} from '../utils/format';

interface MonthlyRampChartProps {
  lots: LotConfig[];
  globalConfig: GlobalSimConfig;
  sim: FullSimulationOutput;
  selectedTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
  onChangeGlobal?: (next: GlobalSimConfig) => void;
  onApplyGlobalPtMode?: (mode: PtSizingMode) => void;
  currentGlobalPtMode?: PtSizingMode | 'MIXED';
  lockedScope?: 'all' | LotConfig['id'];
  embedded?: boolean;
}

type ScopeFilter = 'all' | LotConfig['id'];
type MetricView = 'gsu_capacity' | 'monthly_cost' | 'token_volume';

export const MonthlyRampChart: React.FC<MonthlyRampChartProps> = ({
  lots,
  globalConfig,
  sim,
  selectedTier,
  lockedScope,
  embedded = false,
}) => {
  const [internalScope, setInternalScope] = useState<ScopeFilter>('all');
  const scope: ScopeFilter = lockedScope ?? internalScope;
  const [metricView, setMetricView] = useState<MetricView>('gsu_capacity');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number>(17); // Default M18 (Jun 2028)
  const [showScheduleTable, setShowScheduleTable] = useState<boolean>(false);

  const activeRampMode: CapacityRampMode =
    globalConfig.capacityRampMode ?? 'SMOOTH_MONTHLY';

  const series: MonthlySimulationPoint[] = useMemo(() => {
    if (scope === 'all') {
      return sim.monthlyTotals;
    }
    return sim.monthlyByLot[scope] ?? sim.monthlyTotals;
  }, [scope, sim.monthlyTotals, sim.monthlyByLot]);

  // Compute 36-month aggregate comparison between SMOOTH_MONTHLY and ANNUAL_STEPS
  const rampComparison = useMemo(() => {
    let smooth3YTotalUsd = 0;
    let step3YTotalUsd = 0;
    let purePayGo3YTotalUsd = 0;
    let smoothUtilWeighted = 0;
    let smoothGsuMonths = 0;
    let stepUtilWeighted = 0;
    let stepGsuMonths = 0;

    for (const pt of series) {
      const fsp = pt.fspCostsUsd[selectedTier];
      smooth3YTotalUsd += fsp.smoothMonthlyHybridUsd;
      step3YTotalUsd += fsp.annualStepHybridUsd;
      purePayGo3YTotalUsd += fsp.purePayGoUsd;

      smoothUtilWeighted +=
        pt.smoothMonthlyGsus * pt.smoothMonthlyUtilizationRate;
      smoothGsuMonths += pt.smoothMonthlyGsus;

      stepUtilWeighted += pt.annualStepGsus * pt.annualStepUtilizationRate;
      stepGsuMonths += pt.annualStepGsus;
    }

    const monthlyRampSavingsVsStepsUsd = step3YTotalUsd - smooth3YTotalUsd;
    const avgSmoothUtil =
      smoothGsuMonths > 0 ? smoothUtilWeighted / smoothGsuMonths : 0;
    const avgStepUtil =
      stepGsuMonths > 0 ? stepUtilWeighted / stepGsuMonths : 0;

    const m1 = series[0];
    const m12 = series[11];
    const m13 = series[12];
    const m24 = series[23];
    const m25 = series[24];
    const m36 = series[35];

    return {
      smooth3YTotalUsd,
      step3YTotalUsd,
      purePayGo3YTotalUsd,
      monthlyRampSavingsVsStepsUsd,
      avgSmoothUtil,
      avgStepUtil,
      m1,
      m12,
      m13,
      m24,
      m25,
      m36,
    };
  }, [series, selectedTier]);

  // Build 12-quarter rollup for the quarterly provisioning schedule table
  const quarterlyRollup = useMemo(() => {
    const quarters: Array<{
      quarterLabel: string;
      yearNumber: number;
      monthsRange: string;
      totalTokensB: number;
      smoothStartGsus: number;
      smoothEndGsus: number;
      smoothAvgGsus: number;
      annualStepGsus: number;
      smoothUtilPct: number;
      stepUtilPct: number;
      activeQuarterCostUsd: number;
      purePayGoQuarterCostUsd: number;
    }> = [];

    for (let q = 0; q < 12; q++) {
      const slice = series.slice(q * 3, q * 3 + 3);
      if (slice.length === 0) continue;
      const totalTokensB =
        slice.reduce((acc, m) => acc + m.totalTokensM, 0) / 1000;
      const smoothStartGsus = slice[0].smoothMonthlyGsus;
      const smoothEndGsus = slice[slice.length - 1].smoothMonthlyGsus;
      const smoothAvgGsus = Math.round(
        slice.reduce((acc, m) => acc + m.smoothMonthlyGsus, 0) / slice.length
      );
      const annualStepGsus = slice[0].annualStepGsus;
      const smoothUtilPct =
        (slice.reduce((acc, m) => acc + m.smoothMonthlyUtilizationRate, 0) /
          slice.length) *
        100;
      const stepUtilPct =
        (slice.reduce((acc, m) => acc + m.annualStepUtilizationRate, 0) /
          slice.length) *
        100;
      const activeQuarterCostUsd = slice.reduce(
        (acc, m) => acc + m.fspCostsUsd[selectedTier].hybridTotalUsd,
        0
      );
      const purePayGoQuarterCostUsd = slice.reduce(
        (acc, m) => acc + m.fspCostsUsd[selectedTier].purePayGoUsd,
        0
      );

      quarters.push({
        quarterLabel: slice[0].quarterLabel,
        yearNumber: slice[0].yearNumber,
        monthsRange: `${slice[0].shortMonthLabel}–${slice[slice.length - 1].shortMonthLabel} (${slice[0].monthLabel.split(' ')[0]}–${slice[slice.length - 1].monthLabel.split(' ')[0]})`,
        totalTokensB,
        smoothStartGsus,
        smoothEndGsus,
        smoothAvgGsus,
        annualStepGsus,
        smoothUtilPct,
        stepUtilPct,
        activeQuarterCostUsd,
        purePayGoQuarterCostUsd,
      });
    }
    return quarters;
  }, [series, selectedTier]);

  const activePoint =
    series[Math.max(0, Math.min(35, hoveredMonthIdx))] ?? series[0];

  // SVG Chart Geometry
  const svgWidth = 960;
  const svgHeight = 300;
  const padLeft = 68;
  const padRight = 28;
  const padTop = 24;
  const padBottom = 40;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const xForMonth = (idx: number) =>
    padLeft + (idx / Math.max(1, series.length - 1)) * plotW;

  const maxYValue = useMemo(() => {
    if (metricView === 'gsu_capacity') {
      const maxPeak = Math.max(
        10,
        ...series.map((p) =>
          Math.max(
            p.peakGsuDemand,
            p.smoothMonthlyGsus,
            p.annualStepGsus,
            p.avgGsuDemand
          )
        )
      );
      return Math.ceil(maxPeak * 1.12);
    }
    if (metricView === 'monthly_cost') {
      const maxCost = Math.max(
        1000,
        ...series.map((p) =>
          Math.max(
            p.fspCostsUsd[selectedTier].purePayGoUsd,
            p.fspCostsUsd[selectedTier].smoothMonthlyHybridUsd,
            p.fspCostsUsd[selectedTier].annualStepHybridUsd
          )
        )
      );
      return maxCost * 1.12;
    }
    // token_volume (in Billions of tokens)
    const maxTokB = Math.max(
      1,
      ...series.map((p) => p.totalTokensM / 1000)
    );
    return maxTokB * 1.12;
  }, [series, metricView, selectedTier]);

  const yForVal = (val: number) =>
    padTop + plotH - (Math.max(0, Math.min(maxYValue, val)) / maxYValue) * plotH;

  const buildStepAreaPath = (vals: number[]) => {
    if (vals.length === 0) return '';
    const pts: string[] = [];
    for (let i = 0; i < vals.length; i++) {
      const x = xForMonth(i);
      const y = yForVal(vals[i]);
      if (i === 0) {
        pts.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
      } else {
        const prevX = xForMonth(i - 1);
        const halfX = (prevX + x) / 2;
        const prevY = yForVal(vals[i - 1]);
        pts.push(`L ${halfX.toFixed(1)} ${prevY.toFixed(1)}`);
        pts.push(`L ${halfX.toFixed(1)} ${y.toFixed(1)}`);
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
    }
    const lastX = xForMonth(vals.length - 1);
    const firstX = xForMonth(0);
    const baseY = padTop + plotH;
    return `${pts.join(' ')} L ${lastX.toFixed(1)} ${baseY.toFixed(1)} L ${firstX.toFixed(1)} ${baseY.toFixed(1)} Z`;
  };

  const buildStepLinePath = (vals: number[]) => {
    if (vals.length === 0) return '';
    const pts: string[] = [];
    for (let i = 0; i < vals.length; i++) {
      const x = xForMonth(i);
      const y = yForVal(vals[i]);
      if (i === 0) {
        pts.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
      } else {
        const prevX = xForMonth(i - 1);
        const halfX = (prevX + x) / 2;
        const prevY = yForVal(vals[i - 1]);
        pts.push(`L ${halfX.toFixed(1)} ${prevY.toFixed(1)}`);
        pts.push(`L ${halfX.toFixed(1)} ${y.toFixed(1)}`);
        pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
    }
    return pts.join(' ');
  };

  const buildSmoothLinePath = (vals: number[]) => {
    if (vals.length === 0) return '';
    return vals
      .map(
        (v, i) =>
          `${i === 0 ? 'M' : 'L'} ${xForMonth(i).toFixed(1)} ${yForVal(v).toFixed(1)}`
      )
      .join(' ');
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((t) => maxYValue * t);

  const formatYAxisTick = (val: number) => {
    if (metricView === 'gsu_capacity') {
      return `${Math.round(val)} GSU`;
    }
    if (metricView === 'monthly_cost') {
      if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
      if (val >= 1_000) return `$${Math.round(val / 1_000)}k`;
      return `$${Math.round(val)}`;
    }
    return `${val >= 100 ? Math.round(val) : val.toFixed(1)}B`;
  };

  return (
    <div className={embedded ? 'space-y-4' : 'md-card p-6 space-y-4'}>
      {/* Controls Bar: Scope Filter (if not locked) + Metric View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--md-outline-variant)]">
        <div>
          <h3 className="type-title-md text-[var(--md-on-surface)]">
            36-month capacity & spend trajectory (Jan 2027 – Dec 2029)
          </h3>
          <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
            Compares progressive monthly GSU scaling (M1–M36) against flat annual steps (Y1 / Y2 / Y3). Hover any month to inspect exact numbers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!lockedScope && (
            <div
              role="group"
              aria-label="Filter 36-month chart by lot"
              className="inline-flex items-center p-1 rounded-full bg-[var(--md-surface-container)]"
            >
              <button
                type="button"
                onClick={() => setInternalScope('all')}
                aria-pressed={scope === 'all'}
                className={`h-[32px] px-3 rounded-full type-label-md cursor-pointer transition-colors ${
                  scope === 'all'
                    ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                All 4 lots
              </button>
              {lots.map((lot) => (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => setInternalScope(lot.id)}
                  aria-pressed={scope === lot.id}
                  className={`h-[32px] px-3 rounded-full type-label-md cursor-pointer transition-colors ${
                    scope === lot.id
                      ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                      : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                  }`}
                >
                  Lot {lot.lotNumber}
                </button>
              ))}
            </div>
          )}

          {/* Chart Metric View Switcher */}
          <div
            role="group"
            aria-label="Select 36-month chart metric"
            className="inline-flex items-center p-1 rounded-full bg-[var(--md-surface-container)]"
          >
            <button
              type="button"
              onClick={() => setMetricView('gsu_capacity')}
              aria-pressed={metricView === 'gsu_capacity'}
              className={`h-[32px] px-3 rounded-full type-label-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                metricView === 'gsu_capacity'
                  ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>GSU capacity</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView('monthly_cost')}
              aria-pressed={metricView === 'monthly_cost'}
              className={`h-[32px] px-3 rounded-full type-label-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                metricView === 'monthly_cost'
                  ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Monthly spend ($/mo)</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView('token_volume')}
              aria-pressed={metricView === 'token_volume'}
              className={`h-[32px] px-3 rounded-full type-label-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                metricView === 'token_volume'
                  ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Token volume (B/mo)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Strip blocks (Tonal surface-container, no borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-[12px] bg-[var(--md-surface-container)] space-y-1 tabular-nums">
          <div className="type-label-md text-[var(--md-on-surface)]">
            PT GSU scaling trajectory (M1 → M36)
          </div>
          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
            Reserved units from start to end of contract
          </div>
          <div className="type-title-md text-[var(--md-primary)] pt-0.5">
            {rampComparison.m1.smoothMonthlyGsus} → {rampComparison.m12.smoothMonthlyGsus} → {rampComparison.m24.smoothMonthlyGsus} → {rampComparison.m36.smoothMonthlyGsus} GSUs
          </div>
          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
            vs 3 annual steps: {rampComparison.m1.annualStepGsus} (Y1) · {rampComparison.m13.annualStepGsus} (Y2) · {rampComparison.m25.annualStepGsus} (Y3)
          </div>
        </div>

        <div className="p-3.5 rounded-[12px] bg-[var(--md-surface-container)] space-y-1 tabular-nums">
          <div className="type-label-md text-[var(--md-on-surface)]">
            Monthly ramp vs 3 annual steps
          </div>
          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
            3-year budget impact of progressive monthly scaling
          </div>
          <div className="type-title-md text-[var(--md-positive)] pt-0.5">
            {rampComparison.monthlyRampSavingsVsStepsUsd >= 0 ? '▼ ' : '▲ '}
            {formatCurrencyUsd(Math.abs(rampComparison.monthlyRampSavingsVsStepsUsd))}
          </div>
          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
            Monthly: {formatCurrencyUsd(rampComparison.smooth3YTotalUsd)} vs Steps: {formatCurrencyUsd(rampComparison.step3YTotalUsd)}
          </div>
        </div>

        <div className="p-3.5 rounded-[12px] bg-[var(--md-surface-container)] space-y-1 tabular-nums">
          <div className="type-label-md text-[var(--md-on-surface)]">
            36-month mean PT utilization
          </div>
          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
            Efficiency of reserved capacity across 3 years
          </div>
          <div className="type-title-md text-[var(--md-on-surface)] pt-0.5">
            {(rampComparison.avgSmoothUtil * 100).toFixed(1)}% (monthly) vs {(rampComparison.avgStepUtil * 100).toFixed(1)}% (steps)
          </div>
          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
            Active mode: {activeRampMode === 'SMOOTH_MONTHLY' ? 'Progressive monthly ramp' : '3 annual step plateaus'}
          </div>
        </div>

        <div className="p-3.5 rounded-[12px] bg-[var(--md-surface-container)] space-y-1 tabular-nums">
          <div className="flex items-center justify-between">
            <span className="type-label-md text-[var(--md-primary)]">
              {activePoint.shortMonthLabel} · {activePoint.monthLabel} ({activePoint.quarterLabel})
            </span>
            <span className="type-body-sm text-[var(--md-on-surface-variant)]">
              Inspected month
            </span>
          </div>
          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
            Hover chart below to scrub any month
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="type-title-md text-[var(--md-on-surface)]">
              {activePoint.provisionedGsus} GSUs ({(activePoint.ptUtilizationRate * 100).toFixed(1)}%)
            </span>
            <span className="type-title-md text-[var(--md-primary)]">
              {formatCurrencyUsd(activePoint.fspCostsUsd[selectedTier].hybridTotalUsd)}/mo
            </span>
          </div>
          <div className="type-body-sm text-[var(--md-on-surface-variant)] flex items-center justify-between">
            <span>Volume: {formatTokensMillions(activePoint.totalTokensM)}</span>
            <span>0-GSU PayGo: {formatCurrencyUsd(activePoint.fspCostsUsd[selectedTier].purePayGoUsd)}</span>
          </div>
        </div>
      </div>

      {/* Legend above chart */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-5 type-body-sm text-[var(--md-on-surface-variant)]">
          {metricView === 'gsu_capacity' && (
            <>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-1)' }}
                />
                <span>Progressive monthly PT GSUs (M1–M36)</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-comparison)' }}
                />
                <span>3 annual step plateaus (Y1 / Y2 / Y3 flat, dashed)</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-2)' }}
                />
                <span>24/7 mean GSU demand</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-5)' }}
                />
                <span>Peak hourly GSU demand (spillover zone)</span>
              </span>
            </>
          )}

          {metricView === 'monthly_cost' && (
            <>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-1)' }}
                />
                <span>Monthly hybrid spend (PT commit + overflow)</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-comparison)' }}
                />
                <span>3 annual step hybrid spend (dashed)</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-3)' }}
                />
                <span>0-GSU PayGo baseline ($/mo)</span>
              </span>
            </>
          )}

          {metricView === 'token_volume' && (
            <>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-1)' }}
                />
                <span>Tokens served by reserved PT GSUs (B/mo)</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-[10px] h-[10px] rounded-[4px]"
                  style={{ backgroundColor: 'var(--md-chart-2)' }}
                />
                <span>Total monthly workload ramp (PT + PayGo + Batch)</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive 36-Month SVG Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none cursor-crosshair"
          role="img"
          aria-label="36-month workload and Provisioned Throughput ramp chart"
        >
          {/* Horizontal Y-Grid Lines & Labels */}
          {yTicks.map((t, idx) => {
            const y = yForVal(t);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={
                    idx === 0
                      ? 'var(--md-outline-variant)'
                      : 'var(--md-chart-grid)'
                  }
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--md-on-surface-variant)"
                  className="type-axis-label"
                >
                  {formatYAxisTick(t)}
                </text>
              </g>
            );
          })}

          {/* Year Separator Lines (M12->M13, M24->M25) */}
          {[11.5, 23.5].map((boundaryIdx, i) => {
            const bx = xForMonth(boundaryIdx);
            return (
              <line
                key={i}
                x1={bx}
                y1={padTop}
                x2={bx}
                y2={padTop + plotH}
                stroke="var(--md-outline-variant)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Year Header Labels inside Plot */}
          <text
            x={(xForMonth(0) + xForMonth(11)) / 2}
            y={padTop + 14}
            textAnchor="middle"
            fill="var(--md-on-surface-variant)"
            className="type-axis-label"
          >
            Year 1 · 2027 (M1–M12)
          </text>
          <text
            x={(xForMonth(12) + xForMonth(23)) / 2}
            y={padTop + 14}
            textAnchor="middle"
            fill="var(--md-on-surface-variant)"
            className="type-axis-label"
          >
            Year 2 · 2028 (M13–M24)
          </text>
          <text
            x={(xForMonth(24) + xForMonth(35)) / 2}
            y={padTop + 14}
            textAnchor="middle"
            fill="var(--md-on-surface-variant)"
            className="type-axis-label"
          >
            Year 3 · 2029 (M25–M36)
          </text>

          {/* VIEW 1: GSU CAPACITY RAMP */}
          {metricView === 'gsu_capacity' && (
            <>
              <path
                d={buildStepAreaPath(series.map((s) => s.peakGsuDemand))}
                fill="var(--md-chart-5)"
                fillOpacity={0.12}
              />
              <path
                d={buildSmoothLinePath(series.map((s) => s.peakGsuDemand))}
                fill="none"
                stroke="var(--md-chart-5)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <path
                d={buildStepAreaPath(series.map((s) => s.smoothMonthlyGsus))}
                fill="var(--md-chart-1)"
                fillOpacity={0.16}
              />
              <path
                d={buildStepLinePath(series.map((s) => s.smoothMonthlyGsus))}
                fill="none"
                stroke="var(--md-chart-1)"
                strokeWidth={2}
              />
              <path
                d={buildStepLinePath(series.map((s) => s.annualStepGsus))}
                fill="none"
                stroke="var(--md-chart-comparison)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <path
                d={buildSmoothLinePath(series.map((s) => s.avgGsuDemand))}
                fill="none"
                stroke="var(--md-chart-2)"
                strokeWidth={2}
              />
            </>
          )}

          {/* VIEW 2: MONTHLY COST ($/MO) */}
          {metricView === 'monthly_cost' && (
            <>
              <path
                d={buildSmoothLinePath(
                  series.map((s) => s.fspCostsUsd[selectedTier].purePayGoUsd)
                )}
                fill="none"
                stroke="var(--md-chart-3)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <path
                d={buildStepLinePath(
                  series.map(
                    (s) => s.fspCostsUsd[selectedTier].annualStepHybridUsd
                  )
                )}
                fill="none"
                stroke="var(--md-chart-comparison)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <path
                d={buildStepAreaPath(
                  series.map(
                    (s) => s.fspCostsUsd[selectedTier].smoothMonthlyHybridUsd
                  )
                )}
                fill="var(--md-chart-1)"
                fillOpacity={0.16}
              />
              <path
                d={buildStepLinePath(
                  series.map(
                    (s) => s.fspCostsUsd[selectedTier].smoothMonthlyHybridUsd
                  )
                )}
                fill="none"
                stroke="var(--md-chart-1)"
                strokeWidth={2}
              />
            </>
          )}

          {/* VIEW 3: MONTHLY TOKEN VOLUME (B/MO) */}
          {metricView === 'token_volume' && (
            <>
              <path
                d={buildStepAreaPath(series.map((s) => s.totalTokensM / 1000))}
                fill="var(--md-chart-2)"
                fillOpacity={0.14}
              />
              <path
                d={buildSmoothLinePath(
                  series.map((s) => s.totalTokensM / 1000)
                )}
                fill="none"
                stroke="var(--md-chart-2)"
                strokeWidth={2}
              />
              <path
                d={buildStepAreaPath(
                  series.map((s) => s.ptCoveredTokensM / 1000)
                )}
                fill="var(--md-chart-1)"
                fillOpacity={0.18}
              />
              <path
                d={buildStepLinePath(
                  series.map((s) => s.ptCoveredTokensM / 1000)
                )}
                fill="none"
                stroke="var(--md-chart-1)"
                strokeWidth={2}
              />
            </>
          )}

          {/* Hovered Month Vertical Guide Line & Dot */}
          {activePoint && (
            <g>
              <line
                x1={xForMonth(activePoint.monthIndex)}
                y1={padTop}
                x2={xForMonth(activePoint.monthIndex)}
                y2={padTop + plotH}
                stroke="var(--md-outline)"
                strokeWidth={1}
              />
              <circle
                cx={xForMonth(activePoint.monthIndex)}
                cy={
                  metricView === 'gsu_capacity'
                    ? yForVal(activePoint.provisionedGsus)
                    : metricView === 'monthly_cost'
                    ? yForVal(
                        activePoint.fspCostsUsd[selectedTier].hybridTotalUsd
                      )
                    : yForVal(activePoint.ptCoveredTokensM / 1000)
                }
                r={4}
                fill="var(--md-chart-1)"
              />
            </g>
          )}

          {/* X-Axis Labels (7 key ticks across 36 months) */}
          {series.map((pt, idx) => {
            const showTick = idx % 6 === 0 || idx === 35;
            if (!showTick) return null;
            const x = xForMonth(idx);
            return (
              <text
                key={pt.monthIndex}
                x={x}
                y={padTop + plotH + 20}
                textAnchor="middle"
                fill="var(--md-on-surface-variant)"
                className="type-axis-label"
              >
                {pt.shortMonthLabel} ({pt.monthLabel})
              </text>
            );
          })}

          {/* Invisible Interactive Hover Columns for All 36 Months */}
          {series.map((pt, idx) => {
            const colW = plotW / 36;
            const x = xForMonth(idx) - colW / 2;
            return (
              <rect
                key={pt.monthIndex}
                x={Math.max(padLeft, x)}
                y={padTop}
                width={colW}
                height={plotH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredMonthIdx(idx)}
                onClick={() => setHoveredMonthIdx(idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Collapsible 12-Quarter Provisioning Schedule Table */}
      <div className="pt-2 border-t border-[var(--md-outline-variant)]">
        <div className="flex items-center justify-between">
          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
            Quarterly GSU provisioning & budget schedule (Q1 2027 – Q4 2029)
          </div>
          <button
            type="button"
            onClick={() => setShowScheduleTable((v) => !v)}
            className="md-btn-text cursor-pointer"
          >
            <span>
              {showScheduleTable ? 'Hide 12-quarter table' : 'Show 12-quarter table'}
            </span>
            {showScheduleTable ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {showScheduleTable && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="h-[44px] bg-[var(--md-surface-container)] border-b border-[var(--md-outline-variant)]">
                  <th className="px-3 type-label-md text-[var(--md-on-surface-variant)]">
                    Quarter
                  </th>
                  <th className="px-3 type-label-md text-[var(--md-on-surface-variant)]">
                    Months
                  </th>
                  <th className="px-3 type-label-md text-[var(--md-on-surface-variant)] text-right">
                    Quarter volume
                  </th>
                  <th className="px-3 type-label-md text-[var(--md-on-surface-variant)] text-right">
                    Monthly PT ramp (start → end)
                  </th>
                  <th className="px-3 type-label-md text-[var(--md-on-surface-variant)] text-right">
                    Flat annual step GSUs
                  </th>
                  <th className="px-3 type-label-md text-[var(--md-on-surface-variant)] text-right">
                    PT utilization
                  </th>
                  <th className="px-3 type-label-md text-[var(--md-on-surface-variant)] text-right">
                    Active quarter spend
                  </th>
                </tr>
              </thead>
              <tbody>
                {quarterlyRollup.map((q) => (
                  <tr
                    key={q.quarterLabel}
                    className="h-[44px] border-b border-[var(--md-outline-variant)] hover:bg-[var(--md-surface-container-low)] type-data-cell"
                  >
                    <td className="px-3 font-medium text-[var(--md-on-surface)]">
                      {q.quarterLabel}
                    </td>
                    <td className="px-3 text-[var(--md-on-surface-variant)]">
                      {q.monthsRange}
                    </td>
                    <td className="px-3 text-right">
                      {q.totalTokensB.toFixed(2)}B
                    </td>
                    <td className="px-3 text-right font-medium text-[var(--md-primary)]">
                      {q.smoothStartGsus} → {q.smoothEndGsus} GSUs (avg {q.smoothAvgGsus})
                    </td>
                    <td className="px-3 text-right text-[var(--md-on-surface-variant)]">
                      {q.annualStepGsus} GSUs
                    </td>
                    <td className="px-3 text-right">
                      {q.smoothUtilPct.toFixed(1)}%
                    </td>
                    <td className="px-3 text-right font-medium text-[var(--md-on-surface)]">
                      {formatCurrencyUsd(q.activeQuarterCostUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
