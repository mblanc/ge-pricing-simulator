# Spec: Orange RFQ — Gemini EU TCO & Capacity Simulator (PayGo + PT + Priority PayGo)

## 1. Objective & Statement of Intent
- **Outcome**: An executive-grade, interactive web simulator allowing Orange and Google deal teams to dynamically tweak token volumes, input/output/thinking splits, cache rates, batch ratios, and traffic seasonality across the 2027–2029 RFQ (48.54T baseline tokens), comparing **100% PayGo** against a **Hybrid Architecture (Base-load Provisioned Throughput GSUs + Standard PayGo burst + Priority PayGo 1.8× retry on 429 errors)** with **1-Year and 3-Year FSP Commit discounts**.
- **Target Users**: Orange procurement/architecture teams and Google Cloud account/deal teams evaluating the 3-year LLM RFQ.
- **Why Now**: The baseline RFQ Excel model (`Google Price Grid`) only evaluates 100% PayGo with older model mappings (`Gemini 3.1 Pro` Global / `3.7 Flash`) and lacks Provisioned Throughput (GSU) base-load sizing, hourly/weekly chatbot traffic seasonality, Priority PayGo (1.8×) retry bursts, and the updated **Gemini 3.8 Flash (`eu` endpoint)** lineup.
- **Success Criteria**:
  1. All 4 Lots priced strictly in **USD (`$`)** on the **`eu` (Europe Multi-Region) endpoint** (+10% non-global official Google Cloud SKU rates).
  2. **Lot 1** mapped to **`Gemini 3.8 Flash` (`thinking_level = HIGH`)** and **Lot 2** mapped to **`Gemini 3.8 Flash` (`thinking_level = MEDIUM` or `LOW`)**, with an interactive toggle to pool Lot 1 + Lot 2 `eu` GSUs.
  3. Realistic **168-hour (24h × 7d Weekday vs. Weekend)** public B2C general chatbot traffic curve with visual horizontal **PT Capacity Ceiling**, showing exact hourly bands for **PT Covered Traffic**, **Unused PT Valley**, **Standard PayGo Spillover**, and **Priority PayGo (1.8×) 429 Retries**.
  4. **Default PT** automatically sized to the **Minimum Traffic Floor** (100% GSU utilization, zero waste), with 1-click presets for **Daytime Base Floor**, **Cost-Optimal TCO Break-Even (~75.2% utilization)**, and manual **GSUs / $/month override** per Lot.
  5. Commercial discounts streamlined to **FSP (Flat Spend / Financial Commitment) discounts** for **1-Year Commit** and **3-Year Commit** (vs. 0% Uncommitted baseline), omitting complex marginal monthly PAYG brackets.
- **Out of Scope**:
  - Multi-currency FX conversion (all figures are in USD `$` for the `eu` multi-region endpoint).
  - Tiered progressive monthly PAYG brackets from rows 55–62 of the Excel sheet (replaced by 1Y and 3Y FSP commit discounts).
  - Backend database persistence or multi-user authentication (state is reactive client-side with URL/JSON scenario export & reset to RFQ baseline).

---

## 2. Domain Model & Verified Pricing Engine (`eu` Multi-Region, USD)

### 2.1 Lot Mapping & Official `eu` Multi-Region Public Rates (2027–2029 Baseline)

| Lot | Workload & Default RFQ 3Y Volume | Model & Thinking Config (`eu` Endpoint) | Standard PayGo (`eu` USD / 1M tok) | Priority PayGo (`1.8×` `eu` USD / 1M tok) | Batch API (`0.5×` `eu` USD / 1M tok) | Official PT Capacity per GSU (`eu` = $2,200/mo 1Y, $2,970/mo 1M) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Lot 1** | **Frontier / Complex Reasoning**<br>Y1: `750,000M` (0.75T)<br>Y2: `1,230,000M` (1.23T)<br>Y3: `1,790,000M` (1.79T)<br>**3Y Total**: `3.77T` | **`gemini-3.8-flash`**<br>`thinking_level = HIGH`<br>Location: `eu` multi-region | • Input: **$1.65**<br>• Cached Input: **$0.165**<br>• Output + Thinking: **$8.25** | • Input: **$2.97**<br>• Cached Input: **$0.297**<br>• Output + Thinking: **$14.85** | • Input: **$0.825**<br>• Cached: **$0.0825**<br>• Output: **$4.125** | **675 burndown tok/sec**<br>Weights:<br>• Input = `1.0`<br>• Cached Input = `0.1`<br>• Output & Thinking = `5.0` |
| **Lot 2** | **Balanced / Polyvalent**<br>Y1: `3,250,000M` (3.25T)<br>Y2: `4,470,000M` (4.47T)<br>Y3: `5,950,000M` (5.95T)<br>**3Y Total**: `13.67T` | **`gemini-3.8-flash`**<br>`thinking_level = MEDIUM` *(or `LOW` selectable)*<br>Location: `eu` multi-region | • Input: **$1.65**<br>• Cached Input: **$0.165**<br>• Output + Thinking: **$8.25** | • Input: **$2.97**<br>• Cached Input: **$0.297**<br>• Output + Thinking: **$14.85** | • Input: **$0.825**<br>• Cached: **$0.0825**<br>• Output: **$4.125** | **675 burndown tok/sec**<br>Weights:<br>• Input = `1.0`<br>• Cached Input = `0.1`<br>• Output & Thinking = `5.0`<br>*(Can pool GSUs with Lot 1)* |
| **Lot 3** | **Low-Cost / Mini / Nano**<br>Y1: `5,500,000M` (5.50T)<br>Y2: `9,820,000M` (9.82T)<br>Y3: `15,220,000M` (15.22T)<br>**3Y Total**: `30.54T` | **`gemini-3.5-flash-lite`**<br>`thinking_level = MINIMAL`<br>Location: `eu` multi-region | • Input: **$0.33**<br>• Cached Input: **$0.033**<br>• Output: **$2.75** | • Input: **$0.594**<br>• Cached Input: **$0.0594**<br>• Output: **$4.95** | • Input: **$0.165**<br>• Cached: **$0.0165**<br>• Output: **$1.375** | **3,360 burndown tok/sec**<br>Weights:<br>• Input = `1.0`<br>• Cached Input = `0.1`<br>• Output = `9.0` |
| **Lot 4** | **Image Generation**<br>Y1: `95,000M` (95B)<br>Y2: `180,000M` (180B)<br>Y3: `287,000M` (287B)<br>**3Y Total**: `562B` | **40% `Nano Banana 2 Lite`** (`3.1-flash-lite-image`)<br>**55% `Nano Banana 2`** (`3.1-flash-image`)<br>**5% `Nano Banana Pro`** (`3-pro-image`)<br>Location: `eu` multi-region (+10%) | • **NB2 Lite**: $0.275 in / $1.65 txt / $33.00 img<br>• **NB2**: $0.55 in / $3.30 txt / $66.00 img<br>• **NB Pro**: $2.20 in / $13.20 txt / $132.00 img | **1.8×** `eu` Standard PayGo rates | **0.5×** `eu` Standard PayGo rates | • **NB2 Lite**: `4,030 tok/s` (`1:6:120`)<br>• **NB2**: `2,015 tok/s` (`1:6:120`)<br>• **NB Pro**: `500 tok/s` (`1:6:60`) |

---

### 2.2 Thinking Level Token Mechanics (Lot 1 & Lot 2)
- In `Gemini 3.8 Flash`, internal reasoning (`thinking`) tokens are billed at the **Output token rate (`$8.25/1M` in `eu`)** and burn GSU capacity at the **Output weight (`5.0×`)**.
- Each `thinking_level` (`LOW`, `MEDIUM`, `HIGH`) has an editable **Thinking Token Ratio** (thinking tokens generated per 1.0 visible response output token):
  - `LOW`: default **`0.20×`** response output tokens
  - `MEDIUM`: default **`0.50×`** response output tokens
  - `HIGH`: default **`1.20×`** response output tokens
- **Volume Envelope Mode Toggle**:
  1. **"Add Thinking Tokens on top of RFQ Output Volume"**: Visible response output = `20%` of RFQ volume, and `Thinking Tokens = Response Output × Thinking Ratio` are added on top.
  2. **"Keep Total RFQ Token Volume Fixed"**: Total Lot volume stays fixed at the RFQ target (`0.75T` / `3.25T`), and `thinking_level` shifts the effective share of `(Output + Thinking)%` vs `Input%` (or uses `0.0×` extra multiplier if the user assumes the 20% RFQ output budget already includes thinking tokens).

---

### 2.3 Traffic Seasonality & Hybrid Routing Engine (PT + Standard PayGo + Priority PayGo + Batch)
1. **Batch Separation**:
   - Batch percentage (`B%`, default `10%` Lot 1, `15%` Lot 2, `20%` Lot 3, `10%` Lot 4) is carved out first and priced at the **Batch API rate (`0.5×` Standard PayGo)**, as Vertex AI Provisioned Throughput does not process Batch API jobs.
2. **Real-Time Traffic Distribution Across 168 Hours (1 Week = 5 Weekdays × 24h + 2 Weekend Days × 24h)**:
   - We model a normalized 168-hour seasonality weight vector $w_h$ ($h \in \{0 \dots 167\}$, where $\frac{1}{168}\sum_{h=0}^{167} w_h = 1.0$) representing a **Public General Chatbot (B2C)**:
     - **Hourly diurnal curve (24h)**:
       - Deep night trough (`02:00–05:00`): drops to **`~0.20×`** of the daily mean (configurable via a **Minimum Traffic Floor / Seasonality Amplitude** slider).
       - Morning ramp (`06:00–09:00`): climbs from `0.35×` to `1.15×`.
       - Daytime & evening plateau (`09:00–22:00`): active plateau between `1.15×` and `1.50×`, with a midday peak (`12:00–14:00` at `1.35×`) and prime consumer evening peak (`19:00–21:00` at `1.50×`).
       - Late night taper (`22:00–01:00`): winds down from `1.10×` to `0.40×`.
     - **Weekly factor (Weekday vs. Weekend)**:
       - Configurable **Weekend Traffic Ratio** $r_{\text{wknd}}$ (default **`0.75×`** of weekday volume, so Weekdays scale by $\frac{7}{5 + 2 r_{\text{wknd}}} \approx 1.077\times$ and Weekends scale by $\frac{7 r_{\text{wknd}}}{5 + 2 r_{\text{wknd}}} \approx 0.808\times$).
3. **Converting Real-Time Volume to Hourly GSU Demand ($G_h$)**:
   - For any Lot $L$ (or pooled Lot 1 + Lot 2) in Year $Y$:
     - Annual real-time tokens (Input non-cached, Input cached, Output+Thinking) are converted into **Total Annual Burndown Tokens** $B_{\text{annual}}$ using the official model burndown weights (`1.0`, `0.1`, `5.0`/`9.0`).
     - Mean burndown tokens per second across the year ($31,536,000$ seconds):
       $$\bar{R}_{\text{sec}} = \frac{B_{\text{annual}}}{31,536,000}$$
     - Required GSU capacity at hour $h$ of the week ($h \in \{0 \dots 167\}$):
       $$G_h = \frac{\bar{R}_{\text{sec}} \cdot w_h}{\text{Throughput}_{\text{GSU}}}$$
4. **Provisioned Throughput Ceiling ($G_{\text{PT}}$) & Spillover Split**:
   - Given a provisioned GSU commitment $G_{\text{PT}}$ (in integer GSUs, or equivalent $/month commitment):
     - **Default Sizing ("Minimum Traffic Floor")**:
       $$G_{\text{PT, default}} = \lfloor \min_{h} G_h \rfloor \quad \text{(or exact minimum hourly traffic } \min_h G_h \text{)}$$
       At this level, $G_{\text{PT}} \le G_h$ for all 168 hours—meaning **PT Utilization = 100%** and **0% wasted capacity**.
     - **Additional 1-Click Sizing Modes**:
       - **Daytime Base-Load Floor**: $\min_{h \in \text{08:00–22:00}} G_h$
       - **Cost-Optimal TCO Break-Even**: sets $G_{\text{PT}}$ at the quantile where hourly demand exceeds $G_{\text{PT}}$ for $(1 - \text{PT Price Advantage}) \approx 75.2\%$ of the week's hours (which mathematically minimizes total spend!).
       - **Manual GSU / Monthly $ Commit Slider**: user drags $G_{\text{PT}}$ (or enters monthly PT spend in `$`) from `0` to `Peak GSU`.
   - **Hourly Traffic Partition**:
     - Fraction of real-time traffic served by **PT**:
       $$\alpha_{\text{PT}} = \frac{\sum_{h=0}^{167} \min(G_h, G_{\text{PT}})}{\sum_{h=0}^{167} G_h}$$
     - Fraction of real-time traffic spilling over to **On-Demand PayGo**:
       $$\alpha_{\text{spill}} = 1 - \alpha_{\text{PT}} = \frac{\sum_{h=0}^{167} \max(0, G_h - G_{\text{PT}})}{\sum_{h=0}^{167} G_h}$$
     - Within the spillover fraction $\alpha_{\text{spill}}$, given a **PayGo 429 Error / Retry %** $p_{\text{retry}}$ (default **`5%`**, slider `0%–25%`):
       - **Standard PayGo Share**: $\alpha_{\text{std}} = \alpha_{\text{spill}} \cdot (1 - p_{\text{retry}})$ (billed at `1.0×` `eu` PayGo list price)
       - **Priority PayGo Share**: $\alpha_{\text{prio}} = \alpha_{\text{spill}} \cdot p_{\text{retry}}$ (billed at **`1.8×`** `eu` PayGo list price)

---

### 2.4 Commercial FSP Commitment Discounts (1-Year vs. 3-Year Commit)
- Users can evaluate and compare three commercial contract structures side-by-side:
  1. **Baseline (No FSP Commit — 0% FSP Discount)**:
     - PayGo / Priority / Batch at `eu` public list rates; PT GSUs at selected GSU term rate (1-Month `$2,970/mo` or 1-Year `$2,200/mo` in `eu`).
  2. **1-Year FSP Commit (Default `-10%` FSP Discount, editable slider `0%` to `-25%`)**:
     - Applies the 1-Year FSP discount to eligible spend, with 1-Year `eu` GSU pricing (`$2,200/GSU/mo`) and a toggle for whether FSP discount stacks on top of already-discounted 1-Year GSUs or applies to PayGo/Priority/Batch while GSU spend counts toward commit drawdown.
  3. **3-Year FSP Commit (Default `-20%` FSP Discount, editable slider `0%` to `-30%`)**:
     - Applies the 3-Year FSP discount across the 2027–2029 horizon.

---

## 3. UI/UX Architecture ("Beautiful, Uncluttered, Clear")
1. **Top Executive Summary Bar**:
   - **4 Hero KPI Cards**:
     1. **3-Year Total TCO (Hybrid PT + PayGo + Priority)** with net savings ($ and %) vs. **100% Pure PayGo**
     2. **Traffic Routing Split Bar**: `% Served by PT (Base)` | `% Standard PayGo (Burst)` | `% Priority PayGo (429 Retry)` | `% Batch (-50%)`
     3. **Provisioned Throughput Efficiency**: Total `eu` GSUs (`Y1 / Y2 / Y3`), Monthly PT Commit (`$`), and **Realized GSU Utilization %** vs. Break-Even (`75.2%`)
     4. **FSP Commit Tier Selector**: Instant switcher & comparison across **Uncommitted (0%)**, **1-Year FSP Commit (-10%)**, and **3-Year FSP Commit (-12%)**
2. **Interactive 168-Hour Seasonality & PT Capacity Visualizer**:
   - Smooth area chart showing **Weekday (Mon–Fri)** and **Weekend (Sat–Sun)** hourly traffic demand (in GSUs & burndown tokens/sec) for the selected Year (`2027`, `2028`, `2029`) and Lot (or Pooled Lots 1+2).
   - Interactive horizontal **PT Ceiling Line** showing:
     - **Green shaded base band**: Traffic absorbed by Provisioned Throughput
     - **Dashed amber band**: Unused PT capacity during deep nighttime troughs
     - **Blue burst area above PT line**: Standard PayGo spillover (`95%`)
     - **Orange/Coral tip on burst peaks**: Priority PayGo (`1.8×`) retry spillover (`5%`)
   - Quick-sizing pills: `Strict Minimum Floor (Default)` | `Daytime Floor (8am–10pm)` | `Optimal TCO (~75% Util)` | `100% PayGo (0 GSU)` + direct GSU / `$/mo` slider.
3. **Clean Lot Configuration Cards (Lots 1–4 + Lot 1&2 Pool Toggle)**:
   - Each Lot card allows adjusting:
     - **3-Year Token Volumes** (`Y1 / Y2 / Y3` or growth multiplier)
     - **Input % / Output % Split** (`80/20` default for Lots 1–3, `5/95` for Lot 4)
     - **Thinking Level (`HIGH` / `MEDIUM` / `LOW`)** & Thinking Token Ratio for `Gemini 3.8 Flash` (Lots 1 & 2)
     - **Cache Hit %** (`15%` default) & **Batch Request %** (`10%–20%` default)
     - **PT GSU Allocation** (`Auto-Minimum`, `Auto-Optimal`, or custom GSUs / `$/mo`)
4. **Year-by-Year (2027, 2028, 2029) & Lot-by-Lot Financial Breakdown Table**:
   - Side-by-side comparison of **Pure PayGo** vs. **Hybrid (PT + PayGo + Priority PayGo)** under **No Commit**, **1Y FSP**, and **3Y FSP**, plus 1-click **CSV / JSON Export** and **Reset to Orange RFQ Defaults**.

---

## 4. Tech Stack & Commands
- **Framework**: Vite + React 19 + TypeScript + Tailwind CSS + Lucide Icons
- **Commands**:
  - Install: `npm install`
  - Dev server: `npm run dev`
  - Build & Typecheck: `npm run build`
  - Unit Tests (Pricing & GSU Math): `npm test`

## 5. Project Structure
```text
/Users/mblanc/projects/pricing-simulator/
├── SPEC.md                        # Living specification document
├── package.json
├── src/
│   ├── data/
│   │   └── rfqDefaults.ts         # Verified EU SKU prices, GSU burndown tables, and Orange RFQ volumes
│   ├── engine/
│   │   ├── seasonality.ts         # 168-hour weekday/weekend B2C bot traffic curve generator
│   │   ├── simulator.ts           # PT GSU sizing, spillover, Priority PayGo (1.8x), and FSP commit math
│   │   └── simulator.test.ts      # Unit tests verifying GSU burndown & TCO formulas
│   ├── components/
│   │   ├── HeaderKpis.tsx         # Top KPI cards & FSP Commit selector
│   │   ├── TrafficSeasonalityChart.tsx # Interactive SVG 168h / 24h traffic & PT ceiling visualizer
│   │   ├── GlobalControls.tsx     # Seasonality, Priority Retry %, Lot 1+2 GSU Pool & FSP sliders
│   │   ├── LotConfigurator.tsx    # Per-lot inputs (Volumes, Input/Output, Thinking level, Cache, Batch, PT)
│   │   └── TcoComparisonTable.tsx # Detailed Y1/Y2/Y3 financial matrix (Pure PayGo vs Hybrid)
│   └── App.tsx
```
