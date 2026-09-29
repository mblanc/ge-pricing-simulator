---
version: alpha
name: Cloud Analytics Design System
description: A Google Material 3 style design system for data-dense analytics dashboards with KPI cards, time-series charts, breakdowns and tables. Calm tonal surfaces, Google blue as the single action color, and a colorblind-aware chart palette.
colors:
  # Brand and action
  primary: "#0B57D0"
  on-primary: "#FFFFFF"
  primary-container: "#D3E3FD"
  on-primary-container: "#041E49"
  secondary: "#00639B"
  secondary-container: "#C2E7FF"
  on-secondary-container: "#001D35"
  tertiary: "#146C2E"
  tertiary-container: "#C4EED0"
  on-tertiary-container: "#072711"
  error: "#B3261E"
  error-container: "#F9DEDC"
  on-error-container: "#410E0B"
  # Surfaces (light)
  surface: "#F8FAFD"
  surface-container-lowest: "#FFFFFF"
  surface-container-low: "#F8FAFD"
  surface-container: "#F0F4F9"
  surface-container-high: "#E9EEF6"
  surface-container-highest: "#DDE3EA"
  on-surface: "#1F1F1F"
  on-surface-variant: "#444746"
  outline: "#747775"
  outline-variant: "#C4C7C5"
  inverse-surface: "#303030"
  inverse-on-surface: "#F2F2F2"
  # Semantic data states
  positive: "#146C2E"
  positive-container: "#C4EED0"
  negative: "#B3261E"
  negative-container: "#F9DEDC"
  warning: "#B06000"
  warning-container: "#FFDDB8"
  # Categorical chart series (light), in order of use
  chart-1: "#1A73E8"
  chart-2: "#007B83"
  chart-3: "#D01884"
  chart-4: "#9334E6"
  chart-5: "#B06000"
  chart-6: "#5F6368"
  chart-comparison: "#747775"
  chart-grid: "#E1E3E1"
  # Dark theme
  dark-primary: "#A8C7FA"
  dark-on-primary: "#062E6F"
  dark-primary-container: "#0842A0"
  dark-on-primary-container: "#D3E3FD"
  dark-surface: "#131314"
  dark-surface-container-low: "#1B1B1C"
  dark-surface-container: "#1E1F20"
  dark-surface-container-high: "#282A2C"
  dark-surface-container-highest: "#333537"
  dark-on-surface: "#E3E3E3"
  dark-on-surface-variant: "#C4C7C5"
  dark-outline: "#8E918F"
  dark-outline-variant: "#444746"
  dark-positive: "#6DD58C"
  dark-negative: "#F2B8B5"
  dark-chart-1: "#8AB4F8"
  dark-chart-2: "#4FD8EB"
  dark-chart-3: "#FF8BCB"
  dark-chart-4: "#C58AF9"
  dark-chart-5: "#FCAD70"
  dark-chart-6: "#BDC1C6"
  dark-chart-grid: "#2F3133"
typography:
  display-sm:
    fontFamily: Google Sans Flex
    fontSize: 36px
    fontWeight: 400
    lineHeight: 44px
    letterSpacing: 0em
  headline-md:
    fontFamily: Google Sans Flex
    fontSize: 28px
    fontWeight: 400
    lineHeight: 36px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Google Sans Flex
    fontSize: 24px
    fontWeight: 400
    lineHeight: 32px
    letterSpacing: 0em
  title-lg:
    fontFamily: Google Sans Flex
    fontSize: 22px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0em
  title-md:
    fontFamily: Google Sans Flex
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0.009em
  title-sm:
    fontFamily: Google Sans Flex
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0.007em
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0.031em
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0.018em
  body-sm:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0.033em
  label-lg:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0.007em
  label-md:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.042em
  label-sm:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.045em
  kpi-hero:
    fontFamily: Google Sans Flex
    fontSize: 45px
    fontWeight: 400
    lineHeight: 52px
    letterSpacing: -0.01em
  kpi-value:
    fontFamily: Google Sans Flex
    fontSize: 32px
    fontWeight: 400
    lineHeight: 40px
    letterSpacing: -0.005em
  kpi-delta:
    fontFamily: Roboto Flex
    fontSize: 13px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.01em
  data-cell:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0em
  axis-label:
    fontFamily: Roboto Flex
    fontSize: 11px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  none: 0px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 28px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  page-margin: 24px
  card-padding: 20px
components:
  page:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
  top-app-bar:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    typography: "{typography.title-lg}"
    height: 64px
    padding: 0 16px
  navigation-rail:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-md}"
    width: 80px
  nav-item-active:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.full}"
    height: 32px
    width: 56px
  search-field:
    backgroundColor: "{colors.surface-container-high}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 0 16px
  card-kpi:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 20px
  card-kpi-selected:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.lg}"
    padding: 20px
  card-chart:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  delta-positive:
    backgroundColor: "{colors.positive-container}"
    textColor: "{colors.positive}"
    typography: "{typography.kpi-delta}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  delta-negative:
    backgroundColor: "{colors.negative-container}"
    textColor: "{colors.negative}"
    typography: "{typography.kpi-delta}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  button-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 24px
  button-tonal:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 24px
  button-text:
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    height: 40px
    padding: 0 12px
  chip-filter:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    height: 32px
    padding: 0 16px
  chip-filter-selected:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    height: 32px
    padding: 0 12px
  segmented-button-selected:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    height: 40px
  chart-tooltip:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  plain-tooltip:
    backgroundColor: "{colors.inverse-surface}"
    textColor: "{colors.inverse-on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    padding: 4px 8px
  table-header:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.label-lg}"
    height: 48px
    padding: 0 16px
  table-row:
    backgroundColor: "{colors.surface-container-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data-cell}"
    height: 52px
    padding: 0 16px
  table-row-hover:
    backgroundColor: "{colors.surface-container-low}"
  status-badge-warning:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.warning}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 2px 8px
---

## Overview

Cloud Analytics is a Google-native analytics dashboard: the calm, confident clarity of Google Analytics and Cloud Console, rendered in Material 3. It should feel like a tool built by the same people who build Google Workspace. Nothing shouts; the data is the loudest thing on the screen.

The emotional target is *trustworthy and unhurried*. Users open this dashboard to answer a question ("How did last week compare?"), and the interface should let them answer it in under five seconds: scan the KPI strip, glance at the hero chart, drill into the breakdown.

Three ideas define the system:

1. **Tonal, not shadowed.** Hierarchy comes from surface tone (a soft blue-gray page with white cards), not from borders or drop shadows.
2. **One action color.** Google blue (`primary`) is reserved for interaction and the primary data series. Everything else is neutral.
3. **Numbers first.** KPI values are set large and light in Google Sans Flex with tabular figures; labels are small, sentence case and quiet.

## Colors

The palette is the Material 3 baseline generated from a Google blue seed, matching the tones used across Google Workspace.

- **Primary (#0B57D0):** Filled buttons, active links, focus rings, selected states and the primary series when a chart has only one. Never used for decoration.
- **Primary container (#D3E3FD):** Selected KPI card (the metric currently driving the hero chart), highlighted rows, the active date range.
- **Secondary container (#C2E7FF):** Active navigation pill, selected filter chips, selected segment in segmented buttons.
- **Surface container (#F0F4F9):** The page background. Cards sit on it in pure white (`surface-container-lowest`), which creates separation without borders.
- **Surface container high (#E9EEF6):** The search pill in the top app bar and pressed states.
- **On surface (#1F1F1F) / on surface variant (#444746):** Primary text and KPI values / labels, axis text, secondary metadata.
- **Outline variant (#C4C7C5):** Dividers inside cards and table row separators, only where grouping is otherwise unclear.

### Semantic states

- **Positive (#146C2E on #C4EED0):** A favorable delta. "Favorable" depends on the metric: a *drop* in bounce rate or cost per acquisition is positive. Map color to meaning, never to arithmetic sign.
- **Negative (#B3261E on #F9DEDC):** An unfavorable delta or a breached threshold.
- **Warning (#B06000 on #FFDDB8):** Anomalies, incomplete data ("Data for today is still processing"), approaching limits.

### Chart palette

Six categorical colors, used in this order. Each clears 3:1 contrast against white cards, as WCAG requires for graphical objects, and the sequence alternates hue and lightness so adjacent series stay distinguishable for the most common forms of color blindness.

| Token | Light | Dark | Typical use |
|---|---|---|---|
| chart-1 | #1A73E8 | #8AB4F8 | Primary metric, current period |
| chart-2 | #007B83 | #4FD8EB | Second series |
| chart-3 | #D01884 | #FF8BCB | Third series |
| chart-4 | #9334E6 | #C58AF9 | Fourth series |
| chart-5 | #B06000 | #FCAD70 | Fifth series |
| chart-6 | #5F6368 | #BDC1C6 | "Other" bucket, always last |
| chart-comparison | #747775 | on-surface-variant | Previous period, dashed |

Green and red are deliberately absent from the categorical palette so they stay reserved for positive and negative meaning.

## Typography

Two families, split by role, as in Google's own products:

- **Google Sans Flex** for anything a user reads as a headline or a headline number: page titles, card titles, KPI values. Its open, round forms make large numbers feel friendly rather than clinical. If it isn't available in the target environment, use Roboto Flex for these roles too.
- **Roboto Flex** for body copy, labels, table cells and chart axes, where its narrower proportions fit dense data.

Rules for numbers:

- Always enable tabular figures (`font-variant-numeric: tabular-nums`) on KPI values, table cells, axis labels and tooltips, so digits align in columns and values don't jitter when they update.
- KPI values use weight 400. Large numbers look heavier than they are; bold makes them crude.
- Abbreviate with one decimal above 10,000: 12.4K, 3.2M, €1.8B. Show exact values in tooltips and tables.
- Percentages use one decimal (4.7%). Deltas carry an explicit sign and arrow: ▲ 12.4%, ▼ 3.1%.

Everything is sentence case: "Active users", "Last 28 days", "Export report". No all-caps labels anywhere, including table headers.

## Layout

A 12-column fluid grid, max content width 1600px, 24px gutters and 24px page margins, built on a 4px baseline. Cards snap to the grid; nothing floats.

### Shell

- **Navigation rail** (80px) on the left for medium and larger windows: icon plus short label, active item in a secondary-container pill. On extra-large windows (≥1600px) it may expand to a 256px navigation drawer.
- **Top app bar** (64px) on the same `surface-container` tone as the page, so the chrome disappears. Left: product name and property selector. Center: a full-width pill search field ("Search metrics, reports and settings"). Right: date range chip, help, account avatar.
- **Filter bar** directly under the page title: date range, comparison toggle ("Compare to previous period"), then filter chips for dimensions like country or channel.

### Dashboard page

```
┌──────┬────────────────────────────────────────────────────────────────┐
│      │  [≡ Cloud Analytics ▾] ( 🔍 Search metrics and reports ) 📅 ⓘ ◉ │
│  ◉   ├────────────────────────────────────────────────────────────────┤
│ Home │  Overview                                                      │
│      │  (Last 28 days ▾) (Compare ✓) (Country ▾) (Channel ▾)           │
│  ▦   │                                                                │
│ Rep. │ ┌─────────────┐┌─────────────┐┌─────────────┐┌─────────────┐   │
│      │ │Active users ││Revenue      ││Conversion   ││Avg. session │   │
│  ◎   │ │ 48.2K       ││ €312.6K     ││ 3.4%        ││ 2m 41s      │   │
│ Expl.│ │ ▲ 12.4%  ~~~││ ▲ 8.1%   ~~~││ ▼ 0.3 pts ~~││ ▲ 4.0%   ~~~│   │
│      │ └─────────────┘└─────────────┘└─────────────┘└─────────────┘   │
│  ⚙   │ ┌──────────────────────────────────────┐┌───────────────────┐  │
│      │ │ Active users over time    (Day|Wk|Mo)││ Users by channel  │  │
│      │ │                                      ││  ◔  Organic  42%  │  │
│      │ │   ╱╲    ╱‾‾╲      ╱╲                 ││     Paid     27%  │  │
│      │ │ ╱‾  ╲__╱    ‾╲__╱  ‾‾   (- - prev)   ││     Direct   18%  │  │
│      │ │                                      ││     Other    13%  │  │
│      │ └──────────────────────────────────────┘└───────────────────┘  │
│      │ ┌────────────────────────────────────────────────────────────┐ │
│      │ │ Top pages                                    (Export ▾)    │ │
│      │ │ Page             Users     Change    Engagement   Trend    │ │
│      │ │ /pricing        12,480    ▲ 18.2%       64%       ~~~~     │ │
│      │ └────────────────────────────────────────────────────────────┘ │
└──────┴────────────────────────────────────────────────────────────────┘
```

- **KPI strip:** four cards, 3 columns each. Clicking a KPI card selects it (primary-container) and drives the hero chart below. Maximum six KPIs per page; if you need more, you need a second page.
- **Hero chart:** 8 columns, 320–400px tall. The single most important time series.
- **Breakdown:** 4 columns, same height as the hero chart. Donut plus legend-list, or a ranked horizontal bar list.
- **Table:** full width, with inline sparklines and deltas.

Content is left-aligned throughout. Numbers in tables are right-aligned; text columns are left-aligned; column headers follow their column's alignment.

### Breakpoints (Material window size classes)

| Class | Width | Behavior |
|---|---|---|
| Compact | < 600px | Single column, bottom navigation bar, KPI cards in a horizontal scroller, hero chart full width at 240px |
| Medium | 600–839px | Navigation rail, KPIs 2 × 2, breakdown stacks under hero chart |
| Expanded | 840–1199px | Full layout, KPIs 4 across |
| Large | 1200–1599px | Full layout, generous spacing |
| Extra-large | ≥ 1600px | Optional expanded navigation drawer, content capped at 1600px |

## Elevation & Depth

Material 3 expresses depth primarily through tone, and this system leans into that fully.

- **Level 0:** the page (`surface-container`, #F0F4F9) and all cards at rest (`surface-container-lowest`, white). Cards have **no border and no shadow** at rest: the tonal step between page and card is the separation.
- **Level 1:** a hovered, clickable card (KPI cards, report tiles) gains `0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)`. Non-interactive cards never lift.
- **Level 2:** menus, chart tooltips, date pickers: `0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)`.
- **Level 3:** dialogs and side sheets, over a scrim of `on-surface` at 32% opacity.

In dark theme, shadows are nearly invisible, so elevation is expressed by moving one step up the dark surface-container scale instead.

## Shapes

Rounding follows the Material 3 shape scale and encodes component type, not taste:

- **Full (pill):** buttons, the search field, navigation indicator, delta badges, status badges.
- **Large (16px):** cards and the main content containers.
- **Medium (12px):** chart tooltips, menus, the date picker.
- **Small (8px):** filter chips, input fields, table container corners.
- **Extra-small (4px):** plain tooltips, bar chart bar tops, legend swatches (which are 10px squares, not circles).
- **Extra-large (28px):** dialogs only.

Bars in bar charts have a 4px radius on the value end only; the baseline end stays square so bars read as anchored.

## Components

### KPI card

Structure, top to bottom, left-aligned inside 20px padding:

1. Label in `title-sm`, `on-surface-variant` ("Active users"). An optional info icon (18px) to the right opens a plain tooltip with the metric definition.
2. Value in `kpi-value`, `on-surface`, tabular figures ("48.2K").
3. A row with the delta badge (`delta-positive` / `delta-negative`, with ▲/▼ glyph) followed by comparison text in `body-sm`, `on-surface-variant` ("vs previous 28 days").
4. Sparkline, 40px tall, full card width, `chart-1` at 2px stroke with a 12% area fill fading to 0. No axes, no labels; the last point is marked with a 4px dot.

Minimum height 148px so the strip stays aligned when deltas are missing. When data is unavailable, show "—" as the value and "No data for this period" as the comparison text.

The page's single most important KPI may use `kpi-hero` instead of `kpi-value`, but only one card per page.

### Chart card

- Header row: card title in `title-md` on the left; on the right, a segmented button for granularity (Day / Week / Month) and an overflow menu (Download CSV, Download PNG, Open in explorer).
- A legend row under the header in `body-sm`, with 10px square swatches with 4px radius. Legends sit above the chart, left-aligned, never at the bottom.
- The plot area has 24px padding and no inner border.

### Filter chips and date range

Unselected filter chips are white with a 1px `outline` border; selected chips are `secondary-container` with a leading check icon and no border. The date range control is a chip showing the resolved range ("Aug 27 – Sep 23, 2026") and opens a Material date range picker with presets (Today, Last 7 days, Last 28 days, Last 90 days, Custom).

### Data table

- Header row in `label-lg`, `on-surface-variant`, white background, sticky on scroll, with a 1px `outline-variant` bottom border.
- Rows 52px tall, 1px `outline-variant` separators, hover state `surface-container-low`. No zebra striping.
- Sortable columns show a sort arrow on hover and persistently when active.
- Inline sparklines are 80 × 24px. Delta columns use colored text with arrow glyphs, without badge backgrounds, to keep rows calm.
- Pagination sits bottom-right: "Rows per page 25 ▾   1–25 of 1,284   ‹ ›".

### Buttons

Filled (`primary`) for the one primary action per screen, typically "Export report" or "Create alert". Tonal for secondary actions, text buttons for tertiary actions inside cards. All buttons are pill-shaped and 40px tall, with a 48px minimum touch target.

### Empty, loading and error states

- **Loading:** skeleton blocks in `surface-container-high` with the card's final shape, and a subtle shimmer. Never a spinner in a KPI card.
- **Empty:** a short line in `body-md` and a text button: "No conversions in this period. Change date range".
- **Error:** inline in the card, with an error icon, what happened, and how to fix it: "Couldn't load revenue data. Retry". Errors don't apologize.

## Do's and Don'ts

- Do use `primary` only for the single most important action per screen and for interactive states.
- Do separate cards from the page with tone alone; keep cards borderless and shadowless at rest.
- Do use tabular figures for every number that can change or be compared.
- Do pair every KPI with context: a delta, a comparison period, or a target.
- Do encode deltas with an arrow glyph and a sign as well as color.
- Do color deltas by meaning (favorable or unfavorable), not by arithmetic sign.
- Do keep charts to five series plus "Other"; group the long tail.
- Do maintain WCAG AA text contrast (4.5:1) and 3:1 for chart marks and focus indicators.
- Don't use drop shadows on static content, gradients as decoration, or glassmorphism.
- Don't use all caps anywhere, including table headers and KPI labels.
- Don't use red or green as categorical series colors.
- Don't use pie charts with more than five slices, 3D charts, or dual y-axes.
- Don't mix rounded and square corners at the same level of hierarchy.
- Don't use more than two font weights (400 and 500) on a single screen.
- Don't put more than six KPI cards on one page.

## Data Visualization

Charts follow the restraint of Google Analytics and Looker Studio.

- **Line charts:** 2px stroke, round joins, monotone curve interpolation. The current period uses `chart-1` with a vertical gradient area fill from 16% to 0% opacity. The comparison period is a 1.5px dashed line (4px dash, 4px gap) in `chart-comparison`, with no fill.
- **Gridlines:** horizontal only, 1px `chart-grid`, at most five. No vertical gridlines, no chart border, no axis line on the y-axis. The x-axis baseline is 1px `outline-variant`.
- **Axis labels:** `axis-label`, `on-surface-variant`. The y-axis sits on the left with abbreviated values; the x-axis shows at most 7 ticks with smart date formatting ("Sep 1", "Sep 8"; months as "Aug", "Sep").
- **Bar charts:** 4px radius on the value end, bar width at 60% of the band, 8px gap between grouped bars. Ranked lists are horizontal bars sorted descending, with the value label at the bar end.
- **Donut charts:** 20px ring thickness, 2px white gaps between segments, total value in `title-lg` in the center, and a legend-list to the right with percentages. Maximum five segments plus "Other".
- **Hover and crosshair:** hovering a time series shows a 1px vertical crosshair in `outline` and 4px dots on each series, with the `chart-tooltip` (level 2) showing the date as the header, then one row per series: swatch, name, exact value, and delta vs comparison.
- **Annotations:** anomalies and events appear as small `warning` diamond markers on the x-axis with a tooltip. Use sparingly.
- **Selection:** clicking a KPI card switches the hero chart's metric with a 300ms crossfade; the chart title updates to match.

## Dark Theme

Dark theme swaps every color for its `dark-` counterpart:

- Page on `dark-surface` (#131314), cards on `dark-surface-container` (#1E1F20), hovered cards on `dark-surface-container-high`.
- Primary becomes `dark-primary` (#A8C7FA) with `dark-on-primary` text, following Material's rule that dark-theme accents are lighter and less saturated.
- Chart series use the `dark-chart-*` palette, gridlines use `dark-chart-grid`, and area fills drop to 12% opacity.
- Positive and negative deltas use `dark-positive` and `dark-negative` as text on transparent badges with a 1px border in the same color at 40% opacity.

Respect the system preference by default and offer a manual toggle in the account menu.

## Motion

Material 3 standard motion, applied sparingly.

- Easing: emphasized `cubic-bezier(0.2, 0, 0, 1)` for elements entering, standard `cubic-bezier(0.2, 0, 0, 1)` at shorter durations for state changes.
- Durations: 100–200ms for hover and press states, 300ms for crossfades and chip selection, 500ms for sheets and dialogs.
- Charts draw in once on first load (lines trace left to right over 600ms, bars grow from the baseline). Updates from filters animate values between states rather than redrawing from zero.
- KPI values do not count up. Numbers appear at their final value.
- Honor `prefers-reduced-motion`: disable draw-in and crossfades, keep instant state changes.

## Accessibility

- Focus indicator: 3px `secondary` outline with 2px offset, following the component's shape.
- Every chart has a text alternative: a visually hidden summary ("Active users rose 12.4% to 48.2K over the last 28 days, peaking on Sep 15") and an accessible data table via the overflow menu.
- Keyboard: arrow keys move the crosshair between data points when a chart is focused; the tooltip follows focus.
- Touch targets are at least 48 × 48px, including chips and table sort controls.

## Content & Voice

Write like Google's own product copy: plain, specific, sentence case.

- Metric names say what they measure: "Active users", "Revenue", "Conversion rate", "Avg. session duration".
- Comparison text is always explicit: "vs previous 28 days", "vs same period last year".
- Buttons name the outcome: "Export report", "Create alert", "Save view". The resulting snackbar echoes the verb: "Report exported".
- Timestamps show freshness in the top-right of the page: "Updated 4 minutes ago".
