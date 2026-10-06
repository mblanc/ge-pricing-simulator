import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  Globe2,
  Layers,
  Table2,
} from 'lucide-react';
import {
  GlobalSimConfig,
  LotConfig,
  PtSizingMode,
} from '../data/rfqDefaults';
import { FullSimulationOutput, YearKey } from '../engine/simulator';
import { HeaderKpis, SelectedKpiId } from './HeaderKpis';
import { TcoComparisonTable } from './TcoComparisonTable';
import { MonthlyRampChart } from './MonthlyRampChart';
import { TrafficSeasonalityChart } from './TrafficSeasonalityChart';
import { PricingConceptGuide } from './PricingConceptGuide';
import {
  SimulationControlsPanel,
  SimulatorScope,
} from './SimulationControlsPanel';
import {
  formatCurrencyExact,
  formatCurrencyMillions,
  formatDeltaPct,
  formatPct,
  formatTokensMillions,
} from '../utils/format';

interface UnifiedSimulatorViewProps {
  lots: LotConfig[];
  onChangeLot: (updatedLot: LotConfig) => void;
  onChangeAllLots: (nextLots: LotConfig[]) => void;
  globalConfig: GlobalSimConfig;
  onChangeGlobalConfig: (next: GlobalSimConfig) => void;
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
  onSelectFspTier: (tier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp') => void;
  selectedYear: YearKey;
  onSelectYear: (yr: YearKey) => void;
  selectedKpi: SelectedKpiId;
  onSelectKpi: (id: SelectedKpiId) => void;
  sim: FullSimulationOutput;
  onApplyGlobalPtMode: (mode: PtSizingMode) => void;
  currentGlobalPtMode: PtSizingMode | 'MIXED';
}

type VisualView = 'seasonality' | 'ramp' | 'comparison';

export const UnifiedSimulatorView: React.FC<UnifiedSimulatorViewProps> = ({
  lots,
  onChangeLot,
  onChangeAllLots,
  globalConfig,
  onChangeGlobalConfig,
  activeFspTier,
  onSelectFspTier,
  selectedYear,
  onSelectYear,
  selectedKpi,
  onSelectKpi,
  sim,
  onApplyGlobalPtMode,
  currentGlobalPtMode,
}) => {
  const [activeScope, setActiveScope] = useState<SimulatorScope>('all');
  const [visualView, setVisualView] = useState<VisualView>('seasonality');

  const isGlobal = activeScope === 'all';
  const selectedLot = !isGlobal
    ? lots.find((l) => l.id === activeScope) ?? lots[0]
    : null;

  // Global 3-year metrics for Card 0
  const global3YTco = sim.threeYearCumulated[activeFspTier].hybridTotalUsd;
  const global3YListPayGo = lots.reduce(
    (acc, l) =>
      acc +
      sim.byLotAndYear[l.id].y1.annualCostsListUsd.purePayGoBaselineCostUsd +
      sim.byLotAndYear[l.id].y2.annualCostsListUsd.purePayGoBaselineCostUsd +
      sim.byLotAndYear[l.id].y3.annualCostsListUsd.purePayGoBaselineCostUsd,
    0
  );
  const globalDeltaVsList =
    global3YListPayGo > 0
      ? (global3YTco - global3YListPayGo) / global3YListPayGo
      : 0;
  const globalY1Gsus = sim.totalsByYear.y1.totalProvisionedGsus;
  const globalY2Gsus = sim.totalsByYear.y2.totalProvisionedGsus;
  const globalY3Gsus = sim.totalsByYear.y3.totalProvisionedGsus;

  // Commercial discounts for per-lot breakdown table headers & guide
  const ptDiscount = globalConfig.fspDiscounts.ptDiscount ?? 0.2;
  const fspDiscountRate =
    activeFspTier === 'threeYearFsp'
      ? globalConfig.fspDiscounts.threeYearCommitDiscount
      : activeFspTier === 'oneYearFsp'
      ? globalConfig.fspDiscounts.oneYearCommitDiscount
      : globalConfig.fspDiscounts.uncommittedDiscount ?? 0;

  const activeBreakEvenUtil =
    isGlobal || !selectedLot
      ? sim.avgBreakEvenUtilization
      : sim.byLotAndYear[selectedLot.id][selectedYear].breakEvenUtilization;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          STEP 0: COLLAPSIBLE 3-STEP CONCEPT GUIDE FOR FIRST-TIME CLIENTS
          ===================================================================== */}
      <PricingConceptGuide
        breakEvenUtilization={activeBreakEvenUtil}
        activeFspDiscountPct={Math.round(fspDiscountRate * 100)}
        ptDiscountPct={Math.round(ptDiscount * 100)}
      />

      {/* =====================================================================
          STEP 1: 5-CARD SCOPE SELECTOR STRIP (FULL WIDTH)
          Switch between All 4 Lots (Global) and Individual Lots (Lot 1–4)
          ===================================================================== */}
      <section aria-label="Select simulation scope" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--md-primary)] shrink-0" />
            <span className="type-title-sm text-[var(--md-on-surface)]">
              Select scope — All 4 lots combined or individual workload lot
            </span>
          </div>
          <span className="type-body-sm text-[var(--md-on-surface-variant)]">
            Main KPIs and charts update on top; configure options in the 4 tabs below
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* CARD 0: All 4 Lots · Global */}
          <button
            type="button"
            onClick={() => setActiveScope('all')}
            aria-pressed={isGlobal}
            className={`p-4 text-left cursor-pointer flex flex-col justify-between gap-3 min-w-0 ${
              isGlobal ? 'md-card-selected' : 'md-card-interactive'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full type-label-md inline-flex items-center gap-1 ${
                    isGlobal
                      ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                      : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]'
                  }`}
                >
                  <Globe2 className="w-3 h-3 shrink-0" />
                  <span>All 4 lots · Global</span>
                </span>
                <span
                  className={
                    globalDeltaVsList <= 0
                      ? 'md-delta-positive'
                      : 'md-delta-negative'
                  }
                >
                  {formatDeltaPct(globalDeltaVsList)}
                </span>
              </div>

              <h3
                className={`type-title-md mt-2 ${
                  isGlobal
                    ? 'text-[var(--md-on-primary-container)]'
                    : 'text-[var(--md-on-surface)]'
                }`}
              >
                All 4 lots combined
              </h3>
              <p
                className={`type-body-sm mt-0.5 line-clamp-2 ${
                  isGlobal
                    ? 'text-[var(--md-on-primary-container)] opacity-85'
                    : 'text-[var(--md-on-surface-variant)]'
                }`}
              >
                Company-wide portfolio across Flash-Lite, Flash, Pro & Image
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--md-outline-variant)] flex items-baseline justify-between gap-2 tabular-nums">
              <div>
                <div
                  className={`type-body-sm ${
                    isGlobal
                      ? 'text-[var(--md-on-primary-container)] opacity-80'
                      : 'text-[var(--md-on-surface-variant)]'
                  }`}
                >
                  3-year TCO
                </div>
                <div
                  className={`type-title-lg ${
                    isGlobal
                      ? 'text-[var(--md-on-primary-container)]'
                      : 'text-[var(--md-on-surface)]'
                  }`}
                >
                  {formatCurrencyMillions(global3YTco, 1)}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`type-body-sm ${
                    isGlobal
                      ? 'text-[var(--md-on-primary-container)] opacity-80'
                      : 'text-[var(--md-on-surface-variant)]'
                  }`}
                >
                  GSUs (Y1→Y3)
                </div>
                <div
                  className={`type-label-lg ${
                    isGlobal
                      ? 'text-[var(--md-on-primary-container)]'
                      : 'text-[var(--md-on-surface)]'
                  }`}
                >
                  {globalY1Gsus} → {globalY2Gsus} → {globalY3Gsus}
                </div>
              </div>
            </div>
          </button>

          {/* CARDS 1–4: Individual Workload Lots */}
          {lots.map((lot) => {
            const isSelected = activeScope === lot.id;
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
            const deltaVsList = list3Y > 0 ? (cost3Y - list3Y) / list3Y : 0;
            const lotSharePct = Math.round((lot.googleShare ?? 1.0) * 100);

            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => setActiveScope(lot.id)}
                aria-pressed={isSelected}
                className={`p-4 text-left cursor-pointer flex flex-col justify-between gap-3 min-w-0 ${
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
                      Lot {lot.lotNumber} · {lot.endpointLocation ?? 'eu'} ·{' '}
                      {lotSharePct}%
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
          STEP 2: FULL-WIDTH EXECUTIVE KPIs + MAIN GRAPH & BREAKDOWN (TOP)
          ===================================================================== */}
      <section
        aria-label={
          isGlobal
            ? 'Global simulation results'
            : `Simulation results for ${selectedLot?.shortName}`
        }
        className="space-y-5"
      >
        <HeaderKpis
          sim={sim}
          globalConfig={globalConfig}
          onChangeGlobalConfig={onChangeGlobalConfig}
          activeFspTier={activeFspTier}
          onSelectFspTier={onSelectFspTier}
          onApplyGlobalPtMode={onApplyGlobalPtMode}
          currentGlobalPtMode={currentGlobalPtMode}
          selectedKpi={selectedKpi}
          activeScope={activeScope}
          lots={lots}
          onSelectKpi={(id) => {
            onSelectKpi(id);
            if (id === 'tco') {
              setVisualView('comparison');
            } else if (id === 'gsu' || id === 'spend') {
              setVisualView('ramp');
            } else if (id === 'routing') {
              setVisualView('seasonality');
            }
          }}
        />

        {/* Single Full-Width Results & Chart Card with 3-Way Switcher */}
        <div className="md-card overflow-hidden">
          <div className="px-6 py-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="type-title-md text-[var(--md-on-surface)]">
                {isGlobal
                  ? 'Global results & financial breakdown (all 4 lots combined)'
                  : `${selectedLot?.name} — Lot results & traffic profile`}
              </h2>
              <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                {isGlobal
                  ? 'Switch between the weekly hourly traffic routing profile, the 36-month capacity & spend ramp, or the 3-year commercial summary.'
                  : `${selectedLot?.subtitle} · Switch between weekly traffic routing, 36-month capacity ramp, and 3-year financial breakdown.`}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Select result visualization"
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
                aria-selected={visualView === 'comparison'}
                onClick={() => setVisualView('comparison')}
                className={`h-[34px] px-3.5 rounded-full type-label-md inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  visualView === 'comparison'
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
            {visualView === 'seasonality' && (
              <TrafficSeasonalityChart
                sim={sim}
                lots={lots}
                globalConfig={globalConfig}
                selectedYear={selectedYear}
                onSelectYear={onSelectYear}
                selectedKpi={selectedKpi}
                lockedScope={activeScope}
                embedded
              />
            )}

            {visualView === 'ramp' && (
              <MonthlyRampChart
                lots={lots}
                globalConfig={globalConfig}
                sim={sim}
                selectedTier={activeFspTier}
                lockedScope={isGlobal ? undefined : activeScope}
                embedded
              />
            )}

            {visualView === 'comparison' && isGlobal && (
              <TcoComparisonTable
                sim={sim}
                lots={lots}
                globalConfig={globalConfig}
                activeFspTier={activeFspTier}
                embedded
              />
            )}

            {visualView === 'comparison' && !isGlobal && selectedLot && (
              <PerLotCommercialBreakdown
                selectedLot={selectedLot}
                sim={sim}
                selectedYear={selectedYear}
                onSelectYear={onSelectYear}
                activeFspTier={activeFspTier}
                ptDiscount={ptDiscount}
                fspDiscountRate={fspDiscountRate}
              />
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          STEP 3: 4-TAB LOW-DENSITY CONFIGURATION PANEL (BELOW GRAPH)
          Only 1 focused configuration tab (2–3 spacious cards) shown at a time
          ===================================================================== */}
      <SimulationControlsPanel
        activeScope={activeScope}
        lots={lots}
        onChangeLot={onChangeLot}
        onChangeAllLots={onChangeAllLots}
        globalConfig={globalConfig}
        onChangeGlobalConfig={onChangeGlobalConfig}
        activeFspTier={activeFspTier}
        onSelectFspTier={onSelectFspTier}
        selectedYear={selectedYear}
        onSelectYear={onSelectYear}
        sim={sim}
      />
    </div>
  );
};

interface PerLotCommercialBreakdownProps {
  selectedLot: LotConfig;
  sim: FullSimulationOutput;
  selectedYear: YearKey;
  onSelectYear: (yr: YearKey) => void;
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
  ptDiscount: number;
  fspDiscountRate: number;
}

const PerLotCommercialBreakdown: React.FC<PerLotCommercialBreakdownProps> = ({
  selectedLot,
  sim,
  selectedYear,
  onSelectYear,
  activeFspTier,
  ptDiscount,
  fspDiscountRate,
}) => {
  const lotY1 = sim.byLotAndYear[selectedLot.id].y1;
  const lotY2 = sim.byLotAndYear[selectedLot.id].y2;
  const lotY3 = sim.byLotAndYear[selectedLot.id].y3;
  const lotSim = sim.byLotAndYear[selectedLot.id][selectedYear];

  const lot3YHybridUsd =
    lotY1.annualCostsFspUsd[activeFspTier].hybridTotalUsd +
    lotY2.annualCostsFspUsd[activeFspTier].hybridTotalUsd +
    lotY3.annualCostsFspUsd[activeFspTier].hybridTotalUsd;

  const lot3YPurePayGoUsd =
    lotY1.annualCostsFspUsd[activeFspTier].purePayGoUsd +
    lotY2.annualCostsFspUsd[activeFspTier].purePayGoUsd +
    lotY3.annualCostsFspUsd[activeFspTier].purePayGoUsd;

  const lot3YPtCostUsd =
    lotY1.annualCostsListUsd.ptGsuAnnualCostUsd +
    lotY2.annualCostsListUsd.ptGsuAnnualCostUsd +
    lotY3.annualCostsListUsd.ptGsuAnnualCostUsd;

  const lot3YVarCostUsd = Math.max(0, lot3YHybridUsd - lot3YPtCostUsd);
  const lot3YTokensM =
    lotY1.totalTokensM + lotY2.totalTokensM + lotY3.totalTokensM;

  return (
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
            {(
              [
                { yr: 'y1' as YearKey, label: 'Year 1 (2027)', res: lotY1 },
                { yr: 'y2' as YearKey, label: 'Year 2 (2028)', res: lotY2 },
                { yr: 'y3' as YearKey, label: 'Year 3 (2029)', res: lotY3 },
              ]
            ).map(({ yr, label, res }) => {
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
                  <td className="px-4 type-data-cell font-medium">{label}</td>
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
              Real-time traffic routing split (
              {selectedYear === 'y1'
                ? 'Year 1'
                : selectedYear === 'y2'
                ? 'Year 2'
                : 'Year 3'}
              )
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
              width: `${lotSim.realtimeRouting.ptCoveredFraction * 100}%`,
              backgroundColor: 'var(--md-chart-1)',
            }}
            title="Covered by Provisioned Throughput"
          />
          <div
            style={{
              width: `${lotSim.realtimeRouting.standardPayGoFraction * 100}%`,
              backgroundColor: 'var(--md-chart-2)',
            }}
            title="Standard PayGo burst spillover"
          />
          <div
            style={{
              width: `${lotSim.realtimeRouting.priorityPayGoFraction * 100}%`,
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
              {formatPct(lotSim.realtimeRouting.standardPayGoFraction, 1)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-[10px] h-[10px] rounded-[4px]"
              style={{ backgroundColor: 'var(--md-chart-3)' }}
            />
            <span>
              Priority 1.8× burst:{' '}
              {formatPct(lotSim.realtimeRouting.priorityPayGoFraction, 1)}
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
  );
};
