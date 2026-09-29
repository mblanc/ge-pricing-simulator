import React, { useState } from 'react';
import {
  Check,
  Table2,
  Calendar,
  Activity,
  Sparkles,
  RotateCcw,
  DollarSign,
  Globe2,
  Sliders,
} from 'lucide-react';
import {
  CapacityRampMode,
  DEFAULT_GLOBAL_CONFIG,
  DEFAULT_LOTS,
  ENDPOINT_LOCATION_SPECS,
  EndpointLocation,
  EU_GSU_MONTHLY_PRICE_USD,
  GlobalSimConfig,
  GsuCommitTerm,
  LotConfig,
  PtSizingMode,
} from '../data/rfqDefaults';
import { FullSimulationOutput, YearKey } from '../engine/simulator';
import { HeaderKpis, SelectedKpiId } from './HeaderKpis';
import { TcoComparisonTable } from './TcoComparisonTable';
import { MonthlyRampChart } from './MonthlyRampChart';
import { TrafficSeasonalityChart } from './TrafficSeasonalityChart';
import {
  formatCurrencyExact,
  formatPct,
  formatTokensMillions,
} from '../utils/format';

interface GlobalSimulationTabProps {
  lots: LotConfig[];
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

type GlobalVisualView = 'comparison' | 'ramp' | 'seasonality';

export const GlobalSimulationTab: React.FC<GlobalSimulationTabProps> = ({
  lots,
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
  const [visualView, setVisualView] = useState<GlobalVisualView>('seasonality');

  // Compute global tokenomics state across text lots (Lots 1-3) and all lots
  const firstGoogleShare = lots[0]?.googleShare ?? 1.0;
  const isUniformGoogleShare = lots.every(
    (l) => Math.abs((l.googleShare ?? 1.0) - firstGoogleShare) < 0.001
  );

  const textLots = lots.filter((l) => l.id !== 'lot4');
  const firstInputRatio = textLots[0]?.inputRatio ?? 0.8;
  const isUniformInputRatio = textLots.every(
    (l) => Math.abs(l.inputRatio - firstInputRatio) < 0.001
  );

  const firstCacheRatio = lots[0]?.cacheRatio ?? 0.15;
  const isUniformCacheRatio = lots.every(
    (l) => Math.abs(l.cacheRatio - firstCacheRatio) < 0.001
  );

  const firstBatchRatio = lots[0]?.batchRatio ?? 0.0;
  const isUniformBatchRatio = lots.every(
    (l) => Math.abs(l.batchRatio - firstBatchRatio) < 0.001
  );

  const firstEndpoint: EndpointLocation = lots[0]?.endpointLocation ?? 'eu';
  const isUniformEndpoint = lots.every(
    (l) => (l.endpointLocation ?? 'eu') === firstEndpoint
  );

  const applyGlobalEndpoint = (locKey: EndpointLocation) => {
    const spec = ENDPOINT_LOCATION_SPECS[locKey];
    onChangeAllLots(
      lots.map((l) => ({
        ...l,
        endpointLocation: locKey,
        region: spec.regionDisplay,
      }))
    );
  };

  const applyGlobalGoogleShare = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    onChangeAllLots(
      lots.map((l) => {
        const def = DEFAULT_LOTS.find((d) => d.id === l.id);
        return {
          ...l,
          googleShare: clamped,
          manualGsus:
            l.ptSizingMode === 'MANUAL' && def
              ? {
                  y1: Math.round(def.manualGsus.y1 * clamped),
                  y2: Math.round(def.manualGsus.y2 * clamped),
                  y3: Math.round(def.manualGsus.y3 * clamped),
                }
              : l.manualGsus,
        };
      })
    );
  };

  const applyGlobalInputRatio = (val: number) => {
    // Apply to text lots (Lots 1, 2, 3); Lot 4 is an image generation lot (5% prompt / 95% image output)
    onChangeAllLots(
      lots.map((l) => (l.id === 'lot4' ? l : { ...l, inputRatio: val }))
    );
  };

  const applyGlobalCacheRatio = (val: number) => {
    onChangeAllLots(lots.map((l) => ({ ...l, cacheRatio: val })));
  };

  const applyGlobalBatchRatio = (val: number) => {
    onChangeAllLots(lots.map((l) => ({ ...l, batchRatio: val })));
  };

  // One-click business scenario presets
  const applyScenarioPreset = (
    preset: 'RECOMMENDED_HYBRID' | 'CONSERVATIVE_BASELINE' | 'PURE_PAYGO'
  ) => {
    if (preset === 'RECOMMENDED_HYBRID') {
      onSelectFspTier('threeYearFsp');
      onChangeGlobalConfig({
        ...globalConfig,
        gsuCommitTerm: '1_YEAR',
        capacityRampMode: 'SMOOTH_MONTHLY',
        fspDiscounts: {
          ...globalConfig.fspDiscounts,
          threeYearCommitDiscount: 0.2,
          ptDiscount: 0.2,
        },
      });
      onChangeAllLots(
        lots.map((l) => {
          const def = DEFAULT_LOTS.find((d) => d.id === l.id);
          return {
            ...l,
            ptSizingMode: 'OPTIMAL_TCO',
            cacheRatio: def ? def.cacheRatio : l.cacheRatio,
            batchRatio: def ? def.batchRatio : l.batchRatio,
          };
        })
      );
    } else if (preset === 'CONSERVATIVE_BASELINE') {
      onSelectFspTier('threeYearFsp');
      onChangeGlobalConfig(structuredClone(DEFAULT_GLOBAL_CONFIG));
      onChangeAllLots(structuredClone(DEFAULT_LOTS));
    } else if (preset === 'PURE_PAYGO') {
      onChangeAllLots(
        lots.map((l) => ({
          ...l,
          ptSizingMode: 'NONE',
        }))
      );
    }
  };

  const ptDiscount = globalConfig.fspDiscounts.ptDiscount ?? 0.2;
  const activeRampMode: CapacityRampMode =
    globalConfig.capacityRampMode ?? 'SMOOTH_MONTHLY';

  const googleSharePct = Math.round(firstGoogleShare * 100);
  const inputPct = Math.round(firstInputRatio * 100);
  const outputPct = 100 - inputPct;
  const cachePct = Math.round(firstCacheRatio * 100);
  const batchPct = Math.round(firstBatchRatio * 100);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          PART 1: RESULTS (TOP) — Executive KPIs + Single Unified Visual Card
          ===================================================================== */}
      <section aria-label="Global simulation results" className="space-y-5">
        <HeaderKpis
          sim={sim}
          globalConfig={globalConfig}
          onChangeGlobalConfig={onChangeGlobalConfig}
          activeFspTier={activeFspTier}
          onSelectFspTier={onSelectFspTier}
          onApplyGlobalPtMode={onApplyGlobalPtMode}
          currentGlobalPtMode={currentGlobalPtMode}
          selectedKpi={selectedKpi}
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

        {/* Single Unified Results & Chart Card with 3-Way Switcher */}
        <div className="md-card overflow-hidden">
          <div className="px-6 py-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="type-title-md text-[var(--md-on-surface)]">
                Global results & financial breakdown (all 4 lots combined)
              </h2>
              <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                Switch between the weekly hourly traffic routing profile, the 36-month capacity & spend ramp, or the 3-year commercial summary.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Select global result visualization"
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
            {visualView === 'comparison' && (
              <TcoComparisonTable
                sim={sim}
                lots={lots}
                globalConfig={globalConfig}
                activeFspTier={activeFspTier}
                embedded
              />
            )}

            {visualView === 'ramp' && (
              <MonthlyRampChart
                lots={lots}
                globalConfig={globalConfig}
                sim={sim}
                selectedTier={activeFspTier}
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
                selectedKpi={selectedKpi}
                embedded
              />
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          PART 2: UNIFIED GLOBAL VARIABLES PANEL (BELOW RESULTS)
          Impacts all 4 lots simultaneously
          ===================================================================== */}
      <section
        aria-label="Global simulation variables affecting all lots"
        className="md-card p-6 space-y-6"
      >
        {/* Header + One-Click Business Scenario Presets */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-[var(--md-outline-variant)]">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[var(--md-primary)] shrink-0" />
              <h2 className="type-title-lg text-[var(--md-on-surface)]">
                Global simulation variables (applies to all 4 lots)
              </h2>
            </div>
            <p className="type-body-md text-[var(--md-on-surface-variant)] max-w-[74ch] mt-0.5">
              Adjust commercial discounts, reserved capacity sizing, and workload optimizations below. Every change here updates all 4 lots at once.
            </p>
          </div>

          {/* One-Click Business Scenario Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-label-md text-[var(--md-on-surface-variant)] mr-1">
              Quick scenarios:
            </span>
            <button
              type="button"
              onClick={() => applyScenarioPreset('RECOMMENDED_HYBRID')}
              className="md-btn-tonal cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Recommended 3Y hybrid</span>
            </button>
            <button
              type="button"
              onClick={() => applyScenarioPreset('CONSERVATIVE_BASELINE')}
              className="md-chip-filter cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RFQ baseline (24/7 floor)</span>
            </button>
            <button
              type="button"
              onClick={() => applyScenarioPreset('PURE_PAYGO')}
              className={`${
                currentGlobalPtMode === 'NONE'
                  ? 'md-chip-filter-selected'
                  : 'md-chip-filter'
              } cursor-pointer`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>100% PayGo (0 GSUs)</span>
            </button>
          </div>
        </div>

        {/* 3-Column Variable Groups Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GROUP 1: Commercial Terms & Discounts */}
          <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="type-title-md text-[var(--md-on-surface)]">
                  Commercial commitment & discounts
                </h3>
                <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                  Contractual discount tiers for variable PayGo and fixed PT capacity
                </p>
              </div>

              {/* 1A. FSP Commitment Tier & PayGo Discount % */}
              <div className="space-y-2">
                <div>
                  <div className="type-label-lg text-[var(--md-on-surface)]">
                    FSP commitment tier & PayGo discount (%)
                  </div>
                  <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                    Multi-year spend commitment discounting on-demand overflow & batch
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Option A */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-[8px] bg-[var(--md-surface-container-lowest)]">
                    <button
                      type="button"
                      onClick={() => onSelectFspTier('uncommitted')}
                      aria-pressed={activeFspTier === 'uncommitted'}
                      className={`${
                        activeFspTier === 'uncommitted'
                          ? 'md-chip-filter-selected'
                          : 'md-chip-filter'
                      } cursor-pointer`}
                    >
                      {activeFspTier === 'uncommitted' && (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>Option A: Uncommitted</span>
                    </button>
                    <label className="inline-flex items-center gap-1 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                      <span>-</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        aria-label="Option A Uncommitted PayGo discount percentage"
                        value={Math.round(
                          (globalConfig.fspDiscounts.uncommittedDiscount ?? 0) *
                            100
                        )}
                        onChange={(e) => {
                          const pct = Math.max(
                            0,
                            Math.min(60, Number(e.target.value))
                          );
                          onChangeGlobalConfig({
                            ...globalConfig,
                            fspDiscounts: {
                              ...globalConfig.fspDiscounts,
                              uncommittedDiscount: pct / 100,
                            },
                          });
                        }}
                        className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-md tabular-nums"
                      />
                      <span>% PayGo</span>
                    </label>
                  </div>

                  {/* Option B */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-[8px] bg-[var(--md-surface-container-lowest)]">
                    <button
                      type="button"
                      onClick={() => onSelectFspTier('oneYearFsp')}
                      aria-pressed={activeFspTier === 'oneYearFsp'}
                      className={`${
                        activeFspTier === 'oneYearFsp'
                          ? 'md-chip-filter-selected'
                          : 'md-chip-filter'
                      } cursor-pointer`}
                    >
                      {activeFspTier === 'oneYearFsp' && (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>Option B: 1-year FSP</span>
                    </button>
                    <label className="inline-flex items-center gap-1 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                      <span>-</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        aria-label="Option B 1-year FSP PayGo discount percentage"
                        value={Math.round(
                          globalConfig.fspDiscounts.oneYearCommitDiscount * 100
                        )}
                        onChange={(e) => {
                          const pct = Math.max(
                            0,
                            Math.min(60, Number(e.target.value))
                          );
                          onChangeGlobalConfig({
                            ...globalConfig,
                            fspDiscounts: {
                              ...globalConfig.fspDiscounts,
                              oneYearCommitDiscount: pct / 100,
                            },
                          });
                        }}
                        className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-md tabular-nums"
                      />
                      <span>% PayGo</span>
                    </label>
                  </div>

                  {/* Option C */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-[8px] bg-[var(--md-surface-container-lowest)]">
                    <button
                      type="button"
                      onClick={() => onSelectFspTier('threeYearFsp')}
                      aria-pressed={activeFspTier === 'threeYearFsp'}
                      className={`${
                        activeFspTier === 'threeYearFsp'
                          ? 'md-chip-filter-selected'
                          : 'md-chip-filter'
                      } cursor-pointer`}
                    >
                      {activeFspTier === 'threeYearFsp' && (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>Option C: 3-year FSP</span>
                    </button>
                    <label className="inline-flex items-center gap-1 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                      <span>-</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        aria-label="Option C 3-year FSP PayGo discount percentage"
                        value={Math.round(
                          globalConfig.fspDiscounts.threeYearCommitDiscount *
                            100
                        )}
                        onChange={(e) => {
                          const pct = Math.max(
                            0,
                            Math.min(60, Number(e.target.value))
                          );
                          onChangeGlobalConfig({
                            ...globalConfig,
                            fspDiscounts: {
                              ...globalConfig.fspDiscounts,
                              threeYearCommitDiscount: pct / 100,
                            },
                          });
                        }}
                        className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-md tabular-nums"
                      />
                      <span>% PayGo</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 1B. Provisioned Throughput (PT GSU) Commercial Discount */}
              <div className="pt-3 border-t border-[var(--md-outline-variant)] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <label
                      htmlFor="global-pt-discount-input"
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      PT GSU commercial discount (%)
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Discount on fixed monthly reserved capacity subscriptions
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1 type-body-sm tabular-nums shrink-0">
                    <span>-</span>
                    <input
                      id="global-pt-discount-input"
                      type="number"
                      min={0}
                      max={70}
                      step={1}
                      value={Math.round(ptDiscount * 100)}
                      onChange={(e) => {
                        const pct = Math.max(
                          0,
                          Math.min(70, Number(e.target.value))
                        );
                        onChangeGlobalConfig({
                          ...globalConfig,
                          fspDiscounts: {
                            ...globalConfig.fspDiscounts,
                            ptDiscount: pct / 100,
                          },
                        });
                      }}
                      className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-md tabular-nums"
                    />
                    <span>% PT</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  aria-label="PT GSU discount percentage slider"
                  value={Math.round(ptDiscount * 100)}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    onChangeGlobalConfig({
                      ...globalConfig,
                      fspDiscounts: {
                        ...globalConfig.fspDiscounts,
                        ptDiscount: pct / 100,
                      },
                    });
                  }}
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
              </div>
            </div>

            {/* 1C. GSU Commit Term */}
            <div className="pt-3 border-t border-[var(--md-outline-variant)] space-y-2">
              <div>
                <div className="type-label-lg text-[var(--md-on-surface)]">
                  GSU commit term
                </div>
                <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                  Subscription duration per reserved GSU unit (net EU/US rate shown)
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    {
                      id: '1_YEAR',
                      label: `1-year ($${Math.round(
                        EU_GSU_MONTHLY_PRICE_USD['1_YEAR'] * (1 - ptDiscount)
                      ).toLocaleString()}/mo)`,
                    },
                    {
                      id: '3_MONTH',
                      label: `3-month ($${Math.round(
                        EU_GSU_MONTHLY_PRICE_USD['3_MONTH'] * (1 - ptDiscount)
                      ).toLocaleString()}/mo)`,
                    },
                    {
                      id: '1_MONTH',
                      label: `Monthly ($${Math.round(
                        EU_GSU_MONTHLY_PRICE_USD['1_MONTH'] * (1 - ptDiscount)
                      ).toLocaleString()}/mo)`,
                    },
                  ] as { id: GsuCommitTerm; label: string }[]
                ).map((term) => {
                  const selected = globalConfig.gsuCommitTerm === term.id;
                  return (
                    <button
                      key={term.id}
                      type="button"
                      onClick={() =>
                        onChangeGlobalConfig({
                          ...globalConfig,
                          gsuCommitTerm: term.id,
                        })
                      }
                      aria-pressed={selected}
                      className={`${
                        selected ? 'md-chip-filter-selected' : 'md-chip-filter'
                      } cursor-pointer`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span>{term.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GROUP 2: Capacity & Traffic Strategy */}
          <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="type-title-md text-[var(--md-on-surface)]">
                  Capacity & traffic strategy
                </h3>
                <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                  Reserved throughput sizing, monthly scaling, and regional deployment
                </p>
              </div>

              {/* 2A. Global PT Sizing Strategy */}
              <div className="space-y-2">
                <div>
                  <div className="type-label-lg text-[var(--md-on-surface)]">
                    Provisioned Throughput (PT) sizing mode
                  </div>
                  <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                    How much traffic to cover with fixed monthly GSUs vs PayGo overflow
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(
                    [
                      {
                        mode: 'OPTIMAL_TCO',
                        label: 'Optimal TCO (~75% util)',
                        desc: 'Lowest total cost',
                      },
                      {
                        mode: 'MIN_FLOOR',
                        label: '24/7 minimum floor',
                        desc: '100% utilized base',
                      },
                      {
                        mode: 'DAYTIME_FLOOR',
                        label: 'Daytime floor',
                        desc: 'Covers business hours',
                      },
                      {
                        mode: 'NONE',
                        label: '0 GSUs (No PT)',
                        desc: '100% variable PayGo',
                      },
                    ] as { mode: PtSizingMode; label: string; desc: string }[]
                  ).map((item) => {
                    const isSelected = currentGlobalPtMode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => onApplyGlobalPtMode(item.mode)}
                        aria-pressed={isSelected}
                        className={`p-2.5 rounded-[8px] text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                            : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                        }`}
                      >
                        <div className="type-label-md flex items-center justify-between gap-1">
                          <span>{item.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                        <div className="type-body-sm opacity-80 mt-0.5">
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2B. 36-Month Capacity Ramp Mode */}
              <div className="pt-3 border-t border-[var(--md-outline-variant)] space-y-2">
                <div>
                  <div className="type-label-lg text-[var(--md-on-surface)]">
                    36-month GSU capacity ramp mode
                  </div>
                  <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                    Scale reserved GSUs month-by-month (M1–M36) vs 3 yearly steps
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGlobalConfig({
                        ...globalConfig,
                        capacityRampMode: 'SMOOTH_MONTHLY',
                      })
                    }
                    aria-pressed={activeRampMode === 'SMOOTH_MONTHLY'}
                    className={`${
                      activeRampMode === 'SMOOTH_MONTHLY'
                        ? 'md-chip-filter-selected'
                        : 'md-chip-filter'
                    } cursor-pointer`}
                  >
                    {activeRampMode === 'SMOOTH_MONTHLY' && (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Progressive monthly ramp (M1–M36)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGlobalConfig({
                        ...globalConfig,
                        capacityRampMode: 'ANNUAL_STEPS',
                      })
                    }
                    aria-pressed={activeRampMode === 'ANNUAL_STEPS'}
                    className={`${
                      activeRampMode === 'ANNUAL_STEPS'
                        ? 'md-chip-filter-selected'
                        : 'md-chip-filter'
                    } cursor-pointer`}
                  >
                    {activeRampMode === 'ANNUAL_STEPS' && (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>3 annual step plateaus (Y1 / Y2 / Y3)</span>
                  </button>
                </div>
              </div>

              {/* 2C. Global Endpoint Location */}
              <div className="pt-3 border-t border-[var(--md-outline-variant)] space-y-2">
                <div>
                  <div className="type-label-lg text-[var(--md-on-surface)] flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-[var(--md-primary)]" />
                    <span>Endpoint location (all 4 lots)</span>
                  </div>
                  <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                    Data residency & regional pricing multiplier (EU/US +10% vs Global 1.00×)
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['eu', 'global', 'us'] as EndpointLocation[]).map(
                    (locKey) => {
                      const spec = ENDPOINT_LOCATION_SPECS[locKey];
                      const selected =
                        isUniformEndpoint && firstEndpoint === locKey;
                      return (
                        <button
                          key={locKey}
                          type="button"
                          onClick={() => applyGlobalEndpoint(locKey)}
                          aria-pressed={selected}
                          className={`${
                            selected
                              ? 'md-chip-filter-selected'
                              : 'md-chip-filter'
                          } cursor-pointer`}
                        >
                          {selected && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{spec.shortLabel}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            {/* 2D. Traffic Seasonality Profile */}
            <div className="pt-3 border-t border-[var(--md-outline-variant)] space-y-2">
              <div>
                <div className="type-label-lg text-[var(--md-on-surface)]">
                  Traffic seasonality profile (168-hour week)
                </div>
                <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                  Customer activity pattern determining daytime peak vs nighttime floor
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    {
                      preset: 'PUBLIC_CONSUMER_BOT',
                      label: 'Public consumer bot',
                      night: 0.22,
                      wknd: 0.75,
                      amp: 1.0,
                    },
                    {
                      preset: 'B2B_CUSTOMER_CARE',
                      label: 'Daytime customer care',
                      night: 0.08,
                      wknd: 0.35,
                      amp: 1.25,
                    },
                    {
                      preset: 'FLAT_24_7',
                      label: 'Flat 24/7 steady',
                      night: 0.9,
                      wknd: 0.95,
                      amp: 0.15,
                    },
                  ] as const
                ).map((p) => {
                  const isSelected =
                    globalConfig.seasonality.preset === p.preset;
                  return (
                    <button
                      key={p.preset}
                      type="button"
                      onClick={() =>
                        onChangeGlobalConfig({
                          ...globalConfig,
                          seasonality: {
                            preset: p.preset,
                            nighttimeFloorRatio: p.night,
                            weekendToWeekdayRatio: p.wknd,
                            peakAmplitude: p.amp,
                          },
                        })
                      }
                      aria-pressed={isSelected}
                      className={`${
                        isSelected
                          ? 'md-chip-filter-selected'
                          : 'md-chip-filter'
                      } cursor-pointer`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GROUP 3: Global Workload & Tokenomics Levers */}
          <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="type-title-md text-[var(--md-on-surface)]">
                  Global workload & tokenomics
                </h3>
                <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                  Google share of volume, prompt ratios, caching, and batch processing across all lots
                </p>
              </div>

              {/* 3A. % of Tokens Served by Google */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div className="flex items-start justify-between gap-2 tabular-nums">
                  <div>
                    <label
                      htmlFor="global-google-share"
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      % of tokens served by Google
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Share of total RFQ token volume routed to Google Gemini models (all 4 lots)
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={googleSharePct}
                      aria-label="Global percentage of tokens served by Google"
                      onChange={(e) => {
                        const pct = Math.max(
                          0,
                          Math.min(100, Number(e.target.value))
                        );
                        applyGlobalGoogleShare(pct / 100);
                      }}
                      className="w-14 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-body-sm tabular-nums"
                    />
                    <span className="type-label-lg text-[var(--md-primary)]">
                      {isUniformGoogleShare ? '%' : '% (Mixed)'}
                    </span>
                  </div>
                </div>
                <input
                  id="global-google-share"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={firstGoogleShare}
                  onChange={(e) =>
                    applyGlobalGoogleShare(Number(e.target.value))
                  }
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                    {formatTokensMillions(sim.threeYearCumulated.totalTokensM)} served by Google (3Y)
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
                        onClick={() => applyGlobalGoogleShare(opt.val)}
                        className="px-2 py-0.5 rounded bg-[var(--md-surface-container)] hover:bg-[var(--md-secondary-container)] type-body-sm text-[var(--md-on-surface)] cursor-pointer transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3B. Input / Output Token Split */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div className="flex items-start justify-between gap-2 tabular-nums">
                  <div>
                    <label
                      htmlFor="global-input-ratio"
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      Input / Output token split
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Prompt context length vs generated response length (Lots 1–3)
                    </div>
                  </div>
                  <span className="type-label-lg text-[var(--md-primary)] shrink-0">
                    {isUniformInputRatio ? `${inputPct}/${outputPct}%` : 'Mixed'}
                  </span>
                </div>
                <input
                  id="global-input-ratio"
                  type="range"
                  min={0.2}
                  max={0.95}
                  step={0.05}
                  value={firstInputRatio}
                  onChange={(e) => applyGlobalInputRatio(Number(e.target.value))}
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                    {inputPct}% Input · {outputPct}% Output
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '80/20%', val: 0.8 },
                      { label: '70/30%', val: 0.7 },
                      { label: '50/50%', val: 0.5 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => applyGlobalInputRatio(opt.val)}
                        className="px-2 py-0.5 rounded bg-[var(--md-surface-container)] hover:bg-[var(--md-secondary-container)] type-body-sm text-[var(--md-on-surface)] cursor-pointer transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3B. Context Caching Hit Rate (-90%) */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div className="flex items-start justify-between gap-2 tabular-nums">
                  <div>
                    <label
                      htmlFor="global-cache-ratio"
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      Context caching hit rate (-90%)
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Repeated prompt input served from memory at 90% discount
                    </div>
                  </div>
                  <span className="type-label-lg text-[var(--md-primary)] shrink-0">
                    {isUniformCacheRatio ? `${cachePct}%` : 'Mixed'}
                  </span>
                </div>
                <input
                  id="global-cache-ratio"
                  type="range"
                  min={0}
                  max={0.9}
                  step={0.05}
                  value={firstCacheRatio}
                  onChange={(e) => applyGlobalCacheRatio(Number(e.target.value))}
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                    {cachePct}% Cached · {100 - cachePct}% Non-cached
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '0%', val: 0.0 },
                      { label: '15%', val: 0.15 },
                      { label: '35%', val: 0.35 },
                      { label: '60%', val: 0.6 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => applyGlobalCacheRatio(opt.val)}
                        className="px-2 py-0.5 rounded bg-[var(--md-surface-container)] hover:bg-[var(--md-secondary-container)] type-body-sm text-[var(--md-on-surface)] cursor-pointer transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3C. Async Batch Offload (-50%) */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2">
                <div className="flex items-start justify-between gap-2 tabular-nums">
                  <div>
                    <label
                      htmlFor="global-batch-ratio"
                      className="type-label-lg text-[var(--md-on-surface)]"
                    >
                      Async Batch API offload (-50%)
                    </label>
                    <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                      Non-urgent background tasks processed within 24h at half price
                    </div>
                  </div>
                  <span className="type-label-lg text-[var(--md-primary)] shrink-0">
                    {isUniformBatchRatio ? `${batchPct}%` : 'Mixed'}
                  </span>
                </div>
                <input
                  id="global-batch-ratio"
                  type="range"
                  min={0}
                  max={0.7}
                  step={0.05}
                  value={firstBatchRatio}
                  onChange={(e) => applyGlobalBatchRatio(Number(e.target.value))}
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                    {batchPct}% Batch · {100 - batchPct}% Real-time
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '0%', val: 0.0 },
                      { label: '15%', val: 0.15 },
                      { label: '30%', val: 0.3 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => applyGlobalBatchRatio(opt.val)}
                        className="px-2 py-0.5 rounded bg-[var(--md-surface-container)] hover:bg-[var(--md-secondary-container)] type-body-sm text-[var(--md-on-surface)] cursor-pointer transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3D. Thinking Token Budget Envelope */}
            <div className="pt-3 border-t border-[var(--md-outline-variant)] space-y-2">
              <div>
                <label
                  htmlFor="global-thinking-envelope"
                  className="type-label-lg text-[var(--md-on-surface)]"
                >
                  Thinking token budget mode (Lots 1 & 2)
                </label>
                <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                  Whether reasoning tokens stay inside the RFQ output cap or add extra volume
                </div>
              </div>
              <select
                id="global-thinking-envelope"
                value={globalConfig.thinkingEnvelopeMode}
                onChange={(e) =>
                  onChangeGlobalConfig({
                    ...globalConfig,
                    thinkingEnvelopeMode: e.target.value as
                      | 'ADD_ON_TOP'
                      | 'FIXED_TOTAL',
                  })
                }
                className="w-full h-[38px] px-3 rounded-[8px] bg-[var(--md-surface-container-lowest)] border border-[var(--md-outline)] text-[var(--md-on-surface)] type-body-md cursor-pointer"
              >
                <option value="FIXED_TOTAL">
                  Keep RFQ token cap fixed (thinking included inside output budget)
                </option>
                <option value="ADD_ON_TOP">
                  Add extra thinking tokens on top of output (+total volume)
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="pt-3 border-t border-[var(--md-outline-variant)] flex flex-wrap items-center justify-between gap-2 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
          <span>
            Active 0-GSU (No PT) PayGo baseline in selected tier:{' '}
            <strong className="text-[var(--md-on-surface)]">
              {formatCurrencyExact(
                sim.threeYearCumulated[activeFspTier].purePayGoUsd
              )}
            </strong>{' '}
            · Active hybrid 3-year TCO:{' '}
            <strong className="text-[var(--md-primary)]">
              {formatCurrencyExact(
                sim.threeYearCumulated[activeFspTier].hybridTotalUsd
              )}
            </strong>
          </span>
          <span>
            Break-even GSU utilization threshold:{' '}
            <strong className="text-[var(--md-on-surface)]">
              {formatPct(sim.avgBreakEvenUtilization, 1)}
            </strong>
          </span>
        </div>
      </section>
    </div>
  );
};
