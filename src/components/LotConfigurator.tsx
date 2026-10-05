import React, { useState } from 'react';
import {
  Check,
  Globe2,
  Link2,
  RotateCcw,
  Sliders,
  Table2,
  Calendar,
  Activity,
} from 'lucide-react';
import {
  DEFAULT_LOTS,
  ENDPOINT_LOCATION_SPECS,
  EndpointLocation,
  formatLot1DisplayName,
  getLot4BlendedEuSpecs,
  getLotEffectiveGsuMonthlyPriceUsd,
  getLotEffectivePricesPer1M,
  GlobalSimConfig,
  LOT1_MODEL_PRESETS,
  Lot1ModelId,
  LotConfig,
  PtSizingMode,
  ThinkingLevel,
} from '../data/rfqDefaults';
import { FullSimulationOutput, YearKey } from '../engine/simulator';
import {
  formatCurrencyExact,
  formatCurrencyMillions,
  formatDeltaPct,
  formatPct,
  formatTokensMillions,
} from '../utils/format';
import { MonthlyRampChart } from './MonthlyRampChart';
import { TrafficSeasonalityChart } from './TrafficSeasonalityChart';

interface LotConfiguratorProps {
  lots: LotConfig[];
  onChangeLot: (updated: LotConfig) => void;
  onChangeAllLots?: (nextLots: LotConfig[]) => void;
  globalConfig: GlobalSimConfig;
  onChangeGlobalConfig: (next: GlobalSimConfig) => void;
  sim: FullSimulationOutput;
  selectedYear: YearKey;
  onSelectYear: (yr: YearKey) => void;
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
}

type LotVisualView = 'breakdown' | 'ramp' | 'seasonality';

export const LotConfigurator: React.FC<LotConfiguratorProps> = ({
  lots,
  onChangeLot,
  globalConfig,
  sim,
  selectedYear,
  onSelectYear,
  activeFspTier,
}) => {
  const [selectedLotId, setSelectedLotId] =
    useState<LotConfig['id']>('lot1');
  const [visualView, setVisualView] = useState<LotVisualView>('seasonality');
  const [scaleYearsProportionally, setScaleYearsProportionally] =
    useState<boolean>(true);

  const selectedLot =
    lots.find((l) => l.id === selectedLotId) ?? lots[0];

  const lotSim = sim.byLotAndYear[selectedLot.id][selectedYear];
  const lotY1 = sim.byLotAndYear[selectedLot.id].y1;
  const lotY2 = sim.byLotAndYear[selectedLot.id].y2;
  const lotY3 = sim.byLotAndYear[selectedLot.id].y3;

  const activeLoc: EndpointLocation = selectedLot.endpointLocation ?? 'eu';
  const effectivePrices = getLotEffectivePricesPer1M(selectedLot);
  const ptDiscount = globalConfig.fspDiscounts.ptDiscount ?? 0.2;
  const gsuListPrice = getLotEffectiveGsuMonthlyPriceUsd(
    selectedLot,
    globalConfig.gsuCommitTerm,
    0
  );
  const gsuUnitPrice = getLotEffectiveGsuMonthlyPriceUsd(
    selectedLot,
    globalConfig.gsuCommitTerm,
    ptDiscount
  );

  const fspDiscountRate =
    activeFspTier === 'oneYearFsp'
      ? globalConfig.fspDiscounts.oneYearCommitDiscount
      : activeFspTier === 'threeYearFsp'
      ? globalConfig.fspDiscounts.threeYearCommitDiscount
      : globalConfig.fspDiscounts.uncommittedDiscount ?? 0;

  const applyManualGsus = (lot: LotConfig, nextGsus: number) => {
    const clamped = Math.max(0, Math.round(nextGsus));
    const currentY1 = sim.byLotAndYear[lot.id].y1.provisionedGsus;
    const currentY2 = sim.byLotAndYear[lot.id].y2.provisionedGsus;
    const currentY3 = sim.byLotAndYear[lot.id].y3.provisionedGsus;
    const currSelected = sim.byLotAndYear[lot.id][selectedYear].provisionedGsus;

    if (scaleYearsProportionally && currSelected > 0) {
      const ratio = clamped / currSelected;
      onChangeLot({
        ...lot,
        ptSizingMode: 'MANUAL',
        manualGsus: {
          y1: selectedYear === 'y1' ? clamped : Math.round(currentY1 * ratio),
          y2: selectedYear === 'y2' ? clamped : Math.round(currentY2 * ratio),
          y3: selectedYear === 'y3' ? clamped : Math.round(currentY3 * ratio),
        },
      });
    } else {
      onChangeLot({
        ...lot,
        ptSizingMode: 'MANUAL',
        manualGsus: {
          y1: selectedYear === 'y1' ? clamped : currentY1,
          y2: selectedYear === 'y2' ? clamped : currentY2,
          y3: selectedYear === 'y3' ? clamped : currentY3,
        },
      });
    }
  };

  const resetSelectedLot = () => {
    const def = DEFAULT_LOTS.find((d) => d.id === selectedLot.id);
    if (def) {
      onChangeLot(structuredClone(def));
    }
  };

  // Selected Lot 3-Year Metrics
  const lot3YTokensM =
    lotY1.totalTokensM + lotY2.totalTokensM + lotY3.totalTokensM;
  const lot3YHybridUsd =
    lotY1.annualCostsFspUsd[activeFspTier].hybridTotalUsd +
    lotY2.annualCostsFspUsd[activeFspTier].hybridTotalUsd +
    lotY3.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
  const lot3YPurePayGoUsd =
    lotY1.annualCostsFspUsd[activeFspTier].purePayGoUsd +
    lotY2.annualCostsFspUsd[activeFspTier].purePayGoUsd +
    lotY3.annualCostsFspUsd[activeFspTier].purePayGoUsd;
  const lot3YListPayGoUsd =
    lotY1.annualCostsListUsd.purePayGoBaselineCostUsd +
    lotY2.annualCostsListUsd.purePayGoBaselineCostUsd +
    lotY3.annualCostsListUsd.purePayGoBaselineCostUsd;

  const lot3YPtCostUsd =
    lotY1.annualCostsListUsd.ptGsuAnnualCostUsd +
    lotY2.annualCostsListUsd.ptGsuAnnualCostUsd +
    lotY3.annualCostsListUsd.ptGsuAnnualCostUsd;
  const lot3YVarCostUsd = Math.max(0, lot3YHybridUsd - lot3YPtCostUsd);

  const lotDeltaVsList =
    lot3YListPayGoUsd > 0
      ? (lot3YHybridUsd - lot3YListPayGoUsd) / lot3YListPayGoUsd
      : 0;
  const lotDeltaVsSameTierPayGo =
    lot3YPurePayGoUsd > 0
      ? (lot3YHybridUsd - lot3YPurePayGoUsd) / lot3YPurePayGoUsd
      : 0;

  const avgLotPtCov =
    (lotY1.realtimeRouting.ptCoveredFraction +
      lotY2.realtimeRouting.ptCoveredFraction +
      lotY3.realtimeRouting.ptCoveredFraction) /
    3;
  const avgLotPtUtil =
    (lotY1.realtimeRouting.ptUtilizationRate +
      lotY2.realtimeRouting.ptUtilizationRate +
      lotY3.realtimeRouting.ptUtilizationRate) /
    3;

  const maxSliderGsus = Math.max(
    120,
    Math.ceil(lotSim.peakHourlyGsuDemand * 1.15)
  );

  const googleShare = selectedLot.googleShare ?? 1.0;
  const googleSharePct = Math.round(googleShare * 100);
  const inputPct = Math.round(selectedLot.inputRatio * 100);
  const outputPct = 100 - inputPct;
  const cachePct = Math.round(selectedLot.cacheRatio * 100);
  const batchPct = Math.round(selectedLot.batchRatio * 100);

  const applyLotGoogleShare = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    const def = DEFAULT_LOTS.find((d) => d.id === selectedLot.id);
    onChangeLot({
      ...selectedLot,
      googleShare: clamped,
      manualGsus:
        selectedLot.ptSizingMode === 'MANUAL' && def
          ? {
              y1: Math.round(def.manualGsus.y1 * clamped),
              y2: Math.round(def.manualGsus.y2 * clamped),
              y3: Math.round(def.manualGsus.y3 * clamped),
            }
          : selectedLot.manualGsus,
    });
  };

  return (
    <div className="space-y-6">
      {/* =====================================================================
          STEP 1: 4-LOT OVERVIEW SELECTOR STRIP
          Click any lot to inspect its results and adjust its variables below
          ===================================================================== */}
      <section aria-label="Select workload lot to inspect and configure">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lots.map((lot) => {
            const isSelected = lot.id === selectedLot.id;
            const r1 = sim.byLotAndYear[lot.id].y1;
            const r2 = sim.byLotAndYear[lot.id].y2;
            const r3 = sim.byLotAndYear[lot.id].y3;

            const cost3Y =
              r1.annualCostsFspUsd[activeFspTier].hybridTotalUsd +
              r2.annualCostsFspUsd[activeFspTier].hybridTotalUsd +
              r3.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
            const list3Y =
              r1.annualCostsListUsd.purePayGoBaselineCostUsd +
              r2.annualCostsListUsd.purePayGoBaselineCostUsd +
              r3.annualCostsListUsd.purePayGoBaselineCostUsd;
            const deltaVsList =
              list3Y > 0 ? (cost3Y - list3Y) / list3Y : 0;
            const lotSharePct = Math.round((lot.googleShare ?? 1.0) * 100);

            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => setSelectedLotId(lot.id)}
                aria-pressed={isSelected}
                className={`p-5 text-left cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected ? 'md-card-selected' : 'md-card-interactive'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full type-label-md ${
                        isSelected
                          ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                          : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]'
                      }`}
                    >
                      Lot {lot.lotNumber} · {(lot.endpointLocation ?? 'eu').toUpperCase()} · {lotSharePct}% Google
                    </span>
                    <span
                      className={
                        deltaVsList <= 0
                          ? 'md-delta-positive'
                          : 'md-delta-negative'
                      }
                    >
                      {formatDeltaPct(deltaVsList)}
                    </span>
                  </div>

                  <h3
                    className={`type-title-md mt-2 ${
                      isSelected
                        ? 'text-[var(--md-on-primary-container)]'
                        : 'text-[var(--md-on-surface)]'
                    }`}
                  >
                    {lot.modelDisplayName}
                  </h3>
                  <p
                    className={`type-body-sm mt-0.5 line-clamp-2 ${
                      isSelected
                        ? 'text-[var(--md-on-primary-container)] opacity-85'
                        : 'text-[var(--md-on-surface-variant)]'
                    }`}
                  >
                    {lot.name.replace(/^Lot \d+\s*·\s*/, '')}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--md-outline-variant)] flex items-baseline justify-between gap-2 tabular-nums">
                  <div>
                    <div
                      className={`type-body-sm ${
                        isSelected
                          ? 'text-[var(--md-on-primary-container)] opacity-80'
                          : 'text-[var(--md-on-surface-variant)]'
                      }`}
                    >
                      3-year TCO
                    </div>
                    <div
                      className={`type-title-lg ${
                        isSelected
                          ? 'text-[var(--md-on-primary-container)]'
                          : 'text-[var(--md-on-surface)]'
                      }`}
                    >
                      {formatCurrencyMillions(cost3Y, 1)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`type-body-sm ${
                        isSelected
                          ? 'text-[var(--md-on-primary-container)] opacity-80'
                          : 'text-[var(--md-on-surface-variant)]'
                      }`}
                    >
                      GSUs (Y1→Y3)
                    </div>
                    <div
                      className={`type-label-lg ${
                        isSelected
                          ? 'text-[var(--md-on-primary-container)]'
                          : 'text-[var(--md-on-surface)]'
                      }`}
                    >
                      {r1.provisionedGsus} → {r2.provisionedGsus} →{' '}
                      {r3.provisionedGsus}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          STEP 2: SELECTED LOT RESULTS (TOP)
          4 Lot KPI Cards + Unified Lot Results & Visuals Card
          ===================================================================== */}
      <section
        aria-label={`Results for ${selectedLot.shortName}`}
        className="space-y-4"
      >
        {/* Selected Lot 4-Card KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md-card p-5 space-y-2 tabular-nums">
            <div>
              <div className="type-title-sm text-[var(--md-on-surface)]">
                Lot {selectedLot.lotNumber} 3-year TCO
              </div>
              <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                Total 36-month budget for this workload lot
              </div>
            </div>
            <div
              title={formatCurrencyExact(lot3YHybridUsd)}
              className="type-kpi-value text-[var(--md-on-surface)]"
            >
              {formatCurrencyMillions(lot3YHybridUsd, 2)}
            </div>
            <div className="flex items-center gap-2 type-body-sm">
              <span
                className={
                  lotDeltaVsList <= 0
                    ? 'md-delta-positive'
                    : 'md-delta-negative'
                }
              >
                {formatDeltaPct(lotDeltaVsList)}
              </span>
              <span className="text-[var(--md-on-surface-variant)]">
                vs {formatCurrencyMillions(lot3YListPayGoUsd, 1)} list PayGo
              </span>
            </div>
          </div>

          <div className="md-card p-5 space-y-2 tabular-nums">
            <div>
              <div className="type-title-sm text-[var(--md-on-surface)]">
                Fixed PT vs dynamic PayGo
              </div>
              <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                Reserved monthly subscription vs variable overflow
              </div>
            </div>
            <div className="type-kpi-value text-[var(--md-on-surface)]">
              {formatCurrencyMillions(lot3YPtCostUsd, 1)} /{' '}
              {formatCurrencyMillions(lot3YVarCostUsd, 1)}
            </div>
            <div className="flex items-center gap-2 type-body-sm">
              <span
                className={
                  lotDeltaVsSameTierPayGo <= 0
                    ? 'md-delta-positive'
                    : 'md-delta-negative'
                }
              >
                {formatDeltaPct(lotDeltaVsSameTierPayGo)}
              </span>
              <span className="text-[var(--md-on-surface-variant)]">
                vs {formatCurrencyMillions(lot3YPurePayGoUsd, 1)} 0-GSU PayGo
              </span>
            </div>
          </div>

          <div className="md-card p-5 space-y-2 tabular-nums">
            <div>
              <div className="type-title-sm text-[var(--md-on-surface)]">
                3-year volume & PT coverage
              </div>
              <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                Total lot tokens & share served by reserved GSUs
              </div>
            </div>
            <div className="type-kpi-value text-[var(--md-on-surface)]">
              {formatTokensMillions(lot3YTokensM)}
            </div>
            <div className="flex items-center gap-2 type-body-sm">
              <span className="md-delta-positive">
                {formatPct(avgLotPtCov, 1)} PT
              </span>
              <span className="text-[var(--md-on-surface-variant)]">
                covered by reserved capacity
              </span>
            </div>
          </div>

          <div className="md-card p-5 space-y-2 tabular-nums">
            <div>
              <div className="type-title-sm text-[var(--md-on-surface)]">
                Provisioned GSUs (Y1 → Y3)
              </div>
              <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                Reserved throughput units & average utilization
              </div>
            </div>
            <div className="type-kpi-value text-[var(--md-on-surface)]">
              {lotY1.provisionedGsus} → {lotY2.provisionedGsus} →{' '}
              {lotY3.provisionedGsus}
            </div>
            <div className="flex items-center gap-2 type-body-sm">
              <span
                className={
                  avgLotPtUtil >= lotSim.breakEvenUtilization
                    ? 'md-delta-positive'
                    : 'md-delta-negative'
                }
              >
                {formatPct(avgLotPtUtil, 1)} util
              </span>
              <span className="text-[var(--md-on-surface-variant)]">
                vs {formatPct(lotSim.breakEvenUtilization, 1)} break-even
              </span>
            </div>
          </div>
        </div>

        {/* Unified Selected Lot Visual Card */}
        <div className="md-card overflow-hidden">
          <div className="px-6 py-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="type-title-md text-[var(--md-on-surface)]">
                {selectedLot.name} · {selectedLot.modelDisplayName}
              </h2>
              <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                {selectedLot.subtitle}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Select lot result view"
              className="inline-flex flex-wrap items-center p-1 rounded-full bg-[var(--md-surface-container)] self-start lg:self-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={visualView === 'seasonality'}
                onClick={() => setVisualView('seasonality')}
                className={`h-[34px] px-3.5 rounded-full type-label-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  visualView === 'seasonality'
                    ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Weekly traffic routing (168h)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={visualView === 'ramp'}
                onClick={() => setVisualView('ramp')}
                className={`h-[34px] px-3.5 rounded-full type-label-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  visualView === 'ramp'
                    ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>36-month ramp (M1–M36)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={visualView === 'breakdown'}
                onClick={() => setVisualView('breakdown')}
                className={`h-[34px] px-3.5 rounded-full type-label-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  visualView === 'breakdown'
                    ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                    : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>Commercial summary</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {visualView === 'breakdown' && (
              <div className="space-y-5">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="h-[48px] bg-[var(--md-surface-container-lowest)] border-b border-[var(--md-outline-variant)]">
                        <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)]">
                          <div>Contract year</div>
                          <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                            3-year horizon
                          </div>
                        </th>
                        <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                          <div>Annual token volume</div>
                          <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                            Total tokens processed
                          </div>
                        </th>
                        <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                          <div>Provisioned GSUs</div>
                          <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                            Reserved units (ramp range)
                          </div>
                        </th>
                        <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                          <div>Fixed PT spend</div>
                          <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                            Reserved monthly fee (-{Math.round(ptDiscount * 100)}%)
                          </div>
                        </th>
                        <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                          <div>Variable PayGo & batch</div>
                          <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                            Overflow + batch (-{Math.round(fspDiscountRate * 100)}%)
                          </div>
                        </th>
                        <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                          <div>Total annual hybrid TCO</div>
                          <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                            Combined annual spend
                          </div>
                        </th>
                        <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                          <div>0-GSU PayGo baseline</div>
                          <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                            100% variable comparison
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { yr: 'y1' as YearKey, label: 'Year 1 (2027)', res: lotY1 },
                        { yr: 'y2' as YearKey, label: 'Year 2 (2028)', res: lotY2 },
                        { yr: 'y3' as YearKey, label: 'Year 3 (2029)', res: lotY3 },
                      ]).map(({ yr, label, res }) => {
                        const isYrSelected = selectedYear === yr;
                        const fixedPt = res.annualCostsListUsd.ptGsuAnnualCostUsd;
                        const hybridTot =
                          res.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
                        const varPayGo = Math.max(0, hybridTot - fixedPt);
                        const purePayGo =
                          res.annualCostsFspUsd[activeFspTier].purePayGoUsd;

                        return (
                          <tr
                            key={yr}
                            onClick={() => onSelectYear(yr)}
                            className={`h-[54px] border-b border-[var(--md-outline-variant)] cursor-pointer transition-colors ${
                              isYrSelected
                                ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                                : 'bg-[var(--md-surface-container-lowest)] hover:bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)]'
                            }`}
                          >
                            <td className="px-4 type-data-cell font-medium">
                              {label}
                            </td>
                            <td className="px-4 type-data-cell text-right">
                              {formatTokensMillions(res.totalTokensM)}
                            </td>
                            <td className="px-4 type-data-cell text-right">
                              {res.provisionedGsus} GSUs
                              {res.minMonthlyGsus !== res.maxMonthlyGsus
                                ? ` (${res.minMonthlyGsus}→${res.maxMonthlyGsus})`
                                : ''}
                            </td>
                            <td className="px-4 type-data-cell text-right">
                              {formatCurrencyExact(fixedPt)}
                            </td>
                            <td className="px-4 type-data-cell text-right">
                              {formatCurrencyExact(varPayGo)}
                            </td>
                            <td className="px-4 type-data-cell font-medium text-right">
                              {formatCurrencyExact(hybridTot)}
                            </td>
                            <td className="px-4 type-data-cell text-right opacity-85">
                              {formatCurrencyExact(purePayGo)}
                            </td>
                          </tr>
                        );
                      })}
                      {/* 3-Year Total Footer Row */}
                      <tr className="h-[54px] bg-[var(--md-surface-container)] font-medium text-[var(--md-on-surface)]">
                        <td className="px-4 type-data-cell font-medium">
                          3-year total (2027–2029)
                        </td>
                        <td className="px-4 type-data-cell text-right font-medium">
                          {formatTokensMillions(lot3YTokensM)}
                        </td>
                        <td className="px-4 type-data-cell text-right font-medium">
                          {lotY1.provisionedGsus} → {lotY2.provisionedGsus} →{' '}
                          {lotY3.provisionedGsus} GSUs
                        </td>
                        <td className="px-4 type-data-cell text-right font-medium">
                          {formatCurrencyExact(lot3YPtCostUsd)}
                        </td>
                        <td className="px-4 type-data-cell text-right font-medium">
                          {formatCurrencyExact(lot3YVarCostUsd)}
                        </td>
                        <td className="px-4 type-data-cell text-right font-medium text-[var(--md-primary)]">
                          {formatCurrencyExact(lot3YHybridUsd)}
                        </td>
                        <td className="px-4 type-data-cell text-right font-medium">
                          {formatCurrencyExact(lot3YPurePayGoUsd)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Stacked Horizontal Bar for Real-Time Token Routing */}
                <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="type-label-lg text-[var(--md-on-surface)]">
                        Real-time traffic routing split ({selectedYear.toUpperCase()})
                      </div>
                      <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                        Share of online traffic absorbed by reserved PT vs spilling over to on-demand PayGo
                      </div>
                    </div>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                      Floor: {Math.round(lotSim.minHourlyGsuDemand)} GSUs · Optimal:{' '}
                      {lotSim.optimalTcoGsuDemand} GSUs · Peak:{' '}
                      {Math.round(lotSim.peakHourlyGsuDemand)} GSUs
                    </div>
                  </div>

                  <div className="w-full h-3 bg-[var(--md-surface-container-highest)] rounded-r-[4px] rounded-l-none overflow-hidden flex">
                    <div
                      style={{
                        width: `${
                          lotSim.realtimeRouting.ptCoveredFraction * 100
                        }%`,
                        backgroundColor: 'var(--md-chart-1)',
                      }}
                      title="Covered by Provisioned Throughput"
                    />
                    <div
                      style={{
                        width: `${
                          lotSim.realtimeRouting.standardPayGoFraction * 100
                        }%`,
                        backgroundColor: 'var(--md-chart-2)',
                      }}
                      title="Standard PayGo burst spillover"
                    />
                    <div
                      style={{
                        width: `${
                          lotSim.realtimeRouting.priorityPayGoFraction * 100
                        }%`,
                        backgroundColor: 'var(--md-chart-3)',
                      }}
                      title="Priority PayGo 1.8x retry spillover"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-[10px] h-[10px] rounded-[4px]"
                        style={{ backgroundColor: 'var(--md-chart-1)' }}
                      />
                      <span>
                        PT covered (reserved):{' '}
                        {formatPct(lotSim.realtimeRouting.ptCoveredFraction, 1)}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-[10px] h-[10px] rounded-[4px]"
                        style={{ backgroundColor: 'var(--md-chart-2)' }}
                      />
                      <span>
                        Standard PayGo overflow:{' '}
                        {formatPct(
                          lotSim.realtimeRouting.standardPayGoFraction,
                          1
                        )}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-[10px] h-[10px] rounded-[4px]"
                        style={{ backgroundColor: 'var(--md-chart-3)' }}
                      />
                      <span>
                        Priority 1.8× burst:{' '}
                        {formatPct(
                          lotSim.realtimeRouting.priorityPayGoFraction,
                          1
                        )}
                      </span>
                    </span>
                    <span>
                      PT utilization:{' '}
                      <strong className="text-[var(--md-on-surface)]">
                        {formatPct(lotSim.realtimeRouting.ptUtilizationRate, 1)}
                      </strong>{' '}
                      (break-even {formatPct(lotSim.breakEvenUtilization, 1)})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {visualView === 'ramp' && (
              <MonthlyRampChart
                lots={lots}
                globalConfig={globalConfig}
                sim={sim}
                selectedTier={activeFspTier}
                lockedScope={selectedLot.id}
                embedded
              />
            )}

            {visualView === 'seasonality' && (
              <TrafficSeasonalityChart
                sim={sim}
                lots={lots}
                globalConfig={globalConfig}
                selectedYear={selectedYear}
                onSelectYear={onSelectYear}
                lockedScope={selectedLot.id}
                embedded
              />
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          STEP 3: UNIFIED LOT VARIABLES PANEL (BELOW RESULTS)
          Fine-tunes ONLY the selected lot
          ===================================================================== */}
      <section
        aria-label={`Variables for ${selectedLot.shortName}`}
        className="md-card p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--md-outline-variant)]">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[var(--md-primary)] shrink-0" />
              <h2 className="type-title-lg text-[var(--md-on-surface)]">
                Lot {selectedLot.lotNumber} variables — {selectedLot.modelDisplayName}
              </h2>
            </div>
            <p className="type-body-md text-[var(--md-on-surface-variant)] mt-0.5">
              Fine-tune capacity, regional endpoint, and tokenomics specifically for Lot {selectedLot.lotNumber}. Other lots remain untouched.
            </p>
          </div>

          <button
            type="button"
            onClick={resetSelectedLot}
            className="md-btn-text shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Lot {selectedLot.lotNumber} to default</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUMN 1: Lot Capacity Sizing & Endpoint */}
          <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="type-title-md text-[var(--md-on-surface)]">
                  Provisioned Throughput (PT · GSU) & endpoint
                </h3>
                <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                  Reserved capacity sizing and regional deployment for Lot {selectedLot.lotNumber}
                </p>
              </div>

              {/* 1A. Endpoint Location */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="type-label-lg text-[var(--md-on-surface)] flex items-center gap-1.5">
                      <Globe2 className="w-4 h-4 text-[var(--md-primary)]" />
                      <span>Endpoint location</span>
                    </div>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Data residency & multi-region pricing multiplier
                    </div>
                  </div>

                  <div
                    role="group"
                    aria-label={`Select endpoint location for ${selectedLot.shortName}`}
                    className="inline-flex items-center p-1 rounded-full bg-[var(--md-surface-container)]"
                  >
                    {(['global', 'eu', 'us'] as EndpointLocation[]).map(
                      (locKey) => {
                        const spec = ENDPOINT_LOCATION_SPECS[locKey];
                        const isSelected = activeLoc === locKey;
                        return (
                          <button
                            key={locKey}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() =>
                              onChangeLot({
                                ...selectedLot,
                                endpointLocation: locKey,
                                region: spec.regionDisplay,
                              })
                            }
                            className={`h-[30px] px-3 rounded-full type-label-md cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                                : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                            }`}
                          >
                            {spec.shortLabel}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--md-outline-variant)] flex flex-wrap items-center justify-between gap-2 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                  <span>
                    In: <strong className="text-[var(--md-on-surface)]">${effectivePrices.inputNonCached.toFixed(2)}/1M</strong> · Cache: <strong className="text-[var(--md-on-surface)]">${effectivePrices.inputCached.toFixed(3)}/1M</strong> · Out: <strong className="text-[var(--md-on-surface)]">${(selectedLot.id === 'lot4' ? effectivePrices.outputImage ?? effectivePrices.outputTextAndThinking : effectivePrices.outputTextAndThinking).toFixed(2)}/1M</strong>
                  </span>
                  <span>
                    Net GSU: <strong className="text-[var(--md-primary)]">{formatCurrencyExact(gsuUnitPrice)}/mo</strong> (list {formatCurrencyExact(gsuListPrice)})
                  </span>
                </div>
              </div>

              {/* 1B. PT Sizing Strategy Presets */}
              <div className="space-y-2">
                <div>
                  <div className="type-label-lg text-[var(--md-on-surface)]">
                    PT sizing mode (Lot {selectedLot.lotNumber})
                  </div>
                  <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                    Choose an automatic sizing rule or set manual GSU counts per year
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      {
                        mode: 'OPTIMAL_TCO',
                        label: `Optimal TCO (≥${Math.round(
                          lotSim.breakEvenUtilization * 100
                        )}% util)`,
                      },
                      { mode: 'MIN_FLOOR', label: '24/7 minimum floor' },
                      { mode: 'DAYTIME_FLOOR', label: 'Daytime floor' },
                      { mode: 'NONE', label: '0 GSUs (PayGo only)' },
                      { mode: 'MANUAL', label: 'Custom manual GSUs' },
                    ] as { mode: PtSizingMode; label: string }[]
                  ).map((m) => {
                    const selected = selectedLot.ptSizingMode === m.mode;
                    return (
                      <button
                        key={m.mode}
                        type="button"
                        onClick={() =>
                          onChangeLot({
                            ...selectedLot,
                            ptSizingMode: m.mode,
                            manualGsus:
                              m.mode === 'MANUAL'
                                ? {
                                    ...selectedLot.manualGsus,
                                    [selectedYear]: lotSim.provisionedGsus,
                                  }
                                : selectedLot.manualGsus,
                          })
                        }
                        aria-pressed={selected}
                        className={`${
                          selected
                            ? 'md-chip-filter-selected'
                            : 'md-chip-filter'
                        } cursor-pointer`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 1C. Manual GSU Slider + Year Selector */}
            <div className="p-4 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="type-label-lg text-[var(--md-on-surface)]">
                    Provisioned GSU count ({selectedYear === 'y1' ? 'Year 1 · 2027' : selectedYear === 'y2' ? 'Year 2 · 2028' : 'Year 3 · 2029'})
                  </div>
                  <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                    Slide or type exact reserved GSU units for the selected year
                  </div>
                </div>

                <div
                  role="group"
                  aria-label="Select contract year for GSU sizing"
                  className="inline-flex items-center p-1 rounded-full bg-[var(--md-surface-container)]"
                >
                  {(['y1', 'y2', 'y3'] as YearKey[]).map((yr, idx) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => onSelectYear(yr)}
                      aria-pressed={selectedYear === yr}
                      className={`h-[28px] px-3 rounded-full type-label-md cursor-pointer transition-colors ${
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

              <div className="flex items-center justify-between gap-3 tabular-nums">
                <input
                  type="range"
                  min={0}
                  max={maxSliderGsus}
                  step={1}
                  value={lotSim.provisionedGsus}
                  aria-label={`Provisioned GSU slider for ${selectedLot.shortName}`}
                  onChange={(e) =>
                    applyManualGsus(selectedLot, Number(e.target.value))
                  }
                  className="flex-1 accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={maxSliderGsus}
                    step={1}
                    value={lotSim.provisionedGsus}
                    aria-label={`Manual GSU count for ${selectedLot.shortName}`}
                    onChange={(e) =>
                      applyManualGsus(selectedLot, Number(e.target.value))
                    }
                    className="w-20 h-[36px] px-2.5 rounded-[8px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-lg tabular-nums"
                  />
                  <span className="type-body-sm text-[var(--md-on-surface)]">
                    GSUs ({formatCurrencyExact(lotSim.provisionedGsus * gsuUnitPrice)}/mo)
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-2 type-body-sm text-[var(--md-on-surface-variant)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scaleYearsProportionally}
                    onChange={(e) =>
                      setScaleYearsProportionally(e.target.checked)
                    }
                    className="rounded accent-[var(--md-primary)]"
                  />
                  <Link2 className="w-3.5 h-3.5 text-[var(--md-primary)]" />
                  <span>Scale Y1, Y2 & Y3 proportionally when dragging</span>
                </label>

                <span className="type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                  Floor: {Math.round(lotSim.minHourlyGsuDemand)} · Optimal:{' '}
                  {lotSim.optimalTcoGsuDemand} · Peak:{' '}
                  {Math.round(lotSim.peakHourlyGsuDemand)} GSUs
                </span>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Lot Workload & Tokenomics Assumptions */}
          <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="type-title-md text-[var(--md-on-surface)]">
                  Workload & tokenomics assumptions (Lot {selectedLot.lotNumber})
                </h3>
                <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                  Configure Google share of volume, prompt/response ratio, caching, batch offload, and model tier
                </p>
              </div>

              {/* 2A. % of Tokens Served by Google */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div className="flex items-start justify-between gap-2 tabular-nums">
                  <div>
                    <label
                      htmlFor={`lot-google-share-${selectedLot.id}`}
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      % of tokens served by Google
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Share of Lot {selectedLot.lotNumber} token volume routed to Google Gemini models
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      id={`lot-google-share-${selectedLot.id}`}
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={googleSharePct}
                      onChange={(e) => {
                        const pct = Math.max(
                          0,
                          Math.min(100, Number(e.target.value))
                        );
                        applyLotGoogleShare(pct / 100);
                      }}
                      className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-body-sm tabular-nums"
                    />
                    <span className="type-body-sm text-[var(--md-on-surface-variant)]">
                      % Google
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={googleShare}
                  aria-label={`Percentage of tokens served by Google slider for ${selectedLot.shortName}`}
                  onChange={(e) =>
                    applyLotGoogleShare(Number(e.target.value))
                  }
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                    {formatTokensMillions(lot3YTokensM)} served by Google (3Y)
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '25%', val: 0.25 },
                      { label: '50%', val: 0.5 },
                      { label: '75%', val: 0.75 },
                      { label: '100%', val: 1.0 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => applyLotGoogleShare(opt.val)}
                        className="px-2 py-0.5 rounded bg-[var(--md-surface-container)] hover:bg-[var(--md-secondary-container)] type-body-sm text-[var(--md-on-surface)] cursor-pointer transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2B. Input / Output Token Split */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div className="flex items-start justify-between gap-2 tabular-nums">
                  <div>
                    <label
                      htmlFor={`lot-input-ratio-${selectedLot.id}`}
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      Input / Output token split
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Share of prompt context (input) vs model response (output)
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      id={`lot-input-ratio-${selectedLot.id}`}
                      type="number"
                      min={5}
                      max={95}
                      step={5}
                      value={inputPct}
                      onChange={(e) => {
                        const pct = Math.max(
                          5,
                          Math.min(95, Number(e.target.value))
                        );
                        onChangeLot({
                          ...selectedLot,
                          inputRatio: pct / 100,
                        });
                      }}
                      className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-body-sm tabular-nums"
                    />
                    <span className="type-body-sm text-[var(--md-on-surface-variant)]">
                      % In
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  value={selectedLot.inputRatio}
                  aria-label={`Input ratio slider for ${selectedLot.shortName}`}
                  onChange={(e) =>
                    onChangeLot({
                      ...selectedLot,
                      inputRatio: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                  <span>{inputPct}% Input</span>
                  <span>{outputPct}% Output</span>
                </div>
              </div>

              {/* 2B. Context Caching Hit Rate (-95% for Gemini 4 Argon, -90% for others) */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div className="flex items-start justify-between gap-2 tabular-nums">
                  <div>
                    <label
                      htmlFor={`lot-cache-ratio-${selectedLot.id}`}
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      Context caching hit rate (
                      {selectedLot.modelId === 'gemini-4-argon' ? '-95%' : '-90%'}
                      )
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Repeated prompt input served from memory at{' '}
                      {selectedLot.modelId === 'gemini-4-argon' ? '95%' : '90%'}{' '}
                      discount
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      id={`lot-cache-ratio-${selectedLot.id}`}
                      type="number"
                      min={0}
                      max={95}
                      step={5}
                      value={cachePct}
                      onChange={(e) => {
                        const pct = Math.max(
                          0,
                          Math.min(95, Number(e.target.value))
                        );
                        onChangeLot({
                          ...selectedLot,
                          cacheRatio: pct / 100,
                        });
                      }}
                      className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-body-sm tabular-nums"
                    />
                    <span className="type-body-sm text-[var(--md-on-surface-variant)]">
                      % Cache
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.95}
                  step={0.05}
                  value={selectedLot.cacheRatio}
                  aria-label={`Context cache hit rate slider for ${selectedLot.shortName}`}
                  onChange={(e) =>
                    onChangeLot({
                      ...selectedLot,
                      cacheRatio: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                  <span>{cachePct}% Cached</span>
                  <span>{100 - cachePct}% Non-cached</span>
                </div>
              </div>

              {/* 2C. Async Batch Offload (-50%) */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div className="flex items-start justify-between gap-2 tabular-nums">
                  <div>
                    <label
                      htmlFor={`lot-batch-ratio-${selectedLot.id}`}
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      Async Batch API offload (-50%)
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Non-urgent background tasks processed within 24h at half price
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      id={`lot-batch-ratio-${selectedLot.id}`}
                      type="number"
                      min={0}
                      max={80}
                      step={5}
                      value={batchPct}
                      onChange={(e) => {
                        const pct = Math.max(
                          0,
                          Math.min(80, Number(e.target.value))
                        );
                        onChangeLot({
                          ...selectedLot,
                          batchRatio: pct / 100,
                        });
                      }}
                      className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-body-sm tabular-nums"
                    />
                    <span className="type-body-sm text-[var(--md-on-surface-variant)]">
                      % Batch
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.8}
                  step={0.05}
                  value={selectedLot.batchRatio}
                  aria-label={`Batch offload slider for ${selectedLot.shortName}`}
                  onChange={(e) =>
                    onChangeLot({
                      ...selectedLot,
                      batchRatio: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                  <span>{batchPct}% Batch</span>
                  <span>{100 - batchPct}% Real-time</span>
                </div>
              </div>
            </div>

            {/* 2D-0. Lot 1 Model Architecture Toggle (Gemini 4 Argon vs Gemini 3.8 Flash) */}
            {selectedLot.id === 'lot1' && (
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div>
                  <div className="type-label-lg text-[var(--md-on-surface)]">
                    Lot 1 frontier model architecture
                  </div>
                  <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                    Toggle Lot 1 between Gemini 4 Argon (default · 6.0× output burndown) and Gemini 3.8 Flash (5.0× output burndown)
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(
                    [
                      {
                        id: 'gemini-4-argon',
                        label: 'Gemini 4 Argon (Default · 6.0× Out)',
                      },
                      {
                        id: 'gemini-3.8-flash',
                        label: 'Gemini 3.8 Flash (5.0× Out)',
                      },
                    ] as { id: Lot1ModelId; label: string }[]
                  ).map((opt) => {
                    const isSelected = selectedLot.modelId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          const preset = LOT1_MODEL_PRESETS[opt.id];
                          const share = selectedLot.googleShare ?? 1.0;
                          onChangeLot({
                            ...selectedLot,
                            modelId: preset.modelId,
                            shortName: preset.shortName,
                            subtitle: preset.subtitle,
                            modelDisplayName: formatLot1DisplayName(
                              preset.modelId,
                              selectedLot.thinkingLevel
                            ),
                            euPricesPer1M: { ...preset.euPricesPer1M },
                            gsuSpec: structuredClone(preset.gsuSpec),
                            manualGsus: {
                              y1: Math.round(preset.manualGsus.y1 * share),
                              y2: Math.round(preset.manualGsus.y2 * share),
                              y3: Math.round(preset.manualGsus.y3 * share),
                            },
                          });
                        }}
                        aria-pressed={isSelected}
                        className={`${
                          isSelected
                            ? 'md-chip-filter-selected'
                            : 'md-chip-filter'
                        } cursor-pointer`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[var(--md-outline-variant)] flex flex-wrap items-center justify-between gap-2 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                  <span>
                    GSU throughput: <strong className="text-[var(--md-on-surface)]">{selectedLot.gsuSpec.throughputPerGsuPerSec} tok/s</strong>
                  </span>
                  <span>
                    Burndown: <strong className="text-[var(--md-on-surface)]">{selectedLot.gsuSpec.burndownWeights.inputNonCached.toFixed(1)}×</strong> In · <strong className="text-[var(--md-on-surface)]">{selectedLot.gsuSpec.burndownWeights.inputCached.toFixed(1)}×</strong> Cache · <strong className="text-[var(--md-on-surface)]">{selectedLot.gsuSpec.burndownWeights.outputTextAndThinking.toFixed(1)}×</strong> Out/Think · <strong className="text-[var(--md-on-surface)]">0.0×</strong> Cache Write
                  </span>
                </div>
              </div>
            )}

            {/* 2D. Thinking Level (Lots 1 & 2) or Image Tier (Lot 4) */}
            {(selectedLot.supportsThinkingLevel || selectedLot.id === 'lot4') && (
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div>
                  <div className="type-label-lg text-[var(--md-on-surface)]">
                    {selectedLot.id === 'lot4'
                      ? 'Nano Banana 2 image resolution & SKU tier'
                      : 'Thinking budget level'}
                  </div>
                  <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                    {selectedLot.id === 'lot4'
                      ? 'Select image generation model quality and unit price tier'
                      : 'Reasoning depth generated per response'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {(selectedLot.id === 'lot4'
                    ? ([
                        {
                          lvl: 'LOW',
                          label: 'NB2 Lite ($33/1M img)',
                          displayName:
                            'Nano Banana 2 Lite (Gemini 3.1 Flash-Lite Image)',
                          mix: {
                            nb2Lite: 1.0,
                            nb2: 0.0,
                            nbPro: 0.0,
                            textOutputShareOfOutput: 0.05,
                          },
                        },
                        {
                          lvl: 'MEDIUM',
                          label: 'NB2 (Default · $66/1M img)',
                          displayName:
                            'Nano Banana 2 (Gemini 3.1 Flash Image)',
                          mix: {
                            nb2Lite: 0.0,
                            nb2: 1.0,
                            nbPro: 0.0,
                            textOutputShareOfOutput: 0.05,
                          },
                        },
                        {
                          lvl: 'HIGH',
                          label: 'NB Pro ($132/1M img)',
                          displayName:
                            'Nano Banana Pro (Gemini 3 Pro Image)',
                          mix: {
                            nb2Lite: 0.0,
                            nb2: 0.0,
                            nbPro: 1.0,
                            textOutputShareOfOutput: 0.05,
                          },
                        },
                      ] as {
                        lvl: ThinkingLevel;
                        label: string;
                        displayName?: string;
                        mix?: LotConfig['imageMix'];
                      }[])
                    : ([
                        {
                          lvl: 'LOW',
                          label: `Low (${selectedLot.thinkingMultiplierByLevel.LOW}×)`,
                        },
                        {
                          lvl: 'MEDIUM',
                          label: `Medium (${selectedLot.thinkingMultiplierByLevel.MEDIUM}×)`,
                        },
                        {
                          lvl: 'HIGH',
                          label: `High (${selectedLot.thinkingMultiplierByLevel.HIGH}×)`,
                        },
                      ] as {
                        lvl: ThinkingLevel;
                        label: string;
                        displayName?: string;
                        mix?: LotConfig['imageMix'];
                      }[])
                  ).map((opt) => {
                    const selected = selectedLot.thinkingLevel === opt.lvl;
                    return (
                      <button
                        key={opt.lvl}
                        type="button"
                        onClick={() => {
                          if (selectedLot.id === 'lot4' && opt.mix) {
                            const specs = getLot4BlendedEuSpecs(opt.mix);
                            onChangeLot({
                              ...selectedLot,
                              thinkingLevel: opt.lvl,
                              modelDisplayName:
                                opt.displayName ?? selectedLot.modelDisplayName,
                              imageMix: opt.mix,
                              euPricesPer1M: specs.euPricesPer1M,
                              gsuSpec: specs.gsuSpec,
                            });
                          } else if (selectedLot.id === 'lot1') {
                            onChangeLot({
                              ...selectedLot,
                              thinkingLevel: opt.lvl,
                              modelDisplayName: formatLot1DisplayName(
                                selectedLot.modelId,
                                opt.lvl
                              ),
                            });
                          } else {
                            onChangeLot({
                              ...selectedLot,
                              thinkingLevel: opt.lvl,
                            });
                          }
                        }}
                        aria-pressed={selected}
                        className={`${
                          selected
                            ? 'md-chip-filter-selected'
                            : 'md-chip-filter'
                        } cursor-pointer`}
                      >
                        {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
