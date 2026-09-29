# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Google Cloud Account & Deal Engineering Teams**: Solution Architects, Customer Engineers, and Deal Desk leads modeling multi-year Vertex AI commercial proposals and walking Orange stakeholders through live pricing/capacity workshops.
- **Orange Procurement & AI Architecture Teams**: Technical and commercial evaluators reviewing the 2027–2029 LLM RFQ (48.54T baseline tokens across 4 Lots) both during collaborative deal sessions and as a self-contained interactive leave-behind.

## Product Purpose

An executive-grade interactive TCO and Provisioned Throughput (GSU) capacity simulator for the Orange 2027–2029 LLM RFQ. It models and compares **100% On-Demand PayGo** against a **Hybrid Architecture**—combining base-load Provisioned Throughput (GSUs), Standard PayGo burst spillover, Priority PayGo (`1.8×`) retry spillover on `429` errors, and Batch API (`0.5×`) routing—across **Uncommitted (0%)**, **1-Year FSP Commit**, and **3-Year FSP Commit** structures on the Google Cloud **`eu` (Europe Multi-Region) endpoint** in **USD (`$`)**.

Success means giving both Google Cloud and Orange decision-makers immediate, transparent, and mathematically verifiable clarity on how base-load GSU sizing, thinking token levels,Lot 1+2 GSU pooling, and multi-year FSP commitments minimize 3-year total cost of ownership while eliminating `429` throttling risk.

## Positioning

Unlike the static RFQ Excel price grid—which only calculates flat 100% PayGo on legacy model mappings without hourly seasonality or capacity commitments—this simulator natively models:
- **168-hour (5 Weekday × 24h + 2 Weekend × 24h) B2C chatbot seasonality** against horizontal Provisioned Throughput GSU capacity ceilings.
- **Exact Vertex AI `eu` GSU burndown math**: `675 tok/s` for `Gemini 3.8 Flash` (`1.0` input / `0.1` cached / `5.0` output & thinking), `3,360 tok/s` for `Gemini 3.5 Flash-Lite` (`1.0` / `0.1` / `9.0`), and weighted image generation burndown for the `Nano Banana 2` suite (`Lot 4`).
- **Closed-form TCO optimization**: Instant sizing presets for **Strict Minimum Traffic Floor (100% GSU utilization, 0% waste)**, **Daytime Base-Load Floor (08:00–22:00)**, and **Cost-Optimal TCO Break-Even (~75.2% GSU utilization)**, plus Lot 1 + Lot 2 `eu` GSU pooling.

## Operating Context

- Used live during Google Cloud × Orange commercial/technical workshops (screen-shared on high-resolution displays) and distributed as a standalone interactive leave-behind alongside the formal RFQ spreadsheet submission.
- Evaluators cross-check simulator outputs directly against the official Orange 2027–2029 RFQ baseline volumes (`Lot 1`: 3.77T reasoning, `Lot 2`: 13.67T polyvalent, `Lot 3`: 30.54T low-cost/nano, `Lot 4`: 562B image generation) and export JSON/CSV scenario snapshots for internal procurement sign-off.

## Capabilities and Constraints

- **Strictly Locked Official `eu` Multi-Region SKU & GSU Math**:
  - All pricing is strictly in **USD (`$`)** on the **`eu` multi-region endpoint** (+10% non-global official Google Cloud SKU list prices; `1-Year` `eu` GSU = `$2,200/GSU/month`, `1-Month` `eu` GSU = `$2,970/GSU/month`).
  - Priority PayGo retry spillover is strictly billed at **`1.8×`** `eu` Standard PayGo rates, and Batch API workloads are carved out prior to real-time GSU routing at **`0.5×`** Standard PayGo rates.
  - Thinking tokens (`Gemini 3.8 Flash` in Lots 1 & 2) are billed and burned at the Output token rate (`$8.25/1M` in `eu`) and Output burndown weight (`5.0×`).
- **Interactive Scenario Overrides**:
  - Users can dynamically adjust 3-year token volumes, Input/Output splits, Thinking Levels (`HIGH`, `MEDIUM`, `LOW`) and thinking ratios, Volume Envelope mode (`Add on top` vs. `Keep total RFQ volume fixed`), Cache Hit %, Batch %, diurnal trough floor, weekend traffic ratio, `429` Priority PayGo retry %, Lot 1+2 GSU pooling, PT sizing modes, and 1Y/3Y FSP commit discount rates.
  - Includes a 1-click **Reset to Orange RFQ Defaults** action to restore the exact baseline RFQ state at any time.
- **100% Client-Side Architecture**:
  - Zero backend or database dependencies (React 19 + TypeScript + Vite + Tailwind CSS v4) so the tool runs deterministically in any browser and can be shared or hosted as a self-contained bundle.

## Brand Commitments

- **Co-Branded Google Cloud Vertex AI × Orange RFQ Executive Framing**: Presents an authoritative, neutral, financial-grade joint evaluation workspace referencing both Orange RFQ Lot nomenclature (`Lots 1–4`) and official Google Cloud Vertex AI SKU/GSU terminology.

## Evidence on Hand

- `SPEC.md`: Complete verified domain specification, `eu` SKU price matrices, GSU burndown tables, and 168-hour traffic partition equations.
- `[External] Orange RFQ LLM Models - Google TCO Price grid.xlsx`: Official baseline RFQ volume and price grid reference.
- `Tokenomics & Consumption Patterns Deck.png`: Reference visual artifact for tokenomics and traffic seasonality patterns.
- `src/data/rfqDefaults.ts` & `src/engine/simulator.ts` (+ `src/engine/simulator.test.ts`): Verified simulation engine and unit-tested pricing/capacity formulas.

## Product Principles

1. **Mathematical & Commercial Auditability First**: Every dollar, token, and GSU displayed must trace cleanly to official `eu` multi-region SKU rates, burndown weights, and the baseline Orange RFQ volume table—never hide assumptions in black-box aggregates.
2. **Executive Clarity Paired with Architectural Depth**: Surface the 3-year TCO bottom line, net Hybrid savings ($ and %), and routing split immediately at the top while keeping per-hour GSU ceilings and per-lot levers one glance below for deep-dive technical scrubbing.
3. **Zero-Friction Scenario Comparison**: Switching between `Uncommitted`, `1-Year FSP`, and `3-Year FSP` or toggling `Minimum Floor` vs. `Cost-Optimal (~75.2% Util)` PT sizing must update every KPI, 168-hour band, and 3-year matrix cell instantaneously with a clear path back to RFQ defaults.
