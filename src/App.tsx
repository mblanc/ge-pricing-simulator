import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  Globe2,
  Sun,
  Moon,
  Download,
  Upload,
  LayoutDashboard,
  Calendar,
  Info,
  BookOpen,
} from 'lucide-react';
import {
  DEFAULT_GLOBAL_CONFIG,
  DEFAULT_LOTS,
  GlobalSimConfig,
  LotConfig,
  PtSizingMode,
} from './data/rfqDefaults';
import { runFullSimulation, YearKey } from './engine/simulator';
import { SelectedKpiId } from './components/HeaderKpis';
import { UnifiedSimulatorView } from './components/UnifiedSimulatorView';
import { MethodologyAndHypothesesTab } from './components/MethodologyAndHypothesesTab';

type PrimaryTabId = 'simulator' | 'hypotheses';

export function App() {
  const [lots, setLots] = useState<LotConfig[]>(() =>
    structuredClone(DEFAULT_LOTS)
  );
  const [globalConfig, setGlobalConfig] = useState<GlobalSimConfig>(() =>
    structuredClone(DEFAULT_GLOBAL_CONFIG)
  );
  const [activeFspTier, setActiveFspTier] = useState<
    'uncommitted' | 'oneYearFsp' | 'threeYearFsp'
  >('threeYearFsp');
  const [selectedYear, setSelectedYear] = useState<YearKey>('y1');
  const [selectedKpi, setSelectedKpi] = useState<SelectedKpiId>('tco');
  const [activeTab, setActiveTab] = useState<PrimaryTabId>('simulator');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [jsonToast, setJsonToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const sim = useMemo(
    () => runFullSimulation(lots, globalConfig, activeFspTier),
    [lots, globalConfig, activeFspTier]
  );

  const currentGlobalPtMode: PtSizingMode | 'MIXED' = useMemo(() => {
    const first = lots[0].ptSizingMode;
    return lots.every((l) => l.ptSizingMode === first) ? first : 'MIXED';
  }, [lots]);

  const handleApplyGlobalPtMode = (mode: PtSizingMode) => {
    setLots((prev) =>
      prev.map((lot) => ({
        ...lot,
        ptSizingMode: mode,
      }))
    );
  };

  const handleChangeLot = (updated: LotConfig) => {
    setLots((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleResetAll = () => {
    setLots(structuredClone(DEFAULT_LOTS));
    setGlobalConfig(structuredClone(DEFAULT_GLOBAL_CONFIG));
    setActiveFspTier('threeYearFsp');
    setSelectedYear('y1');
    setSelectedKpi('tco');
    setJsonToast('Restored baseline defaults');
    setTimeout(() => setJsonToast(null), 2600);
  };

  const handleExportScenarioJson = () => {
    const snapshot = {
      schema: 'gemini-enterprise-tco-simulator-v1',
      exportedAt: new Date().toISOString(),
      activeFspTier,
      selectedYear,
      globalConfig,
      lots,
      summary3Y: {
        totalTokensM: sim.threeYearCumulated.totalTokensM,
        uncommittedHybridUsd: Math.round(
          sim.threeYearCumulated.uncommitted.hybridTotalUsd
        ),
        oneYearFspHybridUsd: Math.round(
          sim.threeYearCumulated.oneYearFsp.hybridTotalUsd
        ),
        threeYearFspHybridUsd: Math.round(
          sim.threeYearCumulated.threeYearFsp.hybridTotalUsd
        ),
      },
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Gemini_Enterprise_3Y_TCO_Scenario_Snapshot.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setJsonToast('Report exported (.json)');
    setTimeout(() => setJsonToast(null), 2600);
  };

  const handleImportScenarioJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed.lots) && parsed.globalConfig) {
          setLots(parsed.lots);
          setGlobalConfig(parsed.globalConfig);
          if (parsed.activeFspTier) setActiveFspTier(parsed.activeFspTier);
          if (parsed.selectedYear) setSelectedYear(parsed.selectedYear);
          setJsonToast('Scenario report imported');
          setTimeout(() => setJsonToast(null), 2600);
        } else {
          setJsonToast(
            'Could not import file: missing workload lot or configuration data. Choose a valid scenario .json file.'
          );
          setTimeout(() => setJsonToast(null), 4200);
        }
      } catch {
        setJsonToast(
          'Could not read JSON file: file format is damaged or invalid JSON. Export a fresh scenario snapshot and try again.'
        );
        setTimeout(() => setJsonToast(null), 4200);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const tabMeta: Record<
    PrimaryTabId,
    {
      title: string;
      subtitle: string;
    }
  > = {
    simulator: {
      title: 'TCO & capacity simulator — Global portfolio or per-lot tuning',
      subtitle:
        'Select All 4 lots (Global) or any individual workload lot below. Model consumption options and future traffic hypotheses are grouped in the same two places across every scope.',
    },
    hypotheses: {
      title: 'Hypotheses, official SKU pricing & calculation methodology',
      subtitle:
        'Read-only reference of every Google Cloud Gemini Enterprise SKU rate, regional uplift, commercial discount rule, and mathematical formula.',
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--md-surface-container)] text-[var(--md-on-surface)]">
      {/* Cloud Analytics Top App Bar */}
      <header className="sticky top-0 z-20 min-h-[64px] bg-[var(--md-surface-container)] px-4 sm:px-6 py-2 flex items-center justify-between gap-4 border-b border-[var(--md-outline-variant)]">
        <div className="max-w-[1600px] w-full mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Product Logo + Name + Active Endpoint & Contract Horizon Pills */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] type-title-sm shrink-0"
              title="Google Cloud Gemini Enterprise · TCO & Capacity Simulator"
            >
              G
            </div>
            <h1 className="type-title-lg text-[var(--md-on-surface)] truncate">
              Gemini Enterprise · TCO & Capacity Simulator
            </h1>
            <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] type-label-md">
              <Globe2 className="w-3.5 h-3.5 text-[var(--md-primary)]" />
              <span>
                {(() => {
                  const uniqueLocs = Array.from(
                    new Set(lots.map((l) => l.endpointLocation ?? 'eu'))
                  );
                  return uniqueLocs.length === 1
                    ? `${uniqueLocs[0]} endpoint (${
                        uniqueLocs[0] === 'global' ? '1.00×' : '1.10×'
                      }) · USD ($)`
                    : `${uniqueLocs.join(' / ')} endpoints · USD ($)`;
                })()}
              </span>
            </span>
            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] type-label-md">
              <Calendar className="w-3.5 h-3.5 text-[var(--md-primary)]" />
              <span>Jan 2027 – Dec 2029 (36 mos)</span>
            </span>
          </div>

          {/* Right: Import, Reset, Theme Toggle, and Single Primary Export Action */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {jsonToast && (
              <span
                role="status"
                className="px-3 py-1.5 rounded-full bg-[var(--md-tertiary-container)] text-[var(--md-on-tertiary-container)] type-label-md"
              >
                {jsonToast}
              </span>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="md-btn-text cursor-pointer"
              title="Import a saved scenario JSON file"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline">Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportScenarioJson}
              className="hidden"
              aria-label="Import scenario JSON file"
            />

            <button
              type="button"
              onClick={handleResetAll}
              className="md-btn-text cursor-pointer"
              title="Reset all global and lot parameters to baseline defaults"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden md:inline">Reset baseline</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
              }
              aria-label={`Switch to ${
                theme === 'light' ? 'dark' : 'light'
              } theme`}
              aria-pressed={theme === 'dark'}
              className="min-h-[48px] min-w-[48px] px-3 rounded-full bg-transparent hover:bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] type-label-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4" />
                  <span className="hidden sm:inline">Light</span>
                </>
              )}
            </button>

            {/* Single Primary Filled Action Button per screen */}
            <div className="min-h-[48px] flex items-center">
              <button
                type="button"
                onClick={handleExportScenarioJson}
                title="Export scenario parameters and 3-year projections as JSON"
                className="md-btn-filled cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export report</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-5 space-y-6">
        {/* Top Non-Binding Visualization & Simulation Tool Disclaimer Cartouche */}
        <div
          role="note"
          aria-label="Non-binding simulation disclaimer"
          className="md-card px-4 py-3 flex items-start sm:items-center gap-2.5"
        >
          <Info className="w-4 h-4 text-[var(--md-primary)] shrink-0 mt-0.5 sm:mt-0" />
          <p className="type-body-sm text-[var(--md-on-surface-variant)]">
            <strong className="text-[var(--md-on-surface)]">
              Non-binding visualization & simulation tool:
            </strong>{' '}
            This interactive simulator is designed for illustrative capacity planning and architectural modeling on <strong>Google Cloud Gemini Enterprise</strong>. All costs, GSU burndown ratios, and discount figures shown are non-binding estimates for simulation purposes only and do not constitute a formal commercial offer or contract.
          </p>
        </div>

        {/* Primary 2-Tab Switcher Header: Simulator | Hypotheses & pricing */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="type-headline-sm text-[var(--md-on-surface)]">
              {tabMeta[activeTab].title}
            </h2>
            <p className="type-body-md text-[var(--md-on-surface-variant)] max-w-[74ch] mt-0.5">
              {tabMeta[activeTab].subtitle}
            </p>
          </div>

          {/* 2-Tab Segmented Navigation Bar */}
          <div
            role="tablist"
            aria-label="Primary application views"
            className="inline-flex flex-wrap items-center p-1.5 rounded-full bg-[var(--md-surface-container-lowest)] self-start lg:self-auto shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'simulator'}
              onClick={() => setActiveTab('simulator')}
              className={`h-[40px] px-5 rounded-full type-label-lg flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'simulator'
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Simulator</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'hypotheses'}
              onClick={() => setActiveTab('hypotheses')}
              className={`h-[40px] px-5 rounded-full type-label-lg flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'hypotheses'
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Hypotheses & pricing</span>
            </button>
          </div>
        </div>

        {/* Active Tab Content */}
        {activeTab === 'simulator' && (
          <UnifiedSimulatorView
            lots={lots}
            onChangeLot={handleChangeLot}
            onChangeAllLots={setLots}
            globalConfig={globalConfig}
            onChangeGlobalConfig={setGlobalConfig}
            activeFspTier={activeFspTier}
            onSelectFspTier={setActiveFspTier}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            selectedKpi={selectedKpi}
            onSelectKpi={setSelectedKpi}
            sim={sim}
            onApplyGlobalPtMode={handleApplyGlobalPtMode}
            currentGlobalPtMode={currentGlobalPtMode}
          />
        )}

        {activeTab === 'hypotheses' && (
          <MethodologyAndHypothesesTab
            sim={sim}
            lots={lots}
            globalConfig={globalConfig}
            selectedYear={selectedYear}
            activeFspTier={activeFspTier}
          />
        )}
      </main>
    </div>
  );
}

export default App;
