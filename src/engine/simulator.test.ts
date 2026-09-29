import { describe, expect, it } from 'vitest';
import { DEFAULT_GLOBAL_CONFIG, DEFAULT_LOTS } from '../data/rfqDefaults';
import { runFullSimulation } from './simulator';

describe('FR-Telco-1 RFQ Gemini Enterprise EU Pricing & PT Simulator Engine', () => {
  it('computes 3-year totals across all 4 Lots with default Minimum Floor PT sizing', () => {
    const out = runFullSimulation(DEFAULT_LOTS, DEFAULT_GLOBAL_CONFIG);

    // Total 3-year volume should be ~48.54 Trillion tokens (48,542,000 M)
    expect(out.threeYearCumulated.totalTokensM).toBeGreaterThan(48_000_000);

    // With default Minimum Traffic Floor PT sizing, PT utilization should be ~100%
    expect(out.totalsByYear.y1.avgPtUtilization).toBeGreaterThan(0.95);
    expect(out.totalsByYear.y2.avgPtUtilization).toBeGreaterThan(0.95);
    expect(out.totalsByYear.y3.avgPtUtilization).toBeGreaterThan(0.95);

    // 1-Year (-10%) and 3-Year (-12%) FSP commits must reduce total cost below uncommitted
    expect(out.threeYearCumulated.oneYearFsp.hybridTotalUsd).toBeLessThan(
      out.threeYearCumulated.uncommitted.hybridTotalUsd
    );
    expect(out.threeYearCumulated.threeYearFsp.hybridTotalUsd).toBeLessThan(
      out.threeYearCumulated.oneYearFsp.hybridTotalUsd
    );
  });

  it('never discounts PT GSUs with FSP and adjusts break-even utilization when PayGo is discounted by FSP', () => {
    const outUncomm = runFullSimulation(DEFAULT_LOTS, DEFAULT_GLOBAL_CONFIG, 'uncommitted');
    const out1Y = runFullSimulation(DEFAULT_LOTS, DEFAULT_GLOBAL_CONFIG, 'oneYearFsp');
    const out3Y = runFullSimulation(DEFAULT_LOTS, DEFAULT_GLOBAL_CONFIG, 'threeYearFsp');

    // Break-even utilization of PT must increase when PayGo gets a -10% or -20% FSP discount while PT stays at $2,200/GSU/mo:
    // ~72.3% (0% FSP) -> ~80.3% (-10% FSP) -> ~90.3% (-20% FSP)
    expect(out1Y.avgBreakEvenUtilization).toBeGreaterThan(outUncomm.avgBreakEvenUtilization);
    expect(out3Y.avgBreakEvenUtilization).toBeGreaterThan(out1Y.avgBreakEvenUtilization);

    // Verify PT cost in Hybrid 3Y FSP is strictly undiscounted (1.0x GSU cost), while PayGo+Priority+Batch is discounted by 20%
    const y1Lot1 = out3Y.byLotAndYear.lot1.y1;
    const expectedHybrid3YFsp =
      y1Lot1.annualCostsListUsd.ptGsuAnnualCostUsd +
      (y1Lot1.annualCostsListUsd.standardPayGoSpilloverCostUsd +
        y1Lot1.annualCostsListUsd.priorityPayGoRetryCostUsd +
        y1Lot1.annualCostsListUsd.batchCostUsd) *
        (1 - DEFAULT_GLOBAL_CONFIG.fspDiscounts.threeYearCommitDiscount);

    expect(y1Lot1.annualCostsFspUsd.threeYearFsp.hybridTotalUsd).toBeCloseTo(
      expectedHybrid3YFsp,
      2
    );
  });

  it('keeps all 4 lots strictly separated (varying Lot 1 GSUs never affects Lot 2) and supports Option A PayGo discount', () => {
    const baseOut = runFullSimulation(DEFAULT_LOTS, DEFAULT_GLOBAL_CONFIG);
    const modifiedLots = DEFAULT_LOTS.map((lot) =>
      lot.id === 'lot1'
        ? {
            ...lot,
            ptSizingMode: 'MANUAL' as const,
            manualGsus: { y1: 42, y2: 65, y3: 90 },
          }
        : lot
    );
    const modOut = runFullSimulation(modifiedLots, DEFAULT_GLOBAL_CONFIG);

    // Lot 1 has exact manual GSUs
    expect(modOut.byLotAndYear.lot1.y1.provisionedGsus).toBe(42);
    expect(modOut.byLotAndYear.lot1.y2.provisionedGsus).toBe(65);
    expect(modOut.byLotAndYear.lot1.y3.provisionedGsus).toBe(90);

    // Lot 2, Lot 3, and Lot 4 are 100% untouched
    expect(modOut.byLotAndYear.lot2.y1.provisionedGsus).toBe(
      baseOut.byLotAndYear.lot2.y1.provisionedGsus
    );
    expect(modOut.byLotAndYear.lot2.y1.annualCostsFspUsd.threeYearFsp.hybridTotalUsd).toBe(
      baseOut.byLotAndYear.lot2.y1.annualCostsFspUsd.threeYearFsp.hybridTotalUsd
    );

    // Option A with 15% PayGo discount reduces Option A PayGo & Hybrid costs
    const optADiscounted = runFullSimulation(
      DEFAULT_LOTS,
      {
        ...DEFAULT_GLOBAL_CONFIG,
        fspDiscounts: {
          ...DEFAULT_GLOBAL_CONFIG.fspDiscounts,
          uncommittedDiscount: 0.15,
        },
      },
      'uncommitted'
    );
    expect(optADiscounted.threeYearCumulated.uncommitted.purePayGoUsd).toBeCloseTo(
      baseOut.threeYearCumulated.uncommitted.purePayGoUsd * 0.85,
      2
    );
    expect(optADiscounted.threeYearCumulated.uncommitted.hybridTotalUsd).toBeLessThan(
      baseOut.threeYearCumulated.uncommitted.hybridTotalUsd
    );
  });

  it('applies +10% (1.10×) Non-Global upscale to both eu and us endpoints while keeping global at 1.00× base', () => {
    const euOut = runFullSimulation(DEFAULT_LOTS, DEFAULT_GLOBAL_CONFIG);

    // Switch Lot 1 to 'global' (1.00x) and Lot 3 to 'us' (1.10x, same as eu)
    const mixedLots = DEFAULT_LOTS.map((lot) => {
      if (lot.id === 'lot1') {
        return { ...lot, endpointLocation: 'global' as const };
      }
      if (lot.id === 'lot3') {
        return { ...lot, endpointLocation: 'us' as const };
      }
      return lot;
    });

    const mixedOut = runFullSimulation(mixedLots, DEFAULT_GLOBAL_CONFIG);

    // Lot 1 (global 1.00x) blended PayGo rate and PT GSU cost are 1 / 1.10 of eu (1.10x)
    expect(
      mixedOut.byLotAndYear.lot1.y1.blendedStandardPayGoPricePer1M
    ).toBeCloseTo(
      euOut.byLotAndYear.lot1.y1.blendedStandardPayGoPricePer1M / 1.1,
      4
    );
    expect(
      mixedOut.byLotAndYear.lot1.y1.annualCostsListUsd.purePayGoBaselineCostUsd
    ).toBeCloseTo(
      euOut.byLotAndYear.lot1.y1.annualCostsListUsd.purePayGoBaselineCostUsd / 1.1,
      2
    );
    expect(
      mixedOut.byLotAndYear.lot1.y1.annualCostsListUsd.ptGsuAnnualCostUsd
    ).toBeCloseTo(
      euOut.byLotAndYear.lot1.y1.annualCostsListUsd.ptGsuAnnualCostUsd / 1.1,
      2
    );

    // Lot 3 (us 1.10x) has the exact same +10% Non-Global upscale as eu (1.10x)
    expect(
      mixedOut.byLotAndYear.lot3.y1.blendedStandardPayGoPricePer1M
    ).toBeCloseTo(euOut.byLotAndYear.lot3.y1.blendedStandardPayGoPricePer1M, 4);
    expect(
      mixedOut.byLotAndYear.lot3.y1.annualCostsListUsd.ptGsuAnnualCostUsd
    ).toBeCloseTo(
      euOut.byLotAndYear.lot3.y1.annualCostsListUsd.ptGsuAnnualCostUsd,
      2
    );

    // Lot 2 (still eu) remains unchanged
    expect(
      mixedOut.byLotAndYear.lot2.y1.annualCostsListUsd.purePayGoBaselineCostUsd
    ).toBe(euOut.byLotAndYear.lot2.y1.annualCostsListUsd.purePayGoBaselineCostUsd);
  });

  it('supports 0 GSU (No PT) as the baseline and applies configurable PT discount (default 20%)', () => {
    // Default PT discount is 20% (0.20)
    expect(DEFAULT_GLOBAL_CONFIG.fspDiscounts.ptDiscount).toBe(0.20);

    const zeroPtLots = DEFAULT_LOTS.map((l) => ({
      ...l,
      ptSizingMode: 'NONE' as const,
    }));
    const baselineNoPt = runFullSimulation(zeroPtLots, DEFAULT_GLOBAL_CONFIG);

    // 0 GSUs provisioned across all 3 years
    expect(baselineNoPt.totalsByYear.y1.totalProvisionedGsus).toBe(0);
    expect(baselineNoPt.totalsByYear.y2.totalProvisionedGsus).toBe(0);
    expect(baselineNoPt.totalsByYear.y3.totalProvisionedGsus).toBe(0);
    expect(baselineNoPt.threeYearCumulated.uncommitted.ptCostUsd).toBe(0);

    // Verify 20% PT discount reduces PT GSU spend by exactly 20% compared to 0% PT discount
    const out0PctPt = runFullSimulation(DEFAULT_LOTS, {
      ...DEFAULT_GLOBAL_CONFIG,
      fspDiscounts: {
        ...DEFAULT_GLOBAL_CONFIG.fspDiscounts,
        ptDiscount: 0.0,
      },
    });
    const out20PctPt = runFullSimulation(DEFAULT_LOTS, {
      ...DEFAULT_GLOBAL_CONFIG,
      fspDiscounts: {
        ...DEFAULT_GLOBAL_CONFIG.fspDiscounts,
        ptDiscount: 0.20,
      },
    });

    expect(out20PctPt.threeYearCumulated.uncommitted.ptCostUsd).toBeCloseTo(
      out0PctPt.threeYearCumulated.uncommitted.ptCostUsd * 0.80,
      2
    );
  });

  it('generates a continuous 36-month ramp (M1–M36) that preserves exact annual RFQ token volumes and optimizes monthly PT GSU scaling over 3 flat steps', () => {
    const smoothOut = runFullSimulation(DEFAULT_LOTS, {
      ...DEFAULT_GLOBAL_CONFIG,
      capacityRampMode: 'SMOOTH_MONTHLY',
    });
    const stepOut = runFullSimulation(DEFAULT_LOTS, {
      ...DEFAULT_GLOBAL_CONFIG,
      capacityRampMode: 'ANNUAL_STEPS',
    });

    // 36 months generated for total and per-lot
    expect(smoothOut.monthlyTotals).toHaveLength(36);
    expect(smoothOut.monthlyByLot.lot1).toHaveLength(36);
    expect(smoothOut.monthlyTotals[0].monthLabel).toBe('Jan 2027');
    expect(smoothOut.monthlyTotals[35].monthLabel).toBe('Dec 2029');

    // Sum of M1..M12, M13..M24, M25..M36 identically matches Y1, Y2, Y3 RFQ token volumes
    const sumY1 = smoothOut.monthlyTotals
      .slice(0, 12)
      .reduce((acc, m) => acc + m.totalTokensM, 0);
    const sumY2 = smoothOut.monthlyTotals
      .slice(12, 24)
      .reduce((acc, m) => acc + m.totalTokensM, 0);
    const sumY3 = smoothOut.monthlyTotals
      .slice(24, 36)
      .reduce((acc, m) => acc + m.totalTokensM, 0);

    expect(sumY1).toBeCloseTo(smoothOut.totalsByYear.y1.totalTokensM, 4);
    expect(sumY2).toBeCloseTo(smoothOut.totalsByYear.y2.totalTokensM, 4);
    expect(sumY3).toBeCloseTo(smoothOut.totalsByYear.y3.totalTokensM, 4);

    // Monthly GSU count ramps smoothly upward across M1 -> M12 -> M24 -> M36 in SMOOTH_MONTHLY
    const m1Gsus = smoothOut.monthlyTotals[0].smoothMonthlyGsus;
    const m12Gsus = smoothOut.monthlyTotals[11].smoothMonthlyGsus;
    const m24Gsus = smoothOut.monthlyTotals[23].smoothMonthlyGsus;
    const m36Gsus = smoothOut.monthlyTotals[35].smoothMonthlyGsus;
    expect(m1Gsus).toBeLessThan(m12Gsus);
    expect(m12Gsus).toBeLessThan(m24Gsus);
    expect(m24Gsus).toBeLessThan(m36Gsus);

    // Under Optimal TCO PT sizing, scaling PT GSUs monthly (SMOOTH_MONTHLY) yields lower or equal 3-year TCO and higher PT utilization than 3 flat steps (ANNUAL_STEPS)
    const optimalLots = DEFAULT_LOTS.map((l) => ({
      ...l,
      ptSizingMode: 'OPTIMAL_TCO' as const,
    }));
    const optSmooth = runFullSimulation(optimalLots, {
      ...DEFAULT_GLOBAL_CONFIG,
      capacityRampMode: 'SMOOTH_MONTHLY',
    });
    const optStep = runFullSimulation(optimalLots, {
      ...DEFAULT_GLOBAL_CONFIG,
      capacityRampMode: 'ANNUAL_STEPS',
    });

    expect(
      optSmooth.threeYearCumulated.threeYearFsp.hybridTotalUsd
    ).toBeLessThanOrEqual(
      optStep.threeYearCumulated.threeYearFsp.hybridTotalUsd
    );
    expect(optSmooth.totalsByYear.y1.avgPtUtilization).toBeGreaterThanOrEqual(
      optStep.totalsByYear.y1.avgPtUtilization
    );
  });

  it('scales token volumes, GSU demand, and costs based on % of tokens served by Google (googleShare)', () => {
    const fullOut = runFullSimulation(DEFAULT_LOTS, DEFAULT_GLOBAL_CONFIG);
    const halfLots = DEFAULT_LOTS.map((l) => ({ ...l, googleShare: 0.5 }));
    const halfOut = runFullSimulation(halfLots, DEFAULT_GLOBAL_CONFIG);

    // 50% Google share halves 3-year token volume and pure PayGo baseline cost
    expect(halfOut.threeYearCumulated.totalTokensM).toBeCloseTo(
      fullOut.threeYearCumulated.totalTokensM * 0.5,
      2
    );
    expect(halfOut.threeYearCumulated.threeYearFsp.purePayGoUsd).toBeCloseTo(
      fullOut.threeYearCumulated.threeYearFsp.purePayGoUsd * 0.5,
      2
    );
    expect(halfOut.byLotAndYear.lot1.y1.avgGsuDemand).toBeCloseTo(
      fullOut.byLotAndYear.lot1.y1.avgGsuDemand * 0.5,
      4
    );

    // 0% Google share results in 0 tokens, 0 GSUs, and $0 cost while keeping break-even utilization valid
    const zeroLots = DEFAULT_LOTS.map((l) => ({ ...l, googleShare: 0 }));
    const zeroOut = runFullSimulation(zeroLots, DEFAULT_GLOBAL_CONFIG);
    expect(zeroOut.threeYearCumulated.totalTokensM).toBe(0);
    expect(zeroOut.totalsByYear.y1.totalProvisionedGsus).toBe(0);
    expect(zeroOut.threeYearCumulated.threeYearFsp.hybridTotalUsd).toBe(0);
    expect(zeroOut.avgBreakEvenUtilization).toBeCloseTo(
      fullOut.avgBreakEvenUtilization,
      4
    );
  });
});
