import React, { useMemo } from 'react';
import katex from 'katex';
import { Calculator, CheckCircle2, Layers, ShieldCheck, Sliders } from 'lucide-react';
import {
  ENDPOINT_LOCATION_SPECS,
  EU_GSU_MONTHLY_PRICE_USD,
  getLotEffectiveGsuMonthlyPriceUsd,
  getLotEffectivePricesPer1M,
  GlobalSimConfig,
  LotConfig,
  PtSizingMode,
} from '../data/rfqDefaults';
import { FullSimulationOutput, YearKey } from '../engine/simulator';
import {
  formatCurrencyExact,
  formatCurrencyMillions,
  formatPct,
  formatTokensMillions,
} from '../utils/format';

interface MethodologyAndHypothesesTabProps {
  sim: FullSimulationOutput;
  lots: LotConfig[];
  globalConfig: GlobalSimConfig;
  selectedYear: YearKey;
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
}

const LatexFormula: React.FC<{ latex: string }> = ({ latex }) => {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      }),
    [latex]
  );

  return (
    <div
      className="overflow-x-auto py-1.5 px-1 text-[var(--md-on-surface)] [&_.katex-display]:!my-1 [&_.katex-display]:!text-left [&_.katex]:!text-[0.875rem]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const formatPtSizingModeLabel = (mode: PtSizingMode): string => {
  switch (mode) {
    case 'OPTIMAL_TCO':
      return 'Optimal TCO';
    case 'MIN_FLOOR':
      return 'Minimum 24/7 floor';
    case 'DAYTIME_FLOOR':
      return 'Daytime floor (99% peak)';
    case 'NONE':
      return '0 GSUs (PayGo only)';
    case 'MANUAL':
      return 'Manual GSUs';
  }
};

export const MethodologyAndHypothesesTab: React.FC<
  MethodologyAndHypothesesTabProps
> = ({
  sim,
  lots,
  globalConfig,
  selectedYear,
  activeFspTier,
}) => {
  const ptDiscount = globalConfig.fspDiscounts.ptDiscount ?? 0.20;
  const ptDiscountPct = Math.round(ptDiscount * 100);

  const gsuListMonthly = getLotEffectiveGsuMonthlyPriceUsd(
    lots[0],
    globalConfig.gsuCommitTerm,
    0
  );
  const gsuMonthly = getLotEffectiveGsuMonthlyPriceUsd(
    lots[0],
    globalConfig.gsuCommitTerm,
    ptDiscount
  );
  const gsuAnnual = gsuMonthly * 12;

  const disc0A = globalConfig.fspDiscounts.uncommittedDiscount ?? 0;
  const disc1Y = globalConfig.fspDiscounts.oneYearCommitDiscount;
  const disc3Y = globalConfig.fspDiscounts.threeYearCommitDiscount;

  const activeDisc =
    activeFspTier === 'oneYearFsp'
      ? disc1Y
      : activeFspTier === 'threeYearFsp'
      ? disc3Y
      : disc0A;

  const activeTierLabel =
    activeFspTier === 'threeYearFsp'
      ? `Option C · 3-year FSP (-${Math.round(disc3Y * 100)}% PayGo / -${ptDiscountPct}% PT)`
      : activeFspTier === 'oneYearFsp'
      ? `Option B · 1-year FSP (-${Math.round(disc1Y * 100)}% PayGo / -${ptDiscountPct}% PT)`
      : `Option A · Uncommitted (-${Math.round(disc0A * 100)}% PayGo / -${ptDiscountPct}% PT)`;

  const exLot = lots[0];
  const exSim = sim.byLotAndYear.lot1[selectedYear];
  const exPrices = getLotEffectivePricesPer1M(exLot);
  const exYearLabel =
    selectedYear === 'y1'
      ? 'Year 1 (2027)'
      : selectedYear === 'y2'
      ? 'Year 2 (2028)'
      : 'Year 3 (2029)';

  const overflowMult =
    (1 - globalConfig.payGoRetryToPriorityRatio) * 1.0 +
    globalConfig.payGoRetryToPriorityRatio * globalConfig.priorityPayGoMultiplier;

  const euUsListGsuMo = EU_GSU_MONTHLY_PRICE_USD[globalConfig.gsuCommitTerm];
  const euUsNetGsuMo = Math.round(euUsListGsuMo * (1 - ptDiscount));
  const globalListGsuMo = Math.round(euUsListGsuMo / 1.1);
  const globalNetGsuMo = Math.round(globalListGsuMo * (1 - ptDiscount));

  const standardSpilloverSharePct = Math.round(
    (1 - globalConfig.payGoRetryToPriorityRatio) * 100
  );
  const prioritySpilloverSharePct = Math.round(
    globalConfig.payGoRetryToPriorityRatio * 100
  );

  return (
    <section
      aria-label="Hypotheses, official SKU pricing, and calculation methodology"
      className="space-y-6"
    >
      {/* SECTION 1: Plain-English Executive Overview & Active Assumptions Snapshot */}
      <div className="md-card p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--md-outline-variant)] pb-4">
          <div>
            <h2 className="type-headline-sm text-[var(--md-on-surface)]">
              Hypotheses, official SKU pricing & calculation methodology
            </h2>
            <p className="type-body-md text-[var(--md-on-surface-variant)] max-w-[75ch] mt-1">
              Read-only reference of every Google Cloud Gemini Enterprise SKU rate, regional uplift (<code>global</code> at <code>1.00×</code>, <code>eu</code> and <code>us</code> at <code>1.10×</code>), active commercial discount, and mathematical formula used in the simulator.
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] shrink-0 space-y-1 tabular-nums">
            <div className="type-label-md text-[var(--md-on-surface)]">
              Active commercial scenario (read-only snapshot)
            </div>
            <div className="type-title-md text-[var(--md-primary)]">
              {activeTierLabel}
            </div>
            <div className="type-body-sm text-[var(--md-on-surface-variant)]">
              Net GSU rate ({globalConfig.gsuCommitTerm === '1_YEAR' ? '1-year term' : 'Monthly term'}, -{ptDiscountPct}% PT):{' '}
              <strong>{formatCurrencyExact(euUsNetGsuMo)}/mo</strong> (<code>eu</code> / <code>us</code>, list {formatCurrencyExact(euUsListGsuMo)}) ·{' '}
              <strong>{formatCurrencyExact(globalNetGsuMo)}/mo</strong> (<code>global</code>, list {formatCurrencyExact(globalListGsuMo)})
            </div>
          </div>
        </div>

        {/* 3 Plain-English Explanations of the Hybrid Routing Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
            <div>
              <div className="flex items-center gap-2 text-[var(--md-on-surface)] type-label-lg">
                <Layers className="w-4 h-4 text-[var(--md-primary)] shrink-0" />
                <span>Provisioned Throughput (PT · GSUs)</span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)] mt-0.5">
                Base layer: Reserved monthly capacity at a fixed fee
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Generative Serving Units (<strong>GSUs</strong>) provide dedicated, reserved token throughput at a fixed monthly subscription: <strong>{formatCurrencyExact(euUsListGsuMo)}/GSU/mo list</strong> (<strong>{formatCurrencyExact(euUsNetGsuMo)}/mo net</strong> after the <strong>-{ptDiscountPct}% PT discount</strong>) in <code>eu</code> and <code>us</code>, or <strong>{formatCurrencyExact(globalNetGsuMo)}/mo net</strong> in <code>global</code>. All traffic below your GSU ceiling is served at $0 extra token cost.
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
            <div>
              <div className="flex items-center gap-2 text-[var(--md-on-surface)] type-label-lg">
                <Sliders className="w-4 h-4 text-[var(--md-primary)] shrink-0" />
                <span>Standard & Priority PayGo + Batch</span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)] mt-0.5">
                Burst & background layer: Variable pay-per-use pricing
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Rather than buying expensive 24/7 GSUs for brief daytime peaks, traffic above your GSU ceiling automatically spills over to on-demand <strong>Standard PayGo (1.0×)</strong>. To protect SLAs during peak congestion, <strong>{Math.round(globalConfig.payGoRetryToPriorityRatio * 100)}%</strong> of overflow uses <strong>Priority PayGo ({globalConfig.priorityPayGoMultiplier}×)</strong>. Non-urgent tasks use <strong>Async Batch (-50%)</strong>.
            </p>
          </div>

          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
            <div>
              <div className="flex items-center gap-2 text-[var(--md-on-surface)] type-label-lg">
                <ShieldCheck className="w-4 h-4 text-[var(--md-primary)] shrink-0" />
                <span>FSP discounts & regional uplifts</span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)] mt-0.5">
                Commercial rules: Non-stacking discounts & EU/US +10%
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Each of the 4 workload lots operates an <strong>independent GSU pool</strong>. Endpoints in <code>eu</code> and <code>us</code> apply the official <strong>+10% (1.10×) regional uplift</strong> over <code>global</code> (1.00×). FSP commitments (-{Math.round(disc0A * 100)}%, -{Math.round(disc1Y * 100)}%, -{Math.round(disc3Y * 100)}%) discount variable PayGo and Batch, while the <strong>-{ptDiscountPct}% PT discount</strong> applies to fixed GSUs.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Official SKU Pricing & GSU Burndown Reference Table */}
      <div className="md-card overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="type-title-md text-[var(--md-on-surface)]">
            Official SKU unit prices & GSU burndown weights
          </h3>
          <p className="type-body-sm text-[var(--md-on-surface-variant)] max-w-[75ch] mt-0.5">
            Live per-lot unit rates in USD per 1 million tokens (<code>$/1M</code>) and GSU throughput specs based on each lot's active endpoint location. Context caching reduces input token price and GSU burndown weight by 90% (<code>0.1×</code>).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="h-[48px] bg-[var(--md-surface-container-lowest)] border-b border-[var(--md-outline-variant)]">
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)]">
                  <div>Workload lot & active model</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Assigned Gemini SKU
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)]">
                  <div>Endpoint & net GSU rate</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Monthly reserved unit cost (-{ptDiscountPct}% PT)
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Uncached input ($/1M)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Standard prompt tokens
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Cached input ($/1M)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Repeated context (-90%)
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Text / thinking output ($/1M)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Generated response tokens
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Image output ($/1M)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Visual generation tokens
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>GSU capacity (tok/s)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Throughput per reserved unit
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>GSU burndown weights</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Compute weight per token type
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const effPrices = getLotEffectivePricesPer1M(lot);
                const listGsuMo = getLotEffectiveGsuMonthlyPriceUsd(
                  lot,
                  globalConfig.gsuCommitTerm,
                  0
                );
                const effGsuMo = getLotEffectiveGsuMonthlyPriceUsd(
                  lot,
                  globalConfig.gsuCommitTerm,
                  ptDiscount
                );
                const loc = lot.endpointLocation ?? 'eu';
                const locSpec = ENDPOINT_LOCATION_SPECS[loc];
                const w = lot.gsuSpec.burndownWeights;
                const weightStr =
                  lot.id === 'lot4'
                    ? `${w.inputNonCached}× In : ${w.inputCached}× Cache : ${Math.round(
                        w.outputImage ?? 120
                      )}× Img Out`
                    : `${w.inputNonCached}× In : ${w.inputCached}× Cache : ${w.outputTextAndThinking}× Out`;
                return (
                  <tr
                    key={lot.id}
                    className="h-[54px] border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] hover:bg-[var(--md-surface-container-low)] transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="type-data-cell font-medium text-[var(--md-on-surface)]">
                        Lot {lot.lotNumber} · {lot.modelDisplayName}
                      </div>
                      <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                        {locSpec.regionDisplay}
                      </div>
                    </td>
                    <td className="px-4 type-data-cell">
                      <span className="font-medium text-[var(--md-primary)]">
                        {locSpec.shortLabel}
                      </span>
                      <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                        <strong>{formatCurrencyExact(effGsuMo)}/mo</strong>{' '}
                        {ptDiscount > 0 && (
                          <span className="line-through opacity-75">
                            ({formatCurrencyExact(listGsuMo)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      ${effPrices.inputNonCached.toFixed(3)}
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      ${effPrices.inputCached.toFixed(4)}
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      ${effPrices.outputTextAndThinking.toFixed(2)}
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {effPrices.outputImage
                        ? `$${effPrices.outputImage.toFixed(2)} (~$${(
                            (effPrices.outputImage * 1120) /
                            1_000_000
                          ).toFixed(4)}/img)`
                        : '—'}
                    </td>
                    <td className="px-4 type-data-cell text-right font-medium">
                      {Math.round(lot.gsuSpec.throughputPerGsuPerSec).toLocaleString()} tok/s
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {weightStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[var(--md-surface-container)] border-t border-[var(--md-outline-variant)] type-body-sm text-[var(--md-on-surface-variant)] space-y-1.5 tabular-nums">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-[var(--md-on-surface)]">Lot 1 Gemini 4 Argon (Default) &amp; toggle reference:</strong>{' '}
              <strong>Gemini 4 Argon</strong> = $4.40 In / $0.22 Cache (-95%) / $22.00 Out &amp; Thinking in <code>eu</code> &amp; <code>us</code> (1.10×) or $4.00 / $0.20 (-95%) / $20.00 in <code>global</code> (1.00×) · 260 tok/s/GSU · Burndown: <code>1.0×</code> In, <code>0.1×</code> Cache Read, <code>6.0×</code> Out/Thinking, <code>0.0×</code> Cache Write surcharge.
            </span>
          </div>
          <div className="pt-1 border-t border-[var(--md-outline-variant)] flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-[var(--md-on-surface)]">Lot 4 Nano Banana 2 image tier reference:</strong>{' '}
              <strong>NB2 (Default · Gemini 3.1 Flash Image)</strong> = $66.00/1M Image Out in <code>eu</code> &amp; <code>us</code> (1.10×) or $60.00/1M in <code>global</code> (1.00×) · 1,120 tokens per 1K image · 2,015 tok/s/GSU.
            </span>
            <span>
              <strong>NB2 Lite:</strong> $33.00/1M (<code>eu</code>/<code>us</code>) · 4,030 tok/s/GSU · <strong>NB Pro:</strong> $132.00/1M (<code>eu</code>/<code>us</code>) · 500 tok/s/GSU.
            </span>
          </div>
          <div className="pt-1 border-t border-[var(--md-outline-variant)] flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-[var(--md-on-surface)]">Gemini 3.8 Flash 2027–2029 rate schedule (Lot 1 toggle &amp; Lot 2):</strong>{' '}
              $1.50 In / $0.15 Cache / $7.50 Out (<code>global</code> 1.00×) and $1.65 In / $0.165 Cache / $8.25 Out (<code>eu</code> &amp; <code>us</code> 1.10×) · 675 tok/s/GSU · <code>1.0× : 0.1× : 5.0×</code> burndown.
            </span>
            <span>
              <strong className="text-[var(--md-on-surface)]">Official PT SKU IDs:</strong>{' '}
              <code>9192-74A6-DE45</code> (1Y Global PT) · <code>2106-EA10-F9CC</code> (1Y Non-Global <code>eu</code>/<code>us</code> PT) · <code>F878-80F5-63BF</code> (3M Non-Global PT).
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Active Workload & Tokenomics Hypotheses per Lot */}
      <div className="md-card overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="type-title-md text-[var(--md-on-surface)]">
            Active workload & tokenomics assumptions across all 4 lots
          </h3>
          <p className="type-body-sm text-[var(--md-on-surface-variant)] max-w-[75ch] mt-0.5">
            Read-only audit snapshot of the parameters currently configured in the Global and Per-Lot tabs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="h-[48px] bg-[var(--md-surface-container-lowest)] border-b border-[var(--md-outline-variant)]">
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)]">
                  <div>Lot & sizing mode</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Active capacity rule
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Annual volumes (Y1 / Y2 / Y3)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Annual token demand
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Input / Output split</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Prompt vs response ratio
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Cached vs uncached</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Memory cache hit rate (-90%)
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Async batch offload</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Background share (-50%)
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Thinking / image tier</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Model depth or resolution
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Blended PayGo ($/1M)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Effective list rate per 1M
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Blended burndown / tok</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Average GSU weight
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const r = sim.byLotAndYear[lot.id][selectedYear];
                const inPct = Math.round(lot.inputRatio * 100);
                const outPct = 100 - inPct;
                const cachePct = Math.round(lot.cacheRatio * 100);
                const nonCachePct = 100 - cachePct;
                const batchPct = Math.round(lot.batchRatio * 100);
                const thinkingLabel =
                  lot.thinkingLevel === 'HIGH'
                    ? 'High'
                    : lot.thinkingLevel === 'MEDIUM'
                    ? 'Medium'
                    : 'Low';
                const tierDesc =
                  lot.id === 'lot4'
                    ? lot.thinkingLevel === 'MEDIUM'
                      ? 'NB2 (Default)'
                      : lot.thinkingLevel === 'LOW'
                      ? 'NB2 Lite'
                      : 'NB Pro'
                    : lot.supportsThinkingLevel
                    ? `${thinkingLabel} (${lot.thinkingMultiplierByLevel[lot.thinkingLevel]}×)`
                    : 'Standard (0×)';

                return (
                  <tr
                    key={lot.id}
                    className="h-[54px] border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] hover:bg-[var(--md-surface-container-low)] transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="type-data-cell font-medium text-[var(--md-on-surface)]">
                        {lot.shortName}
                      </div>
                      <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                        {formatPtSizingModeLabel(lot.ptSizingMode)}
                      </div>
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {formatTokensMillions(lot.volumesM.y1)} /{' '}
                      {formatTokensMillions(lot.volumesM.y2)} /{' '}
                      {formatTokensMillions(lot.volumesM.y3)}
                    </td>
                    <td className="px-4 type-data-cell text-right font-medium">
                      {inPct}% In / {outPct}% Out
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {cachePct}% Cache / {nonCachePct}% Raw
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {batchPct}% Batch / {100 - batchPct}% RT
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {tierDesc}
                    </td>
                    <td className="px-4 type-data-cell text-right font-medium text-[var(--md-primary)]">
                      ${r.blendedStandardPayGoPricePer1M.toFixed(3)}/1M
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {r.blendedBurndownPerToken.toFixed(2)}×
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Step-by-Step Mathematical Formulas & Worked Live Calculation */}
      <div className="md-card p-6 space-y-5">
        <div className="border-b border-[var(--md-outline-variant)] pb-4">
          <div className="flex items-center gap-2 text-[var(--md-on-surface)]">
            <Calculator className="w-5 h-5 text-[var(--md-primary)]" />
            <h3 className="type-title-md">
              Step-by-step calculation formulas & live worked verification
            </h3>
          </div>
          <p className="type-body-sm text-[var(--md-on-surface-variant)] mt-1">
            Mathematical equations executed by the simulation engine using comprehensible term names, paired with live numbers from <strong>{exLot.shortName}</strong> in <strong>{exYearLabel}</strong> under <strong>{activeTierLabel}</strong>.
          </p>
        </div>

        <div className="space-y-4">
          {/* Formula 1 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-3">
            <div>
              <div className="type-label-lg text-[var(--md-on-surface)]">
                1. Blended Standard PayGo Rate ($/1M tokens)
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Weighted average unit cost per 1M tokens before commercial discounts
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Annual token volume is split into Uncached Input, Context-Cached Input (-90%), and Output tokens, then weighted by each token type's SKU rate:
            </p>
            <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2.5 tabular-nums">
              <LatexFormula
                latex={String.raw`\text{Blended PayGo Rate} = \frac{\left(\text{Uncached Input} \times \text{Input Price}\right) + \left(\text{Cached Input} \times \text{Cache Price}\right) + \left(\text{Output Tokens} \times \text{Output Price}\right)}{\text{Total Annual Tokens}}`}
              />
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--md-outline-variant)] type-body-sm text-[var(--md-on-surface-variant)]">
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Uncached Input: <strong>{formatTokensMillions(exSim.tokensBreakdownM.inputNonCachedM)}</strong> × ${exPrices.inputNonCached.toFixed(2)}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Cached Input: <strong>{formatTokensMillions(exSim.tokensBreakdownM.inputCachedM)}</strong> × ${exPrices.inputCached.toFixed(2)}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Output Tokens: <strong>{formatTokensMillions(exSim.tokensBreakdownM.outputTextAndThinkingM)}</strong> × ${exPrices.outputTextAndThinking.toFixed(2)}
                </span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Live result ({exLot.shortName}, {exYearLabel}):{' '}
                <strong>
                  ${exSim.blendedStandardPayGoPricePer1M.toFixed(3)} per 1M tokens
                </strong>{' '}
                across {formatTokensMillions(exSim.totalTokensM)} total tokens
              </div>
            </div>
          </div>

          {/* Formula 2 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-3">
            <div>
              <div className="type-label-lg text-[var(--md-on-surface)]">
                2. GSU Burndown Weighting & Hourly Capacity Demand
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Translating real-time token volume into required reserved capacity units (GSUs)
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Output tokens consume more compute than input tokens and are weighted by the model's official burndown multipliers before dividing by throughput per GSU:
            </p>
            <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2.5 tabular-nums">
              <LatexFormula
                latex={String.raw`\text{Hourly GSU Demand}(h) = \frac{\Big(\text{Uncached Input} \times w_{\text{input}} + \text{Cached Input} \times w_{\text{cache}} + \text{Output} \times w_{\text{output}}\Big) \times \left(1 - \text{Batch Share}\right)}{\text{Throughput per GSU (tok/s)}}`}
              />
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--md-outline-variant)] type-body-sm text-[var(--md-on-surface-variant)]">
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Weights: <strong>{exLot.gsuSpec.burndownWeights.inputNonCached}×</strong> Input, <strong>{exLot.gsuSpec.burndownWeights.inputCached}×</strong> Cache, <strong>{exLot.gsuSpec.burndownWeights.outputTextAndThinking}×</strong> Output
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Batch Share: <strong>{Math.round(exLot.batchRatio * 100)}%</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Throughput per GSU: <strong>{Math.round(exLot.gsuSpec.throughputPerGsuPerSec)} tok/s</strong>
                </span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Live result ({exLot.shortName}, {exYearLabel}):{' '}
                <strong>{exSim.avgGsuDemand.toFixed(1)} avg GSUs</strong> · 24/7 Floor:{' '}
                <strong>{Math.round(exSim.minHourlyGsuDemand)} GSUs</strong> · Peak:{' '}
                <strong>{Math.round(exSim.peakHourlyGsuDemand)} GSUs</strong>
              </div>
            </div>
          </div>

          {/* Formula 3 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-3">
            <div>
              <div className="type-label-lg text-[var(--md-on-surface)]">
                3. 168-Hour Traffic Routing (Reserved PT vs. PayGo Spillover)
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Splitting hourly real-time traffic between fixed GSUs and on-demand overflow
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              For each hour <var>h</var> of the 168-hour week, traffic up to your Reserved GSUs ceiling is absorbed by PT at $0 per-token cost, while any burst above the ceiling spills over to PayGo:
            </p>
            <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2.5 tabular-nums">
              <LatexFormula
                latex={String.raw`\begin{aligned}
\text{PT Covered Traffic}(h) &= \min\!\Big(\text{Hourly GSU Demand}(h),\; \text{Reserved GSUs}\Big) \\[4pt]
\text{PayGo Spillover Traffic}(h) &= \max\!\Big(0,\; \text{Hourly GSU Demand}(h) - \text{Reserved GSUs}\Big)
\end{aligned}`}
              />
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--md-outline-variant)] type-body-sm text-[var(--md-on-surface-variant)]">
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Reserved GSUs: <strong>{exSim.provisionedGsus} GSUs</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  GSU Utilization: <strong>{formatPct(exSim.realtimeRouting.ptUtilizationRate, 1)}</strong>
                </span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Live result ({exLot.shortName}, {exSim.provisionedGsus} GSUs):{' '}
                <strong>
                  {formatPct(exSim.realtimeRouting.ptCoveredFraction, 1)} PT covered
                </strong>{' '}
                ·{' '}
                <strong>
                  {formatPct(
                    exSim.realtimeRouting.standardPayGoFraction +
                      exSim.realtimeRouting.priorityPayGoFraction,
                    1
                  )}{' '}
                  PayGo spillover
                </strong>
              </div>
            </div>
          </div>

          {/* Formula 4 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-3">
            <div>
              <div className="type-label-lg text-[var(--md-on-surface)]">
                4. Spillover Priority Uplift & Break-Even GSU Utilization
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Minimum utilization threshold where 1 reserved GSU becomes cheaper than PayGo
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Spillover traffic is split between Standard PayGo (1.0×) and Priority PayGo (1.8×). A reserved GSU reduces TCO whenever its utilization exceeds the ratio of its annual subscription cost to its full-load PayGo value:
            </p>
            <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2.5 tabular-nums">
              <LatexFormula
                latex={String.raw`\begin{aligned}
\text{Spillover Rate Multiplier} &= \left(\text{Standard Share} \times 1.0\right) + \left(\text{Priority Share} \times 1.8\right) \\[6pt]
\text{Break-Even GSU Utilization} &= \frac{\text{Annual Net Cost of 1 GSU}}{\text{Annual Discounted PayGo Cost of 1 GSU at 100\% Load}}
\end{aligned}`}
              />
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--md-outline-variant)] type-body-sm text-[var(--md-on-surface-variant)]">
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Spillover Split: <strong>{standardSpilloverSharePct}% Standard (1.0×)</strong> / <strong>{prioritySpilloverSharePct}% Priority (1.8×)</strong> → <strong>{overflowMult.toFixed(2)}×</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Annual Net Cost of 1 GSU: <strong>{formatCurrencyExact(gsuAnnual)}/yr</strong>
                </span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Live Break-Even Utilization ({exLot.shortName}, {activeTierLabel}):{' '}
                <strong>{formatPct(exSim.breakEvenUtilization, 1)}</strong>
              </div>
            </div>
          </div>

          {/* Formula 5 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-3">
            <div>
              <div className="flex items-center gap-2 type-label-lg text-[var(--md-on-surface)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--md-positive)]" />
                <span>5. Final Annual Hybrid TCO Equation (-{ptDiscountPct}% PT discount & -{(activeDisc * 100).toFixed(0)}% PayGo discount)</span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)] mt-0.5">
                Total budget = Fixed reserved GSU subscription + Discounted variable spillover & async batch
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Net Provisioned Throughput subscription is summed with the discounted variable token spend across Standard Spillover, Priority Spillover (1.8×), and Async Batch (0.5×):
            </p>
            <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] space-y-2.5 tabular-nums">
              <LatexFormula
                latex={String.raw`\begin{aligned}
\text{Annual Hybrid TCO} &= \underbrace{\text{Reserved GSUs} \times 12 \times \text{Monthly GSU List Price} \times \left(1 - \text{PT Discount}\right)}_{\text{Fixed Reserved Capacity Cost (PT)}} \\[6pt]
&\quad + \underbrace{\Big(\text{Standard Spillover} + \text{Priority Spillover} + \text{Async Batch}\Big) \times \left(1 - \text{PayGo Discount}\right)}_{\text{Discounted Variable Consumption Cost (PayGo + Batch)}}
\end{aligned}`}
              />
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--md-outline-variant)] type-body-sm text-[var(--md-on-surface-variant)]">
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Monthly GSU List Price: <strong>{formatCurrencyExact(gsuListMonthly)}/mo</strong> × (1 - {ptDiscountPct}%) = <strong>{formatCurrencyExact(gsuMonthly)}/mo net</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Fixed Reserved Capacity Cost: <strong>{formatCurrencyExact(exSim.annualCostsListUsd.ptGsuAnnualCostUsd)}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--md-surface-container)]">
                  Discounted Variable Cost (-{(activeDisc * 100).toFixed(0)}%):{' '}
                  <strong>
                    {formatCurrencyExact(
                      (exSim.annualCostsListUsd.standardPayGoSpilloverCostUsd +
                        exSim.annualCostsListUsd.priorityPayGoRetryCostUsd +
                        exSim.annualCostsListUsd.batchCostUsd) *
                        (1 - activeDisc)
                    )}
                  </strong>
                </span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)] flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--md-outline-variant)]">
                <span>
                  Live {exLot.shortName} ({exYearLabel}):{' '}
                  <strong>
                    {formatCurrencyExact(exSim.annualCostsListUsd.ptGsuAnnualCostUsd)}
                  </strong>{' '}
                  (Fixed PT) +{' '}
                  <strong>
                    {formatCurrencyExact(
                      (exSim.annualCostsListUsd.standardPayGoSpilloverCostUsd +
                        exSim.annualCostsListUsd.priorityPayGoRetryCostUsd +
                        exSim.annualCostsListUsd.batchCostUsd) *
                        (1 - activeDisc)
                    )}
                  </strong>{' '}
                  (Discounted PayGo + Batch) ={' '}
                  <strong>
                    {formatCurrencyExact(
                      exSim.annualCostsFspUsd[activeFspTier].hybridTotalUsd
                    )}
                  </strong>
                </span>
                <span>
                  All 4 Lots 3-Year Total ({activeTierLabel}):{' '}
                  <strong>
                    {formatCurrencyMillions(
                      sim.threeYearCumulated[activeFspTier].hybridTotalUsd,
                      2
                    )}{' '}
                    ({formatCurrencyExact(
                      sim.threeYearCumulated[activeFspTier].hybridTotalUsd
                    )})
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
