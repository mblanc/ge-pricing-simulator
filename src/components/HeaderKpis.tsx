import React from 'react';
import { Info, AlertTriangle, Sparkles } from 'lucide-react';
import { FullSimulationOutput } from '../engine/simulator';
import {
  EU_GSU_MONTHLY_PRICE_USD,
  GlobalSimConfig,
  PtSizingMode,
} from '../data/rfqDefaults';
import {
  formatCurrencyExact,
  formatCurrencyMillions,
  formatDeltaPct,
  formatPct,
  formatTokensMillions,
} from '../utils/format';

export type SelectedKpiId = 'tco' | 'spend' | 'routing' | 'gsu';

interface HeaderKpisProps {
  sim: FullSimulationOutput;
  globalConfig: GlobalSimConfig;
  onChangeGlobalConfig: (next: GlobalSimConfig) => void;
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
  onSelectFspTier: (tier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp') => void;
  onApplyGlobalPtMode: (mode: PtSizingMode) => void;
  currentGlobalPtMode: PtSizingMode | 'MIXED';
  selectedKpi?: SelectedKpiId;
  onSelectKpi?: (id: SelectedKpiId) => void;
}

interface SparklineProps {
  points: number[];
  idSuffix: string;
}

/**
 * Meridian KPI Sparkline (DESIGN.md line 474):
 * 40px tall, full card width, chart-1 at 2px stroke with a 12% area fill fading to 0.
 * No axes, no labels; the last point is marked with a 4px dot.
 */
const KpiSparkline: React.FC<SparklineProps> = ({ points, idSuffix }) => {
  const width = 240;
  const height = 40;
  const padX = 4;
  const padY = 6;

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const span = Math.max(maxVal - minVal, 1e-6);

  const coords = points.map((v, idx) => {
    const x =
      padX + (idx / Math.max(points.length - 1, 1)) * (width - padX * 2);
    const y =
      height - padY - ((v - minVal) / span) * (height - padY * 2);
    return { x, y };
  });

  const linePath = coords
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;
  const lastPt = coords[coords.length - 1];
  const gradId = `kpi-spark-grad-${idSuffix}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-[40px] overflow-visible mt-3"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--md-chart-1)"
            stopOpacity="0.12"
          />
          <stop
            offset="100%"
            stopColor="var(--md-chart-1)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--md-chart-1)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="4"
        fill="var(--md-chart-1)"
      />
    </svg>
  );
};

export const HeaderKpis: React.FC<HeaderKpisProps> = ({
  sim,
  globalConfig,
  activeFspTier,
  onApplyGlobalPtMode,
  selectedKpi = 'tco',
  onSelectKpi,
}) => {
  const cum = sim.threeYearCumulated;
  const activeCostObj = cum[activeFspTier];

  const uncommittedDisc = globalConfig.fspDiscounts.uncommittedDiscount ?? 0;

  // True 0% list-rate PayGo baseline (so Option A discount % also reflects savings vs list price)
  const baselineUncommittedPayGo =
    cum.uncommitted.purePayGoUsd / Math.max(1e-6, 1 - uncommittedDisc);
  // The 0-GSU (No PT) Baseline at the active commercial tier:
  const activeTierPayGo = activeCostObj.purePayGoUsd;
  const hybridTotalActiveFsp = activeCostObj.hybridTotalUsd;

  const tcoRatioVsUncommitted =
    baselineUncommittedPayGo > 0
      ? (hybridTotalActiveFsp - baselineUncommittedPayGo) / baselineUncommittedPayGo
      : 0;
  const tcoRatioVsSameTierPayGo =
    activeTierPayGo > 0
      ? (hybridTotalActiveFsp - activeTierPayGo) / activeTierPayGo
      : 0;

  const isTcoFavorable = hybridTotalActiveFsp <= activeTierPayGo + 1;

  const ptCost3Y = cum.uncommitted.ptCostUsd;
  const payGoSpillCost3Y = Math.max(0, hybridTotalActiveFsp - ptCost3Y);
  const ptShareOfSpend =
    hybridTotalActiveFsp > 0 ? ptCost3Y / hybridTotalActiveFsp : 0;

  const gsuY1 = sim.totalsByYear.y1.totalProvisionedGsus;
  const gsuY2 = sim.totalsByYear.y2.totalProvisionedGsus;
  const gsuY3 = sim.totalsByYear.y3.totalProvisionedGsus;
  const isZeroPtBaseline = gsuY1 === 0 && gsuY2 === 0 && gsuY3 === 0;

  const avgPtUtil3Y =
    (sim.totalsByYear.y1.avgPtUtilization +
      sim.totalsByYear.y2.avgPtUtilization +
      sim.totalsByYear.y3.avgPtUtilization) /
    3;
  const avgBreakEvenUtil = sim.avgBreakEvenUtilization;
  const utilDeltaVsBreakEven = avgPtUtil3Y - avgBreakEvenUtil;
  const isUtilHealthy = isZeroPtBaseline || avgPtUtil3Y >= avgBreakEvenUtil;

  // Compute weighted token share routed via Provisioned Throughput across 3 years
  const lotIds = ['lot1', 'lot2', 'lot3', 'lot4'] as const;
  let totalPtTokensM = 0;
  let totalAllTokensM = 0;
  for (const lid of lotIds) {
    for (const yr of ['y1', 'y2', 'y3'] as const) {
      const r = sim.byLotAndYear[lid][yr];
      totalAllTokensM += r.totalTokensM;
      totalPtTokensM += r.totalTokensM * r.routingSharesOfTotal.ptShare;
    }
  }
  const ptCoveredTokenShare =
    totalAllTokensM > 0 ? totalPtTokensM / totalAllTokensM : 0;

  // Build 12-point sparkline series from the 3-year trajectory
  const y1Cost = sim.totalsByYear.y1[activeFspTier].hybridTotalUsd;
  const y2Cost = sim.totalsByYear.y2[activeFspTier].hybridTotalUsd;
  const y3Cost = sim.totalsByYear.y3[activeFspTier].hybridTotalUsd;
  const tcoSparkPoints = [
    y1Cost * 0.88,
    y1Cost * 0.94,
    y1Cost,
    y1Cost * 1.04,
    (y1Cost + y2Cost) * 0.5,
    y2Cost * 0.96,
    y2Cost,
    y2Cost * 1.05,
    (y2Cost + y3Cost) * 0.5,
    y3Cost * 0.95,
    y3Cost * 0.98,
    y3Cost,
  ];

  const spendSparkPoints = [
    sim.totalsByYear.y1.uncommitted.ptCostUsd / 12,
    (sim.totalsByYear.y1.uncommitted.ptCostUsd * 1.05) / 12,
    (sim.totalsByYear.y2.uncommitted.ptCostUsd * 0.95) / 12,
    sim.totalsByYear.y2.uncommitted.ptCostUsd / 12,
    (sim.totalsByYear.y2.uncommitted.ptCostUsd * 1.08) / 12,
    (sim.totalsByYear.y3.uncommitted.ptCostUsd * 0.96) / 12,
    sim.totalsByYear.y3.uncommitted.ptCostUsd / 12,
    (sim.totalsByYear.y3.uncommitted.ptCostUsd * 1.02) / 12,
  ];

  const tokenSparkPoints = [
    sim.totalsByYear.y1.totalTokensM * 0.85,
    sim.totalsByYear.y1.totalTokensM * 0.92,
    sim.totalsByYear.y1.totalTokensM,
    (sim.totalsByYear.y1.totalTokensM + sim.totalsByYear.y2.totalTokensM) * 0.5,
    sim.totalsByYear.y2.totalTokensM,
    (sim.totalsByYear.y2.totalTokensM + sim.totalsByYear.y3.totalTokensM) * 0.5,
    sim.totalsByYear.y3.totalTokensM * 0.96,
    sim.totalsByYear.y3.totalTokensM,
  ];

  const gsuSparkPoints = [
    gsuY1,
    gsuY1,
    Math.round((gsuY1 + gsuY2) / 2),
    gsuY2,
    gsuY2,
    Math.round((gsuY2 + gsuY3) / 2),
    gsuY3,
    gsuY3,
  ];

  const ptDiscount = globalConfig.fspDiscounts.ptDiscount ?? 0.20;
  const gsuMonthlyRate = Math.round(
    EU_GSU_MONTHLY_PRICE_USD[globalConfig.gsuCommitTerm] * (1 - ptDiscount)
  );

  const savingsVsListUsd = Math.max(0, baselineUncommittedPayGo - hybridTotalActiveFsp);

  const cards: {
    id: SelectedKpiId;
    label: string;
    businessSubtext: string;
    tooltip: string;
    value: string;
    exactTitle: string;
    isHero?: boolean;
    deltaText: string;
    isDeltaFavorable: boolean;
    comparisonText: string;
    sparkPoints: number[];
  }[] = [
    {
      id: 'tco',
      label: '3-year total cost of ownership (TCO)',
      businessSubtext: 'Total 36-month budget across all 4 lots (reserved + overflow)',
      tooltip: `Exact 36-month TCO: ${formatCurrencyExact(
        hybridTotalActiveFsp
      )} vs ${formatCurrencyExact(
        activeTierPayGo
      )} 0-GSU (No PT) baseline (${formatCurrencyExact(
        baselineUncommittedPayGo
      )} uncommitted 0% list PayGo).`,
      value: formatCurrencyMillions(hybridTotalActiveFsp, 1),
      exactTitle: formatCurrencyExact(hybridTotalActiveFsp),
      isHero: true,
      deltaText: formatDeltaPct(tcoRatioVsUncommitted),
      isDeltaFavorable: tcoRatioVsUncommitted <= 0,
      comparisonText:
        savingsVsListUsd > 0
          ? `saves ${formatCurrencyMillions(savingsVsListUsd, 1)} vs list PayGo`
          : `vs ${formatCurrencyMillions(baselineUncommittedPayGo, 1)} list PayGo`,
      sparkPoints: tcoSparkPoints,
    },
    {
      id: 'spend',
      label: 'Fixed PT vs dynamic PayGo spend',
      businessSubtext: 'Predictable monthly subscription vs variable pay-per-use overflow',
      tooltip: `Fixed PT commitment (after -${Math.round(
        ptDiscount * 100
      )}% PT discount): ${formatCurrencyExact(ptCost3Y)} (${formatPct(
        ptShareOfSpend,
        1
      )}). Dynamic PayGo spillover + batch: ${formatCurrencyExact(
        payGoSpillCost3Y
      )}.`,
      value: `${formatCurrencyMillions(ptCost3Y, 1)} / ${formatCurrencyMillions(
        payGoSpillCost3Y,
        1
      )}`,
      exactTitle: `PT: ${formatCurrencyExact(
        ptCost3Y
      )} · PayGo: ${formatCurrencyExact(payGoSpillCost3Y)}`,
      deltaText: isZeroPtBaseline
        ? '0% fixed'
        : formatDeltaPct(tcoRatioVsSameTierPayGo),
      isDeltaFavorable: isTcoFavorable,
      comparisonText: isZeroPtBaseline
        ? '100% variable pay-per-use spend'
        : `${formatPct(ptShareOfSpend, 0)} fixed PT · vs ${formatCurrencyMillions(
            activeTierPayGo,
            1
          )} 0-GSU PayGo`,
      sparkPoints: spendSparkPoints,
    },
    {
      id: 'routing',
      label: '3-year token volume & PT coverage',
      businessSubtext: 'Total AI traffic volume & share handled by reserved capacity',
      tooltip: `Total 36-month token volume: ${formatTokensMillions(
        cum.totalTokensM
      )} (${formatPct(ptCoveredTokenShare, 1)} absorbed by PT base).`,
      value: formatTokensMillions(cum.totalTokensM),
      exactTitle: `${cum.totalTokensM.toLocaleString()}M total tokens across 36 months`,
      deltaText: isZeroPtBaseline
        ? '0.0% PT'
        : `▲ ${formatPct(ptCoveredTokenShare, 1)}`,
      isDeltaFavorable: isZeroPtBaseline || ptCoveredTokenShare >= 0.55,
      comparisonText: isZeroPtBaseline
        ? '100% routed via on-demand & batch'
        : 'covered by reserved PT capacity',
      sparkPoints: tokenSparkPoints,
    },
    {
      id: 'gsu',
      label: 'Provisioned GSU capacity (Y1–Y3)',
      businessSubtext: 'Reserved throughput units & usage efficiency vs break-even',
      tooltip: `Net EU/US GSU monthly unit rate (-${Math.round(
        ptDiscount * 100
      )}% PT discount): ${formatCurrencyExact(
        gsuMonthlyRate
      )}/mo. Average PT utilization: ${formatPct(
        avgPtUtil3Y,
        1
      )} vs ${formatPct(avgBreakEvenUtil, 1)} break-even threshold.`,
      value: isZeroPtBaseline ? '0 GSUs (No PT)' : `${gsuY1} → ${gsuY2} → ${gsuY3}`,
      exactTitle: `Y1: ${gsuY1} GSUs · Y2: ${gsuY2} GSUs · Y3: ${gsuY3} GSUs`,
      deltaText: isZeroPtBaseline
        ? 'Baseline'
        : formatDeltaPct(utilDeltaVsBreakEven),
      isDeltaFavorable: isUtilHealthy,
      comparisonText: isZeroPtBaseline
        ? 'No reserved capacity commitment'
        : `${formatPct(
            avgPtUtil3Y,
            1
          )} util vs ${formatPct(avgBreakEvenUtil, 1)} break-even`,
      sparkPoints: gsuSparkPoints,
    },
  ];

  return (
    <div className="space-y-4">
      <div
        role="region"
        aria-label="Key performance indicators"
        className="grid grid-cols-12 gap-6"
      >
        {cards.map((card) => {
          const isSelected = selectedKpi === card.id;
          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onSelectKpi?.(card.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectKpi?.(card.id);
                }
              }}
              className={`col-span-12 sm:col-span-6 lg:col-span-3 min-h-[164px] p-5 flex flex-col justify-between text-left cursor-pointer relative group ${
                isSelected ? 'md-card-selected' : 'md-card-interactive'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`type-title-sm ${
                      isSelected
                        ? 'text-[var(--md-on-primary-container)]'
                        : 'text-[var(--md-on-surface)]'
                    }`}
                  >
                    {card.label}
                  </h3>
                  <span
                    className="relative inline-flex items-center shrink-0 mt-0.5"
                    title={card.tooltip}
                  >
                    <Info
                      className={`w-[18px] h-[18px] shrink-0 ${
                        isSelected
                          ? 'text-[var(--md-on-primary-container)] opacity-80'
                          : 'text-[var(--md-on-surface-variant)] opacity-70 group-hover:opacity-100'
                      }`}
                    />
                  </span>
                </div>
                <p
                  className={`type-body-sm mt-0.5 ${
                    isSelected
                      ? 'text-[var(--md-on-primary-container)] opacity-85'
                      : 'text-[var(--md-on-surface-variant)]'
                  }`}
                >
                  {card.businessSubtext}
                </p>
              </div>

              <div className="mt-2.5">
                <div
                  title={card.exactTitle}
                  className={`${
                    card.isHero ? 'type-kpi-hero' : 'type-kpi-value'
                  } ${
                    isSelected
                      ? 'text-[var(--md-on-primary-container)]'
                      : 'text-[var(--md-on-surface)]'
                  } truncate`}
                >
                  {card.value}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={
                    card.isDeltaFavorable
                      ? 'md-delta-positive'
                      : 'md-delta-negative'
                  }
                >
                  {card.deltaText}
                </span>
                <span
                  className={`type-body-sm ${
                    isSelected
                      ? 'text-[var(--md-on-primary-container)] opacity-90'
                      : 'text-[var(--md-on-surface-variant)]'
                  }`}
                >
                  {card.comparisonText}
                </span>
              </div>

              <KpiSparkline points={card.sparkPoints} idSuffix={card.id} />
            </div>
          );
        })}
      </div>

      {!isTcoFavorable && (
        <div className="md-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <span className="md-badge-warning shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Over-provisioned PT capacity</span>
            </span>
            <p className="type-body-md text-[var(--md-on-surface)] max-w-[72ch]">
              Provisioned GSUs (reserved fixed capacity) are under-utilized during off-peak hours (
              {formatPct(avgPtUtil3Y, 1)} average utilization vs{' '}
              {formatPct(avgBreakEvenUtil, 1)} break-even), adding{' '}
              {formatCurrencyMillions(Math.abs(hybridTotalActiveFsp - activeTierPayGo), 1)} vs
              same-tier PayGo. Switch to Optimal TCO sizing to let brief traffic spikes spill over to on-demand PayGo.
            </p>
          </div>
          <div className="min-h-[48px] flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onApplyGlobalPtMode('OPTIMAL_TCO')}
              className="md-btn-tonal cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Optimize GSUs (~75% util)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
