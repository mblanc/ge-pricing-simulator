import React from 'react';
import { Calculator, CheckCircle2, Layers, ShieldCheck, Sliders } from 'lucide-react';
import {
  ENDPOINT_LOCATION_SPECS,
  EU_GSU_MONTHLY_PRICE_USD,
  getLotEffectiveGsuMonthlyPriceUsd,
  getLotEffectivePricesPer1M,
  GlobalSimConfig,
  LotConfig,
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
              Net GSU rate ({globalConfig.gsuCommitTerm.replace('_', '-')}, -{ptDiscountPct}% PT):{' '}
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
                  <div>Non-cached input ($/1M)</div>
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
              <strong className="text-[var(--md-on-surface)]">Lot 4 Nano Banana 2 image tier reference:</strong>{' '}
              <strong>NB2 (Default · Gemini 3.1 Flash Image)</strong> = $66.00/1M Image Out in <code>eu</code> &amp; <code>us</code> (1.10×) or $60.00/1M in <code>global</code> (1.00×) · 1,120 tokens per 1K image · 2,015 tok/s/GSU.
            </span>
            <span>
              <strong>NB2 Lite:</strong> $33.00/1M (<code>eu</code>/<code>us</code>) · 4,030 tok/s/GSU · <strong>NB Pro:</strong> $132.00/1M (<code>eu</code>/<code>us</code>) · 500 tok/s/GSU.
            </span>
          </div>
          <div className="pt-1 border-t border-[var(--md-outline-variant)] flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-[var(--md-on-surface)]">Gemini 3.8 Flash 2027–2029 rate schedule:</strong>{' '}
              $1.50 In / $0.15 Cache / $7.50 Out (<code>global</code> 1.00×) and $1.65 In / $0.165 Cache / $8.25 Out (<code>eu</code> &amp; <code>us</code> 1.10×) starting January 1, 2027.
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
                  <div>Cached vs non-cached</div>
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
                const tierDesc =
                  lot.id === 'lot4'
                    ? lot.thinkingLevel === 'MEDIUM'
                      ? 'NB2 (Default)'
                      : lot.thinkingLevel === 'LOW'
                      ? 'NB2 Lite'
                      : 'NB Pro'
                    : lot.supportsThinkingLevel
                    ? `${lot.thinkingLevel} (${lot.thinkingMultiplierByLevel[lot.thinkingLevel]}×)`
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
                        Mode: {lot.ptSizingMode}
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
            Exact equations executed by the simulation engine, illustrated with live numbers from <strong>{exLot.shortName}</strong> in <strong>{exYearLabel}</strong> under <strong>{activeTierLabel}</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Formula 1 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
            <div>
              <div className="type-label-lg text-[var(--md-on-surface)]">
                Token split & blended Standard PayGo rate ($/1M)
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Weighted average unit cost per 1M tokens before discounts
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Total annual volume is partitioned into Non-Cached Input, Context-Cached Input (-90%), and Output (Text + Thinking or Image) according to the lot's ratios:
            </p>
            <div className="p-3 rounded-[8px] bg-[var(--md-surface-container-lowest)] type-data-cell space-y-1">
              <div>
                <code>
                  P_blended = (In_raw × P_in + In_cache × P_cache + Out × P_out) / Total_Tokens
                </code>
              </div>
              <div className="text-[var(--md-primary)]">
                Live ({exLot.shortName}, {exYearLabel}):{' '}
                <strong>
                  ${exSim.blendedStandardPayGoPricePer1M.toFixed(3)} per 1M tokens
                </strong>{' '}
                across {formatTokensMillions(exSim.totalTokensM)} tokens
              </div>
            </div>
          </div>

          {/* Formula 2 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
            <div>
              <div className="type-label-lg text-[var(--md-on-surface)]">
                GSU burndown conversion & hourly demand curve
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Translating token volume into required reserved capacity units (GSUs)
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Google Cloud Provisioned Throughput measures capacity in burndown tokens per second (<code>tok/s</code>). Output tokens consume more compute than input tokens and are weighted by the model's official multiplier:
            </p>
            <div className="p-3 rounded-[8px] bg-[var(--md-surface-container-lowest)] type-data-cell space-y-1">
              <div>
                <code>
                  Burndown_Tokens = (In_raw × {exLot.gsuSpec.burndownWeights.inputNonCached} + In_cache × {exLot.gsuSpec.burndownWeights.inputCached} + Out × {exLot.gsuSpec.burndownWeights.outputTextAndThinking}) × (1 - Batch%)
                </code>
              </div>
              <div className="text-[var(--md-primary)]">
                Live ({exLot.shortName}, {exYearLabel}):{' '}
                <strong>{exSim.avgGsuDemand.toFixed(1)} avg GSUs</strong> · Floor:{' '}
                <strong>{Math.round(exSim.minHourlyGsuDemand)} GSUs</strong> · Peak:{' '}
                <strong>{Math.round(exSim.peakHourlyGsuDemand)} GSUs</strong>
              </div>
            </div>
          </div>

          {/* Formula 3 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
            <div>
              <div className="type-label-lg text-[var(--md-on-surface)]">
                168-hour seasonality routing (PT covered vs PayGo spillover)
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Splitting real-time traffic between fixed GSUs and variable overflow
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              For every hour <code>h</code> of the 168-hour week, demand below <code>GSU_provisioned</code> is absorbed by PT ($0 token cost), while demand above <code>GSU_provisioned</code> spills over to PayGo:
            </p>
            <div className="p-3 rounded-[8px] bg-[var(--md-surface-container-lowest)] type-data-cell space-y-1">
              <div>
                <code>
                  Covered(h) = min(Demand(h), GSU_prov) | Spillover(h) = max(0, Demand(h) - GSU_prov)
                </code>
              </div>
              <div className="text-[var(--md-primary)]">
                Live ({exLot.shortName}, {exSim.provisionedGsus} GSUs):{' '}
                <strong>
                  {formatPct(exSim.realtimeRouting.ptCoveredFraction, 1)} PT covered
                </strong>{' '}
                ({formatPct(exSim.realtimeRouting.ptUtilizationRate, 1)} GSU utilization) ·{' '}
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
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
            <div>
              <div className="type-label-lg text-[var(--md-on-surface)]">
                Priority 1.8× retry uplift & break-even GSU utilization
              </div>
              <div className="type-body-sm text-[var(--md-primary)]">
                Minimum usage needed for a reserved GSU to be cheaper than PayGo
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Spillover tokens are split between Standard PayGo (1.0×) and Priority PayGo (1.8×). A GSU saves money whenever its utilization exceeds the break-even ratio between annual GSU cost and discounted PayGo value:
            </p>
            <div className="p-3 rounded-[8px] bg-[var(--md-surface-container-lowest)] type-data-cell space-y-1">
              <div>
                <code>
                  M_overflow = (1 - r_prio)×1.0 + r_prio×1.8 = {overflowMult.toFixed(2)}× | U_breakeven = Cost_GSU / Value_PayGo
                </code>
              </div>
              <div className="text-[var(--md-primary)]">
                Live Break-Even Utilization ({activeTierLabel}):{' '}
                <strong>{formatPct(sim.avgBreakEvenUtilization, 1)}</strong> (GSU annual cost:{' '}
                {formatCurrencyExact(gsuAnnual)}/yr)
              </div>
            </div>
          </div>

          {/* Formula 5 */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2 lg:col-span-2">
            <div>
              <div className="flex items-center gap-2 type-label-lg text-[var(--md-on-surface)]">
                <CheckCircle2 className="w-4 h-4 text-[var(--md-positive)]" />
                <span>Final annual & 3-year Hybrid TCO equation (-{ptDiscountPct}% PT discount & -{(activeDisc * 100).toFixed(0)}% PayGo discount)</span>
              </div>
              <div className="type-body-sm text-[var(--md-primary)] mt-0.5">
                Total budget = Fixed monthly GSU subscription + Discounted variable overflow & batch
              </div>
            </div>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Net Provisioned Throughput (<code>GSU_prov × 12 × List_GSU_Rate × (1 - PT_Discount)</code>) is added to the discounted variable token spend (<code>Standard_PayGo + Priority_PayGo_1.8x + Async_Batch_0.5x</code>) multiplied by <code>(1 - Discount_PayGo)</code>:
            </p>
            <div className="p-3.5 rounded-[8px] bg-[var(--md-surface-container-lowest)] type-data-cell space-y-1.5">
              <div>
                <code>
                  Hybrid_TCO = [ GSU_prov × 12 × ${gsuListMonthly} × (1 - {ptDiscountPct}%) = ${gsuMonthly}/mo ] + [ Standard_PayGo_Spillover + Priority_1.8x_Spillover + Batch_0.5x ] × (1 - {(activeDisc * 100).toFixed(0)}%)
                </code>
              </div>
              <div className="text-[var(--md-primary)] flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--md-outline-variant)]">
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
