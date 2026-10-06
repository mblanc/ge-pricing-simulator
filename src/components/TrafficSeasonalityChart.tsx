import React, { useState } from 'react';
import { Info } from 'lucide-react';
import {
  FullSimulationOutput,
  HourlyChartSeriesPoint,
  YearKey,
} from '../engine/simulator';
import {
  EU_GSU_MONTHLY_PRICE_USD,
  GlobalSimConfig,
  LotConfig,
} from '../data/rfqDefaults';
import {
  formatCurrencyExact,
  formatCurrencyMillions,
  formatPct,
  formatTokensMillions,
} from '../utils/format';
import { SelectedKpiId } from './HeaderKpis';

interface TrafficSeasonalityChartProps {
  sim: FullSimulationOutput;
  lots: LotConfig[];
  globalConfig: GlobalSimConfig;
  onChangeGlobalConfig?: (next: GlobalSimConfig) => void;
  selectedYear: YearKey;
  onSelectYear: (yr: YearKey) => void;
  selectedKpi?: SelectedKpiId;
  lockedScope?: 'all' | 'lot1' | 'lot2' | 'lot3' | 'lot4';
  embedded?: boolean;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TrafficSeasonalityChart: React.FC<TrafficSeasonalityChartProps> = ({
  sim,
  lots,
  globalConfig,
  selectedYear,
  onSelectYear,
  selectedKpi = 'tco',
  lockedScope,
  embedded = false,
}) => {
  const [internalScope, setInternalScope] = useState<
    'all' | 'lot1' | 'lot2' | 'lot3' | 'lot4'
  >('all');
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  const activeScope = lockedScope ?? internalScope;

  const series: HourlyChartSeriesPoint[] =
    activeScope === 'all'
      ? sim.allLotsHourlyByYear[selectedYear]
      : sim.hourlyByLotAndYear[activeScope][selectedYear];

  const maxDemand = Math.max(
    10,
    ...series.map((s) => Math.max(s.totalDemandGsus, s.ptCeilingGsus))
  );
  const yMax = Math.ceil(maxDemand * 1.15);
  const ptCeiling = series[0]?.ptCeilingGsus ?? 0;

  const currentRes = (() => {
    if (activeScope === 'all') {
      const lotIds = ['lot1', 'lot2', 'lot3', 'lot4'] as const;
      let minFloor = 0;
      let daytimeFloor = 0;
      let optimalTco = 0;
      let peak = 0;
      let provisioned = 0;
      let weightedPtCov = 0;
      let weightedStdSpill = 0;
      let weightedPrioSpill = 0;
      let totalRtTokens = 0;

      for (const lid of lotIds) {
        const r = sim.byLotAndYear[lid][selectedYear];
        minFloor += r.minHourlyGsuDemand;
        daytimeFloor += r.daytimeFloorGsuDemand;
        optimalTco += r.optimalTcoGsuDemand;
        peak += r.peakHourlyGsuDemand;
        provisioned += r.provisionedGsus;
        totalRtTokens += r.realtimeTokensM;
        weightedPtCov += r.realtimeTokensM * r.realtimeRouting.ptCoveredFraction;
        weightedStdSpill +=
          r.realtimeTokensM * r.realtimeRouting.standardPayGoFraction;
        weightedPrioSpill +=
          r.realtimeTokensM * r.realtimeRouting.priorityPayGoFraction;
      }

      return {
        minFloor,
        daytimeFloor,
        optimalTco,
        peak,
        provisioned,
        util: sim.totalsByYear[selectedYear].avgPtUtilization,
        ptCov: totalRtTokens > 0 ? weightedPtCov / totalRtTokens : 0,
        stdSpill: totalRtTokens > 0 ? weightedStdSpill / totalRtTokens : 0,
        prioSpill: totalRtTokens > 0 ? weightedPrioSpill / totalRtTokens : 0,
        modelLabel: 'All 4 lots combined · Company-wide GSU demand',
        tokPerGsu: 0,
      };
    }

    const r = sim.byLotAndYear[activeScope][selectedYear];
    const l = lots.find((x) => x.id === activeScope)!;
    return {
      minFloor: r.minHourlyGsuDemand,
      daytimeFloor: r.daytimeFloorGsuDemand,
      optimalTco: r.optimalTcoGsuDemand,
      peak: r.peakHourlyGsuDemand,
      provisioned: r.provisionedGsus,
      util: r.realtimeRouting.ptUtilizationRate,
      ptCov: r.realtimeRouting.ptCoveredFraction,
      stdSpill: r.realtimeRouting.standardPayGoFraction,
      prioSpill: r.realtimeRouting.priorityPayGoFraction,
      modelLabel: `${l.shortName} · ${l.modelDisplayName}`,
      tokPerGsu: Math.round(l.gsuSpec.throughputPerGsuPerSec),
    };
  })();

  const chartTitleByKpi: Record<SelectedKpiId, string> = {
    tco: 'Hourly GSU demand vs Provisioned Throughput ceiling (168-hour week)',
    spend: 'Fixed Provisioned Throughput base vs dynamic PayGo spillover over time',
    routing: 'Real-time token routing across Provisioned Throughput, Standard PayGo, and Priority 1.8×',
    gsu: 'Provisioned GSU capacity utilization and peak burst profile',
  };

  // SVG dimensions & scale
  const width = 860;
  const height = 300;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xPos = (idx: number) =>
    padLeft + (idx / Math.max(1, series.length - 1)) * plotW;
  const yPos = (val: number) =>
    padTop + plotH - (Math.min(yMax, Math.max(0, val)) / yMax) * plotH;

  const totalPoints = series
    .map((pt, i) => `${xPos(i).toFixed(1)},${yPos(pt.totalDemandGsus).toFixed(1)}`)
    .join(' ');
  const totalAreaPath = `M ${xPos(0).toFixed(1)},${yPos(0).toFixed(
    1
  )} L ${totalPoints.replace(/ /g, ' L ')} L ${xPos(series.length - 1).toFixed(
    1
  )},${yPos(0).toFixed(1)} Z`;

  const stdTopPoints = series
    .map(
      (pt, i) =>
        `${xPos(i).toFixed(1)},${yPos(
          pt.ptCoveredGsus + pt.standardPayGoSpilloverGsus
        ).toFixed(1)}`
    )
    .join(' ');
  const stdAreaPath = `M ${xPos(0).toFixed(1)},${yPos(0).toFixed(
    1
  )} L ${stdTopPoints.replace(/ /g, ' L ')} L ${xPos(
    series.length - 1
  ).toFixed(1)},${yPos(0).toFixed(1)} Z`;

  const ptCoveredPoints = series
    .map((pt, i) => `${xPos(i).toFixed(1)},${yPos(pt.ptCoveredGsus).toFixed(1)}`)
    .join(' ');
  const ptAreaPath = `M ${xPos(0).toFixed(1)},${yPos(0).toFixed(
    1
  )} L ${ptCoveredPoints.replace(/ /g, ' L ')} L ${xPos(
    series.length - 1
  ).toFixed(1)},${yPos(0).toFixed(1)} Z`;

  const activePoint = hoverHour !== null ? series[hoverHour] : null;
  const activeDayName =
    hoverHour !== null ? DAY_NAMES[Math.floor(hoverHour / 24)] : '';
  const activeHourOfDay = hoverHour !== null ? hoverHour % 24 : 0;

  const handleChartKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoverHour((prev) => (prev === null ? 10 : Math.min(167, prev + 1)));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoverHour((prev) => (prev === null ? 10 : Math.max(0, prev - 1)));
    } else if (e.key === 'Escape') {
      setHoverHour(null);
    }
  };

  // Compute 3-year weighted token shares for Donut Breakdown (either for lockedScope or all 4 lots)
  const scopeLots =
    activeScope === 'all'
      ? (['lot1', 'lot2', 'lot3', 'lot4'] as const)
      : ([activeScope] as const);
  let ptTok = 0;
  let stdTok = 0;
  let prioTok = 0;
  let batchTok = 0;
  let allTok = 0;
  for (const lid of scopeLots) {
    for (const yr of ['y1', 'y2', 'y3'] as const) {
      const r = sim.byLotAndYear[lid][yr];
      allTok += r.totalTokensM;
      ptTok += r.totalTokensM * r.routingSharesOfTotal.ptShare;
      stdTok += r.totalTokensM * r.routingSharesOfTotal.standardPayGoShare;
      prioTok += r.totalTokensM * r.routingSharesOfTotal.priorityPayGoShare;
      batchTok += r.totalTokensM * r.routingSharesOfTotal.batchShare;
    }
  }

  const donutSegments = [
    {
      label: 'Provisioned Throughput (PT base)',
      subtext: 'Covered by reserved monthly GSUs',
      share: allTok > 0 ? ptTok / allTok : 0,
      color: 'var(--md-chart-1)',
    },
    {
      label: 'Standard PayGo burst (1.0×)',
      subtext: 'Variable on-demand overflow',
      share: allTok > 0 ? stdTok / allTok : 0,
      color: 'var(--md-chart-2)',
    },
    {
      label: 'Priority PayGo retry (1.8×)',
      subtext: 'SLA-protected peak burst traffic',
      share: allTok > 0 ? prioTok / allTok : 0,
      color: 'var(--md-chart-3)',
    },
    {
      label: 'Async Batch API (-50%)',
      subtext: 'Non-urgent background processing',
      share: allTok > 0 ? batchTok / allTok : 0,
      color: 'var(--md-chart-4)',
    },
  ];

  const donutRadius = 54;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let cumulativeAngle = 0;

  const lotBarRows = lots
    .map((l) => {
      const cost3Y =
        sim.byLotAndYear[l.id].y1.annualCostsFspUsd.threeYearFsp.hybridTotalUsd +
        sim.byLotAndYear[l.id].y2.annualCostsFspUsd.threeYearFsp.hybridTotalUsd +
        sim.byLotAndYear[l.id].y3.annualCostsFspUsd.threeYearFsp.hybridTotalUsd;
      return {
        id: l.id,
        name: `${l.shortName} · ${l.modelDisplayName.split(' (')[0]}`,
        cost: cost3Y,
      };
    })
    .sort((a, b) => b.cost - a.cost);
  const maxLotCost = Math.max(1, ...lotBarRows.map((r) => r.cost));

  const ptDiscount = globalConfig.fspDiscounts.ptDiscount ?? 0.2;
  const gsuMonthlyPrice = Math.round(
    EU_GSU_MONTHLY_PRICE_USD[globalConfig.gsuCommitTerm] * (1 - ptDiscount)
  );

  return (
    <div
      aria-label="Seasonality time-series and routing breakdown"
      className="grid grid-cols-12 gap-6 items-stretch"
    >
      {/* HERO CHART CARD: 8 columns */}
      <div
        className={`col-span-12 lg:col-span-8 flex flex-col justify-between ${
          embedded ? '' : 'md-card p-6'
        }`}
      >
        <div>
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="meridian-crossfade" key={selectedKpi}>
              <h3 className="type-title-md text-[var(--md-on-surface)]">
                {chartTitleByKpi[selectedKpi]}
              </h3>
              <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5 tabular-nums">
                {currentRes.modelLabel} · Traffic below the PT ceiling is covered by fixed monthly GSUs ({formatCurrencyExact(gsuMonthlyPrice)}/mo net); peaks above spill over to PayGo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!lockedScope && (
                <div
                  role="group"
                  aria-label="Select workload scope"
                  className="inline-flex items-center p-1 rounded-full bg-[var(--md-surface-container)]"
                >
                  {(['lot1', 'lot2', 'lot3', 'lot4'] as const).map((lid, i) => (
                    <button
                      key={lid}
                      type="button"
                      onClick={() => setInternalScope(lid)}
                      aria-pressed={activeScope === lid}
                      className={`h-[32px] px-3 rounded-full type-label-md cursor-pointer transition-colors ${
                        activeScope === lid
                          ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                          : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                      }`}
                    >
                      Lot {i + 1}
                    </button>
                  ))}
                </div>
              )}

              <div
                role="group"
                aria-label="Select contract year"
                className="inline-flex items-center p-1 rounded-full bg-[var(--md-surface-container)]"
              >
                {(['y1', 'y2', 'y3'] as YearKey[]).map((yr, idx) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => onSelectYear(yr)}
                    aria-pressed={selectedYear === yr}
                    className={`h-[32px] px-3 rounded-full type-label-md cursor-pointer transition-colors ${
                      selectedYear === yr
                        ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                        : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                    }`}
                  >
                    Y{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend Row above chart */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 mb-2 type-body-sm text-[var(--md-on-surface-variant)]">
            <span className="inline-flex items-center gap-2">
              <span
                className="w-[10px] h-[10px] rounded-[4px] shrink-0"
                style={{ backgroundColor: 'var(--md-chart-1)' }}
              />
              <span>
                PT covered ({formatPct(currentRes.ptCov, 1)})
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="w-[10px] h-[10px] rounded-[4px] shrink-0"
                style={{ backgroundColor: 'var(--md-chart-2)' }}
              />
              <span>
                Standard PayGo overflow ({formatPct(currentRes.stdSpill, 1)})
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="w-[10px] h-[10px] rounded-[4px] shrink-0"
                style={{ backgroundColor: 'var(--md-chart-3)' }}
              />
              <span>
                Priority PayGo 1.8× ({formatPct(currentRes.prioSpill, 1)})
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="w-[10px] h-[10px] rounded-[4px] shrink-0"
                style={{ backgroundColor: 'var(--md-chart-4)' }}
              />
              <span className="tabular-nums">
                Active PT ceiling ({ptCeiling} GSUs)
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="w-[10px] h-[10px] rounded-[4px] shrink-0"
                style={{ backgroundColor: 'var(--md-chart-comparison)' }}
              />
              <span className="tabular-nums">
                Optimal TCO benchmark ({currentRes.optimalTco} GSUs, dashed)
              </span>
            </span>
          </div>

          <p className="sr-only">
            168-hour weekly demand chart for {currentRes.modelLabel}. Active
            Provisioned Throughput ceiling is {ptCeiling} GSUs with{' '}
            {formatPct(currentRes.util, 1)} average utilization. Peak hourly
            demand reaches {Math.round(currentRes.peak)} GSUs and optimal TCO
            sits at {currentRes.optimalTco} GSUs.
          </p>

          <div className="relative pt-2">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              tabIndex={0}
              role="img"
              aria-label={`168-hour demand and PT capacity chart for ${currentRes.modelLabel}`}
              onKeyDown={handleChartKeyDown}
              onMouseLeave={() => setHoverHour(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX =
                  ((e.clientX - rect.left) / rect.width) * width - padLeft;
                const ratio = Math.max(0, Math.min(1, relX / plotW));
                const idx = Math.round(ratio * (series.length - 1));
                setHoverHour(idx);
              }}
              className="w-full h-auto select-none cursor-crosshair rounded-lg"
            >
              <defs>
                <linearGradient id="md-area-pt" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--md-chart-1)"
                    stopOpacity="var(--md-chart-area-opacity)"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--md-chart-1)"
                    stopOpacity="0"
                  />
                </linearGradient>
                <linearGradient id="md-area-std" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--md-chart-2)"
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--md-chart-2)"
                    stopOpacity="0.02"
                  />
                </linearGradient>
                <linearGradient id="md-area-prio" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--md-chart-3)"
                    stopOpacity="0.28"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--md-chart-3)"
                    stopOpacity="0.04"
                  />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const val = Math.round(t * yMax);
                const y = yPos(val);
                return (
                  <g key={t}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke={
                        t === 0
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
                      {val}
                    </text>
                  </g>
                );
              })}

              {DAY_NAMES.map((day, dIdx) => {
                const centerX = xPos(dIdx * 24 + 12);
                return (
                  <text
                    key={day}
                    x={centerX}
                    y={height - 8}
                    textAnchor="middle"
                    fill="var(--md-on-surface-variant)"
                    className="type-axis-label"
                  >
                    {day}
                  </text>
                );
              })}

              <path d={totalAreaPath} fill="url(#md-area-prio)" />
              <path d={stdAreaPath} fill="url(#md-area-std)" />
              <polyline
                fill="none"
                stroke="var(--md-chart-2)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={stdTopPoints}
              />

              <path d={ptAreaPath} fill="url(#md-area-pt)" />
              <polyline
                fill="none"
                stroke="var(--md-chart-1)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={ptCoveredPoints}
              />

              <polyline
                fill="none"
                stroke="var(--md-chart-3)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={totalPoints}
              />

              {currentRes.optimalTco > 0 && (
                <line
                  x1={padLeft}
                  y1={yPos(currentRes.optimalTco)}
                  x2={width - padRight}
                  y2={yPos(currentRes.optimalTco)}
                  stroke="var(--md-chart-comparison)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )}

              {ptCeiling > 0 && (
                <line
                  x1={padLeft}
                  y1={yPos(ptCeiling)}
                  x2={width - padRight}
                  y2={yPos(ptCeiling)}
                  stroke="var(--md-chart-4)"
                  strokeWidth="2"
                />
              )}

              {activePoint && hoverHour !== null && (
                <g>
                  <line
                    x1={xPos(hoverHour)}
                    y1={padTop}
                    x2={xPos(hoverHour)}
                    y2={padTop + plotH}
                    stroke="var(--md-outline)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={xPos(hoverHour)}
                    cy={yPos(activePoint.ptCoveredGsus)}
                    r="4"
                    fill="var(--md-chart-1)"
                  />
                  <circle
                    cx={xPos(hoverHour)}
                    cy={yPos(
                      activePoint.ptCoveredGsus +
                        activePoint.standardPayGoSpilloverGsus
                    )}
                    r="4"
                    fill="var(--md-chart-2)"
                  />
                  <circle
                    cx={xPos(hoverHour)}
                    cy={yPos(activePoint.totalDemandGsus)}
                    r="4"
                    fill="var(--md-chart-3)"
                  />
                </g>
              )}
            </svg>

            {activePoint && hoverHour !== null && (
              <div
                className="mt-3 p-3 px-4 rounded-[12px] bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] type-body-sm flex flex-wrap items-center justify-between gap-4 tabular-nums"
                style={{ boxShadow: 'var(--md-elevation-2)' }}
              >
                <div className="font-medium text-[var(--md-on-surface)]">
                  {activeDayName} · {String(activeHourOfDay).padStart(2, '0')}:00
                  {activePoint.isWeekend ? ' (Weekend)' : ' (Weekday)'}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-[10px] h-[10px] rounded-[4px]"
                      style={{ backgroundColor: 'var(--md-chart-1)' }}
                    />
                    <span>PT covered: {activePoint.ptCoveredGsus.toFixed(1)} GSUs</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-[10px] h-[10px] rounded-[4px]"
                      style={{ backgroundColor: 'var(--md-chart-2)' }}
                    />
                    <span>
                      Standard PayGo: {activePoint.standardPayGoSpilloverGsus.toFixed(1)} GSUs
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-[10px] h-[10px] rounded-[4px]"
                      style={{ backgroundColor: 'var(--md-chart-3)' }}
                    />
                    <span>
                      Priority 1.8×: {activePoint.priorityPayGoRetryGsus.toFixed(1)} GSUs
                    </span>
                  </span>
                  <span className="text-[var(--md-on-surface-variant)]">
                    Total demand: {activePoint.totalDemandGsus.toFixed(1)} GSUs
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Benchmark Reference Strip */}
        <div className="mt-4 pt-4 border-t border-[var(--md-outline-variant)] grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div>
            <div className="type-label-md text-[var(--md-on-surface)]">
              24/7 minimum floor
            </div>
            <div className="type-body-sm text-[var(--md-on-surface-variant)]">
              Lowest nighttime demand
            </div>
            <div className="type-title-md text-[var(--md-on-surface)] mt-0.5">
              {Math.round(currentRes.minFloor)} GSUs
            </div>
          </div>
          <div>
            <div className="type-label-md text-[var(--md-on-surface)]">
              Optimal TCO ceiling
            </div>
            <div className="type-body-sm text-[var(--md-on-surface-variant)]">
              Lowest total cost (~75% util)
            </div>
            <div className="type-title-md text-[var(--md-primary)] mt-0.5">
              {currentRes.optimalTco} GSUs
            </div>
          </div>
          <div>
            <div className="type-label-md text-[var(--md-on-surface)]">
              Active provisioned ceiling
            </div>
            <div className="type-body-sm text-[var(--md-on-surface-variant)]">
              Currently configured GSUs
            </div>
            <div className="type-title-md text-[var(--md-on-surface)] mt-0.5">
              {ptCeiling} GSUs ({formatPct(currentRes.util, 1)} util)
            </div>
          </div>
          <div>
            <div className="type-label-md text-[var(--md-on-surface)]">
              100% peak hourly demand
            </div>
            <div className="type-body-sm text-[var(--md-on-surface-variant)]">
              Busiest weekday hour
            </div>
            <div className="type-title-md text-[var(--md-on-surface)] mt-0.5">
              {Math.round(currentRes.peak)} GSUs
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT BREAKDOWN CARD: 4 columns */}
      <div
        className={`col-span-12 lg:col-span-4 flex flex-col justify-between gap-5 ${
          embedded
            ? 'p-5 rounded-[12px] bg-[var(--md-surface-container)]'
            : 'md-card p-6'
        }`}
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="type-title-md text-[var(--md-on-surface)]">
                Token routing & lot spend split
              </h3>
              <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                How total traffic is distributed across pricing tiers
              </p>
            </div>
            <span
              title="Donut shows 36-month token routing share; horizontal bars rank lots by 3-year TCO"
              className="text-[var(--md-on-surface-variant)] shrink-0"
            >
              <Info className="w-[18px] h-[18px]" />
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="relative w-[124px] h-[124px] shrink-0 flex items-center justify-center">
              <svg
                viewBox="0 0 132 132"
                className="w-full h-full -rotate-90"
                aria-hidden="true"
              >
                {donutSegments.map((seg, i) => {
                  const segLength = Math.max(
                    0,
                    seg.share * donutCircumference - 2
                  );
                  const strokeDasharray = `${segLength} ${donutCircumference}`;
                  const strokeDashoffset = -cumulativeAngle;
                  cumulativeAngle += seg.share * donutCircumference;
                  return (
                    <circle
                      key={i}
                      cx="66"
                      cy="66"
                      r={donutRadius}
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="type-title-lg text-[var(--md-on-surface)] tabular-nums">
                  {formatTokensMillions(allTok)}
                </span>
                <span className="type-body-sm text-[var(--md-on-surface-variant)]">
                  36-mo tokens
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 type-body-sm tabular-nums">
              {donutSegments.map((seg) => (
                <div key={seg.label}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-[var(--md-on-surface)] font-medium truncate">
                      <span
                        className="w-[10px] h-[10px] rounded-[4px] shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="truncate">{seg.label}</span>
                    </span>
                    <span className="font-medium text-[var(--md-on-surface)] shrink-0">
                      {formatPct(seg.share, 1)}
                    </span>
                  </div>
                  <div className="pl-[18px] text-[var(--md-on-surface-variant)] truncate">
                    {seg.subtext}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ranked Horizontal Bar List by Lot */}
        <div className="pt-4 border-t border-[var(--md-outline-variant)] space-y-2.5">
          <div>
            <div className="type-label-md text-[var(--md-on-surface)]">
              3-year TCO ranked by lot (Option C)
            </div>
            <div className="type-body-sm text-[var(--md-on-surface-variant)]">
              Relative budget weight of each workload lot
            </div>
          </div>
          {lotBarRows.map((row, idx) => {
            const widthPct = Math.max(6, (row.cost / maxLotCost) * 100);
            const barColor = `var(--md-chart-${Math.min(idx + 1, 4)})`;
            return (
              <div key={row.id} className="space-y-1">
                <div className="flex items-center justify-between type-body-sm tabular-nums">
                  <span className="text-[var(--md-on-surface)] truncate">
                    {row.name}
                  </span>
                  <span className="font-medium text-[var(--md-on-surface)]">
                    {formatCurrencyMillions(row.cost, 1)}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[var(--md-surface-container-lowest)] rounded-r-[4px] rounded-l-none overflow-hidden">
                  <div
                    className="h-full rounded-r-[4px] rounded-l-none transition-all duration-300"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: barColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
