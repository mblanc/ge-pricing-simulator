> ###### _This is not an officially supported Google product. This project is not eligible for the [Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security)._

# Gemini Enterprise TCO & Capacity Simulator

An interactive, multi-year **Total Cost of Ownership (TCO)** and **Provisioned Throughput (PT) capacity planning simulator** for Google Cloud Vertex AI and Gemini models.

Built for **FinOps teams, Cloud Architects, Procurement leaders, and Enterprise AI decision-makers**, this tool bridges the gap between deep LLM tokenomics and executive financial planning—translating every engineering metric into plain business language in real time.

---

## Why This Project Exists

Estimating the true multi-year cost of enterprise generative AI at scale is rarely a simple multiplication of `tokens × unit price`. In production, organizations face a complex set of interacting variables:

1. **Traffic Spikiness vs. 24/7 Reserved Capacity**: Real-world user traffic fluctuates across daytime peaks, nighttime troughs, and weekends. Because **Provisioned Throughput (Generative AI Scale Units — GSUs)** is billed as a flat 24/7 monthly subscription, over-provisioning for peak hours wastes budget during nights and weekends, while under-provisioning exposes applications to rate limits or expensive overflow.
2. **Four Distinct Consumption Channels**: Enterprise workloads blend **Provisioned Throughput (PT)** for guaranteed base capacity, **Standard Pay-As-You-Go (PayGo)** for elastic spillover, **Priority PayGo** for mission-critical burst SLA, and **Batch API** (`-50%` discount) for asynchronous back-office processing.
3. **Separate Commercial Discount Rules**: Contractual spend commitments (Flexible Spend Plans / CUDs) and reserved GSU discounts follow distinct commercial rules and cannot be naively stacked.
4. **Tokenomics & Model Mix**: Context caching (`-90%` on repeated input prefixes), reasoning/thinking token overhead, multimodal output ratios, and regional data residency uplifts (`global` vs. `eu` / `us` multi-region endpoints) dramatically shift the break-even point between reserved capacity and pay-per-use.

**The Gemini Enterprise TCO & Capacity Simulator** models all of these dynamics deterministically across a **168-hour weekly traffic curve** and a **36-month adoption ramp**, allowing technical and commercial teams to find the mathematically optimal hybrid architecture in seconds.

---

## Core Value & Key Capabilities

### 1. Executive Clarity with Bilingual Technical-to-Business Labels
Every technical metric in the interface (`Provisioned Throughput (GSU)`, `Burndown weight`, `Context cache hit rate`, `Priority PayGo 429 retry share`, `Break-even utilization`) displays its official Google Cloud terminology first, paired immediately with a plain-business explanation as subtext—so procurement, finance, and engineering teams can collaborate on the exact same screen.

### 2. True Hourly Traffic Routing (168-Hour Weekly Simulation)
Instead of assuming flat 24/7 traffic, the simulator generates a realistic **168-hour weekly demand profile** (Monday 00:00 through Sunday 23:00) with configurable:
- **Industry traffic presets** (Public Consumer Bot, B2B Customer Care, or Flat 24/7 Batch/API)
- **Nighttime floor ratio** (`00:00–06:00` minimum demand)
- **Weekend-to-weekday ratio**
- **Daytime peak sharpness**

For every hour of the week, the engine routes asynchronous workloads to **Batch API**, fills reserved **PT GSU capacity** up to the provisioned ceiling, and splits any peak-hour spillover between **Standard PayGo** and **Priority PayGo**.

### 3. Automated Break-Even & Optimal GSU Sizing
The simulator continuously calculates the exact **break-even utilization threshold** where 1 marginal GSU of reserved capacity costs the same as the On-Demand PayGo overflow it replaces:

$$\text{Break-Even Utilization } u^* = \frac{\text{Annual Cost of 1 GSU}}{\text{Annual PayGo Value of 1 Full GSU at 100\% Load}}$$

Users can switch instantly between five capacity sizing strategies:
- **Optimal TCO (`~75–90%` utilization)** — Sizes GSUs to the exact hourly demand percentile that minimizes 3-year total spend.
- **Min Floor (`24/7` base)** — Sizes GSUs to the lowest nighttime/weekend hourly demand (`~100%` GSU utilization, zero idle waste).
- **Daytime Floor (`08:00–20:00`)** — Covers the daytime base load on reserved GSUs.
- **0 GSU (`100% PayGo`)** — Pure pay-per-use baseline with zero fixed commitment.
- **Manual GSU Override** — Custom year-by-year GSU capacity with optional proportional scaling across Years 1–3.

### 4. Progressive 36-Month Capacity Ramp (`M1–M36`)
Enterprise AI adoption grows progressively rather than jumping in sudden annual cliffs on January 1st. The simulator models a continuous **36-month trajectory** that preserves annual volume targets while comparing:
- **Progressive Monthly Scaling (`M1–M36`)** — Scaling GSU subscriptions month-by-month alongside actual traffic growth.
- **Annual Step Scaling (`Y1 / Y2 / Y3`)** — Provisioning flat annual average GSU blocks at the start of each contract year.

### 5. Multi-Lot Workload Portfolio Modeling
Model up to **4 independent workload lots** simultaneously—from complex agentic reasoning and high-volume customer assistants to low-latency classification and multimodal image generation—each with its own model tier, token growth curve, thinking budget, and regional endpoint (`global` `1.00×`, `eu` `+10%`, `us` `+10%`).

---

## Application Structure (3-Tab Workflow)

| Tab | Purpose | Audience |
| :--- | :--- | :--- |
| **1. Global Simulation** | Company-wide 3-year executive KPIs, unified visual switcher (*Weekly Traffic Routing*, *36-Month Ramp*, *Commercial Summary*), and a single **Global Variables Panel** below the results that updates all workload lots at once. | Executives, FinOps, Procurement, Lead Architects |
| **2. Per-Lot Simulation** | Interactive lot selector strip, lot-specific KPIs and charts, and a **Per-Lot Variables Panel** below the results to fine-tune an individual workload's annual volumes, thinking level, image model mix, or manual GSU count. | Solution Architects, ML Engineers, Product Owners |
| **3. Hypotheses & SKU Pricing** | Strictly read-only, auditable reference of all SKU list prices, GSU throughput & token burndown weights, regional multipliers, discount rules, and mathematical formulas. | Finance Auditors, Procurement, Technical Reviewers |

---

## Quick Start & Local Development

### Prerequisites
- **Node.js** `>= 20`
- **npm** `>= 10`

### Installation & Commands

```bash
# 1. Install dependencies
npm install

# 2. Start the interactive development server (http://localhost:5173)
npm run dev

# 3. Run the automated unit test suite (Vitest)
npm test

# 4. Build the production static bundle (TypeScript check + Vite build)
npm run build

# 5. Preview the production build locally
npm run preview
```

---

## Deploying to Google Cloud Run

The repository includes a multi-stage [`Dockerfile`](Dockerfile) (Node 20 Alpine build stage + Nginx 1.27 Alpine static server on port `8080`) and [`nginx.conf`](nginx.conf) ready for serverless deployment on **Google Cloud Run**:

```bash
gcloud run deploy gemini-pricing-simulator \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated
```

---

## Scenario Import & Export

Every simulation state—including all global commercial parameters, seasonality curves, and per-lot workload configurations—can be exported and shared:
- **Export JSON Snapshot** — Save a reproducible `.json` scenario file from the top navigation bar and re-import it at any time using **Import**.
- **Export Audit CSV** — Download a spreadsheet-ready `.csv` financial breakdown from the **Commercial Summary** table for offline financial modeling.

---

## Project Architecture

```text
src/
├── App.tsx                                    # Top-level 3-tab shell & scenario import/export
├── index.css                                  # Meridian Material 3 design tokens & typography
├── data/
│   └── rfqDefaults.ts                         # Default workload lots, SKU pricing, and GSU specs
├── engine/
│   ├── seasonality.ts                         # 168-hour weekly traffic profile generator
│   ├── simulator.ts                           # Core 3-year & 36-month hybrid TCO simulation engine
│   └── simulator.test.ts                      # Vitest mathematical & commercial verification suite
├── components/
│   ├── GlobalSimulationTab.tsx                # Tab 1: Global results on top + Global variables below
│   ├── LotConfigurator.tsx                    # Tab 2: Per-lot results on top + Per-lot variables below
│   ├── MethodologyAndHypothesesTab.tsx        # Tab 3: Read-only SKU pricing & mathematical reference
│   ├── HeaderKpis.tsx                         # Executive 4-card KPI strip with sparklines
│   ├── TrafficSeasonalityChart.tsx            # 168-hour weekly GSU ceiling vs. PayGo spillover chart
│   ├── MonthlyRampChart.tsx                   # 36-month capacity & spend ramp visualization
│   └── TcoComparisonTable.tsx                 # Multi-tier commercial comparison table & CSV export
└── utils/
    └── format.ts                              # Currency, token volume, and percentage formatters
```

---

## License

Copyright 2026 Google LLC. Licensed under the [Apache License, Version 2.0](LICENSE).
