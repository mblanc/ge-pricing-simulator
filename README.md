> ###### _This is not an officially supported Google product. This project is not eligible for the [Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security)._

# Gemini Enterprise 3-Year TCO & Provisioned Throughput Simulator

Interactive 36-month Total Cost of Ownership (TCO) and capacity planning simulator for **Google Cloud Vertex AI / Gemini Enterprise** workloads across multi-lot enterprise RFQ scenarios.

## Key Capabilities

- **3-Tab Executive & Engineering Workspace**:
  1. **Global simulation (all 4 lots)** — Company-wide 3-year KPIs, 168-hour weekly traffic routing, 36-month progressive GSU & spend ramp, and a unified Global Variables panel that updates all lots simultaneously.
  2. **Per-lot simulation (Lots 1–4)** — Lot-by-lot selector, dedicated lot KPIs, weekly/monthly visualizations, and granular per-lot overrides (volumes, thinking levels, image sub-model mix, manual GSU overrides).
  3. **Hypotheses & SKU pricing** — Read-only reference of official Vertex AI / Gemini Enterprise SKU rates, GSU burndown weights, regional endpoint multipliers (`global` `1.00×`, `eu` `1.10×`, `us` `1.10×`), and mathematical formulas.
- **Hybrid Capacity & Commercial Modeling**:
  - Compares **Provisioned Throughput (PT GSUs)** + **Standard PayGo** + **Priority PayGo** + **Batch API** against 100% PayGo baselines.
  - Enforces official commercial discount separation: Flexible Spend Plan (FSP) discounts apply strictly to variable PayGo SKUs, while PT GSU commitments use their dedicated PT discount rate.

## Local Development

```bash
# Install dependencies
npm install

# Start local Vite dev server
npm run dev

# Run unit tests
npm test

# Build production bundle
npm run build
```

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
