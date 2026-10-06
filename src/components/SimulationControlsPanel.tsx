import React, { useMemo, useState } from 'react';
import {
  Check,
  Cpu,
  DollarSign,
  Globe2,
  Layers,
  Link2,
  Percent,
  RotateCcw,
  Sliders,
  Sparkles,
  TrendingUp,
  Wand2,
} from 'lucide-react';
import {
  CapacityRampMode,
  DEFAULT_GLOBAL_CONFIG,
  DEFAULT_LOTS,
  ENDPOINT_LOCATION_SPECS,
  EndpointLocation,
  EU_GSU_MONTHLY_PRICE_USD,
  formatLot1DisplayName,
  getLot4BlendedEuSpecs,
  getLotEffectiveGsuMonthlyPriceUsd,
  getLotEffectivePricesPer1M,
  GlobalSimConfig,
  GsuCommitTerm,
  LOT1_MODEL_PRESETS,
  Lot1ModelId,
  LotConfig,
  PtSizingMode,
  SeasonalityConfig,
  SeasonalityPreset,
  ThinkingEnvelopeMode,
  ThinkingLevel,
} from '../data/rfqDefaults';
import {
  FullSimulationOutput,
  runFullSimulation,
  YearKey,
} from '../engine/simulator';
import {
  formatCurrencyMillions,
  formatTokensMillions,
} from '../utils/format';

export type SimulatorScope = 'all' | LotConfig['id'];
type ConfigTabId = 'traffic' | 'models' | 'capacity' | 'discounts';

interface SimulationControlsPanelProps {
  activeScope: SimulatorScope;
  lots: LotConfig[];
  onChangeLot: (updated: LotConfig) => void;
  onChangeAllLots: (nextLots: LotConfig[]) => void;
  globalConfig: GlobalSimConfig;
  onChangeGlobalConfig: (next: GlobalSimConfig) => void;
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
  onSelectFspTier: (tier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp') => void;
  selectedYear: YearKey;
  onSelectYear: (yr: YearKey) => void;
  sim: FullSimulationOutput;
}

const SEASONALITY_PRESETS: Array<{
  preset: SeasonalityPreset;
  label: string;
  desc: string;
  night: number;
  wknd: number;
  amp: number;
}> = [
  {
    preset: 'PUBLIC_CONSUMER_BOT',
    label: 'Public consumer bot (B2C)',
    desc: '22% night floor · 75% weekend · evening peak',
    night: 0.22,
    wknd: 0.75,
    amp: 1.0,
  },
  {
    preset: 'B2B_CUSTOMER_CARE',
    label: 'Daytime customer care (B2B)',
    desc: '8% night floor · 35% weekend · 9–5 business peak',
    night: 0.08,
    wknd: 0.35,
    amp: 1.25,
  },
  {
    preset: 'FLAT_24_7',
    label: 'Flat 24/7 steady',
    desc: '100% constant load all week (no peaks)',
    night: 1.0,
    wknd: 1.0,
    amp: 0.0,
  },
];

export const SimulationControlsPanel: React.FC<
  SimulationControlsPanelProps
> = ({
  activeScope,
  lots,
  onChangeLot,
  onChangeAllLots,
  globalConfig,
  onChangeGlobalConfig,
  activeFspTier,
  onSelectFspTier,
  selectedYear,
  onSelectYear,
  sim,
}) => {
  const [activeConfigTab, setActiveConfigTab] =
    useState<ConfigTabId>('traffic');
  const [scaleYearsProportionally, setScaleYearsProportionally] =
    useState<boolean>(true);
  const [magicOptimizeBanner, setMagicOptimizeBanner] = useState<string | null>(
    null
  );

  const isGlobal = activeScope === 'all';
  const selectedLot = !isGlobal
    ? lots.find((l) => l.id === activeScope) ?? lots[0]
    : null;

  const updateTargetLots = (updater: (lot: LotConfig) => LotConfig) => {
    if (isGlobal) {
      onChangeAllLots(lots.map(updater));
    } else if (selectedLot) {
      onChangeLot(updater(selectedLot));
    }
  };

  // =========================================================================
  // EFFECTIVE VALUES & UNIFORMITY DETECTION (Global vs Per-Lot)
  // =========================================================================
  const firstEndpoint: EndpointLocation =
    (selectedLot ? selectedLot.endpointLocation : lots[0]?.endpointLocation) ??
    'eu';
  const isUniformEndpoint =
    !isGlobal ||
    lots.every((l) => (l.endpointLocation ?? 'eu') === firstEndpoint);

  const firstPtMode: PtSizingMode = selectedLot
    ? selectedLot.ptSizingMode
    : lots[0]?.ptSizingMode ?? 'MIN_FLOOR';
  const activePtMode: PtSizingMode | 'MIXED' =
    !isGlobal || lots.every((l) => l.ptSizingMode === firstPtMode)
      ? firstPtMode
      : 'MIXED';

  const getLotCommitTerm = (l: LotConfig): GsuCommitTerm =>
    l.gsuCommitTerm ?? globalConfig.gsuCommitTerm;
  const activeCommitTerm: GsuCommitTerm = selectedLot
    ? getLotCommitTerm(selectedLot)
    : getLotCommitTerm(lots[0]);
  const isUniformCommitTerm =
    !isGlobal || lots.every((l) => getLotCommitTerm(l) === activeCommitTerm);

  const getLotRampMode = (l: LotConfig): CapacityRampMode =>
    l.capacityRampMode ?? globalConfig.capacityRampMode ?? 'SMOOTH_MONTHLY';
  const activeRampMode: CapacityRampMode = selectedLot
    ? getLotRampMode(selectedLot)
    : getLotRampMode(lots[0]);
  const isUniformRampMode =
    !isGlobal || lots.every((l) => getLotRampMode(l) === activeRampMode);

  const getLotRetryRatio = (l: LotConfig): number =>
    l.payGoRetryToPriorityRatio ?? globalConfig.payGoRetryToPriorityRatio;
  const activeRetryRatio: number = selectedLot
    ? getLotRetryRatio(selectedLot)
    : getLotRetryRatio(lots[0]);
  const isUniformRetryRatio =
    !isGlobal ||
    lots.every((l) => Math.abs(getLotRetryRatio(l) - activeRetryRatio) < 0.001);

  const activeBatchRatio = selectedLot
    ? selectedLot.batchRatio
    : lots[0]?.batchRatio ?? 0;
  const isUniformBatchRatio =
    !isGlobal ||
    lots.every((l) => Math.abs(l.batchRatio - activeBatchRatio) < 0.001);

  const activeCacheRatio = selectedLot
    ? selectedLot.cacheRatio
    : lots[0]?.cacheRatio ?? 0.15;
  const isUniformCacheRatio =
    !isGlobal ||
    lots.every((l) => Math.abs(l.cacheRatio - activeCacheRatio) < 0.001);

  const activeGoogleShare = selectedLot
    ? selectedLot.googleShare ?? 1.0
    : lots[0]?.googleShare ?? 1.0;
  const isUniformGoogleShare =
    !isGlobal ||
    lots.every(
      (l) => Math.abs((l.googleShare ?? 1.0) - activeGoogleShare) < 0.001
    );

  const textLots = lots.filter((l) => l.id !== 'lot4');
  const activeInputRatio = selectedLot
    ? selectedLot.inputRatio
    : textLots[0]?.inputRatio ?? 0.8;
  const isUniformInputRatio =
    !isGlobal ||
    textLots.every((l) => Math.abs(l.inputRatio - activeInputRatio) < 0.001);

  const getLotSeasonality = (l: LotConfig): SeasonalityConfig =>
    l.seasonality ?? globalConfig.seasonality;
  const activeSeasonality: SeasonalityConfig = selectedLot
    ? getLotSeasonality(selectedLot)
    : getLotSeasonality(lots[0]);
  const isUniformSeasonality =
    !isGlobal ||
    lots.every(
      (l) =>
        getLotSeasonality(l).preset === activeSeasonality.preset &&
        Math.abs(
          getLotSeasonality(l).nighttimeFloorRatio -
            activeSeasonality.nighttimeFloorRatio
        ) < 0.005 &&
        Math.abs(
          getLotSeasonality(l).weekendToWeekdayRatio -
            activeSeasonality.weekendToWeekdayRatio
        ) < 0.005
    );

  const getLotThinkingEnvelope = (l: LotConfig): ThinkingEnvelopeMode =>
    l.thinkingEnvelopeMode ?? globalConfig.thinkingEnvelopeMode;
  const activeThinkingEnvelope: ThinkingEnvelopeMode = selectedLot
    ? getLotThinkingEnvelope(selectedLot)
    : getLotThinkingEnvelope(lots[0]);

  const ptDiscount = globalConfig.fspDiscounts.ptDiscount ?? 0.2;

  // =========================================================================
  // LIVE 3-YEAR COUNTERFACTUAL DOLLAR-IMPACT BADGES (Scope-Aware)
  // =========================================================================
  const impactBadges = useMemo(() => {
    const getScope3YTco = (
      s: FullSimulationOutput,
      tier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp'
    ) => {
      if (isGlobal || !selectedLot) {
        return s.threeYearCumulated[tier].hybridTotalUsd;
      }
      const lid = selectedLot.id;
      return (
        s.byLotAndYear[lid].y1.annualCostsFspUsd[tier].hybridTotalUsd +
        s.byLotAndYear[lid].y2.annualCostsFspUsd[tier].hybridTotalUsd +
        s.byLotAndYear[lid].y3.annualCostsFspUsd[tier].hybridTotalUsd
      );
    };

    const getScope3YPurePayGo = (
      s: FullSimulationOutput,
      tier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp'
    ) => {
      if (isGlobal || !selectedLot) {
        return s.threeYearCumulated[tier].purePayGoUsd;
      }
      const lid = selectedLot.id;
      return (
        s.byLotAndYear[lid].y1.annualCostsFspUsd[tier].purePayGoUsd +
        s.byLotAndYear[lid].y2.annualCostsFspUsd[tier].purePayGoUsd +
        s.byLotAndYear[lid].y3.annualCostsFspUsd[tier].purePayGoUsd
      );
    };

    const current3YTco = getScope3YTco(sim, activeFspTier);
    const sameTierZeroPtTco = getScope3YPurePayGo(sim, activeFspTier);

    const ptDeltaUsd = current3YTco - sameTierZeroPtTco;

    const globalEndpointLots = lots.map((l) => ({
      ...l,
      endpointLocation: 'global' as const,
    }));
    const globalEndpSim = runFullSimulation(
      globalEndpointLots,
      globalConfig,
      activeFspTier
    );
    const endpointDeltaUsd =
      current3YTco - getScope3YTco(globalEndpSim, activeFspTier);

    const unoptimizedLots = lots.map((l) => ({
      ...l,
      cacheRatio: 0,
      batchRatio: 0,
    }));
    const unoptimizedSim = runFullSimulation(
      unoptimizedLots,
      globalConfig,
      activeFspTier
    );
    const cacheAndBatchDeltaUsd =
      current3YTco - getScope3YTco(unoptimizedSim, activeFspTier);

    const zeroDiscountGlobal: GlobalSimConfig = {
      ...globalConfig,
      fspDiscounts: {
        uncommittedDiscount: 0,
        oneYearCommitDiscount: 0,
        threeYearCommitDiscount: 0,
        ptDiscount: 0,
      },
    };
    const zeroDiscSim = runFullSimulation(
      lots,
      zeroDiscountGlobal,
      'uncommitted'
    );
    const commercialDiscountDeltaUsd =
      current3YTco - getScope3YTco(zeroDiscSim, 'uncommitted');

    return {
      ptDeltaUsd,
      endpointDeltaUsd,
      cacheAndBatchDeltaUsd,
      commercialDiscountDeltaUsd,
    };
  }, [lots, globalConfig, activeFspTier, sim, isGlobal, selectedLot]);

  // Scope-aware GSU demand & provisioned metrics for the selected year
  const scopeGsuMetrics = (() => {
    if (isGlobal) {
      const lotIds = ['lot1', 'lot2', 'lot3', 'lot4'] as const;
      let provisioned = 0;
      let minFloor = 0;
      let optimal = 0;
      let peak = 0;
      let breakEvenWeighted = 0;
      let totalTok = 0;
      for (const lid of lotIds) {
        const r = sim.byLotAndYear[lid][selectedYear];
        provisioned += r.provisionedGsus;
        minFloor += r.minHourlyGsuDemand;
        optimal += r.optimalTcoGsuDemand;
        peak += r.peakHourlyGsuDemand;
        breakEvenWeighted += r.totalTokensM * r.breakEvenUtilization;
        totalTok += r.totalTokensM;
      }
      return {
        provisionedGsus: provisioned,
        minFloorGsus: Math.round(minFloor),
        optimalTcoGsus: optimal,
        peakGsus: Math.round(peak),
        breakEvenUtil:
          totalTok > 0
            ? breakEvenWeighted / totalTok
            : sim.avgBreakEvenUtilization,
      };
    }
    const r = sim.byLotAndYear[selectedLot!.id][selectedYear];
    return {
      provisionedGsus: r.provisionedGsus,
      minFloorGsus: Math.round(r.minHourlyGsuDemand),
      optimalTcoGsus: r.optimalTcoGsuDemand,
      peakGsus: Math.round(r.peakHourlyGsuDemand),
      breakEvenUtil: r.breakEvenUtilization,
    };
  })();

  // =========================================================================
  // HANDLERS
  // =========================================================================
  const handleSelectEndpoint = (locKey: EndpointLocation) => {
    const spec = ENDPOINT_LOCATION_SPECS[locKey];
    updateTargetLots((l) => ({
      ...l,
      endpointLocation: locKey,
      region: spec.regionDisplay,
    }));
  };

  const handleSelectPtMode = (mode: PtSizingMode) => {
    updateTargetLots((l) => ({
      ...l,
      ptSizingMode: mode,
      manualGsus:
        mode === 'MANUAL'
          ? {
              y1: sim.byLotAndYear[l.id].y1.provisionedGsus,
              y2: sim.byLotAndYear[l.id].y2.provisionedGsus,
              y3: sim.byLotAndYear[l.id].y3.provisionedGsus,
            }
          : l.manualGsus,
    }));
  };

  const handleManualGsuChange = (yr: YearKey, nextGsus: number) => {
    const clamped = Math.max(0, Math.round(nextGsus));
    if (isGlobal) {
      const currentTotal = lots.reduce(
        (acc, l) => acc + sim.byLotAndYear[l.id][yr].provisionedGsus,
        0
      );
      onChangeAllLots(
        lots.map((l, idx) => {
          const curLotGsu = sim.byLotAndYear[l.id][yr].provisionedGsus;
          const share =
            currentTotal > 0 ? curLotGsu / currentTotal : 1 / lots.length;
          const allocated =
            idx === lots.length - 1
              ? Math.max(0, Math.round(clamped * share))
              : Math.round(clamped * share);
          return {
            ...l,
            ptSizingMode: 'MANUAL',
            manualGsus: {
              y1:
                yr === 'y1'
                  ? allocated
                  : l.ptSizingMode === 'MANUAL'
                  ? l.manualGsus.y1
                  : sim.byLotAndYear[l.id].y1.provisionedGsus,
              y2:
                yr === 'y2'
                  ? allocated
                  : l.ptSizingMode === 'MANUAL'
                  ? l.manualGsus.y2
                  : sim.byLotAndYear[l.id].y2.provisionedGsus,
              y3:
                yr === 'y3'
                  ? allocated
                  : l.ptSizingMode === 'MANUAL'
                  ? l.manualGsus.y3
                  : sim.byLotAndYear[l.id].y3.provisionedGsus,
            },
          };
        })
      );
    } else if (selectedLot) {
      onChangeLot({
        ...selectedLot,
        ptSizingMode: 'MANUAL',
        manualGsus: {
          ...selectedLot.manualGsus,
          [yr]: clamped,
        },
      });
    }
  };

  const handleSelectCommitTerm = (term: GsuCommitTerm) => {
    if (isGlobal) {
      onChangeGlobalConfig({ ...globalConfig, gsuCommitTerm: term });
      onChangeAllLots(lots.map((l) => ({ ...l, gsuCommitTerm: undefined })));
    } else if (selectedLot) {
      onChangeLot({ ...selectedLot, gsuCommitTerm: term });
    }
  };

  const handleSelectRampMode = (mode: CapacityRampMode) => {
    if (isGlobal) {
      onChangeGlobalConfig({ ...globalConfig, capacityRampMode: mode });
      onChangeAllLots(lots.map((l) => ({ ...l, capacityRampMode: undefined })));
    } else if (selectedLot) {
      onChangeLot({ ...selectedLot, capacityRampMode: mode });
    }
  };

  const handleRetryRatioChange = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    if (isGlobal) {
      onChangeGlobalConfig({
        ...globalConfig,
        payGoRetryToPriorityRatio: clamped,
      });
      onChangeAllLots(
        lots.map((l) => ({ ...l, payGoRetryToPriorityRatio: undefined }))
      );
    } else if (selectedLot) {
      onChangeLot({ ...selectedLot, payGoRetryToPriorityRatio: clamped });
    }
  };

  const handleBatchRatioChange = (ratio: number) => {
    const clamped = Math.max(0, Math.min(0.6, ratio));
    updateTargetLots((l) => ({ ...l, batchRatio: clamped }));
  };

  const handleCacheRatioChange = (ratio: number) => {
    const clamped = Math.max(0, Math.min(0.85, ratio));
    updateTargetLots((l) => ({ ...l, cacheRatio: clamped }));
  };

  const handleGoogleShareChange = (share: number) => {
    const clamped = Math.max(0, Math.min(1, share));
    updateTargetLots((l) => {
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
    });
  };

  const getScopeVolumesB = () => {
    if (isGlobal) {
      return {
        y1: lots.reduce((s, l) => s + l.volumesM.y1, 0) / 1000,
        y2: lots.reduce((s, l) => s + l.volumesM.y2, 0) / 1000,
        y3: lots.reduce((s, l) => s + l.volumesM.y3, 0) / 1000,
      };
    }
    return {
      y1: selectedLot!.volumesM.y1 / 1000,
      y2: selectedLot!.volumesM.y2 / 1000,
      y3: selectedLot!.volumesM.y3 / 1000,
    };
  };
  const scopeVolumesB = getScopeVolumesB();

  const handleVolumeChangeB = (yr: YearKey, nextB: number) => {
    const safeNextM = Math.max(0, nextB * 1000);
    if (isGlobal) {
      const currentYrTotalM = lots.reduce((s, l) => s + l.volumesM[yr], 0);
      const ratio = currentYrTotalM > 0 ? safeNextM / currentYrTotalM : 1;
      onChangeAllLots(
        lots.map((l) => {
          if (scaleYearsProportionally && currentYrTotalM > 0) {
            return {
              ...l,
              volumesM: {
                y1: Math.round(l.volumesM.y1 * ratio),
                y2: Math.round(l.volumesM.y2 * ratio),
                y3: Math.round(l.volumesM.y3 * ratio),
              },
            };
          }
          const share =
            currentYrTotalM > 0 ? l.volumesM[yr] / currentYrTotalM : 0.25;
          return {
            ...l,
            volumesM: {
              ...l.volumesM,
              [yr]: Math.round(safeNextM * share),
            },
          };
        })
      );
    } else if (selectedLot) {
      const prevM = selectedLot.volumesM[yr];
      if (scaleYearsProportionally && prevM > 0) {
        const ratio = safeNextM / prevM;
        onChangeLot({
          ...selectedLot,
          volumesM: {
            y1:
              yr === 'y1'
                ? Math.round(safeNextM)
                : Math.round(selectedLot.volumesM.y1 * ratio),
            y2:
              yr === 'y2'
                ? Math.round(safeNextM)
                : Math.round(selectedLot.volumesM.y2 * ratio),
            y3:
              yr === 'y3'
                ? Math.round(safeNextM)
                : Math.round(selectedLot.volumesM.y3 * ratio),
          },
        });
      } else {
        onChangeLot({
          ...selectedLot,
          volumesM: {
            ...selectedLot.volumesM,
            [yr]: Math.round(safeNextM),
          },
        });
      }
    }
  };

  const handleScaleVolumesByFactor = (factor: number) => {
    if (factor === 1.0) {
      updateTargetLots((l) => {
        const def = DEFAULT_LOTS.find((d) => d.id === l.id);
        return def ? { ...l, volumesM: { ...def.volumesM } } : l;
      });
      return;
    }
    updateTargetLots((l) => ({
      ...l,
      volumesM: {
        y1: Math.round(l.volumesM.y1 * factor),
        y2: Math.round(l.volumesM.y2 * factor),
        y3: Math.round(l.volumesM.y3 * factor),
      },
    }));
  };

  const handleSeasonalityChange = (nextSeasonality: SeasonalityConfig) => {
    if (isGlobal) {
      onChangeGlobalConfig({
        ...globalConfig,
        seasonality: nextSeasonality,
      });
      onChangeAllLots(lots.map((l) => ({ ...l, seasonality: undefined })));
    } else if (selectedLot) {
      onChangeLot({
        ...selectedLot,
        seasonality: nextSeasonality,
      });
    }
  };

  const handleInputRatioChange = (nextRatio: number) => {
    const clamped = Math.max(0.05, Math.min(0.95, nextRatio));
    if (isGlobal) {
      onChangeAllLots(
        lots.map((l) => (l.id === 'lot4' ? l : { ...l, inputRatio: clamped }))
      );
    } else if (selectedLot) {
      onChangeLot({ ...selectedLot, inputRatio: clamped });
    }
  };

  const handleThinkingLevelChange = (lvl: ThinkingLevel) => {
    updateTargetLots((l) => {
      if (!l.supportsThinkingLevel) return l;
      const nextDisplayName =
        l.id === 'lot1'
          ? formatLot1DisplayName(l.modelId as Lot1ModelId, lvl)
          : `Gemini 3.8 Flash (${
              lvl === 'HIGH' ? 'High' : lvl === 'MEDIUM' ? 'Medium' : 'Low'
            } Thinking)`;
      return {
        ...l,
        thinkingLevel: lvl,
        modelDisplayName: nextDisplayName,
      };
    });
  };

  const handleThinkingEnvelopeChange = (mode: ThinkingEnvelopeMode) => {
    if (isGlobal) {
      onChangeGlobalConfig({ ...globalConfig, thinkingEnvelopeMode: mode });
      onChangeAllLots(
        lots.map((l) => ({ ...l, thinkingEnvelopeMode: undefined }))
      );
    } else if (selectedLot) {
      onChangeLot({ ...selectedLot, thinkingEnvelopeMode: mode });
    }
  };

  const handleLot1ModelChange = (modelId: Lot1ModelId) => {
    const preset = LOT1_MODEL_PRESETS[modelId];
    onChangeAllLots(
      lots.map((l) => {
        if (l.id !== 'lot1') return l;
        return {
          ...l,
          modelId: preset.modelId,
          shortName: preset.shortName,
          subtitle: preset.subtitle,
          modelDisplayName: formatLot1DisplayName(
            preset.modelId,
            l.thinkingLevel
          ),
          euPricesPer1M: { ...preset.euPricesPer1M },
          gsuSpec: structuredClone(preset.gsuSpec),
          manualGsus: { ...preset.manualGsus },
        };
      })
    );
  };

  const applyLot4Preset = (
    nb2Lite: number,
    nb2: number,
    nbPro: number,
    presetLabel: string,
    shortLabel: string
  ) => {
    onChangeAllLots(
      lots.map((l) => {
        if (l.id !== 'lot4') return l;
        const textShare = l.imageMix?.textOutputShareOfOutput ?? 0.05;
        const nextMix = {
          nb2Lite,
          nb2,
          nbPro,
          textOutputShareOfOutput: textShare,
        };
        const updatedSpecs = getLot4BlendedEuSpecs(nextMix);
        return {
          ...l,
          shortName: shortLabel,
          modelDisplayName: presetLabel,
          imageMix: nextMix,
          euPricesPer1M: updatedSpecs.euPricesPer1M,
          gsuSpec: updatedSpecs.gsuSpec,
        };
      })
    );
  };

  const handleMagicOptimizeAllLots = () => {
    const before3YTco = sim.threeYearCumulated[activeFspTier].hybridTotalUsd;

    const nextGlobalConfig: GlobalSimConfig = {
      ...globalConfig,
      gsuCommitTerm: '1_YEAR',
      capacityRampMode: 'SMOOTH_MONTHLY',
      payGoRetryToPriorityRatio: 0,
      thinkingEnvelopeMode: 'FIXED_TOTAL',
      fspDiscounts: {
        ...globalConfig.fspDiscounts,
        threeYearCommitDiscount: Math.max(
          globalConfig.fspDiscounts.threeYearCommitDiscount,
          0.2
        ),
        ptDiscount: Math.max(globalConfig.fspDiscounts.ptDiscount ?? 0.2, 0.2),
      },
    };

    const nextLots: LotConfig[] = lots.map((l) => ({
      ...l,
      ptSizingMode: 'OPTIMAL_TCO',
      gsuCommitTerm: undefined,
      capacityRampMode: undefined,
      payGoRetryToPriorityRatio: undefined,
      thinkingEnvelopeMode: undefined,
      cacheRatio: l.id === 'lot4' ? l.cacheRatio : Math.max(l.cacheRatio, 0.35),
      batchRatio: Math.max(l.batchRatio, 0.2),
    }));

    const optimizedSim = runFullSimulation(
      nextLots,
      nextGlobalConfig,
      'threeYearFsp'
    );
    const after3YTco = optimizedSim.threeYearCumulated.threeYearFsp.hybridTotalUsd;
    const savedUsd = Math.max(0, before3YTco - after3YTco);

    onSelectFspTier('threeYearFsp');
    onChangeGlobalConfig(nextGlobalConfig);
    onChangeAllLots(nextLots);

    setMagicOptimizeBanner(
      savedUsd > 500
        ? `Optimization applied across all 4 lots — unlocked ${formatCurrencyMillions(
            savedUsd,
            1
          )} in additional 3-year savings (Optimal PT + Monthly ramp + ≥35% cache + ≥20% batch + 0% Priority surcharge + 3Y FSP)`
        : 'All 4 lots are now set to optimal cost settings (Optimal PT + Monthly ramp + ≥35% cache + ≥20% batch + 0% Priority surcharge + 3Y FSP)'
    );
  };

  const applyScenarioPreset = (
    preset: 'CONSERVATIVE_BASELINE' | 'PURE_PAYGO'
  ) => {
    setMagicOptimizeBanner(null);
    if (preset === 'CONSERVATIVE_BASELINE') {
      onSelectFspTier('threeYearFsp');
      if (isGlobal) {
        onChangeGlobalConfig(structuredClone(DEFAULT_GLOBAL_CONFIG));
        onChangeAllLots(structuredClone(DEFAULT_LOTS));
      } else if (selectedLot) {
        const def = DEFAULT_LOTS.find((d) => d.id === selectedLot.id);
        if (def) onChangeLot(structuredClone(def));
      }
    } else if (preset === 'PURE_PAYGO') {
      updateTargetLots((l) => ({
        ...l,
        ptSizingMode: 'NONE',
      }));
    }
  };

  const hasPerLotOverrides = selectedLot
    ? selectedLot.gsuCommitTerm !== undefined ||
      selectedLot.capacityRampMode !== undefined ||
      selectedLot.payGoRetryToPriorityRatio !== undefined ||
      selectedLot.seasonality !== undefined ||
      selectedLot.thinkingEnvelopeMode !== undefined
    : lots.some(
        (l) =>
          l.gsuCommitTerm !== undefined ||
          l.capacityRampMode !== undefined ||
          l.payGoRetryToPriorityRatio !== undefined ||
          l.seasonality !== undefined ||
          l.thinkingEnvelopeMode !== undefined
      );

  const handleResetLotOverridesToGlobal = () => {
    if (selectedLot) {
      onChangeLot({
        ...selectedLot,
        gsuCommitTerm: undefined,
        capacityRampMode: undefined,
        payGoRetryToPriorityRatio: undefined,
        seasonality: undefined,
        thinkingEnvelopeMode: undefined,
      });
    } else {
      onChangeAllLots(
        lots.map((l) => ({
          ...l,
          gsuCommitTerm: undefined,
          capacityRampMode: undefined,
          payGoRetryToPriorityRatio: undefined,
          seasonality: undefined,
          thinkingEnvelopeMode: undefined,
        }))
      );
    }
  };

  const scopeTitle = isGlobal
    ? 'All 4 lots combined (Global)'
    : `Lot ${selectedLot!.lotNumber} · ${selectedLot!.modelDisplayName}`;

  const lot1Ref = lots.find((l) => l.id === 'lot1')!;
  const lot4Ref = lots.find((l) => l.id === 'lot4')!;
  const lot4Mix = lot4Ref.imageMix ?? {
    nb2Lite: 0,
    nb2: 1.0,
    nbPro: 0,
    textOutputShareOfOutput: 0.05,
  };

  const renderImpactBadge = (
    deltaUsd: number,
    baselineLabel: string,
    zeroLabel: string
  ) => {
    if (Math.abs(deltaUsd) < 500) {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] type-label-md tabular-nums">
          {zeroLabel}
        </span>
      );
    }
    if (deltaUsd < 0) {
      return (
        <span className="md-delta-positive tabular-nums">
          Saves {formatCurrencyMillions(Math.abs(deltaUsd), 1)} {baselineLabel}
        </span>
      );
    }
    return (
      <span className="md-delta-negative tabular-nums">
        +{formatCurrencyMillions(deltaUsd, 1)} {baselineLabel}
      </span>
    );
  };

  // Tab metadata with live status summary pills
  const ptModeLabel =
    activePtMode === 'OPTIMAL_TCO'
      ? 'Optimal TCO'
      : activePtMode === 'MIN_FLOOR'
      ? '24/7 floor'
      : activePtMode === 'DAYTIME_FLOOR'
      ? 'Daytime floor'
      : activePtMode === 'NONE'
      ? '0 GSUs (PayGo)'
      : activePtMode === 'MANUAL'
      ? 'Manual GSUs'
      : 'Mixed PT';

  const activeFspPct =
    activeFspTier === 'threeYearFsp'
      ? Math.round(globalConfig.fspDiscounts.threeYearCommitDiscount * 100)
      : activeFspTier === 'oneYearFsp'
      ? Math.round(globalConfig.fspDiscounts.oneYearCommitDiscount * 100)
      : Math.round((globalConfig.fspDiscounts.uncommittedDiscount ?? 0) * 100);

  const configTabs: Array<{
    id: ConfigTabId;
    title: string;
    summary: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'traffic',
      title: '1. Future traffic hypotheses',
      summary: `${Math.round(activeGoogleShare * 100)}% Google · ${
        activeSeasonality.preset === 'PUBLIC_CONSUMER_BOT'
          ? 'B2C curve'
          : activeSeasonality.preset === 'B2B_CUSTOMER_CARE'
          ? 'B2B curve'
          : '24/7 flat'
      }`,
      icon: <TrendingUp className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'models',
      title: '2. Models, region & caching',
      summary: `${firstEndpoint} (${
        firstEndpoint === 'global' ? '1.00×' : '1.10×'
      }) · ${Math.round(activeCacheRatio * 100)}% cache`,
      icon: <Layers className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'capacity',
      title: '3. Capacity & consumption',
      summary: `${ptModeLabel} · ${
        activeRampMode === 'SMOOTH_MONTHLY' ? 'Monthly ramp' : 'Annual steps'
      } · ${Math.round(activeBatchRatio * 100)}% batch`,
      icon: <Cpu className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'discounts',
      title: '4. Commercial discounts',
      summary: `FSP -${activeFspPct}% · PT -${Math.round(ptDiscount * 100)}%`,
      icon: <Percent className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <section
      aria-label={`Simulation configuration for ${scopeTitle}`}
      className="md-card overflow-hidden"
    >
      {/* =====================================================================
          HEADER BAR: Scope Indicator + Magic Optimize (All 4 Lots) + Presets
          ===================================================================== */}
      <div className="px-6 py-4 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Sliders className="w-5 h-5 text-[var(--md-primary)] shrink-0" />
              <h2 className="type-title-md text-[var(--md-on-surface)]">
                Configure {scopeTitle}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md">
                {isGlobal
                  ? 'Applies to all 4 lots'
                  : `Lot ${selectedLot!.lotNumber} only`}
              </span>
              {hasPerLotOverrides && (
                <button
                  type="button"
                  onClick={handleResetLotOverridesToGlobal}
                  className="md-chip-filter cursor-pointer"
                  title="Reset custom per-lot overrides so all lots share global defaults"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>
                    {isGlobal
                      ? 'Sync all lots to global'
                      : 'Match global defaults'}
                  </span>
                </button>
              )}
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Follow the 4 steps below from traffic demand → model & caching → capacity sizing → commercial discounts, or click Optimize to auto-select the lowest-cost architecture across all 4 lots.
            </p>
          </div>

          {/* Optimize Button + Baseline Presets */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleMagicOptimizeAllLots}
              className="md-btn-tonal cursor-pointer"
              title="Automatically select Optimal PT sizing, progressive M1–M36 GSU ramp, 1-year GSU term, ≥35% context caching, ≥20% async batch, 0% Priority surcharge, and 3-year FSP across all 4 lots"
            >
              <Wand2 className="w-4 h-4" />
              <span>Optimize</span>
            </button>
            <button
              type="button"
              onClick={() => applyScenarioPreset('CONSERVATIVE_BASELINE')}
              className="md-chip-filter cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>24/7 floor baseline</span>
            </button>
            <button
              type="button"
              onClick={() => applyScenarioPreset('PURE_PAYGO')}
              className={`${
                activePtMode === 'NONE'
                  ? 'md-chip-filter-selected'
                  : 'md-chip-filter'
              } cursor-pointer`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>100% PayGo (0 GSUs)</span>
            </button>
          </div>
        </div>

        {magicOptimizeBanner && (
          <div
            role="status"
            className="px-3.5 py-2 rounded-[8px] bg-[var(--md-tertiary-container)] text-[var(--md-on-tertiary-container)] type-body-sm flex items-center justify-between gap-2 tabular-nums"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{magicOptimizeBanner}</span>
            </span>
            <button
              type="button"
              onClick={() => setMagicOptimizeBanner(null)}
              className="type-label-sm underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          4-TAB CONFIGURATION NAVIGATION BAR
          Only 1 focused tab is rendered below at a time
          ===================================================================== */}
      <div
        role="tablist"
        aria-label="Configuration categories"
        className="px-6 pt-4 pb-3 bg-[var(--md-surface-container-low)] border-b border-[var(--md-outline-variant)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {configTabs.map((tab) => {
          const isSelected = activeConfigTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveConfigTab(tab.id)}
              className={`p-3.5 rounded-[12px] text-left cursor-pointer transition-colors min-w-0 ${
                isSelected
                  ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                  : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="type-label-lg inline-flex items-center gap-2 truncate">
                  {tab.icon}
                  <span className="truncate">{tab.title}</span>
                </span>
                {isSelected && <Check className="w-4 h-4 shrink-0" />}
              </div>
              <div
                className={`type-body-sm mt-1 truncate tabular-nums ${
                  isSelected
                    ? 'text-[var(--md-on-secondary-container)] opacity-85'
                    : 'text-[var(--md-on-surface-variant)]'
                }`}
              >
                {tab.summary}
              </div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          ACTIVE TAB CONTENT (Spacious 3-Column or 2-Column Grid, Zero Overflow)
          ===================================================================== */}
      <div className="p-6">
        {/* -------------------------------------------------------------------
            TAB 1: CAPACITY & CONSUMPTION (PT Sizing, GSU Ramp, PayGo & Batch)
            3 Spacious Cards in 1 Row
            ------------------------------------------------------------------- */}
        {activeConfigTab === 'capacity' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* CARD 1A: Reserved Base Capacity Strategy (PT GSUs) */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between min-w-0">
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="type-title-sm text-[var(--md-on-surface)]">
                      Reserved base capacity (PT GSUs)
                    </h3>
                    <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                      How much steady traffic to cover with fixed monthly GSUs vs. variable PayGo overflow
                    </p>
                  </div>
                  {renderImpactBadge(
                    impactBadges.ptDeltaUsd,
                    'vs 100% PayGo',
                    '100% PayGo baseline'
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      {
                        mode: 'OPTIMAL_TCO',
                        label: `Optimal TCO (≥${Math.round(
                          scopeGsuMetrics.breakEvenUtil * 100
                        )}% util)`,
                        desc: `${scopeGsuMetrics.optimalTcoGsus} GSUs (${selectedYear}) · Lowest cost`,
                      },
                      {
                        mode: 'MIN_FLOOR',
                        label: '24/7 minimum floor',
                        desc: `${scopeGsuMetrics.minFloorGsus} GSUs (${selectedYear}) · 100% utilized`,
                      },
                      {
                        mode: 'DAYTIME_FLOOR',
                        label: 'Daytime floor',
                        desc: 'Covers 08:00–22:00 base',
                      },
                      {
                        mode: 'NONE',
                        label: '100% PayGo (0 GSUs)',
                        desc: 'No fixed PT subscription',
                      },
                      {
                        mode: 'MANUAL',
                        label: 'Manual GSU count',
                        desc: 'Custom Y1 / Y2 / Y3 GSUs',
                      },
                    ] as { mode: PtSizingMode; label: string; desc: string }[]
                  ).map((item) => {
                    const isSelected = activePtMode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => handleSelectPtMode(item.mode)}
                        aria-pressed={isSelected}
                        className={`p-2.5 rounded-[8px] text-left cursor-pointer transition-colors min-w-0 ${
                          isSelected
                            ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                            : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                        }`}
                      >
                        <div className="type-label-md flex items-center justify-between gap-1">
                          <span className="truncate">{item.label}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
                        </div>
                        <div className="type-body-sm opacity-80 mt-0.5 tabular-nums truncate">
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual / Active Year GSU Slider */}
              <div className="p-3 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2 tabular-nums">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="type-label-md text-[var(--md-on-surface)]">
                    Reserved GSUs ({selectedYear}):{' '}
                    <strong>{scopeGsuMetrics.provisionedGsus} GSUs</strong>
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[var(--md-surface-container)] p-0.5">
                    {(['y1', 'y2', 'y3'] as YearKey[]).map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => onSelectYear(yr)}
                        className={`h-[24px] px-2.5 rounded-full type-label-sm cursor-pointer transition-colors ${
                          selectedYear === yr
                            ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                            : 'text-[var(--md-on-surface-variant)]'
                        }`}
                      >
                        {yr === 'y1' ? 'Y1' : yr === 'y2' ? 'Y2' : 'Y3'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(50, scopeGsuMetrics.peakGsus)}
                    step={1}
                    aria-label={`Provisioned GSUs for ${selectedYear}`}
                    value={scopeGsuMetrics.provisionedGsus}
                    onChange={(e) =>
                      handleManualGsuChange(
                        selectedYear,
                        Number(e.target.value)
                      )
                    }
                    className="flex-1 accent-[var(--md-primary)] cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={Math.max(200, scopeGsuMetrics.peakGsus * 2)}
                    step={1}
                    aria-label={`Manual GSU count input for ${selectedYear}`}
                    value={scopeGsuMetrics.provisionedGsus}
                    onChange={(e) =>
                      handleManualGsuChange(
                        selectedYear,
                        Number(e.target.value)
                      )
                    }
                    className="w-16 h-[30px] px-1.5 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-md tabular-nums"
                  />
                </div>
                <div className="flex items-center justify-between type-body-sm text-[var(--md-on-surface-variant)]">
                  <span>Floor: {scopeGsuMetrics.minFloorGsus}</span>
                  <span>Optimal: {scopeGsuMetrics.optimalTcoGsus}</span>
                  <span>Peak: {scopeGsuMetrics.peakGsus}</span>
                </div>
              </div>
            </div>

            {/* CARD 1B: GSU Subscription Term & 36-Month Ramp Mode */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-5 flex flex-col justify-between min-w-0">
              <div className="space-y-4">
                <div>
                  <h3 className="type-title-sm text-[var(--md-on-surface)]">
                    GSU subscription term & 36-month scaling
                  </h3>
                  <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                    Commitment duration per GSU and how reserved capacity scales across 2027–2029
                  </p>
                </div>

                {/* GSU Commit Term */}
                <div className="space-y-2">
                  <div className="type-label-md text-[var(--md-on-surface)]">
                    GSU subscription commit term (net rate after -{Math.round(ptDiscount * 100)}% PT discount)
                  </div>
                  <div className="space-y-1.5">
                    {(
                      [
                        {
                          id: '1_YEAR',
                          label: '1-year commitment',
                          rate: `$${Math.round(
                            EU_GSU_MONTHLY_PRICE_USD['1_YEAR'] *
                              (1 - ptDiscount)
                          ).toLocaleString()}/GSU/mo`,
                        },
                        {
                          id: '3_MONTH',
                          label: '3-month commitment',
                          rate: `$${Math.round(
                            EU_GSU_MONTHLY_PRICE_USD['3_MONTH'] *
                              (1 - ptDiscount)
                          ).toLocaleString()}/GSU/mo`,
                        },
                        {
                          id: '1_MONTH',
                          label: 'Monthly flexible',
                          rate: `$${Math.round(
                            EU_GSU_MONTHLY_PRICE_USD['1_MONTH'] *
                              (1 - ptDiscount)
                          ).toLocaleString()}/GSU/mo`,
                        },
                      ] as { id: GsuCommitTerm; label: string; rate: string }[]
                    ).map((term) => {
                      const isSelected =
                        isUniformCommitTerm && activeCommitTerm === term.id;
                      return (
                        <button
                          key={term.id}
                          type="button"
                          onClick={() => handleSelectCommitTerm(term.id)}
                          aria-pressed={isSelected}
                          className={`w-full p-2.5 rounded-[8px] flex items-center justify-between gap-2 text-left cursor-pointer transition-colors tabular-nums ${
                            isSelected
                              ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                              : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                          }`}
                        >
                          <span className="type-label-md flex items-center gap-1.5">
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{term.label}</span>
                          </span>
                          <span className="type-body-sm opacity-85">
                            {term.rate}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 36-Month Capacity Ramp Mode */}
              <div className="pt-4 border-t border-[var(--md-outline-variant)] space-y-2">
                <div className="type-label-md text-[var(--md-on-surface)]">
                  36-month GSU capacity ramp mode
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectRampMode('SMOOTH_MONTHLY')}
                    aria-pressed={
                      isUniformRampMode && activeRampMode === 'SMOOTH_MONTHLY'
                    }
                    className={`p-2.5 rounded-[8px] text-left cursor-pointer transition-colors ${
                      isUniformRampMode && activeRampMode === 'SMOOTH_MONTHLY'
                        ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                        : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                    }`}
                  >
                    <div className="type-label-md flex items-center justify-between gap-1">
                      <span>Progressive monthly</span>
                      {isUniformRampMode &&
                        activeRampMode === 'SMOOTH_MONTHLY' && (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        )}
                    </div>
                    <div className="type-body-sm opacity-80 mt-0.5">
                      Scales M1–M36 with traffic
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectRampMode('ANNUAL_STEPS')}
                    aria-pressed={
                      isUniformRampMode && activeRampMode === 'ANNUAL_STEPS'
                    }
                    className={`p-2.5 rounded-[8px] text-left cursor-pointer transition-colors ${
                      isUniformRampMode && activeRampMode === 'ANNUAL_STEPS'
                        ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                        : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                    }`}
                  >
                    <div className="type-label-md flex items-center justify-between gap-1">
                      <span>3 annual steps</span>
                      {isUniformRampMode &&
                        activeRampMode === 'ANNUAL_STEPS' && (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        )}
                    </div>
                    <div className="type-body-sm opacity-80 mt-0.5">
                      Flat GSUs per year (Y1/Y2/Y3)
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 1C: Peak Overflow (Priority PayGo 1.8x) & Async Batch (-50%) */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-5 flex flex-col justify-between min-w-0">
              <div className="space-y-4">
                <div>
                  <h3 className="type-title-sm text-[var(--md-on-surface)]">
                    Peak overflow & async batch routing
                  </h3>
                  <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                    Configure how traffic above your PT ceiling and non-urgent batch jobs are billed
                  </p>
                </div>

                {/* Priority PayGo 1.8x Share of Overflow */}
                <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2 tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="ctrl-priority-slider"
                      className="type-label-md text-[var(--md-on-surface)]"
                    >
                      Priority PayGo (1.8× rate) overflow share
                    </label>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md">
                      {isUniformRetryRatio
                        ? `${Math.round(activeRetryRatio * 100)}%`
                        : `Mixed (${Math.round(activeRetryRatio * 100)}%)`}
                    </span>
                  </div>
                  <p className="type-body-sm text-[var(--md-on-surface-variant)]">
                    Share of real-time overflow routed to Priority PayGo (1.8×) vs. Standard PayGo (1.0×)
                  </p>
                  <input
                    id="ctrl-priority-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(activeRetryRatio * 100)}
                    onChange={(e) =>
                      handleRetryRatioChange(Number(e.target.value) / 100)
                    }
                    className="w-full accent-[var(--md-primary)] cursor-pointer"
                  />
                </div>

                {/* Async Batch API Share (-50%) */}
                <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2 tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="ctrl-batch-slider"
                      className="type-label-md text-[var(--md-on-surface)]"
                    >
                      Async Batch API share (-50% off PayGo)
                    </label>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md">
                      {isUniformBatchRatio
                        ? `${Math.round(activeBatchRatio * 100)}%`
                        : `Mixed (${Math.round(activeBatchRatio * 100)}%)`}
                    </span>
                  </div>
                  <p className="type-body-sm text-[var(--md-on-surface-variant)]">
                    Share of total workload processed asynchronously (24h SLO) at -50% off Standard PayGo
                  </p>
                  <input
                    id="ctrl-batch-slider"
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={Math.round(activeBatchRatio * 100)}
                    onChange={(e) =>
                      handleBatchRatioChange(Number(e.target.value) / 100)
                    }
                    className="w-full accent-[var(--md-primary)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                Tip: Offloading non-interactive jobs to Batch API reduces both real-time peak GSU demand and per-token spend by 50%.
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            TAB 2: MODELS, REGION & CACHING (SKU & Architecture)
            3 Spacious Cards in 1 Row
            ------------------------------------------------------------------- */}
        {activeConfigTab === 'models' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* CARD 2A: Deployment Region (Data Residency) */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between min-w-0">
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="type-title-sm text-[var(--md-on-surface)]">
                      Deployment region & data residency
                    </h3>
                    <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                      Multi-region EU and US endpoints apply a +10% (1.10×) uplift over Global (1.00×)
                    </p>
                  </div>
                  {renderImpactBadge(
                    impactBadges.endpointDeltaUsd,
                    'vs Global 1.00×',
                    'Base 1.00× rate'
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {(['global', 'eu', 'us'] as EndpointLocation[]).map(
                    (locKey) => {
                      const spec = ENDPOINT_LOCATION_SPECS[locKey];
                      const isSelected =
                        isUniformEndpoint && firstEndpoint === locKey;
                      return (
                        <button
                          key={locKey}
                          type="button"
                          onClick={() => handleSelectEndpoint(locKey)}
                          aria-pressed={isSelected}
                          className={`w-full p-3 rounded-[8px] text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                              : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                          }`}
                        >
                          <div className="type-label-md flex items-center justify-between gap-2 tabular-nums">
                            <span className="inline-flex items-center gap-1.5">
                              <Globe2 className="w-4 h-4 shrink-0" />
                              <span>{spec.label}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)]">
                              {spec.multiplierVsGlobal.toFixed(2)}×
                            </span>
                          </div>
                          <div className="type-body-sm opacity-80 mt-0.5">
                            {locKey === 'global'
                              ? 'Global dynamic routing · Lowest unit cost (1.00×)'
                              : locKey === 'eu'
                              ? 'European Union data residency · +10% sovereign uplift'
                              : 'United States multi-region · +10% regional uplift'}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                Both PayGo token prices and monthly PT GSU rates scale by the selected endpoint multiplier.
              </div>
            </div>

            {/* CARD 2B: Model Variant & Reasoning Depth */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between min-w-0">
              <div className="space-y-4">
                <div>
                  <h3 className="type-title-sm text-[var(--md-on-surface)]">
                    Model variant & reasoning depth
                  </h3>
                  <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                    Select model family and thinking token depth for reasoning workloads
                  </p>
                </div>

                {/* Lot 1 Model Variant */}
                {(isGlobal || selectedLot?.id === 'lot1') && (
                  <div className="space-y-1.5">
                    <div className="type-label-md text-[var(--md-on-surface)]">
                      Lot 1 complex reasoning model
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(
                        ['gemini-4-argon', 'gemini-3.8-flash'] as Lot1ModelId[]
                      ).map((mId) => {
                        const preset = LOT1_MODEL_PRESETS[mId];
                        const isSelected = lot1Ref.modelId === mId;
                        return (
                          <button
                            key={mId}
                            type="button"
                            onClick={() => handleLot1ModelChange(mId)}
                            aria-pressed={isSelected}
                            className={`p-2.5 rounded-[8px] text-left cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                                : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                            }`}
                          >
                            <div className="type-label-md flex items-center justify-between gap-1">
                              <span className="truncate">
                                {preset.shortName}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </div>
                            <div className="type-body-sm opacity-80 mt-0.5 tabular-nums">
                              {mId === 'gemini-4-argon'
                                ? '$4.40/$22 EU · 260 tok/s'
                                : '$1.65/$8.25 EU · 675 tok/s'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lot 4 Image Model Preset */}
                {(isGlobal || selectedLot?.id === 'lot4') && (
                  <div className="space-y-1.5">
                    <div className="type-label-md text-[var(--md-on-surface)]">
                      Lot 4 image generation model
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          label: 'NB2 (Default)',
                          sub: '$66/1M img',
                          mix: [0, 1, 0] as const,
                          full: 'Nano Banana 2 (Gemini 3.1 Flash Image)',
                          short: 'Lot 4 (NB2 · Gemini 3.1 Flash Image)',
                        },
                        {
                          label: 'NB2 Lite',
                          sub: '$33/1M img',
                          mix: [1, 0, 0] as const,
                          full: 'Nano Banana 2 Lite',
                          short: 'Lot 4 (NB2 Lite)',
                        },
                        {
                          label: 'NB Pro',
                          sub: '$132/1M img',
                          mix: [0, 0, 1] as const,
                          full: 'Nano Banana Pro (Gemini 3 Pro Image)',
                          short: 'Lot 4 (NB Pro · Gemini 3 Pro Image)',
                        },
                      ].map((p) => {
                        const isSelected =
                          Math.abs(lot4Mix.nb2Lite - p.mix[0]) < 0.01 &&
                          Math.abs(lot4Mix.nb2 - p.mix[1]) < 0.01 &&
                          Math.abs(lot4Mix.nbPro - p.mix[2]) < 0.01;
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() =>
                              applyLot4Preset(
                                p.mix[0],
                                p.mix[1],
                                p.mix[2],
                                p.full,
                                p.short
                              )
                            }
                            aria-pressed={isSelected}
                            className={`p-2 rounded-[8px] text-left cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                                : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                            }`}
                          >
                            <div className="type-label-md flex items-center justify-between gap-1">
                              <span className="truncate">{p.label}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </div>
                            <div className="type-body-sm opacity-80 tabular-nums">
                              {p.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Thinking Depth (Lots 1 & 2) */}
                {(isGlobal || selectedLot?.supportsThinkingLevel) && (
                  <div className="space-y-2 pt-2 border-t border-[var(--md-outline-variant)]">
                    <div className="type-label-md text-[var(--md-on-surface)]">
                      Reasoning / thinking depth (Lots 1 & 2)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { lvl: 'LOW', label: 'Low (+15%)' },
                          { lvl: 'MEDIUM', label: 'Med (+45%)' },
                          { lvl: 'HIGH', label: 'High (+90%)' },
                        ] as { lvl: ThinkingLevel; label: string }[]
                      ).map((item) => {
                        const currentLvl = selectedLot
                          ? selectedLot.thinkingLevel
                          : lot1Ref.thinkingLevel;
                        const isSelected = currentLvl === item.lvl;
                        return (
                          <button
                            key={item.lvl}
                            type="button"
                            onClick={() => handleThinkingLevelChange(item.lvl)}
                            aria-pressed={isSelected}
                            className={`p-2 rounded-[8px] text-left cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                                : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                            }`}
                          >
                            <div className="type-label-md flex items-center justify-between gap-1">
                              <span className="truncate">{item.label}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleThinkingEnvelopeChange('ADD_ON_TOP')}
                        aria-pressed={activeThinkingEnvelope === 'ADD_ON_TOP'}
                        className={`${
                          activeThinkingEnvelope === 'ADD_ON_TOP'
                            ? 'md-chip-filter-selected'
                            : 'md-chip-filter'
                        } cursor-pointer`}
                      >
                        <span>Add thinking on top</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleThinkingEnvelopeChange('FIXED_TOTAL')
                        }
                        aria-pressed={activeThinkingEnvelope === 'FIXED_TOTAL'}
                        className={`${
                          activeThinkingEnvelope === 'FIXED_TOTAL'
                            ? 'md-chip-filter-selected'
                            : 'md-chip-filter'
                        } cursor-pointer`}
                      >
                        <span>Keep total volume fixed</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2C: Context Caching Hit Rate (-90% / -95%) */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between min-w-0">
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="type-title-sm text-[var(--md-on-surface)]">
                      Context caching hit rate (-90% / -95%)
                    </h3>
                    <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                      Cached input tokens cost 90%–95% less and use only 0.1× GSU burndown weight
                    </p>
                  </div>
                  {renderImpactBadge(
                    impactBadges.cacheAndBatchDeltaUsd,
                    'from cache & batch',
                    '0% active'
                  )}
                </div>

                {(!selectedLot || selectedLot.id !== 'lot4') ? (
                  <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-3 tabular-nums">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="ctrl-cache-slider"
                        className="type-label-md text-[var(--md-on-surface)]"
                      >
                        Share of input tokens served from cache
                      </label>
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md">
                        {isUniformCacheRatio
                          ? `${Math.round(activeCacheRatio * 100)}% cached`
                          : `Mixed (${Math.round(activeCacheRatio * 100)}%)`}
                      </span>
                    </div>

                    <input
                      id="ctrl-cache-slider"
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={Math.round(activeCacheRatio * 100)}
                      onChange={(e) =>
                        handleCacheRatioChange(Number(e.target.value) / 100)
                      }
                      className="w-full accent-[var(--md-primary)] cursor-pointer"
                    />

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[0, 0.15, 0.3, 0.5, 0.7].map((val) => {
                        const pct = Math.round(val * 100);
                        const isSelected =
                          isUniformCacheRatio &&
                          Math.abs(activeCacheRatio - val) < 0.005;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleCacheRatioChange(val)}
                            className={`${
                              isSelected
                                ? 'md-chip-filter-selected'
                                : 'md-chip-filter'
                            } cursor-pointer tabular-nums`}
                          >
                            <span>{pct}%</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] type-body-sm text-[var(--md-on-surface-variant)]">
                    Lot 4 is an image generation workload (95% image output tokens), so text context caching does not apply.
                  </div>
                )}
              </div>

              {/* Active SKU Unit Rate Reference */}
              <div className="p-3 rounded-[8px] bg-[var(--md-surface-container-lowest)] type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                {(() => {
                  const refLot = selectedLot ?? lot1Ref;
                  const effPrices = getLotEffectivePricesPer1M(refLot);
                  const effGsu = getLotEffectiveGsuMonthlyPriceUsd(
                    refLot,
                    activeCommitTerm,
                    ptDiscount
                  );
                  return (
                    <div className="space-y-1">
                      <div className="font-medium text-[var(--md-on-surface)]">
                        {refLot.modelDisplayName} ({refLot.endpointLocation ?? 'eu'})
                      </div>
                      <div>
                        Input: ${effPrices.inputNonCached.toFixed(2)}/1M · Cached:{' '}
                        ${effPrices.inputCached.toFixed(3)}/1M · Output: $
                        {(
                          effPrices.outputImage ??
                          effPrices.outputTextAndThinking
                        ).toFixed(2)}
                        /1M
                      </div>
                      <div>
                        1 GSU = {refLot.gsuSpec.throughputPerGsuPerSec} tok/s ($
                        {Math.round(effGsu).toLocaleString()}/mo net)
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            TAB 3: FUTURE TRAFFIC HYPOTHESES (Google Share, Volumes, Seasonality)
            3 Spacious Cards in 1 Row
            ------------------------------------------------------------------- */}
        {activeConfigTab === 'traffic' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* CARD 3A: Share of Traffic Served by Google & Input/Output Split */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-5 flex flex-col justify-between min-w-0">
              <div className="space-y-4">
                <div>
                  <h3 className="type-title-sm text-[var(--md-on-surface)]">
                    Google share & prompt/response split
                  </h3>
                  <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                    Percentage of total demand routed to Google Cloud and ratio of input vs. output tokens
                  </p>
                </div>

                {/* Google Share (%) */}
                <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2.5 tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="ctrl-google-share-slider"
                      className="type-label-md text-[var(--md-on-surface)]"
                    >
                      Share of traffic served by Google (%)
                    </label>
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md">
                      {isUniformGoogleShare
                        ? `${Math.round(activeGoogleShare * 100)}% Google`
                        : `Mixed (${Math.round(activeGoogleShare * 100)}%)`}
                    </span>
                  </div>
                  <input
                    id="ctrl-google-share-slider"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(activeGoogleShare * 100)}
                    onChange={(e) =>
                      handleGoogleShareChange(Number(e.target.value) / 100)
                    }
                    className="w-full accent-[var(--md-primary)] cursor-pointer"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[0, 0.25, 0.5, 0.75, 1.0].map((val) => {
                      const pct = Math.round(val * 100);
                      const isSelected =
                        isUniformGoogleShare &&
                        Math.abs(activeGoogleShare - val) < 0.005;
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleGoogleShareChange(val)}
                          className={`${
                            isSelected
                              ? 'md-chip-filter-selected'
                              : 'md-chip-filter'
                          } cursor-pointer tabular-nums`}
                        >
                          <span>{pct}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Input / Output Token Split (%) */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2 tabular-nums">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="ctrl-input-split-slider"
                    className="type-label-md text-[var(--md-on-surface)]"
                  >
                    Input vs. output token split (%)
                  </label>
                  <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md">
                    {isUniformInputRatio
                      ? `${Math.round(activeInputRatio * 100)}% in / ${
                          100 - Math.round(activeInputRatio * 100)
                        }% out`
                      : `Mixed (${Math.round(activeInputRatio * 100)}% in)`}
                  </span>
                </div>
                <input
                  id="ctrl-input-split-slider"
                  type="range"
                  min={5}
                  max={95}
                  step={5}
                  value={Math.round(activeInputRatio * 100)}
                  onChange={(e) =>
                    handleInputRatioChange(Number(e.target.value) / 100)
                  }
                  className="w-full accent-[var(--md-primary)] cursor-pointer"
                />
                <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                  Output tokens carry 5×–9× higher GSU burndown weight than input tokens (1×).
                </div>
              </div>
            </div>

            {/* CARD 3B: 3-Year Annual Token Forecast (Y1 / Y2 / Y3 in Billions B) */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between min-w-0">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="type-title-sm text-[var(--md-on-surface)]">
                      3-year annual token forecast (Billions · B)
                    </h3>
                    <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                      Annual demand before Google share % (1,000B = 1 Trillion tokens)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { factor: 0.5, label: '0.5×' },
                      { factor: 1.0, label: 'Reset 1.0×' },
                      { factor: 1.5, label: '1.5×' },
                      { factor: 2.0, label: '2.0×' },
                    ].map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => handleScaleVolumesByFactor(b.factor)}
                        className="h-[26px] px-2.5 rounded-full bg-[var(--md-surface-container-lowest)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] type-label-sm cursor-pointer tabular-nums"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {(
                    [
                      { yr: 'y1', label: 'Year 1 (2027)' },
                      { yr: 'y2', label: 'Year 2 (2028)' },
                      { yr: 'y3', label: 'Year 3 (2029)' },
                    ] as { yr: YearKey; label: string }[]
                  ).map(({ yr, label }) => {
                    const valB = Math.round(scopeVolumesB[yr] * 10) / 10;
                    const effectiveM =
                      scopeVolumesB[yr] * 1000 * activeGoogleShare;
                    return (
                      <div
                        key={yr}
                        className="p-2.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] flex items-center justify-between gap-3 tabular-nums"
                      >
                        <div>
                          <label
                            htmlFor={`vol-input-${yr}`}
                            className="type-label-md text-[var(--md-on-surface)] block"
                          >
                            {label}
                          </label>
                          <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                            Served: {formatTokensMillions(effectiveM)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`vol-input-${yr}`}
                            type="number"
                            min={0}
                            step={10}
                            value={valB}
                            onChange={(e) =>
                              handleVolumeChangeB(yr, Number(e.target.value))
                            }
                            className="w-28 h-[32px] px-2 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-lg tabular-nums"
                          />
                          <span className="type-label-md text-[var(--md-on-surface-variant)]">
                            B
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <label className="pt-2 border-t border-[var(--md-outline-variant)] inline-flex items-center gap-2 type-body-sm text-[var(--md-on-surface-variant)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={scaleYearsProportionally}
                  onChange={(e) =>
                    setScaleYearsProportionally(e.target.checked)
                  }
                  className="accent-[var(--md-primary)] cursor-pointer"
                />
                <span>
                  Scale Y1–Y3 proportionally when editing a single year
                </span>
              </label>
            </div>

            {/* CARD 3C: Weekly Traffic Seasonality (168h Curve) */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between min-w-0">
              <div className="space-y-3">
                <div>
                  <h3 className="type-title-sm text-[var(--md-on-surface)]">
                    Weekly traffic seasonality (168h curve)
                  </h3>
                  <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                    Shapes daytime peaks vs. nighttime and weekend valleys across the 168-hour week
                  </p>
                </div>

                <div className="space-y-1.5">
                  {SEASONALITY_PRESETS.map((p) => {
                    const isSelected =
                      isUniformSeasonality &&
                      activeSeasonality.preset === p.preset;
                    return (
                      <button
                        key={p.preset}
                        type="button"
                        onClick={() =>
                          handleSeasonalityChange({
                            preset: p.preset,
                            nighttimeFloorRatio: p.night,
                            weekendToWeekdayRatio: p.wknd,
                            peakAmplitude: p.amp,
                          })
                        }
                        aria-pressed={isSelected}
                        className={`w-full p-2.5 rounded-[8px] text-left cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)]'
                            : 'bg-[var(--md-surface-container-lowest)] text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-low)]'
                        }`}
                      >
                        <div className="type-label-md flex items-center justify-between gap-1">
                          <span>{p.label}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
                        </div>
                        <div className="type-body-sm opacity-80 tabular-nums">
                          {p.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeSeasonality.preset !== 'FLAT_24_7' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--md-outline-variant)] tabular-nums">
                  <div className="p-2.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-1">
                    <div className="flex items-center justify-between type-body-sm">
                      <label
                        htmlFor="ctrl-night-floor"
                        className="text-[var(--md-on-surface-variant)]"
                      >
                        Night floor
                      </label>
                      <span className="font-medium text-[var(--md-on-surface)]">
                        {Math.round(
                          activeSeasonality.nighttimeFloorRatio * 100
                        )}
                        %
                      </span>
                    </div>
                    <input
                      id="ctrl-night-floor"
                      type="range"
                      min={5}
                      max={70}
                      step={1}
                      value={Math.round(
                        activeSeasonality.nighttimeFloorRatio * 100
                      )}
                      onChange={(e) =>
                        handleSeasonalityChange({
                          ...activeSeasonality,
                          nighttimeFloorRatio: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full accent-[var(--md-primary)] cursor-pointer"
                    />
                  </div>

                  <div className="p-2.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-1">
                    <div className="flex items-center justify-between type-body-sm">
                      <label
                        htmlFor="ctrl-weekend-ratio"
                        className="text-[var(--md-on-surface-variant)]"
                      >
                        Weekend ratio
                      </label>
                      <span className="font-medium text-[var(--md-on-surface)]">
                        {Math.round(
                          activeSeasonality.weekendToWeekdayRatio * 100
                        )}
                        %
                      </span>
                    </div>
                    <input
                      id="ctrl-weekend-ratio"
                      type="range"
                      min={20}
                      max={100}
                      step={5}
                      value={Math.round(
                        activeSeasonality.weekendToWeekdayRatio * 100
                      )}
                      onChange={(e) =>
                        handleSeasonalityChange({
                          ...activeSeasonality,
                          weekendToWeekdayRatio: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full accent-[var(--md-primary)] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            TAB 4: COMMERCIAL DISCOUNTS (FSP Tier & PT GSU Discount %)
            2 Spacious Cards in 1 Row
            ------------------------------------------------------------------- */}
        {activeConfigTab === 'discounts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* CARD 4A: Flexible Spend Commitment (FSP Tier on PayGo & Batch) */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between min-w-0">
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="type-title-sm text-[var(--md-on-surface)]">
                      Flexible Spend Commitment (FSP discount on PayGo & batch)
                    </h3>
                    <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                      Company-wide spend commitment discounting variable Standard PayGo, Priority PayGo, and Batch tokens
                    </p>
                  </div>
                  {renderImpactBadge(
                    impactBadges.commercialDiscountDeltaUsd,
                    'total discount savings',
                    '0% list price'
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {(
                    [
                      {
                        tier: 'uncommitted',
                        key: 'uncommittedDiscount',
                        label: 'Option A: Uncommitted (PayGo list)',
                        val: Math.round(
                          (globalConfig.fspDiscounts.uncommittedDiscount ?? 0) *
                            100
                        ),
                      },
                      {
                        tier: 'oneYearFsp',
                        key: 'oneYearCommitDiscount',
                        label: 'Option B: 1-year FSP commitment',
                        val: Math.round(
                          globalConfig.fspDiscounts.oneYearCommitDiscount * 100
                        ),
                      },
                      {
                        tier: 'threeYearFsp',
                        key: 'threeYearCommitDiscount',
                        label: 'Option C: 3-year FSP commitment',
                        val: Math.round(
                          globalConfig.fspDiscounts.threeYearCommitDiscount *
                            100
                        ),
                      },
                    ] as const
                  ).map((item) => {
                    const isSelected = activeFspTier === item.tier;
                    return (
                      <div
                        key={item.tier}
                        className="p-3 rounded-[8px] bg-[var(--md-surface-container-lowest)] flex flex-wrap items-center justify-between gap-3"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectFspTier(item.tier)}
                          aria-pressed={isSelected}
                          className={`${
                            isSelected
                              ? 'md-chip-filter-selected'
                              : 'md-chip-filter'
                          } cursor-pointer`}
                        >
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{item.label}</span>
                        </button>

                        <label className="inline-flex items-center gap-1.5 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                          <span>Discount: -</span>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            step={1}
                            aria-label={`${item.label} PayGo discount percentage`}
                            value={item.val}
                            onChange={(e) => {
                              const pct = Math.max(
                                0,
                                Math.min(60, Number(e.target.value))
                              );
                              onChangeGlobalConfig({
                                ...globalConfig,
                                fspDiscounts: {
                                  ...globalConfig.fspDiscounts,
                                  [item.key]: pct / 100,
                                },
                              });
                            }}
                            className="w-16 h-[30px] px-2 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-md tabular-nums"
                          />
                          <span>% PayGo</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                Note: FSP discounts apply exclusively to variable PayGo and Batch spend. Fixed PT GSU subscriptions use the dedicated PT discount on the right.
              </div>
            </div>

            {/* CARD 4B: Provisioned Throughput (PT GSU) Commercial Discount */}
            <div className="p-5 rounded-[12px] bg-[var(--md-surface-container)] space-y-4 flex flex-col justify-between min-w-0">
              <div className="space-y-4">
                <div>
                  <h3 className="type-title-sm text-[var(--md-on-surface)]">
                    Provisioned Throughput (PT GSU) commercial discount (%)
                  </h3>
                  <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-0.5">
                    Contractual discount applied to fixed monthly reserved GSU subscriptions across all lots
                  </p>
                </div>

                <div className="p-4 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-3 tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="ctrl-pt-discount-input"
                      className="type-label-md text-[var(--md-on-surface)]"
                    >
                      PT GSU discount percentage
                    </label>
                    <div className="inline-flex items-center gap-1.5">
                      <span>-</span>
                      <input
                        id="ctrl-pt-discount-input"
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
                        className="w-16 h-[32px] px-2 rounded-[6px] bg-[var(--md-surface-container)] border border-[var(--md-outline)] text-right text-[var(--md-on-surface)] type-label-md tabular-nums"
                      />
                      <span className="type-label-md text-[var(--md-on-surface-variant)]">
                        % PT
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={1}
                    aria-label="PT GSU commercial discount slider"
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

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[0, 0.1, 0.2, 0.3, 0.4].map((val) => {
                      const pct = Math.round(val * 100);
                      const isSelected = Math.abs(ptDiscount - val) < 0.005;
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() =>
                            onChangeGlobalConfig({
                              ...globalConfig,
                              fspDiscounts: {
                                ...globalConfig.fspDiscounts,
                                ptDiscount: val,
                              },
                            })
                          }
                          className={`${
                            isSelected
                              ? 'md-chip-filter-selected'
                              : 'md-chip-filter'
                          } cursor-pointer tabular-nums`}
                        >
                          <span>-{pct}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Net Monthly GSU Price Preview */}
              <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] flex flex-wrap items-center justify-between gap-2 type-body-sm text-[var(--md-on-surface-variant)] tabular-nums">
                <span>
                  Net EU/US 1-year GSU rate:{' '}
                  <strong className="text-[var(--md-on-surface)]">
                    $
                    {Math.round(
                      EU_GSU_MONTHLY_PRICE_USD['1_YEAR'] * (1 - ptDiscount)
                    ).toLocaleString()}
                    /GSU/mo
                  </strong>{' '}
                  (list $2,200/mo)
                </span>
                <span>
                  Break-even utilization:{' '}
                  <strong className="text-[var(--md-on-surface)]">
                    {Math.round(scopeGsuMetrics.breakEvenUtil * 100)}%
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
