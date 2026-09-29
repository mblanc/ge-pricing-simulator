import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { FullSimulationOutput } from '../engine/simulator';
import {
  EU_GSU_MONTHLY_PRICE_USD,
  GlobalSimConfig,
  LotConfig,
} from '../data/rfqDefaults';
import {
  formatCurrencyExact,
  formatDeltaPct,
  formatPct,
  formatTokensMillions,
} from '../utils/format';

interface TcoComparisonTableProps {
  sim: FullSimulationOutput;
  lots: LotConfig[];
  globalConfig: GlobalSimConfig;
  activeFspTier: 'uncommitted' | 'oneYearFsp' | 'threeYearFsp';
  embedded?: boolean;
}

/**
 * Inline 80x24px Sparkline for Data Table Rows (DESIGN.md line 495)
 */
const InlineTableSparkline: React.FC<{ points: number[] }> = ({ points }) => {
  const width = 80;
  const height = 24;
  const padX = 3;
  const padY = 4;

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
  const lastPt = coords[coords.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block align-middle overflow-visible"
      aria-hidden="true"
    >
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
        r="2.5"
        fill="var(--md-chart-1)"
      />
    </svg>
  );
};

export const TcoComparisonTable: React.FC<TcoComparisonTableProps> = ({
  sim,
  lots,
  globalConfig,
  activeFspTier,
  embedded = false,
}) => {
  const { totalsByYear, threeYearCumulated } = sim;
  const fsp0A = globalConfig.fspDiscounts.uncommittedDiscount ?? 0;
  const fsp1Y = globalConfig.fspDiscounts.oneYearCommitDiscount;
  const fsp3Y = globalConfig.fspDiscounts.threeYearCommitDiscount;
  const ptDisc = globalConfig.fspDiscounts.ptDiscount ?? 0.2;
  const [csvDownloaded, setCsvDownloaded] = useState(false);

  const inv0A = 1 / Math.max(1e-6, 1 - fsp0A);
  const listPurePayGoY1 = totalsByYear.y1.uncommitted.purePayGoUsd * inv0A;
  const listPurePayGoY2 = totalsByYear.y2.uncommitted.purePayGoUsd * inv0A;
  const listPurePayGoY3 = totalsByYear.y3.uncommitted.purePayGoUsd * inv0A;
  const listPurePayGo3Y = threeYearCumulated.uncommitted.purePayGoUsd * inv0A;

  const listRetryPayGoY1 = totalsByYear.y1.uncommitted.payGoWithPriorityUsd * inv0A;
  const listRetryPayGoY2 = totalsByYear.y2.uncommitted.payGoWithPriorityUsd * inv0A;
  const listRetryPayGoY3 = totalsByYear.y3.uncommitted.payGoWithPriorityUsd * inv0A;
  const listRetryPayGo3Y =
    threeYearCumulated.uncommitted.payGoWithPriorityUsd * inv0A;

  const exportToCsv = () => {
    const gsuMonthly = EU_GSU_MONTHLY_PRICE_USD[globalConfig.gsuCommitTerm];
    const rows: string[][] = [
      [
        'FR-Telco-1 2027-2029 LLM RFQ - Google Cloud Gemini Enterprise (eu multi-region) TCO simulation',
      ],
      ['Parameter', 'Value', 'Notes', '', '', ''],
      [
        'GSU commit term & monthly rate',
        `${globalConfig.gsuCommitTerm} ($${gsuMonthly}/GSU/month list, -${Math.round(ptDisc * 100)}% PT discount)`,
        'Official EU multi-region (+10%) rate',
        '',
        '',
        '',
      ],
      [
        'PayGo discount levels (Option A / 1Y FSP / 3Y FSP)',
        `-${Math.round(fsp0A * 100)}% (Option A) / -${Math.round(fsp1Y * 100)}% (1Y) / -${Math.round(fsp3Y * 100)}% (3Y)`,
        'Applies to PayGo, Priority PayGo & Batch (non-stacking on PT GSUs)',
        '',
        '',
        '',
      ],
      ['', '', '', '', '', ''],
      [
        'Scenario / architecture',
        'Model configuration (eu multi-region)',
        'Year 1 (2027) USD',
        'Year 2 (2028) USD',
        'Year 3 (2029) USD',
        '3-year cumulated USD',
      ],
      [
        'Baseline 1: 100% Standard PayGo + Batch (0% retry, 0% list price)',
        'All lots (PayGo only)',
        Math.round(listPurePayGoY1).toString(),
        Math.round(listPurePayGoY2).toString(),
        Math.round(listPurePayGoY3).toString(),
        Math.round(listPurePayGo3Y).toString(),
      ],
      [
        'Baseline 2: 100% PayGo + Priority 1.8x retry (0% list price)',
        'All lots (PayGo + Priority retry)',
        Math.round(listRetryPayGoY1).toString(),
        Math.round(listRetryPayGoY2).toString(),
        Math.round(listRetryPayGoY3).toString(),
        Math.round(listRetryPayGo3Y).toString(),
      ],
      [
        `Option A (PayGo only): Uncommitted (-${Math.round(fsp0A * 100)}% PayGo discount, no PT)`,
        'All lots (discounted PayGo + Priority retry)',
        Math.round(totalsByYear.y1.uncommitted.payGoWithPriorityUsd).toString(),
        Math.round(totalsByYear.y2.uncommitted.payGoWithPriorityUsd).toString(),
        Math.round(totalsByYear.y3.uncommitted.payGoWithPriorityUsd).toString(),
        Math.round(threeYearCumulated.uncommitted.payGoWithPriorityUsd).toString(),
      ],
      [
        `Option A (Hybrid): Uncommitted (-${Math.round(fsp0A * 100)}% PayGo) + PT + Batch`,
        'All lots (Option A hybrid PT + PayGo)',
        Math.round(totalsByYear.y1.uncommitted.hybridTotalUsd).toString(),
        Math.round(totalsByYear.y2.uncommitted.hybridTotalUsd).toString(),
        Math.round(totalsByYear.y3.uncommitted.hybridTotalUsd).toString(),
        Math.round(threeYearCumulated.uncommitted.hybridTotalUsd).toString(),
      ],
      [
        `Option B: 1-year FSP (-${Math.round(fsp1Y * 100)}% PayGo) + PT`,
        'All lots (1-year FSP)',
        Math.round(totalsByYear.y1.oneYearFsp.hybridTotalUsd).toString(),
        Math.round(totalsByYear.y2.oneYearFsp.hybridTotalUsd).toString(),
        Math.round(totalsByYear.y3.oneYearFsp.hybridTotalUsd).toString(),
        Math.round(threeYearCumulated.oneYearFsp.hybridTotalUsd).toString(),
      ],
      [
        `Option C: 3-year FSP (-${Math.round(fsp3Y * 100)}% PayGo) + PT`,
        'All lots (3-year FSP)',
        Math.round(totalsByYear.y1.threeYearFsp.hybridTotalUsd).toString(),
        Math.round(totalsByYear.y2.threeYearFsp.hybridTotalUsd).toString(),
        Math.round(totalsByYear.y3.threeYearFsp.hybridTotalUsd).toString(),
        Math.round(threeYearCumulated.threeYearFsp.hybridTotalUsd).toString(),
      ],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      'FR_Telco_1_RFQ_Gemini_Enterprise_EU_3Y_TCO_Simulation.csv'
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCsvDownloaded(true);
    setTimeout(() => setCsvDownloaded(false), 2600);
  };

  const baselineUncommittedPayGo = listPurePayGo3Y;

  const scenarioRows = [
    {
      id: 'pure-paygo',
      tierKey: null,
      name: 'Reference baseline: 100% Standard PayGo + Batch (0% list price)',
      subtitle:
        'Pure pay-as-you-go at public list prices without reserved capacity or contract commitment',
      y1: listPurePayGoY1,
      y2: listPurePayGoY2,
      y3: listPurePayGoY3,
      total3Y: listPurePayGo3Y,
    },
    {
      id: 'paygo-retry',
      tierKey: null,
      name: `Burst-protected baseline: 100% PayGo with ${formatPct(
        globalConfig.payGoRetryToPriorityRatio,
        0
      )} Priority 1.8× retry`,
      subtitle:
        'Pay-as-you-go at list price including priority tier protection during peak traffic spikes',
      y1: listRetryPayGoY1,
      y2: listRetryPayGoY2,
      y3: listRetryPayGoY3,
      total3Y: listRetryPayGo3Y,
    },
    {
      id: 'hybrid-uncommitted',
      tierKey: 'uncommitted' as const,
      name: `Option A (Uncommitted Hybrid): -${Math.round(
        fsp0A * 100
      )}% PayGo + PT GSUs (-${Math.round(ptDisc * 100)}% PT)`,
      subtitle:
        'No multi-year spend commitment · Combines reserved monthly GSUs with on-demand overflow',
      y1: totalsByYear.y1.uncommitted.hybridTotalUsd,
      y2: totalsByYear.y2.uncommitted.hybridTotalUsd,
      y3: totalsByYear.y3.uncommitted.hybridTotalUsd,
      total3Y: threeYearCumulated.uncommitted.hybridTotalUsd,
    },
    {
      id: 'hybrid-1y-fsp',
      tierKey: 'oneYearFsp' as const,
      name: `Option B (1-Year FSP Hybrid): -${Math.round(
        fsp1Y * 100
      )}% PayGo + PT GSUs (-${Math.round(ptDisc * 100)}% PT)`,
      subtitle:
        '1-year contract commitment · Discounts variable overflow & batch by ' +
        `${Math.round(fsp1Y * 100)}% alongside reserved GSUs`,
      y1: totalsByYear.y1.oneYearFsp.hybridTotalUsd,
      y2: totalsByYear.y2.oneYearFsp.hybridTotalUsd,
      y3: totalsByYear.y3.oneYearFsp.hybridTotalUsd,
      total3Y: threeYearCumulated.oneYearFsp.hybridTotalUsd,
    },
    {
      id: 'hybrid-3y-fsp',
      tierKey: 'threeYearFsp' as const,
      name: `Option C (3-Year FSP Hybrid): -${Math.round(
        fsp3Y * 100
      )}% PayGo + PT GSUs (-${Math.round(ptDisc * 100)}% PT)`,
      subtitle:
        'Target 3-year contract commitment · Discounts variable overflow & batch by ' +
        `${Math.round(fsp3Y * 100)}% alongside reserved GSUs`,
      y1: totalsByYear.y1.threeYearFsp.hybridTotalUsd,
      y2: totalsByYear.y2.threeYearFsp.hybridTotalUsd,
      y3: totalsByYear.y3.threeYearFsp.hybridTotalUsd,
      total3Y: threeYearCumulated.threeYearFsp.hybridTotalUsd,
    },
  ];

  const containerClass = embedded
    ? 'space-y-6'
    : 'space-y-6';

  return (
    <section
      aria-label="3-year financial comparison and lot audit tables"
      className={containerClass}
    >
      {/* TABLE 1: Commercial Scenario Comparison Table */}
      <div className={embedded ? 'overflow-hidden' : 'md-card overflow-hidden'}>
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--md-outline-variant)]">
          <div>
            <h3 className="type-title-md text-[var(--md-on-surface)]">
              3-year commercial architecture comparison (2027–2029)
            </h3>
            <p className="type-body-sm text-[var(--md-on-surface-variant)] max-w-[72ch] mt-0.5">
              Compares 100% variable PayGo baselines against hybrid architectures (Reserved PT GSUs + discounted PayGo overflow) across Option A, Option B (1-year), and Option C (3-year).
            </p>
          </div>

          <div className="min-h-[48px] flex items-center shrink-0">
            <button
              type="button"
              onClick={exportToCsv}
              className="md-btn-tonal cursor-pointer"
            >
              {csvDownloaded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>CSV exported</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="h-[48px] bg-[var(--md-surface-container-lowest)] border-b border-[var(--md-outline-variant)]">
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-left">
                  <div>Commercial scenario</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Contract commitment & capacity mix
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Year 1 (2027)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Annual spend
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Year 2 (2028)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Annual spend
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Year 3 (2029)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Annual spend
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>3-year total (TCO)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    36-month cumulative
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Savings vs list PayGo</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    vs 100% list baseline
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>3-year trend</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Y1 → Y3
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {scenarioRows.map((row) => {
                const isSelected = row.tierKey === activeFspTier;
                const deltaRatio =
                  baselineUncommittedPayGo > 0
                    ? (row.total3Y - baselineUncommittedPayGo) /
                      baselineUncommittedPayGo
                    : 0;
                const isFavorable = deltaRatio <= 0;

                return (
                  <tr
                    key={row.id}
                    className={`h-[56px] border-b border-[var(--md-outline-variant)] transition-colors ${
                      isSelected
                        ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                        : 'bg-[var(--md-surface-container-lowest)] hover:bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)]'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="type-data-cell font-medium">
                        {row.name}
                      </div>
                      <div
                        className={`type-body-sm ${
                          isSelected
                            ? 'text-[var(--md-on-primary-container)] opacity-85'
                            : 'text-[var(--md-on-surface-variant)]'
                        }`}
                      >
                        {row.subtitle}
                      </div>
                    </td>
                    <td
                      title={formatCurrencyExact(row.y1)}
                      className="px-4 type-data-cell text-right"
                    >
                      {formatCurrencyExact(row.y1)}
                    </td>
                    <td
                      title={formatCurrencyExact(row.y2)}
                      className="px-4 type-data-cell text-right"
                    >
                      {formatCurrencyExact(row.y2)}
                    </td>
                    <td
                      title={formatCurrencyExact(row.y3)}
                      className="px-4 type-data-cell text-right"
                    >
                      {formatCurrencyExact(row.y3)}
                    </td>
                    <td
                      title={formatCurrencyExact(row.total3Y)}
                      className="px-4 type-data-cell font-medium text-right"
                    >
                      {formatCurrencyExact(row.total3Y)}
                    </td>
                    <td
                      className="px-4 type-data-cell font-medium text-right"
                      style={{
                        color: isFavorable
                          ? 'var(--md-positive)'
                          : 'var(--md-negative)',
                      }}
                    >
                      {formatDeltaPct(deltaRatio)}
                    </td>
                    <td className="px-4 text-right">
                      <InlineTableSparkline points={[row.y1, row.y2, row.y3]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: Per-Lot 3-Year Breakdown Table */}
      <div className={embedded ? 'overflow-hidden border-t border-[var(--md-outline-variant)] pt-4' : 'md-card overflow-hidden'}>
        <div className="px-6 py-4 border-b border-[var(--md-outline-variant)]">
          <h3 className="type-title-md text-[var(--md-on-surface)]">
            Per-lot 3-year summary (active commercial tier)
          </h3>
          <p className="type-body-sm text-[var(--md-on-surface-variant)] max-w-[72ch] mt-0.5">
            Shows how each of the 4 RFQ workload lots contributes to the 36-month token volume, reserved GSU capacity, and total spend.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="h-[48px] bg-[var(--md-surface-container-lowest)] border-b border-[var(--md-outline-variant)]">
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-left">
                  <div>Lot & AI model</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Use case & endpoint
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>3-year token volume</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Total traffic processed
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Provisioned GSUs (Y1→Y3)</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Reserved capacity units
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>PT coverage</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Traffic served by PT
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>PT utilization</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Reserved capacity efficiency
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>3-year hybrid TCO</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Total lot budget
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>vs 0-GSU PayGo</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    PT impact vs same-tier PayGo
                  </div>
                </th>
                <th className="px-4 type-label-lg text-[var(--md-on-surface-variant)] text-right">
                  <div>Trend</div>
                  <div className="type-body-sm font-normal text-[var(--md-on-surface-variant)]">
                    Y1 → Y3
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const r1 = sim.byLotAndYear[lot.id].y1;
                const r2 = sim.byLotAndYear[lot.id].y2;
                const r3 = sim.byLotAndYear[lot.id].y3;

                const tok3Y = r1.totalTokensM + r2.totalTokensM + r3.totalTokensM;
                const y1Cost = r1.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
                const y2Cost = r2.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
                const y3Cost = r3.annualCostsFspUsd[activeFspTier].hybridTotalUsd;
                const hybrid3Y = y1Cost + y2Cost + y3Cost;

                const purePayGo3Y =
                  r1.annualCostsFspUsd[activeFspTier].purePayGoUsd +
                  r2.annualCostsFspUsd[activeFspTier].purePayGoUsd +
                  r3.annualCostsFspUsd[activeFspTier].purePayGoUsd;

                const deltaRatio =
                  purePayGo3Y > 0 ? (hybrid3Y - purePayGo3Y) / purePayGo3Y : 0;
                const avgPtCov =
                  (r1.realtimeRouting.ptCoveredFraction +
                    r2.realtimeRouting.ptCoveredFraction +
                    r3.realtimeRouting.ptCoveredFraction) /
                  3;
                const avgPtUtil =
                  (r1.realtimeRouting.ptUtilizationRate +
                    r2.realtimeRouting.ptUtilizationRate +
                    r3.realtimeRouting.ptUtilizationRate) /
                  3;

                return (
                  <tr
                    key={lot.id}
                    className="h-[56px] border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-lowest)] hover:bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="type-data-cell font-medium">
                        {lot.shortName} · {lot.modelDisplayName}
                      </div>
                      <div className="type-body-sm text-[var(--md-on-surface-variant)]">
                        {lot.subtitle}
                      </div>
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {formatTokensMillions(tok3Y)}
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {r1.provisionedGsus} → {r2.provisionedGsus} →{' '}
                      {r3.provisionedGsus}
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {formatPct(avgPtCov, 1)}
                    </td>
                    <td className="px-4 type-data-cell text-right">
                      {formatPct(avgPtUtil, 1)}
                    </td>
                    <td className="px-4 type-data-cell font-medium text-right">
                      {formatCurrencyExact(hybrid3Y)}
                    </td>
                    <td
                      className="px-4 type-data-cell font-medium text-right"
                      style={{
                        color:
                          deltaRatio <= 0
                            ? 'var(--md-positive)'
                            : 'var(--md-negative)',
                      }}
                    >
                      {formatDeltaPct(deltaRatio)}
                    </td>
                    <td className="px-4 text-right">
                      <InlineTableSparkline
                        points={[y1Cost, y2Cost, y3Cost]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
