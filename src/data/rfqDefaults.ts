export type ThinkingLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type PtSizingMode = 'MIN_FLOOR' | 'DAYTIME_FLOOR' | 'OPTIMAL_TCO' | 'MANUAL' | 'NONE';
export type GsuCommitTerm = '1_MONTH' | '3_MONTH' | '1_YEAR';
export type ThinkingEnvelopeMode = 'ADD_ON_TOP' | 'FIXED_TOTAL';
export type EndpointLocation = 'global' | 'eu' | 'us';
export type CapacityRampMode = 'SMOOTH_MONTHLY' | 'ANNUAL_STEPS';

export interface LotConfig {
  id: 'lot1' | 'lot2' | 'lot3' | 'lot4';
  lotNumber: number;
  name: string;
  shortName: string;
  subtitle: string;
  modelId: string;
  modelDisplayName: string;
  endpointLocation?: EndpointLocation;
  region: string;
  /** Yearly RFQ total token volumes in Millions of tokens (e.g. 750,000 = 750B tokens) */
  volumesM: {
    y1: number; // 2027
    y2: number; // 2028
    y3: number; // 2029
  };
  /** Share of total lot tokens served by Google Gemini models (0..1, default 1.0 = 100%) */
  googleShare?: number;
  /** Percentage of total tokens that are Input tokens (0..1) */
  inputRatio: number;
  /** Percentage of Input tokens served from Context Cache (0..1) */
  cacheRatio: number;
  /** Percentage of total workload executed via Batch API (-50% PayGo, not on PT) */
  batchRatio: number;
  /** Thinking configuration for Gemini 3.8 Flash (Lots 1 & 2) */
  supportsThinkingLevel: boolean;
  thinkingLevel: ThinkingLevel;
  /** Thinking tokens generated per 1.0 visible output token when thinking is active */
  thinkingMultiplierByLevel: Record<ThinkingLevel, number>;
  /** Lot 4 specific sub-model mix (Nano Banana 2 Lite, Nano Banana 2, Nano Banana Pro) */
  imageMix?: {
    nb2Lite: number;
    nb2: number;
    nbPro: number;
    textOutputShareOfOutput: number;
  };
  /** EU Multi-Region (+10%) Standard PayGo reference prices ($ USD per 1M tokens) */
  euPricesPer1M: {
    inputNonCached: number;
    inputCached: number;
    outputTextAndThinking: number;
    outputImage?: number;
  };
  /** Official Gemini Enterprise GSU throughput & burndown rates */
  gsuSpec: {
    throughputPerGsuPerSec: number; // burndown-adjusted tokens/sec per GSU
    burndownWeights: {
      inputNonCached: number;
      inputCached: number;
      outputTextAndThinking: number;
      outputImage?: number;
    };
  };
  /** Provisioned Throughput sizing mode & manual GSU overrides per year */
  ptSizingMode: PtSizingMode;
  manualGsus: {
    y1: number;
    y2: number;
    y3: number;
  };
}

export interface GlobalSimConfig {
  /** Priority PayGo price multiplier over Standard PayGo (Official = 1.8x) */
  priorityPayGoMultiplier: number;
  /** Percentage of On-Demand PayGo spillover requests that hit 429/retry with Priority PayGo (default 0.05 = 5%) */
  payGoRetryToPriorityRatio: number;
  /** Batch API discount factor relative to Standard PayGo (Official = 0.50 = 50% discount) */
  batchPriceMultiplier: number;
  /** GSU Monthly Commit Term (1_MONTH, 3_MONTH, 1_YEAR) */
  gsuCommitTerm: GsuCommitTerm;
  /** Whether Lot 1 & Lot 2 pool their Provisioned Throughput GSUs */
  poolLot1AndLot2Gsus: boolean;
  /** How Thinking Level affects token volume: add thinking tokens on top of RFQ output, or keep total RFQ tokens fixed */
  thinkingEnvelopeMode: ThinkingEnvelopeMode;
  /** 36-month Provisioned Throughput GSU ramping mode: progressive monthly ramp (M1–M36) vs 3 flat annual steps (Y1/Y2/Y3) */
  capacityRampMode?: CapacityRampMode;
  /** Seasonality parameters for Public General Bot (24h x 7d) */
  seasonality: {
    preset: 'PUBLIC_CONSUMER_BOT' | 'B2B_CUSTOMER_CARE' | 'FLAT_24_7';
    nighttimeFloorRatio: number;
    weekendToWeekdayRatio: number;
    peakAmplitude: number;
  };
  /** Commercial Discount percentages: PayGo FSP tiers (Option A/B/C) and Provisioned Throughput (PT GSU) discount */
  fspDiscounts: {
    uncommittedDiscount?: number;    // default 0.0 (Option A PayGo discount %)
    oneYearCommitDiscount: number;   // default 0.10 (-10% on PayGo SKUs)
    threeYearCommitDiscount: number; // default 0.20 (-20% on PayGo SKUs)
    ptDiscount?: number;             // default 0.20 (-20% commercial discount on PT GSU subscriptions)
  };
}

export const EU_GSU_MONTHLY_PRICE_USD: Record<GsuCommitTerm, number> = {
  '1_MONTH': 2970, // $2,700 Global * 1.10 Non-Global (EU / US)
  '3_MONTH': 2640, // $2,400 Global * 1.10 Non-Global (EU / US)
  '1_YEAR': 2200,  // $2,000 Global * 1.10 Non-Global (EU / US)
};

export const ENDPOINT_LOCATION_SPECS: Record<
  EndpointLocation,
  {
    id: EndpointLocation;
    label: string;
    shortLabel: string;
    regionDisplay: string;
    multiplierVsGlobal: number;
    factorVsEuBaseline: number;
  }
> = {
  global: {
    id: 'global',
    label: 'global (1.00× base)',
    shortLabel: 'global (1.00×)',
    regionDisplay: 'global (Global Dynamic Endpoint · 1.00× base)',
    multiplierVsGlobal: 1.0,
    factorVsEuBaseline: 1.0 / 1.1,
  },
  eu: {
    id: 'eu',
    label: 'eu (+10% EU)',
    shortLabel: 'eu (+10%)',
    regionDisplay: 'eu (Europe Multi-Region · +10%)',
    multiplierVsGlobal: 1.1,
    factorVsEuBaseline: 1.0,
  },
  us: {
    id: 'us',
    label: 'us (+10% US)',
    shortLabel: 'us (+10%)',
    regionDisplay: 'us (US Multi-Region · +10%)',
    multiplierVsGlobal: 1.1,
    factorVsEuBaseline: 1.0,
  },
};

export function getLotEffectivePricesPer1M(lot: LotConfig) {
  const loc = lot.endpointLocation ?? 'eu';
  const factor = ENDPOINT_LOCATION_SPECS[loc].factorVsEuBaseline;
  return {
    inputNonCached: Number((lot.euPricesPer1M.inputNonCached * factor).toFixed(4)),
    inputCached: Number((lot.euPricesPer1M.inputCached * factor).toFixed(5)),
    outputTextAndThinking: Number(
      (lot.euPricesPer1M.outputTextAndThinking * factor).toFixed(4)
    ),
    outputImage:
      lot.euPricesPer1M.outputImage !== undefined
        ? Number((lot.euPricesPer1M.outputImage * factor).toFixed(4))
        : undefined,
  };
}

export function getLotEffectiveGsuMonthlyPriceUsd(
  lot: LotConfig,
  term: GsuCommitTerm,
  ptDiscount = 0
): number {
  const loc = lot.endpointLocation ?? 'eu';
  const factor = ENDPOINT_LOCATION_SPECS[loc].factorVsEuBaseline;
  const listMonthly = Math.round(EU_GSU_MONTHLY_PRICE_USD[term] * factor);
  return Number((listMonthly * (1 - ptDiscount)).toFixed(2));
}

/**
 * Helper to compute blended Lot 4 EU prices and GSU specs from the 3 Nano Banana image models
 * All in EU Multi-Region (+10% Non-Global uplift in USD)
 */
export function getLot4BlendedEuSpecs(mix: NonNullable<LotConfig['imageMix']>) {
  // Official EU Non-Global (+10%) USD prices per 1M tokens:
  // 1. Gemini 3.1 Flash-Lite Image (Nano Banana 2 Lite): In $0.275, Out Txt $1.65, Out Img $33.00 | GSU: 4,030 tok/s (1 : 6 : 120)
  // 2. Gemini 3.1 Flash Image (Nano Banana 2):          In $0.550, Out Txt $3.30, Out Img $66.00 | GSU: 2,015 tok/s (1 : 6 : 120)
  // 3. Gemini 3 Pro Image (Nano Banana Pro):            In $2.200, Out Txt $13.20, Out Img $132.00 | GSU: 500 tok/s (1 : 6 : 60)
  const wLite = mix.nb2Lite;
  const wFlash = mix.nb2;
  const wPro = mix.nbPro;
  const sumW = Math.max(0.0001, wLite + wFlash + wPro);

  const nLite = wLite / sumW;
  const nFlash = wFlash / sumW;
  const nPro = wPro / sumW;

  const inputNonCached = nLite * 0.275 + nFlash * 0.55 + nPro * 2.20;
  const inputCached = inputNonCached * 0.10;
  const outputText = nLite * 1.65 + nFlash * 3.30 + nPro * 13.20;
  const outputImage = nLite * 33.0 + nFlash * 66.0 + nPro * 132.0;

  // Official GSU throughput per second from Google Cloud supported-models documentation:
  // - Gemini 3.1 Flash-Lite Image (NB2 Lite): 4,030 burndown tok/s (weights 1 : 6 : 120)
  // - Gemini 3.1 Flash Image (NB2):          2,015 burndown tok/s (weights 1 : 6 : 120)
  // - Gemini 3 Pro Image (NB Pro):             500 burndown tok/s (weights 1 : 6 : 60)
  const unitPriceBase = inputNonCached; // 1 input token = 1 burndown token
  const throughputPerGsuPerSec =
    nLite * 4030 + nFlash * 2015 + nPro * 500;

  return {
    euPricesPer1M: {
      inputNonCached,
      inputCached,
      outputTextAndThinking: outputText,
      outputImage,
    },
    gsuSpec: {
      throughputPerGsuPerSec,
      burndownWeights: {
        inputNonCached: 1.0,
        inputCached: 0.1,
        outputTextAndThinking: outputText / unitPriceBase,
        outputImage: outputImage / unitPriceBase,
      },
    },
  };
}

export const DEFAULT_GLOBAL_CONFIG: GlobalSimConfig = {
  priorityPayGoMultiplier: 1.8, // Verified 1.8x Priority PayGo uplift across Gemini 3 models
  payGoRetryToPriorityRatio: 0.05, // 5% of PayGo overflow requests retry on Priority PayGo
  batchPriceMultiplier: 0.5, // 50% discount on Batch API
  gsuCommitTerm: '1_YEAR', // $2,200 / GSU / month in EU
  poolLot1AndLot2Gsus: false, // Full separation of Lots: each Lot has 100% independent GSU capacity
  thinkingEnvelopeMode: 'FIXED_TOTAL', // Keep RFQ baseline token volume fixed by default (same baseline as Excel sheet, adjustable)
  capacityRampMode: 'SMOOTH_MONTHLY', // Progressive monthly GSU & workload ramp across M1–M36 by default
  seasonality: {
    preset: 'PUBLIC_CONSUMER_BOT',
    nighttimeFloorRatio: 0.22,
    weekendToWeekdayRatio: 0.75,
    peakAmplitude: 1.0,
  },
  fspDiscounts: {
    uncommittedDiscount: 0.0,      // 0% Option A PayGo discount by default (editable)
    oneYearCommitDiscount: 0.10,   // -10% FSP 1Y Commit (PayGo/Priority/Batch)
    threeYearCommitDiscount: 0.20, // -20% FSP 3Y Commit (PayGo/Priority/Batch)
    ptDiscount: 0.20,              // -20% PT GSU commercial discount by default (editable in Hypotheses & Overview)
  },
};

const defaultLot4Mix = {
  nb2Lite: 0.0,
  nb2: 1.0,
  nbPro: 0.0,
  textOutputShareOfOutput: 0.05,
};
const defaultLot4Specs = getLot4BlendedEuSpecs(defaultLot4Mix);

export const DEFAULT_LOTS: LotConfig[] = [
  {
    id: 'lot1',
    lotNumber: 1,
    name: 'Lot 1 · Frontier / Complex Reasoning',
    shortName: 'Lot 1 (High Thinking)',
    subtitle:
      'Complex reasoning & agentic workflows · Upgraded from Gemini 3.1 Pro to Gemini 3.8 Flash (High Thinking)',
    modelId: 'gemini-3.8-flash',
    modelDisplayName: 'Gemini 3.8 Flash (High Thinking)',
    endpointLocation: 'eu',
    region: 'eu (Europe Multi-Region · +10%)',
    volumesM: {
      y1: 750_000,   // 750 Billion tokens
      y2: 1_230_000, // 1.23 Trillion tokens
      y3: 1_790_000, // 1.79 Trillion tokens
    },
    googleShare: 1.0,
    inputRatio: 0.80,
    cacheRatio: 0.15,
    batchRatio: 0.0,
    supportsThinkingLevel: true,
    thinkingLevel: 'HIGH',
    thinkingMultiplierByLevel: {
      LOW: 0.15,
      MEDIUM: 0.40,
      HIGH: 0.85,
    },
    euPricesPer1M: {
      inputNonCached: 1.65,        // $1.50 Global * 1.10 EU
      inputCached: 0.165,          // $0.15 Global * 1.10 EU
      outputTextAndThinking: 8.25, // $7.50 Global * 1.10 EU
    },
    gsuSpec: {
      throughputPerGsuPerSec: 675, // Official 675 burndown tokens/sec per GSU for Gemini 3.8 Flash
      burndownWeights: {
        inputNonCached: 1.0,
        inputCached: 0.1,
        outputTextAndThinking: 5.0, // Official 1 output/thinking token = 5 burndown tokens
      },
    },
    ptSizingMode: 'MIN_FLOOR',
    manualGsus: { y1: 12, y2: 20, y3: 29 },
  },
  {
    id: 'lot2',
    lotNumber: 2,
    name: 'Lot 2 · Balanced / Polyvalent Model',
    shortName: 'Lot 2 (Med/Low Thinking)',
    subtitle:
      'Polyvalent B2C assistant & summarization workloads · Gemini 3.8 Flash (Medium or Low Thinking selectable)',
    modelId: 'gemini-3.8-flash',
    modelDisplayName: 'Gemini 3.8 Flash (Medium / Low Thinking)',
    endpointLocation: 'eu',
    region: 'eu (Europe Multi-Region · +10%)',
    volumesM: {
      y1: 3_250_000, // 3.25 Trillion tokens
      y2: 4_470_000, // 4.47 Trillion tokens
      y3: 5_950_000, // 5.95 Trillion tokens
    },
    googleShare: 1.0,
    inputRatio: 0.80,
    cacheRatio: 0.15,
    batchRatio: 0.0,
    supportsThinkingLevel: true,
    thinkingLevel: 'MEDIUM',
    thinkingMultiplierByLevel: {
      LOW: 0.0,
      MEDIUM: 0.25,
      HIGH: 0.85,
    },
    euPricesPer1M: {
      inputNonCached: 1.65,
      inputCached: 0.165,
      outputTextAndThinking: 8.25,
    },
    gsuSpec: {
      throughputPerGsuPerSec: 675,
      burndownWeights: {
        inputNonCached: 1.0,
        inputCached: 0.1,
        outputTextAndThinking: 5.0,
      },
    },
    ptSizingMode: 'MIN_FLOOR',
    manualGsus: { y1: 50, y2: 68, y3: 91 },
  },
  {
    id: 'lot3',
    lotNumber: 3,
    name: 'Lot 3 · Low-Cost / Mini / Nano Model',
    shortName: 'Lot 3 (3.5 Flash-Lite)',
    subtitle:
      'High-volume classification, routing & low-latency chat · Gemini 3.5 Flash-Lite',
    modelId: 'gemini-3.5-flash-lite',
    modelDisplayName: 'Gemini 3.5 Flash-Lite',
    endpointLocation: 'eu',
    region: 'eu (Europe Multi-Region · +10%)',
    volumesM: {
      y1: 5_500_000,  // 5.50 Trillion tokens
      y2: 9_820_000,  // 9.82 Trillion tokens
      y3: 15_220_000, // 15.22 Trillion tokens
    },
    googleShare: 1.0,
    inputRatio: 0.80,
    cacheRatio: 0.15,
    batchRatio: 0.0,
    supportsThinkingLevel: false,
    thinkingLevel: 'LOW',
    thinkingMultiplierByLevel: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    },
    euPricesPer1M: {
      inputNonCached: 0.33,        // $0.30 Global * 1.10 EU
      inputCached: 0.033,          // $0.03 Global * 1.10 EU
      outputTextAndThinking: 2.75, // $2.50 Global * 1.10 EU
    },
    gsuSpec: {
      throughputPerGsuPerSec: 3360, // Official 3,360 burndown tokens/sec per GSU
      burndownWeights: {
        inputNonCached: 1.0,
        inputCached: 0.1,
        outputTextAndThinking: 9.0, // Official 1 output token = 9 burndown tokens
      },
    },
    ptSizingMode: 'MIN_FLOOR',
    manualGsus: { y1: 22, y2: 39, y3: 60 },
  },
  {
    id: 'lot4',
    lotNumber: 4,
    name: 'Lot 4 · Image Generation Models',
    shortName: 'Lot 4 (NB2 · Gemini 3.1 Flash Image)',
    subtitle:
      'Image generation & visual editing · Default: Nano Banana 2 (Gemini 3.1 Flash Image)',
    modelId: 'gemini-3.1-flash-image',
    modelDisplayName: 'Nano Banana 2 (Gemini 3.1 Flash Image)',
    endpointLocation: 'eu',
    region: 'eu (Europe Multi-Region · +10%)',
    volumesM: {
      y1: 95_000,  // 95 Billion tokens
      y2: 180_000, // 180 Billion tokens
      y3: 287_000, // 287 Billion tokens
    },
    googleShare: 1.0,
    inputRatio: 0.05, // 5% Input tokens, 95% Output tokens
    cacheRatio: 0.0,
    batchRatio: 0.0,
    supportsThinkingLevel: false,
    thinkingLevel: 'MEDIUM', // Default tier: NB2 (Nano Banana 2)
    thinkingMultiplierByLevel: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    },
    imageMix: defaultLot4Mix,
    euPricesPer1M: defaultLot4Specs.euPricesPer1M,
    gsuSpec: defaultLot4Specs.gsuSpec,
    ptSizingMode: 'MIN_FLOOR',
    manualGsus: { y1: 25, y2: 47, y3: 75 },
  },
];
