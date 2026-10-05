import {
  EU_GSU_MONTHLY_PRICE_USD,
  GlobalSimConfig,
  LotConfig,
  PtSizingMode,
  getLot4BlendedEuSpecs,
  getLotEffectiveGsuMonthlyPriceUsd,
  getLotEffectivePricesPer1M,
} from '../data/rfqDefaults';
import { generateWeeklyTrafficProfile, HourlyTrafficPoint } from './seasonality';

export type YearKey = 'y1' | 'y2' | 'y3';

export interface YearLotSimulationResult {
  lotId: LotConfig['id'];
  yearKey: YearKey;
  yearNumber: 2027 | 2028 | 2029;
  /** Total tokens (in Millions) */
  totalTokensM: number;
  batchTokensM: number;
  realtimeTokensM: number;
  /** Detailed token breakdown (in Millions) across all consumption modes */
  tokensBreakdownM: {
    inputNonCachedM: number;
    inputCachedM: number;
    outputTextAndThinkingM: number;
    thinkingTokensIncludedM: number;
    outputImageM: number;
  };
  /** Weighted price per 1M real-time tokens ($ USD in EU) at Standard PayGo */
  blendedStandardPayGoPricePer1M: number;
  /** Weighted burndown tokens per 1 real-time token */
  blendedBurndownPerToken: number;
  /** Annual real-time burndown tokens (in Millions) */
  annualRealtimeBurndownTokensM: number;
  /** Average burndown tokens/sec and average GSUs needed at flat 24/7 mean */
  avgBurndownTokensPerSec: number;
  avgGsuDemand: number;
  minHourlyGsuDemand: number;
  daytimeFloorGsuDemand: number;
  optimalTcoGsuDemand: number;
  peakHourlyGsuDemand: number;
  /** Provisioned GSUs allocated to this Lot (or share of pool) */
  provisionedGsus: number;
  /** Break-even GSU utilization rate (0..1) for this lot's model and endpoint */
  breakEvenUtilization: number;
  /** Monthly GSU ramp range within this year (e.g. M1..M12 in SMOOTH_MONTHLY mode) */
  minMonthlyGsus: number;
  maxMonthlyGsus: number;
  /** Traffic routing shares (0..1 of TOTAL tokens including Batch) */
  routingSharesOfTotal: {
    ptShare: number;
    standardPayGoShare: number;
    priorityPayGoShare: number;
    batchShare: number;
  };
  /** Traffic routing shares (0..1 of REAL-TIME online tokens) */
  realtimeRouting: {
    ptCoveredFraction: number;
    spilloverFraction: number;
    standardPayGoFraction: number;
    priorityPayGoFraction: number;
    ptUtilizationRate: number; // 0..1 (actual PT tokens served / max PT capacity)
    unusedPtCapacityFraction: number;
  };
  /** Annual Costs in USD ($), BEFORE commercial FSP commit discounts */
  annualCostsListUsd: {
    /** Baseline if 100% of real-time tokens were on Standard PayGo + Batch (0 PT, 0 Priority) */
    purePayGoBaselineCostUsd: number;
    /** Baseline if 100% PayGo with the same 429 retry % routed to Priority PayGo (0 PT) */
    payGoWithPriorityRetryCostUsd: number;
    /** Hybrid Architecture Cost Breakdown */
    ptGsuAnnualCostUsd: number;
    standardPayGoSpilloverCostUsd: number;
    priorityPayGoRetryCostUsd: number;
    batchCostUsd: number;
    hybridTotalCostUsd: number;
  };
  /** Annual Costs in USD ($), AFTER 1-Year and 3-Year FSP Commit Discounts */
  annualCostsFspUsd: {
    uncommitted: {
      purePayGoUsd: number;
      hybridTotalUsd: number;
    };
    oneYearFsp: {
      purePayGoUsd: number;
      hybridTotalUsd: number;
    };
    threeYearFsp: {
      purePayGoUsd: number;
      hybridTotalUsd: number;
    };
  };
}

export interface HourlyChartSeriesPoint {
  hourIndex: number;
  dayName: string;
  hourOfDay: number;
  isWeekend: boolean;
  totalDemandGsus: number;
  ptCeilingGsus: number;
  ptCoveredGsus: number;
  unusedPtGsus: number;
  standardPayGoSpilloverGsus: number;
  priorityPayGoRetryGsus: number;
}

export interface MonthlySimulationPoint {
  monthIndex: number; // 0..35
  monthNumber: number; // 1..36
  yearKey: YearKey;
  yearNumber: 2027 | 2028 | 2029;
  monthInYear: number; // 1..12
  monthLabel: string; // 'Jan 2027' .. 'Dec 2029'
  shortMonthLabel: string; // 'M1' .. 'M36'
  quarterLabel: string; // 'Q1 2027' .. 'Q4 2029'
  /** Volume in Millions of tokens for this month */
  totalTokensM: number;
  realtimeTokensM: number;
  batchTokensM: number;
  ptCoveredTokensM: number;
  standardPayGoTokensM: number;
  priorityPayGoTokensM: number;
  /** GSU demand & capacity for this month */
  avgGsuDemand: number;
  minFloorGsuDemand: number;
  daytimeFloorGsuDemand: number;
  optimalTcoGsuDemand: number;
  peakGsuDemand: number;
  /** Active provisioned GSUs in the selected capacityRampMode */
  provisionedGsus: number;
  /** Comparison GSU series for both modes (Progressive Monthly vs 3 Annual Steps) */
  smoothMonthlyGsus: number;
  annualStepGsus: number;
  ptUtilizationRate: number;
  smoothMonthlyUtilizationRate: number;
  annualStepUtilizationRate: number;
  /** Monthly Costs ($ USD) before FSP commit discounts */
  listCostsUsd: {
    purePayGoBaselineUsd: number;
    ptGsuMonthlyCostUsd: number;
    standardPayGoSpilloverUsd: number;
    priorityPayGoRetryUsd: number;
    batchCostUsd: number;
    hybridTotalUsd: number;
  };
  /** Monthly Costs ($ USD) after FSP commit discounts (for active mode + comparison of both ramp modes) */
  fspCostsUsd: {
    uncommitted: {
      purePayGoUsd: number;
      hybridTotalUsd: number;
      smoothMonthlyHybridUsd: number;
      annualStepHybridUsd: number;
    };
    oneYearFsp: {
      purePayGoUsd: number;
      hybridTotalUsd: number;
      smoothMonthlyHybridUsd: number;
      annualStepHybridUsd: number;
    };
    threeYearFsp: {
      purePayGoUsd: number;
      hybridTotalUsd: number;
      smoothMonthlyHybridUsd: number;
      annualStepHybridUsd: number;
    };
  };
}

export interface FullSimulationOutput {
  weeklyProfile: HourlyTrafficPoint[];
  activeFspDiscountRate: number;
  avgBreakEvenUtilization: number;
  byLotAndYear: Record<LotConfig['id'], Record<YearKey, YearLotSimulationResult>>;
  pooledLot1And2HourlyByYear: Record<YearKey, HourlyChartSeriesPoint[]>;
  hourlyByLotAndYear: Record<LotConfig['id'], Record<YearKey, HourlyChartSeriesPoint[]>>;
  monthlyByLot: Record<LotConfig['id'], MonthlySimulationPoint[]>;
  monthlyTotals: MonthlySimulationPoint[];
  totalsByYear: Record<
    YearKey,
    {
      totalTokensM: number;
      totalProvisionedGsus: number;
      avgPtUtilization: number;
      uncommitted: {
        purePayGoUsd: number;
        payGoWithPriorityUsd: number;
        hybridTotalUsd: number;
        ptCostUsd: number;
        standardPayGoUsd: number;
        priorityPayGoUsd: number;
        batchCostUsd: number;
      };
      oneYearFsp: {
        purePayGoUsd: number;
        hybridTotalUsd: number;
      };
      threeYearFsp: {
        purePayGoUsd: number;
        hybridTotalUsd: number;
      };
    }
  >;
  threeYearCumulated: {
    totalTokensM: number;
    uncommitted: {
      purePayGoUsd: number;
      payGoWithPriorityUsd: number;
      hybridTotalUsd: number;
      ptCostUsd: number;
      standardPayGoUsd: number;
      priorityPayGoUsd: number;
      batchCostUsd: number;
    };
    oneYearFsp: {
      purePayGoUsd: number;
      hybridTotalUsd: number;
    };
    threeYearFsp: {
      purePayGoUsd: number;
      hybridTotalUsd: number;
    };
  };
}

const SECONDS_PER_YEAR = 365 * 24 * 3600; // 31,536,000

/**
 * Calculates optimal GSU count for a given hourly demand array `hourlyDemandGsus` (length 168)
 * based on the selected PtSizingMode.
 */
export function selectGsuCapacityForProfile(
  hourlyDemandGsus: number[],
  weeklyProfile: HourlyTrafficPoint[],
  mode: PtSizingMode,
  manualGsu: number,
  gsuAnnualCostUsd: number,
  annualPayGoValuePerFullGsuUsd: number,
  effectivePayGoOverflowMultiplier: number // e.g. (1 - retry) * 1.0 + retry * 1.8
): {
  selectedGsus: number;
  minFloorGsus: number;
  daytimeFloorGsus: number;
  optimalTcoGsus: number;
  peakGsus: number;
} {
  const minRaw = Math.min(...hourlyDemandGsus);
  const maxRaw = Math.max(...hourlyDemandGsus);
  const daytimeDemands = hourlyDemandGsus.filter((_, i) => weeklyProfile[i].isDaytime);
  const daytimeMinRaw = daytimeDemands.length > 0 ? Math.min(...daytimeDemands) : minRaw;

  // Minimum traffic floor: integer GSU floor (at least 1 if traffic > 0.5 GSU)
  const minFloorGsus = minRaw >= 0.5 ? Math.max(1, Math.floor(minRaw)) : 0;
  const daytimeFloorGsus = daytimeMinRaw >= 0.5 ? Math.max(1, Math.round(daytimeMinRaw)) : 0;
  const peakGsus = Math.ceil(maxRaw);

  // Mathematically optimal TCO GSU count:
  // Adding 1 marginal GSU costs `gsuAnnualCostUsd` per year.
  // If that marginal GSU is utilized in a fraction `u` of the 168 hours, it replaces
  // `u * annualPayGoValuePerFullGsuUsd * effectivePayGoOverflowMultiplier` of PayGo+Priority spend.
  // Therefore, adding the K-th GSU reduces total cost as long as:
  // u(K) >= gsuAnnualCostUsd / (annualPayGoValuePerFullGsuUsd * effectivePayGoOverflowMultiplier)
  const breakEvenUtilization = Math.min(
    1.0,
    gsuAnnualCostUsd /
      Math.max(1, annualPayGoValuePerFullGsuUsd * effectivePayGoOverflowMultiplier)
  );

  // Sort hourly demands descending to find the threshold exceeded `breakEvenUtilization` of the week
  const sortedDesc = [...hourlyDemandGsus].sort((a, b) => b - a);
  const targetHourIdx = Math.min(
    sortedDesc.length - 1,
    Math.max(0, Math.floor(breakEvenUtilization * sortedDesc.length) - 1)
  );
  const optimalTcoGsus = Math.max(0, Math.round(sortedDesc[targetHourIdx]));

  let selectedGsus = minFloorGsus;
  switch (mode) {
    case 'NONE':
      selectedGsus = 0;
      break;
    case 'MIN_FLOOR':
      selectedGsus = minFloorGsus;
      break;
    case 'DAYTIME_FLOOR':
      selectedGsus = daytimeFloorGsus;
      break;
    case 'OPTIMAL_TCO':
      selectedGsus = optimalTcoGsus;
      break;
    case 'MANUAL':
      selectedGsus = Math.max(0, Math.round(manualGsu));
      break;
  }

  return {
    selectedGsus,
    minFloorGsus,
    daytimeFloorGsus,
    optimalTcoGsus,
    peakGsus,
  };
}

/**
 * Evaluates PT coverage vs Spillover for an array of 168 hourly GSU demands and a fixed GSU ceiling
 */
function evaluateHourlyCoverage(
  hourlyDemandGsus: number[],
  weeklyProfile: HourlyTrafficPoint[],
  ptCeilingGsus: number,
  retryRatio: number
): {
  ptCoveredFraction: number;
  spilloverFraction: number;
  standardPayGoFraction: number;
  priorityPayGoFraction: number;
  ptUtilizationRate: number;
  unusedPtCapacityFraction: number;
  series: HourlyChartSeriesPoint[];
} {
  let totalDemand = 0;
  let totalCovered = 0;
  let totalSpillover = 0;
  const totalPtCapacityAvailable = ptCeilingGsus * hourlyDemandGsus.length;

  const series: HourlyChartSeriesPoint[] = hourlyDemandGsus.map((demand, idx) => {
    const covered = Math.min(demand, ptCeilingGsus);
    const spill = Math.max(0, demand - ptCeilingGsus);
    const unused = Math.max(0, ptCeilingGsus - demand);
    const prioSpill = spill * retryRatio;
    const stdSpill = spill * (1 - retryRatio);

    totalDemand += demand;
    totalCovered += covered;
    totalSpillover += spill;

    return {
      hourIndex: idx,
      dayName: weeklyProfile[idx].dayName,
      hourOfDay: weeklyProfile[idx].hourOfDay,
      isWeekend: weeklyProfile[idx].isWeekend,
      totalDemandGsus: demand,
      ptCeilingGsus,
      ptCoveredGsus: covered,
      unusedPtGsus: unused,
      standardPayGoSpilloverGsus: stdSpill,
      priorityPayGoRetryGsus: prioSpill,
    };
  });

  const ptCoveredFraction = totalDemand > 0 ? totalCovered / totalDemand : 0;
  const spilloverFraction = totalDemand > 0 ? totalSpillover / totalDemand : 0;
  const standardPayGoFraction = spilloverFraction * (1 - retryRatio);
  const priorityPayGoFraction = spilloverFraction * retryRatio;
  const ptUtilizationRate =
    totalPtCapacityAvailable > 0 ? totalCovered / totalPtCapacityAvailable : 0;
  const unusedPtCapacityFraction =
    totalPtCapacityAvailable > 0 ? 1 - ptUtilizationRate : 0;

  return {
    ptCoveredFraction,
    spilloverFraction,
    standardPayGoFraction,
    priorityPayGoFraction,
    ptUtilizationRate,
    unusedPtCapacityFraction,
    series,
  };
}

export function runFullSimulation(
  lotsInput: LotConfig[],
  globalConfig: GlobalSimConfig,
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp' = 'threeYearFsp'
): FullSimulationOutput {
  // Refresh Lot 4 blended EU specs if imageMix changed
  const lots = lotsInput.map((lot) => {
    if (lot.id === 'lot4' && lot.imageMix) {
      const updated = getLot4BlendedEuSpecs(lot.imageMix);
      return {
        ...lot,
        euPricesPer1M: updated.euPricesPer1M,
        gsuSpec: updated.gsuSpec,
      };
    }
    return lot;
  });

  const activeFspDiscountRate =
    activeFspTier === 'oneYearFsp'
      ? globalConfig.fspDiscounts.oneYearCommitDiscount
      : activeFspTier === 'threeYearFsp'
      ? globalConfig.fspDiscounts.threeYearCommitDiscount
      : globalConfig.fspDiscounts.uncommittedDiscount ?? 0;

  const ptDiscountRate = globalConfig.fspDiscounts.ptDiscount ?? 0;
  const weeklyProfile = generateWeeklyTrafficProfile(globalConfig.seasonality);
  const gsuMonthlyPrice =
    EU_GSU_MONTHLY_PRICE_USD[globalConfig.gsuCommitTerm] * (1 - ptDiscountRate);
  const gsuAnnualCostUsd = gsuMonthlyPrice * 12;
  const retryRatio = globalConfig.payGoRetryToPriorityRatio;
  const prioMult = globalConfig.priorityPayGoMultiplier;
  // Since FSP discounts PayGo/Priority by (1 - activeFspDiscountRate) while PT GSU is discounted by ptDiscountRate,
  // the effective PayGo overflow value that 1 GSU replaces is scaled by (1 - activeFspDiscountRate):
  const effectiveOverflowMult =
    ((1 - retryRatio) * 1.0 + retryRatio * prioMult) *
    (1 - activeFspDiscountRate);

  const years: { key: YearKey; num: 2027 | 2028 | 2029 }[] = [
    { key: 'y1', num: 2027 },
    { key: 'y2', num: 2028 },
    { key: 'y3', num: 2029 },
  ];

  // Step 1: Precompute token breakdown & raw hourly GSU demand per Lot & Year
  interface LotYearPrecalc {
    lot: LotConfig;
    yearKey: YearKey;
    yearNumber: 2027 | 2028 | 2029;
    lotGsuAnnualCostUsd: number;
    breakEvenUtilization: number;
    totalTokensM: number;
    batchTokensM: number;
    realtimeTokensM: number;
    tokensBreakdownM: YearLotSimulationResult['tokensBreakdownM'];
    blendedStandardPayGoPricePer1M: number;
    blendedBurndownPerToken: number;
    annualRealtimeBurndownTokensM: number;
    avgBurndownTokensPerSec: number;
    avgGsuDemand: number;
    hourlyDemandGsus: number[];
    annualPayGoValuePerFullGsuUsd: number;
    batchCostUsd: number;
    realtimeFullStandardPayGoCostUsd: number;
  }

  const precalcMap: Record<LotConfig['id'], Record<YearKey, LotYearPrecalc>> = {
    lot1: {} as any,
    lot2: {} as any,
    lot3: {} as any,
    lot4: {} as any,
  };

  for (const lot of lots) {
    const effectivePrices = getLotEffectivePricesPer1M(lot);
    const lotGsuMonthlyPriceUsd = getLotEffectiveGsuMonthlyPriceUsd(
      lot,
      globalConfig.gsuCommitTerm,
      ptDiscountRate
    );
    const lotGsuAnnualCostUsd = lotGsuMonthlyPriceUsd * 12;

    for (const yr of years) {
      const googleShare = Math.max(0, Math.min(1, lot.googleShare ?? 1.0));
      const rawRfqVolumeM = lot.volumesM[yr.key];
      const baseVolumeM = rawRfqVolumeM * googleShare;

      // Also compute unit ratios on a positive reference volume so blended unit price & burndown stay defined even at 0% share
      const refVolM = baseVolumeM > 0 ? baseVolumeM : Math.max(1, rawRfqVolumeM);
      const baseInputM = baseVolumeM * lot.inputRatio;
      const baseVisibleOutputM = baseVolumeM * (1 - lot.inputRatio);

      const refBaseInputM = refVolM * lot.inputRatio;
      const refBaseVisibleOutputM = refVolM * (1 - lot.inputRatio);

      // Apply Thinking Level multiplier for Lots supporting thinking (Lot 1 & 2)
      let effectiveInputM = baseInputM;
      let effectiveOutputTextAndThinkingM = baseVisibleOutputM;
      let thinkingTokensIncludedM = 0;

      let refInputM = refBaseInputM;
      let refOutputTextAndThinkingM = refBaseVisibleOutputM;

      if (lot.supportsThinkingLevel) {
        const thinkMult = lot.thinkingMultiplierByLevel[lot.thinkingLevel] ?? 0;
        if (globalConfig.thinkingEnvelopeMode === 'ADD_ON_TOP') {
          thinkingTokensIncludedM = baseVisibleOutputM * thinkMult;
          effectiveOutputTextAndThinkingM = baseVisibleOutputM + thinkingTokensIncludedM;
          refOutputTextAndThinkingM = refBaseVisibleOutputM * (1 + thinkMult);
        } else {
          const extraShift = (thinkMult - 0.25) * 0.06;
          const adjustedOutputRatio = Math.min(
            0.65,
            Math.max(0.05, 1 - lot.inputRatio + Math.max(0, extraShift))
          );
          effectiveOutputTextAndThinkingM = baseVolumeM * adjustedOutputRatio;
          effectiveInputM = baseVolumeM * (1 - adjustedOutputRatio);
          thinkingTokensIncludedM =
            effectiveOutputTextAndThinkingM * (thinkMult / (1 + thinkMult));

          refOutputTextAndThinkingM = refVolM * adjustedOutputRatio;
          refInputM = refVolM * (1 - adjustedOutputRatio);
        }
      }

      let outputImageM = 0;
      let refOutputImageM = 0;
      if (lot.id === 'lot4' && lot.imageMix) {
        const textShare = lot.imageMix.textOutputShareOfOutput;
        outputImageM = effectiveOutputTextAndThinkingM * (1 - textShare);
        effectiveOutputTextAndThinkingM = effectiveOutputTextAndThinkingM * textShare;

        refOutputImageM = refOutputTextAndThinkingM * (1 - textShare);
        refOutputTextAndThinkingM = refOutputTextAndThinkingM * textShare;
      }

      const totalTokensM =
        effectiveInputM + effectiveOutputTextAndThinkingM + outputImageM;
      const inputCachedM = effectiveInputM * lot.cacheRatio;
      const inputNonCachedM = effectiveInputM * (1 - lot.cacheRatio);

      const refTotalTokensM =
        refInputM + refOutputTextAndThinkingM + refOutputImageM;
      const refInputCachedM = refInputM * lot.cacheRatio;
      const refInputNonCachedM = refInputM * (1 - lot.cacheRatio);

      // Price per 1M tokens using the Lot's selected endpoint location (global, eu, us)
      const totalStandardPayGoIf100PctRealtimeUsd =
        inputNonCachedM * effectivePrices.inputNonCached +
        inputCachedM * effectivePrices.inputCached +
        effectiveOutputTextAndThinkingM * effectivePrices.outputTextAndThinking +
        outputImageM * (effectivePrices.outputImage ?? 0);

      const refTotalStandardPayGoUsd =
        refInputNonCachedM * effectivePrices.inputNonCached +
        refInputCachedM * effectivePrices.inputCached +
        refOutputTextAndThinkingM * effectivePrices.outputTextAndThinking +
        refOutputImageM * (effectivePrices.outputImage ?? 0);

      const blendedStandardPayGoPricePer1M =
        refTotalTokensM > 0 ? refTotalStandardPayGoUsd / refTotalTokensM : 0;

      // Split between Batch (carved out first at 0.5x Standard PayGo) and Real-Time Online
      const batchTokensM = totalTokensM * lot.batchRatio;
      const realtimeTokensM = totalTokensM * (1 - lot.batchRatio);

      const batchCostUsd =
        totalStandardPayGoIf100PctRealtimeUsd *
        lot.batchRatio *
        globalConfig.batchPriceMultiplier;
      const realtimeFullStandardPayGoCostUsd =
        totalStandardPayGoIf100PctRealtimeUsd * (1 - lot.batchRatio);

      // Burndown calculation for Real-Time Online tokens
      const totalBurndownIf100PctRealtimeM =
        inputNonCachedM * lot.gsuSpec.burndownWeights.inputNonCached +
        inputCachedM * lot.gsuSpec.burndownWeights.inputCached +
        effectiveOutputTextAndThinkingM *
          lot.gsuSpec.burndownWeights.outputTextAndThinking +
        outputImageM * (lot.gsuSpec.burndownWeights.outputImage ?? 0);

      const refTotalBurndownM =
        refInputNonCachedM * lot.gsuSpec.burndownWeights.inputNonCached +
        refInputCachedM * lot.gsuSpec.burndownWeights.inputCached +
        refOutputTextAndThinkingM *
          lot.gsuSpec.burndownWeights.outputTextAndThinking +
        refOutputImageM * (lot.gsuSpec.burndownWeights.outputImage ?? 0);

      const annualRealtimeBurndownTokensM =
        totalBurndownIf100PctRealtimeM * (1 - lot.batchRatio);
      const blendedBurndownPerToken =
        refTotalTokensM > 0 ? refTotalBurndownM / refTotalTokensM : 1;

      const avgBurndownTokensPerSec =
        (annualRealtimeBurndownTokensM * 1_000_000) / SECONDS_PER_YEAR;
      const avgGsuDemand =
        avgBurndownTokensPerSec / lot.gsuSpec.throughputPerGsuPerSec;

      const hourlyDemandGsus = weeklyProfile.map((pt) => avgGsuDemand * pt.weight);

      const burndownTokensPerGsuPerYearM =
        (lot.gsuSpec.throughputPerGsuPerSec * SECONDS_PER_YEAR) / 1_000_000;
      const tokensPerGsuPerYearM =
        blendedBurndownPerToken > 0
          ? burndownTokensPerGsuPerYearM / blendedBurndownPerToken
          : 0;
      const annualPayGoValuePerFullGsuUsd =
        tokensPerGsuPerYearM * blendedStandardPayGoPricePer1M;
      const breakEvenUtilization = Math.min(
        1.0,
        lotGsuAnnualCostUsd /
          Math.max(1, annualPayGoValuePerFullGsuUsd * effectiveOverflowMult)
      );

      precalcMap[lot.id][yr.key] = {
        lot,
        yearKey: yr.key,
        yearNumber: yr.num,
        lotGsuAnnualCostUsd,
        breakEvenUtilization,
        totalTokensM,
        batchTokensM,
        realtimeTokensM,
        tokensBreakdownM: {
          inputNonCachedM,
          inputCachedM,
          outputTextAndThinkingM: effectiveOutputTextAndThinkingM,
          thinkingTokensIncludedM,
          outputImageM,
        },
        blendedStandardPayGoPricePer1M,
        blendedBurndownPerToken,
        annualRealtimeBurndownTokensM,
        avgBurndownTokensPerSec,
        avgGsuDemand,
        hourlyDemandGsus,
        annualPayGoValuePerFullGsuUsd,
        batchCostUsd,
        realtimeFullStandardPayGoCostUsd,
      };
    }
  }

  // Average break-even utilization across Lot 2 (using Lot 2's active endpoint location)
  const avgBreakEvenUtilization = precalcMap.lot2.y1.breakEvenUtilization;

  // Step 2: Calculate PT GSU sizing & 36-month ramp routing (handling Lot 1 + Lot 2 pooling if enabled)
  const activeRampMode = globalConfig.capacityRampMode ?? 'SMOOTH_MONTHLY';
  const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  /**
   * Computes 12 relative monthly volume multipliers per year (mean = 1.0000 in each year)
   * such that the 36-month trajectory (M1..M36) is continuous and cliff-free across
   * Dec 2027 -> Jan 2028 and Dec 2028 -> Jan 2029 while preserving exact annual RFQ sums.
   */
  const computeSmoothMonthlyMultipliers = (
    y1TokensM: number,
    y2TokensM: number,
    y3TokensM: number
  ): Record<YearKey, number[]> => {
    const v1 = y1TokensM / 12;
    const v2 = y2TokensM / 12;
    const v3 = y3TokensM / 12;

    const s2 = (v3 - v1) / 24;
    const s1 = (v2 - v1) / 6 - s2;
    const s3 = (v3 - v2) / 6 - s2;

    const maxNormSlope = 0.68 / 5.5; // Ensures Month 1 is at least 32% of the year's monthly mean
    const normSlope1 = Math.max(0, Math.min(maxNormSlope, s1 / Math.max(1, v1)));
    const normSlope2 = Math.max(0, Math.min(maxNormSlope, s2 / Math.max(1, v2)));
    const normSlope3 = Math.max(0, Math.min(maxNormSlope, s3 / Math.max(1, v3)));

    const build12 = (normSlope: number) =>
      Array.from({ length: 12 }, (_, j) => 1 + normSlope * (j - 5.5));

    return {
      y1: build12(normSlope1),
      y2: build12(normSlope2),
      y3: build12(normSlope3),
    };
  };

  /**
   * Builds a 12-month integer GSU ramp schedule around `baseGsus` whose 12-month mean
   * is identically `baseGsus` (sum = 12 * baseGsus).
   */
  const buildSmoothMonthlyGsusForYear = (
    baseGsus: number,
    multipliers: number[]
  ): number[] => {
    if (baseGsus <= 0) return Array(12).fill(0);
    const series = new Array<number>(12).fill(baseGsus);
    for (let j = 0; j < 6; j++) {
      const gEarly = Math.max(0, Math.round(baseGsus * multipliers[j]));
      const gLate = Math.max(gEarly, 2 * baseGsus - gEarly);
      series[j] = gEarly;
      series[11 - j] = gLate;
    }
    return series;
  };

  const lotMultipliersMap: Record<LotConfig['id'], Record<YearKey, number[]>> = {
    lot1: computeSmoothMonthlyMultipliers(
      precalcMap.lot1.y1.totalTokensM,
      precalcMap.lot1.y2.totalTokensM,
      precalcMap.lot1.y3.totalTokensM
    ),
    lot2: computeSmoothMonthlyMultipliers(
      precalcMap.lot2.y1.totalTokensM,
      precalcMap.lot2.y2.totalTokensM,
      precalcMap.lot2.y3.totalTokensM
    ),
    lot3: computeSmoothMonthlyMultipliers(
      precalcMap.lot3.y1.totalTokensM,
      precalcMap.lot3.y2.totalTokensM,
      precalcMap.lot3.y3.totalTokensM
    ),
    lot4: computeSmoothMonthlyMultipliers(
      precalcMap.lot4.y1.totalTokensM,
      precalcMap.lot4.y2.totalTokensM,
      precalcMap.lot4.y3.totalTokensM
    ),
  };

  const byLotAndYear: FullSimulationOutput['byLotAndYear'] = {
    lot1: {} as any,
    lot2: {} as any,
    lot3: {} as any,
    lot4: {} as any,
  };
  const hourlyByLotAndYear: FullSimulationOutput['hourlyByLotAndYear'] = {
    lot1: {} as any,
    lot2: {} as any,
    lot3: {} as any,
    lot4: {} as any,
  };
  const pooledLot1And2HourlyByYear: FullSimulationOutput['pooledLot1And2HourlyByYear'] = {
    y1: [],
    y2: [],
    y3: [],
  };
  const monthlyByLot: FullSimulationOutput['monthlyByLot'] = {
    lot1: [],
    lot2: [],
    lot3: [],
    lot4: [],
  };

  for (let yrIdx = 0; yrIdx < years.length; yrIdx++) {
    const yr = years[yrIdx];
    const lotSizings: Record<
      LotConfig['id'],
      ReturnType<typeof selectGsuCapacityForProfile>
    > = {} as any;

    for (const lot of lots) {
      const p = precalcMap[lot.id][yr.key];
      lotSizings[lot.id] = selectGsuCapacityForProfile(
        p.hourlyDemandGsus,
        weeklyProfile,
        lot.ptSizingMode,
        lot.manualGsus[yr.key],
        p.lotGsuAnnualCostUsd,
        p.annualPayGoValuePerFullGsuUsd,
        effectiveOverflowMult
      );
    }

    // Build pooled Lot 1 + Lot 2 hourly series
    const p1 = precalcMap.lot1[yr.key];
    const p2 = precalcMap.lot2[yr.key];
    const combinedDemand12 = p1.hourlyDemandGsus.map(
      (d1, idx) => d1 + p2.hourlyDemandGsus[idx]
    );
    const combinedGsus12 =
      lotSizings.lot1.selectedGsus + lotSizings.lot2.selectedGsus;
    const pooledEval12 = evaluateHourlyCoverage(
      combinedDemand12,
      weeklyProfile,
      combinedGsus12,
      retryRatio
    );
    pooledLot1And2HourlyByYear[yr.key] = pooledEval12.series;

    for (const lot of lots) {
      const p = precalcMap[lot.id][yr.key];
      const sizing = lotSizings[lot.id];
      const multipliers = lotMultipliersMap[lot.id][yr.key];
      const smoothGsuSeries = buildSmoothMonthlyGsusForYear(
        sizing.selectedGsus,
        multipliers
      );

      const isPooled12 =
        globalConfig.poolLot1AndLot2Gsus && (lot.id === 'lot1' || lot.id === 'lot2');

      const individualEval = evaluateHourlyCoverage(
        p.hourlyDemandGsus,
        weeklyProfile,
        sizing.selectedGsus,
        retryRatio
      );
      hourlyByLotAndYear[lot.id][yr.key] = individualEval.series;

      const baseAnnualEval = isPooled12 ? pooledEval12 : individualEval;
      const provisionedGsus = sizing.selectedGsus;
      const lotGsuMonthlyCostUsd = p.lotGsuAnnualCostUsd / 12;

      // Simulate all 12 months of this year under both SMOOTH_MONTHLY and ANNUAL_STEPS
      let annualStepWeightedPtCoveredTokensM = 0;
      let annualStepWeightedStdSpillTokensM = 0;
      let annualStepWeightedPrioRetryTokensM = 0;
      let annualStepWeightedUtilSum = 0;

      let smoothWeightedPtCoveredTokensM = 0;
      let smoothWeightedStdSpillTokensM = 0;
      let smoothWeightedPrioRetryTokensM = 0;
      let smoothWeightedUtilSum = 0;

      for (let mInYr = 0; mInYr < 12; mInYr++) {
        const monthIndex = yrIdx * 12 + mInYr;
        const monthNumber = monthIndex + 1;
        const r = multipliers[mInYr];

        const mTotalTokensM = (p.totalTokensM / 12) * r;
        const mRealtimeTokensM = (p.realtimeTokensM / 12) * r;
        const mBatchTokensM = (p.batchTokensM / 12) * r;
        const mBatchCostUsd = (p.batchCostUsd / 12) * r;
        const mRealtimeFullStdPayGoUsd =
          (p.realtimeFullStandardPayGoCostUsd / 12) * r;
        const mPurePayGoBaselineUsd = mRealtimeFullStdPayGoUsd + mBatchCostUsd;

        const mHourlyDemand = p.hourlyDemandGsus.map((d) => d * r);
        const smoothGsus = smoothGsuSeries[mInYr];
        const stepGsus = sizing.selectedGsus;

        const evalSmooth = isPooled12
          ? baseAnnualEval
          : evaluateHourlyCoverage(
              mHourlyDemand,
              weeklyProfile,
              smoothGsus,
              retryRatio
            );
        const evalStep = isPooled12
          ? baseAnnualEval
          : evaluateHourlyCoverage(
              mHourlyDemand,
              weeklyProfile,
              stepGsus,
              retryRatio
            );

        smoothWeightedPtCoveredTokensM +=
          mRealtimeTokensM * evalSmooth.ptCoveredFraction;
        smoothWeightedStdSpillTokensM +=
          mRealtimeTokensM * evalSmooth.standardPayGoFraction;
        smoothWeightedPrioRetryTokensM +=
          mRealtimeTokensM * evalSmooth.priorityPayGoFraction;
        smoothWeightedUtilSum += smoothGsus * evalSmooth.ptUtilizationRate;

        annualStepWeightedPtCoveredTokensM +=
          mRealtimeTokensM * evalStep.ptCoveredFraction;
        annualStepWeightedStdSpillTokensM +=
          mRealtimeTokensM * evalStep.standardPayGoFraction;
        annualStepWeightedPrioRetryTokensM +=
          mRealtimeTokensM * evalStep.priorityPayGoFraction;
        annualStepWeightedUtilSum += stepGsus * evalStep.ptUtilizationRate;

        const activeMonthEval =
          activeRampMode === 'SMOOTH_MONTHLY' ? evalSmooth : evalStep;
        const activeMonthGsus =
          activeRampMode === 'SMOOTH_MONTHLY' ? smoothGsus : stepGsus;

        const mSmoothPtCostUsd = smoothGsus * lotGsuMonthlyCostUsd;
        const mSmoothStdSpillUsd =
          mRealtimeFullStdPayGoUsd * evalSmooth.standardPayGoFraction;
        const mSmoothPrioRetryUsd =
          mRealtimeFullStdPayGoUsd * evalSmooth.priorityPayGoFraction * prioMult;

        const mStepPtCostUsd = stepGsus * lotGsuMonthlyCostUsd;
        const mStepStdSpillUsd =
          mRealtimeFullStdPayGoUsd * evalStep.standardPayGoFraction;
        const mStepPrioRetryUsd =
          mRealtimeFullStdPayGoUsd * evalStep.priorityPayGoFraction * prioMult;

        const mActivePtCostUsd =
          activeRampMode === 'SMOOTH_MONTHLY' ? mSmoothPtCostUsd : mStepPtCostUsd;
        const mActiveStdSpillUsd =
          activeRampMode === 'SMOOTH_MONTHLY'
            ? mSmoothStdSpillUsd
            : mStepStdSpillUsd;
        const mActivePrioRetryUsd =
          activeRampMode === 'SMOOTH_MONTHLY'
            ? mSmoothPrioRetryUsd
            : mStepPrioRetryUsd;
        const mActiveHybridListUsd =
          mActivePtCostUsd +
          mActiveStdSpillUsd +
          mActivePrioRetryUsd +
          mBatchCostUsd;

        const buildMonthFspTier = (discRate: number) => {
          const mult = 1 - discRate;
          const purePayGoUsd = mPurePayGoBaselineUsd * mult;
          const smoothMonthlyHybridUsd =
            mSmoothPtCostUsd +
            (mSmoothStdSpillUsd + mSmoothPrioRetryUsd + mBatchCostUsd) * mult;
          const annualStepHybridUsd =
            mStepPtCostUsd +
            (mStepStdSpillUsd + mStepPrioRetryUsd + mBatchCostUsd) * mult;
          const hybridTotalUsd =
            activeRampMode === 'SMOOTH_MONTHLY'
              ? smoothMonthlyHybridUsd
              : annualStepHybridUsd;
          return {
            purePayGoUsd,
            hybridTotalUsd,
            smoothMonthlyHybridUsd,
            annualStepHybridUsd,
          };
        };

        const quarterNum = Math.floor(mInYr / 3) + 1;
        monthlyByLot[lot.id].push({
          monthIndex,
          monthNumber,
          yearKey: yr.key,
          yearNumber: yr.num,
          monthInYear: mInYr + 1,
          monthLabel: `${MONTH_NAMES[mInYr]} ${yr.num}`,
          shortMonthLabel: `M${monthNumber}`,
          quarterLabel: `Q${quarterNum} ${yr.num}`,
          totalTokensM: mTotalTokensM,
          realtimeTokensM: mRealtimeTokensM,
          batchTokensM: mBatchTokensM,
          ptCoveredTokensM:
            mRealtimeTokensM * activeMonthEval.ptCoveredFraction,
          standardPayGoTokensM:
            mRealtimeTokensM * activeMonthEval.standardPayGoFraction,
          priorityPayGoTokensM:
            mRealtimeTokensM * activeMonthEval.priorityPayGoFraction,
          avgGsuDemand: p.avgGsuDemand * r,
          minFloorGsuDemand: sizing.minFloorGsus * r,
          daytimeFloorGsuDemand: sizing.daytimeFloorGsus * r,
          optimalTcoGsuDemand: Math.round(sizing.optimalTcoGsus * r),
          peakGsuDemand: sizing.peakGsus * r,
          provisionedGsus: activeMonthGsus,
          smoothMonthlyGsus: smoothGsus,
          annualStepGsus: stepGsus,
          ptUtilizationRate: activeMonthEval.ptUtilizationRate,
          smoothMonthlyUtilizationRate: evalSmooth.ptUtilizationRate,
          annualStepUtilizationRate: evalStep.ptUtilizationRate,
          listCostsUsd: {
            purePayGoBaselineUsd: mPurePayGoBaselineUsd,
            ptGsuMonthlyCostUsd: mActivePtCostUsd,
            standardPayGoSpilloverUsd: mActiveStdSpillUsd,
            priorityPayGoRetryUsd: mActivePrioRetryUsd,
            batchCostUsd: mBatchCostUsd,
            hybridTotalUsd: mActiveHybridListUsd,
          },
          fspCostsUsd: {
            uncommitted: buildMonthFspTier(
              globalConfig.fspDiscounts.uncommittedDiscount ?? 0
            ),
            oneYearFsp: buildMonthFspTier(
              globalConfig.fspDiscounts.oneYearCommitDiscount
            ),
            threeYearFsp: buildMonthFspTier(
              globalConfig.fspDiscounts.threeYearCommitDiscount
            ),
          },
        });
      }

      // Compute effective annual fractions from the active ramp mode
      const totalAnnualGsuMonths = provisionedGsus * 12;
      const effectivePtCoveredFraction =
        p.realtimeTokensM > 0
          ? (activeRampMode === 'SMOOTH_MONTHLY'
              ? smoothWeightedPtCoveredTokensM
              : annualStepWeightedPtCoveredTokensM) / p.realtimeTokensM
          : baseAnnualEval.ptCoveredFraction;
      const effectiveStdSpillFraction =
        p.realtimeTokensM > 0
          ? (activeRampMode === 'SMOOTH_MONTHLY'
              ? smoothWeightedStdSpillTokensM
              : annualStepWeightedStdSpillTokensM) / p.realtimeTokensM
          : baseAnnualEval.standardPayGoFraction;
      const effectivePrioRetryFraction =
        p.realtimeTokensM > 0
          ? (activeRampMode === 'SMOOTH_MONTHLY'
              ? smoothWeightedPrioRetryTokensM
              : annualStepWeightedPrioRetryTokensM) / p.realtimeTokensM
          : baseAnnualEval.priorityPayGoFraction;
      const effectiveSpilloverFraction =
        effectiveStdSpillFraction + effectivePrioRetryFraction;
      const effectivePtUtilizationRate =
        totalAnnualGsuMonths > 0
          ? (activeRampMode === 'SMOOTH_MONTHLY'
              ? smoothWeightedUtilSum
              : annualStepWeightedUtilSum) / totalAnnualGsuMonths
          : 0;

      const ptGsuAnnualCostUsd = provisionedGsus * p.lotGsuAnnualCostUsd;
      const standardPayGoSpilloverCostUsd =
        p.realtimeFullStandardPayGoCostUsd * effectiveStdSpillFraction;
      const priorityPayGoRetryCostUsd =
        p.realtimeFullStandardPayGoCostUsd *
        effectivePrioRetryFraction *
        prioMult;
      const batchCostUsd = p.batchCostUsd;

      const hybridTotalCostUsd =
        ptGsuAnnualCostUsd +
        standardPayGoSpilloverCostUsd +
        priorityPayGoRetryCostUsd +
        batchCostUsd;

      const purePayGoBaselineCostUsd =
        p.realtimeFullStandardPayGoCostUsd + batchCostUsd;
      const payGoWithPriorityRetryCostUsd =
        p.realtimeFullStandardPayGoCostUsd *
          ((1 - retryRatio) * 1.0 + retryRatio * prioMult) +
        batchCostUsd;

      // IMPORTANT: Provisioned Throughput (GSU subscription commit) is NEVER discounted by FSP!
      // FSP discounts (1Y -10%, 3Y -20%) apply strictly to PayGo consumption SKUs (Standard PayGo, Priority PayGo, Batch).
      const applyFsp = (discountRate: number) => {
        const payGoMultiplier = 1 - discountRate;
        return {
          purePayGoUsd: purePayGoBaselineCostUsd * payGoMultiplier,
          hybridTotalUsd:
            ptGsuAnnualCostUsd +
            (standardPayGoSpilloverCostUsd +
              priorityPayGoRetryCostUsd +
              batchCostUsd) *
              payGoMultiplier,
        };
      };

      const realtimeShareOfTotal =
        p.totalTokensM > 0 ? p.realtimeTokensM / p.totalTokensM : 0;
      const batchShareOfTotal =
        p.totalTokensM > 0 ? p.batchTokensM / p.totalTokensM : 0;

      const minMonthlyGsus =
        activeRampMode === 'SMOOTH_MONTHLY'
          ? Math.min(...smoothGsuSeries)
          : provisionedGsus;
      const maxMonthlyGsus =
        activeRampMode === 'SMOOTH_MONTHLY'
          ? Math.max(...smoothGsuSeries)
          : provisionedGsus;

      byLotAndYear[lot.id][yr.key] = {
        lotId: lot.id,
        yearKey: yr.key,
        yearNumber: yr.num,
        totalTokensM: p.totalTokensM,
        batchTokensM: p.batchTokensM,
        realtimeTokensM: p.realtimeTokensM,
        tokensBreakdownM: p.tokensBreakdownM,
        blendedStandardPayGoPricePer1M: p.blendedStandardPayGoPricePer1M,
        blendedBurndownPerToken: p.blendedBurndownPerToken,
        annualRealtimeBurndownTokensM: p.annualRealtimeBurndownTokensM,
        avgBurndownTokensPerSec: p.avgBurndownTokensPerSec,
        avgGsuDemand: p.avgGsuDemand,
        minHourlyGsuDemand: sizing.minFloorGsus,
        daytimeFloorGsuDemand: sizing.daytimeFloorGsus,
        optimalTcoGsuDemand: sizing.optimalTcoGsus,
        peakHourlyGsuDemand: sizing.peakGsus,
        provisionedGsus,
        breakEvenUtilization: p.breakEvenUtilization,
        minMonthlyGsus,
        maxMonthlyGsus,
        routingSharesOfTotal: {
          ptShare: realtimeShareOfTotal * effectivePtCoveredFraction,
          standardPayGoShare: realtimeShareOfTotal * effectiveStdSpillFraction,
          priorityPayGoShare: realtimeShareOfTotal * effectivePrioRetryFraction,
          batchShare: batchShareOfTotal,
        },
        realtimeRouting: {
          ptCoveredFraction: effectivePtCoveredFraction,
          spilloverFraction: effectiveSpilloverFraction,
          standardPayGoFraction: effectiveStdSpillFraction,
          priorityPayGoFraction: effectivePrioRetryFraction,
          ptUtilizationRate: effectivePtUtilizationRate,
          unusedPtCapacityFraction: Math.max(0, 1 - effectivePtUtilizationRate),
        },
        annualCostsListUsd: {
          purePayGoBaselineCostUsd,
          payGoWithPriorityRetryCostUsd,
          ptGsuAnnualCostUsd,
          standardPayGoSpilloverCostUsd,
          priorityPayGoRetryCostUsd,
          batchCostUsd,
          hybridTotalCostUsd,
        },
        annualCostsFspUsd: {
          uncommitted: applyFsp(
            globalConfig.fspDiscounts.uncommittedDiscount ?? 0
          ),
          oneYearFsp: applyFsp(globalConfig.fspDiscounts.oneYearCommitDiscount),
          threeYearFsp: applyFsp(
            globalConfig.fspDiscounts.threeYearCommitDiscount
          ),
        },
      };
    }
  }

  // Build 36-month combined series across all 4 lots (monthlyTotals)
  const monthlyTotals: MonthlySimulationPoint[] = Array.from(
    { length: 36 },
    (_, mIdx) => {
      const m0 = monthlyByLot.lot1[mIdx];
      let totalTokensM = 0;
      let realtimeTokensM = 0;
      let batchTokensM = 0;
      let ptCoveredTokensM = 0;
      let standardPayGoTokensM = 0;
      let priorityPayGoTokensM = 0;
      let avgGsuDemand = 0;
      let minFloorGsuDemand = 0;
      let daytimeFloorGsuDemand = 0;
      let optimalTcoGsuDemand = 0;
      let peakGsuDemand = 0;
      let provisionedGsus = 0;
      let smoothMonthlyGsus = 0;
      let annualStepGsus = 0;
      let activeUtilWeightedSum = 0;
      let smoothUtilWeightedSum = 0;
      let stepUtilWeightedSum = 0;

      let purePayGoBaselineUsd = 0;
      let ptGsuMonthlyCostUsd = 0;
      let standardPayGoSpilloverUsd = 0;
      let priorityPayGoRetryUsd = 0;
      let batchCostUsd = 0;
      let hybridTotalUsd = 0;

      const fspSums = {
        uncommitted: {
          purePayGoUsd: 0,
          hybridTotalUsd: 0,
          smoothMonthlyHybridUsd: 0,
          annualStepHybridUsd: 0,
        },
        oneYearFsp: {
          purePayGoUsd: 0,
          hybridTotalUsd: 0,
          smoothMonthlyHybridUsd: 0,
          annualStepHybridUsd: 0,
        },
        threeYearFsp: {
          purePayGoUsd: 0,
          hybridTotalUsd: 0,
          smoothMonthlyHybridUsd: 0,
          annualStepHybridUsd: 0,
        },
      };

      for (const lot of lots) {
        const pt = monthlyByLot[lot.id][mIdx];
        totalTokensM += pt.totalTokensM;
        realtimeTokensM += pt.realtimeTokensM;
        batchTokensM += pt.batchTokensM;
        ptCoveredTokensM += pt.ptCoveredTokensM;
        standardPayGoTokensM += pt.standardPayGoTokensM;
        priorityPayGoTokensM += pt.priorityPayGoTokensM;
        avgGsuDemand += pt.avgGsuDemand;
        minFloorGsuDemand += pt.minFloorGsuDemand;
        daytimeFloorGsuDemand += pt.daytimeFloorGsuDemand;
        optimalTcoGsuDemand += pt.optimalTcoGsuDemand;
        peakGsuDemand += pt.peakGsuDemand;
        provisionedGsus += pt.provisionedGsus;
        smoothMonthlyGsus += pt.smoothMonthlyGsus;
        annualStepGsus += pt.annualStepGsus;

        activeUtilWeightedSum += pt.provisionedGsus * pt.ptUtilizationRate;
        smoothUtilWeightedSum +=
          pt.smoothMonthlyGsus * pt.smoothMonthlyUtilizationRate;
        stepUtilWeightedSum +=
          pt.annualStepGsus * pt.annualStepUtilizationRate;

        purePayGoBaselineUsd += pt.listCostsUsd.purePayGoBaselineUsd;
        ptGsuMonthlyCostUsd += pt.listCostsUsd.ptGsuMonthlyCostUsd;
        standardPayGoSpilloverUsd += pt.listCostsUsd.standardPayGoSpilloverUsd;
        priorityPayGoRetryUsd += pt.listCostsUsd.priorityPayGoRetryUsd;
        batchCostUsd += pt.listCostsUsd.batchCostUsd;
        hybridTotalUsd += pt.listCostsUsd.hybridTotalUsd;

        for (const tier of ['uncommitted', 'oneYearFsp', 'threeYearFsp'] as const) {
          fspSums[tier].purePayGoUsd += pt.fspCostsUsd[tier].purePayGoUsd;
          fspSums[tier].hybridTotalUsd += pt.fspCostsUsd[tier].hybridTotalUsd;
          fspSums[tier].smoothMonthlyHybridUsd +=
            pt.fspCostsUsd[tier].smoothMonthlyHybridUsd;
          fspSums[tier].annualStepHybridUsd +=
            pt.fspCostsUsd[tier].annualStepHybridUsd;
        }
      }

      return {
        monthIndex: m0.monthIndex,
        monthNumber: m0.monthNumber,
        yearKey: m0.yearKey,
        yearNumber: m0.yearNumber,
        monthInYear: m0.monthInYear,
        monthLabel: m0.monthLabel,
        shortMonthLabel: m0.shortMonthLabel,
        quarterLabel: m0.quarterLabel,
        totalTokensM,
        realtimeTokensM,
        batchTokensM,
        ptCoveredTokensM,
        standardPayGoTokensM,
        priorityPayGoTokensM,
        avgGsuDemand,
        minFloorGsuDemand,
        daytimeFloorGsuDemand,
        optimalTcoGsuDemand,
        peakGsuDemand,
        provisionedGsus,
        smoothMonthlyGsus,
        annualStepGsus,
        ptUtilizationRate:
          provisionedGsus > 0 ? activeUtilWeightedSum / provisionedGsus : 0,
        smoothMonthlyUtilizationRate:
          smoothMonthlyGsus > 0
            ? smoothUtilWeightedSum / smoothMonthlyGsus
            : 0,
        annualStepUtilizationRate:
          annualStepGsus > 0 ? stepUtilWeightedSum / annualStepGsus : 0,
        listCostsUsd: {
          purePayGoBaselineUsd,
          ptGsuMonthlyCostUsd,
          standardPayGoSpilloverUsd,
          priorityPayGoRetryUsd,
          batchCostUsd,
          hybridTotalUsd,
        },
        fspCostsUsd: fspSums,
      };
    }
  );

  // Step 3: Aggregate Totals by Year and 3-Year Cumulated
  const totalsByYear: FullSimulationOutput['totalsByYear'] = {
    y1: {} as any,
    y2: {} as any,
    y3: {} as any,
  };

  const threeYearCumulated: FullSimulationOutput['threeYearCumulated'] = {
    totalTokensM: 0,
    uncommitted: {
      purePayGoUsd: 0,
      payGoWithPriorityUsd: 0,
      hybridTotalUsd: 0,
      ptCostUsd: 0,
      standardPayGoUsd: 0,
      priorityPayGoUsd: 0,
      batchCostUsd: 0,
    },
    oneYearFsp: { purePayGoUsd: 0, hybridTotalUsd: 0 },
    threeYearFsp: { purePayGoUsd: 0, hybridTotalUsd: 0 },
  };

  for (const yr of years) {
    let totalTokensM = 0;
    let totalProvisionedGsus = 0;
    let weightedUtilSum = 0;

    let purePayGoUsd = 0;
    let payGoWithPriorityUsd = 0;
    let hybridTotalUsd = 0;
    let ptCostUsd = 0;
    let standardPayGoUsd = 0;
    let priorityPayGoUsd = 0;
    let batchCostUsd = 0;

    let oneYearPure = 0;
    let oneYearHybrid = 0;
    let threeYearPure = 0;
    let threeYearHybrid = 0;

    for (const lot of lots) {
      const res = byLotAndYear[lot.id][yr.key];
      totalTokensM += res.totalTokensM;
      totalProvisionedGsus += res.provisionedGsus;
      weightedUtilSum +=
        res.provisionedGsus * res.realtimeRouting.ptUtilizationRate;

      const uncommittedDisc = globalConfig.fspDiscounts.uncommittedDiscount ?? 0;
      purePayGoUsd += res.annualCostsFspUsd.uncommitted.purePayGoUsd;
      payGoWithPriorityUsd +=
        res.annualCostsListUsd.payGoWithPriorityRetryCostUsd *
        (1 - uncommittedDisc);
      hybridTotalUsd += res.annualCostsFspUsd.uncommitted.hybridTotalUsd;
      ptCostUsd += res.annualCostsListUsd.ptGsuAnnualCostUsd;
      standardPayGoUsd +=
        res.annualCostsListUsd.standardPayGoSpilloverCostUsd *
        (1 - uncommittedDisc);
      priorityPayGoUsd +=
        res.annualCostsListUsd.priorityPayGoRetryCostUsd *
        (1 - uncommittedDisc);
      batchCostUsd +=
        res.annualCostsListUsd.batchCostUsd * (1 - uncommittedDisc);

      oneYearPure += res.annualCostsFspUsd.oneYearFsp.purePayGoUsd;
      oneYearHybrid += res.annualCostsFspUsd.oneYearFsp.hybridTotalUsd;
      threeYearPure += res.annualCostsFspUsd.threeYearFsp.purePayGoUsd;
      threeYearHybrid += res.annualCostsFspUsd.threeYearFsp.hybridTotalUsd;
    }

    const avgPtUtilization =
      totalProvisionedGsus > 0 ? weightedUtilSum / totalProvisionedGsus : 0;

    totalsByYear[yr.key] = {
      totalTokensM,
      totalProvisionedGsus,
      avgPtUtilization,
      uncommitted: {
        purePayGoUsd,
        payGoWithPriorityUsd,
        hybridTotalUsd,
        ptCostUsd,
        standardPayGoUsd,
        priorityPayGoUsd,
        batchCostUsd,
      },
      oneYearFsp: {
        purePayGoUsd: oneYearPure,
        hybridTotalUsd: oneYearHybrid,
      },
      threeYearFsp: {
        purePayGoUsd: threeYearPure,
        hybridTotalUsd: threeYearHybrid,
      },
    };

    threeYearCumulated.totalTokensM += totalTokensM;
    threeYearCumulated.uncommitted.purePayGoUsd += purePayGoUsd;
    threeYearCumulated.uncommitted.payGoWithPriorityUsd += payGoWithPriorityUsd;
    threeYearCumulated.uncommitted.hybridTotalUsd += hybridTotalUsd;
    threeYearCumulated.uncommitted.ptCostUsd += ptCostUsd;
    threeYearCumulated.uncommitted.standardPayGoUsd += standardPayGoUsd;
    threeYearCumulated.uncommitted.priorityPayGoUsd += priorityPayGoUsd;
    threeYearCumulated.uncommitted.batchCostUsd += batchCostUsd;
    threeYearCumulated.oneYearFsp.purePayGoUsd += oneYearPure;
    threeYearCumulated.oneYearFsp.hybridTotalUsd += oneYearHybrid;
    threeYearCumulated.threeYearFsp.purePayGoUsd += threeYearPure;
    threeYearCumulated.threeYearFsp.hybridTotalUsd += threeYearHybrid;
  }

  return {
    weeklyProfile,
    activeFspDiscountRate,
    avgBreakEvenUtilization,
    byLotAndYear,
    pooledLot1And2HourlyByYear,
    hourlyByLotAndYear,
    monthlyByLot,
    monthlyTotals,
    totalsByYear,
    threeYearCumulated,
  };
}
