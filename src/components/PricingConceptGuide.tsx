import React, { useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { formatPct } from '../utils/format';

interface PricingConceptGuideProps {
  breakEvenUtilization: number;
  activeFspDiscountPct: number;
  ptDiscountPct: number;
}

export const PricingConceptGuide: React.FC<PricingConceptGuideProps> = ({
  breakEvenUtilization,
  activeFspDiscountPct,
  ptDiscountPct,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <section
      aria-label="How Gemini Enterprise hybrid pricing works"
      className="md-card overflow-hidden"
    >
      <div className="px-5 py-3.5 bg-[var(--md-surface-container-low)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 text-[var(--md-primary)] shrink-0" />
          <h2 className="type-title-sm text-[var(--md-on-surface)]">
            New to Gemini Enterprise pricing? How the 3 cost drivers work together (30-second guide)
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="h-[32px] px-3 rounded-full bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] type-label-md inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <span>{isOpen ? 'Hide guide' : 'Show 3-step guide'}</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="p-5 border-t border-[var(--md-outline-variant)] grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Step 1: Traffic Fluctuates */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md inline-flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>Step 1 · Hourly traffic shape (168h)</span>
              </span>
            </div>
            <h3 className="type-title-sm text-[var(--md-on-surface)]">
              AI demand peaks by day and drops at night
            </h3>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Real-world traffic fluctuates across the 168 hours of the week. If you buy fixed capacity for the highest daytime peak, most of that capacity sits idle at night and on weekends.
            </p>
          </div>

          {/* Step 2: Reserved Base Capacity (PT GSUs) */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2 tabular-nums">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md inline-flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span>Step 2 · Reserved base capacity (PT GSUs)</span>
              </span>
            </div>
            <h3 className="type-title-sm text-[var(--md-on-surface)]">
              Reserve GSUs only where utilization ≥ {formatPct(breakEvenUtilization, 0)}
            </h3>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              <strong>Provisioned Throughput (PT)</strong> lets you reserve fixed monthly capacity in <strong>GSUs</strong> (Generative Serving Units, currently <strong>-{ptDiscountPct}%</strong> off list). A GSU is cheaper than on-demand PayGo whenever it stays busy at least <strong>{formatPct(breakEvenUtilization, 0)} of the week</strong> (the green area on the chart).
            </p>
          </div>

          {/* Step 3: On-Demand Overflow & Commitments */}
          <div className="p-4 rounded-[12px] bg-[var(--md-surface-container)] space-y-2 tabular-nums">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] type-label-md inline-flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>Step 3 · Peak overflow & discounts (PayGo + FSP)</span>
              </span>
            </div>
            <h3 className="type-title-sm text-[var(--md-on-surface)]">
              Let daytime spikes spill over to discounted PayGo
            </h3>
            <p className="type-body-sm text-[var(--md-on-surface-variant)]">
              Traffic above your reserved GSU ceiling automatically spills over to variable <strong>Pay-As-You-Go (PayGo)</strong>—discounted by <strong>-{activeFspDiscountPct}%</strong> via your <strong>Flexible Spend Commitment (FSP)</strong>—while caching (<strong>-90%/-95%</strong>) and async batch (<strong>-50%</strong>) cut token costs further.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
