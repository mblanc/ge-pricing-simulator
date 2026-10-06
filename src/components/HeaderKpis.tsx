import React from 'react';
import { Info, AlertTriangle, Sparkles } from 'lucide-react';
import { FullSimulationOutput } from '../engine/simulator';
import {
  EU_GSU_MONTHLY_PRICE_USD,
  GlobalSimConfig,
  LotConfig,
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
  lots?: LotConfig[];
  activeScope?: 'all' | LotConfig['id'];
  globalConfig: GlobalSimConfig;
  onChangeGlobalConfig: (next: GlobalSimConfig) => void;
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
  onSelectFspTier: (tier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp') => void;
  onApplyGlobalPtMode: (mode: PtSizingMode) => void;
  currentGlobalPtMode: PtSizingMode | 'MIXED';
  selectedKpi?: SelectedKpiId;
  onSelectKpi?: (id: SelectedKpiId) => void;
  compact?: boolean;
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
  lots,
  activeScope = 'all',
  globalConfig,
  activeFspTier,
  onApplyGlobalPtMode,
  selectedKpi = 'tco',
  onSelectKpi,
  compact = false,
}) => {
  const isAll = activeScope === 'all';
  const activeLot =
    !isAll && lots ? lots.find((l) => l.id === activeScope) : undefined;
  const scopePrefix = activeLot ? `Lot ${activeLot.lotNumber} ` : '3-year ';
  const scopeDesc = activeLot
    ? `Total 36-month budget for Lot ${activeLot.lotNumber} (${activeLot.modelDisplayName})`
    : 'Total 36-month budget across all 4 lots (reserved + overflow)';

  const uncommittedDisc = globalConfig.fspDiscounts.uncommittedDiscount ?? 0;

  const y1Lot = !isAll ? sim.byLotAndYear[activeScope].y1 : null;
  const y2Lot = !isAll ? sim.byLotAndYear[activeScope].y2 : null;
  const y3Lot = !isAll ? sim.byLotAndYear[activeScope].y3 : null;

  // True 0% list-rate PayGo baseline
  const baselineUncommittedPayGo =
    isAll || !y1Lot || !y2Lot || !y3Lot
      ? sim.threeYearCumulated.uncommitted.purePayGoUsd /
        Math.max(1e-6, 1 - uncommittedDisc)
      : y1Lot.annualCostsListUsd.purePayGoBaselineCostUsd +
        y2Lot.annualCostsListUsd.purePayGoBaselineCostUsd +
        y3Lot.annualCostsListUsd.purePayGoBaselineCostUsd;

  // The 0-GSU (No PT) Baseline at the active commercial tier:
  const activeTierPayGo =
    isAll || !y1Lot || !y2Lot || !y3Lot
      ? sim.threeYearCumulated[activeFspTier].purePayGoUsd
      : y1Lot.annualCostsFspUsd[activeFspTier].purePayGoUsd +
        y2Lot.annualCostsFspUsd[activeFspTier].purePayGoUsd +
        y3Lot.annualCostsFspUsd[activeFspTier].purePayGoUsd;

  const hybridTotalActiveFsp =
    isAll || !y1Lot || !y2Lot || !y3Lot
      ? sim.threeYearCumulated[activeFspTier].hybridTotalUsd
      : y1Lot.annualCostsFspUsd[activeFspTier].hybridTotalUsd +
        y2Lot.annualCostsFspUsd[activeFspTier].hybridTotalUsd +
        y3Lot.annualCostsFspUsd[activeFspTier].hybridTotalUsd;

  const tcoRatioVsUncommitted =
    baselineUncommittedPayGo > 0
      ? (hybridTotalActiveFsp - baselineUncommittedPayGo) / baselineUncommittedPayGo
      : 0;
  const tcoRatioVsSameTierPayGo =
    activeTierPayGo > 0
      ? (hybridTotalActiveFsp - activeTierPayGo) / activeTierPayGo
      : 0;

  const isTcoFavorable = hybridTotalActiveFsp <= activeTierPayGo + 1;

  const ptCost3Y =
    isAll || !y1Lot || !y2Lot || !y3Lot
      ? sim.threeYearCumulated.uncommitted.ptCostUsd
      : y1Lot.annualCostsListUsd.ptGsuAnnualCostUsd +
        y2Lot.annualCostsListUsd.ptGsuAnnualCostUsd +
        y3Lot.annualCostsListUsd.ptGsuAnnualCostUsd;

  const payGoSpillCost3Y = Math.max(0, hybridTotalActiveFsp - ptCost3Y);
  const ptShareOfSpend =
    hybridTotalActiveFsp > 0 ? ptCost3Y / hybridTotalActiveFsp : 0;

  const gsuY1 =
    isAll || !y1Lot
      ? sim.totalsByYear.y1.totalProvisionedGsus
      : y1Lot.provisionedGsus;
  const gsuY2 =
    isAll || !y2Lot
      ? sim.totalsByYear.y2.totalProvisionedGsus
      : y2Lot.provisionedGsus;
  const gsuY3 =
    isAll || !y3Lot
      ? sim.totalsByYear.y3.totalProvisionedGsus
      : y3Lot.provisionedGsus;
  const isZeroPtBaseline = gsuY1 === 0 && gsuY2 === 0 && gsuY3 === 0;

  const avgPtUtil3Y =
    isAll || !y1Lot || !y2Lot || !y3Lot
      ? (sim.totalsByYear.y1.avgPtUtilization +
          sim.totalsByYear.y2.avgPtUtilization +
          sim.totalsByYear.y3.avgPtUtilization) /
        3
      : (y1Lot.realtimeRouting.ptUtilizationRate +
          y2Lot.realtimeRouting.ptUtilizationRate +
          y3Lot.realtimeRouting.ptUtilizationRate) /
        3;

  const avgBreakEvenUtil =
    isAll || !y1Lot
      ? sim.avgBreakEvenUtilization
      : y1Lot.breakEvenUtilization;
  const utilDeltaVsBreakEven = avgPtUtil3Y - avgBreakEvenUtil;
  const isUtilHealthy = isZeroPtBaseline || avgPtUtil3Y >= avgBreakEvenUtil;

  // Compute weighted token share routed via Provisioned Throughput across 3 years
  const lotIds = isAll
    ? (['lot1', 'lot2', 'lot3', 'lot4'] as const)
    : ([activeScope] as const);
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
  const y1Cost =
    isAll || !y1Lot
      ? sim.totalsByYear.y1[activeFspTier].hybridTotalUsd
      : y1Lot.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
  const y2Cost =
    isAll || !y2Lot
      ? sim.totalsByYear.y2[activeFspTier].hybridTotalUsd
      : y2Lot.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
  const y3Cost =
    isAll || !y3Lot
      ? sim.totalsByYear.y3[activeFspTier].hybridTotalUsd
      : y3Lot.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
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

  const y1PtCost =
    isAll || !y1Lot
      ? sim.totalsByYear.y1.uncommitted.ptCostUsd
      : y1Lot.annualCostsListUsd.ptGsuAnnualCostUsd;
  const y2PtCost =
    isAll || !y2Lot
      ? sim.totalsByYear.y2.uncommitted.ptCostUsd
      : y2Lot.annualCostsListUsd.ptGsuAnnualCostUsd;
  const y3PtCost =
    isAll || !y3Lot
      ? sim.totalsByYear.y3.uncommitted.ptCostUsd
      : y3Lot.annualCostsListUsd.ptGsuAnnualCostUsd;

  const spendSparkPoints = [
    y1PtCost / 12,
    (y1PtCost * 1.05) / 12,
    (y2PtCost * 0.95) / 12,
    y2PtCost / 12,
    (y2PtCost * 1.08) / 12,
    (y3PtCost * 0.96) / 12,
    y3PtCost / 12,
    (y3PtCost * 1.02) / 12,
  ];

  const y1Tok =
    isAll || !y1Lot ? sim.totalsByYear.y1.totalTokensM : y1Lot.totalTokensM;
  const y2Tok =
    isAll || !y2Lot ? sim.totalsByYear.y2.totalTokensM : y2Lot.totalTokensM;
  const y3Tok =
    isAll || !y3Lot ? sim.totalsByYear.y3.totalTokensM : y3Lot.totalTokensM;

  const tokenSparkPoints = [
    y1Tok * 0.85,
    y1Tok * 0.92,
    y1Tok,
    (y1Tok + y2Tok) * 0.5,
    y2Tok,
    (y2Tok + y3Tok) * 0.5,
    y3Tok * 0.96,
    y3Tok,
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
    EU_GSU_MONTHLY_PRICE_USD[
      activeLot?.gsuCommitTerm ?? globalConfig.gsuCommitTerm
    ] *
      (1 - ptDiscount)
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
      label: `${scopePrefix}total cost of ownership (TCO)`,
      businessSubtext: scopeDesc,
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
        totalAllTokensM
      )} (${formatPct(ptCoveredTokenShare, 1)} absorbed by PT base).`,
      value: formatTokensMillions(totalAllTokensM),
      exactTitle: `${totalAllTokensM.toLocaleString()}M total tokens across 36 months`,
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
        className={`grid grid-cols-12 ${compact ? 'gap-3.5' : 'gap-6'}`}
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
              className={`col-span-12 sm:col-span-6 ${
                compact
                  ? '2xl:col-span-3 min-h-[144px] p-4'
                  : 'lg:col-span-3 min-h-[164px] p-5'
              } flex flex-col justify-between text-left cursor-pointer relative group ${
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
              <span>
                Optimize GSUs (≥{Math.round(avgBreakEvenUtil * 100)}% util)
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
