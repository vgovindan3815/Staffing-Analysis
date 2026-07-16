# Staffing Analysis

> **For internal purpose only**

A client-side React application for analysing programme staffing plans — headcount, cost modelling, and pricing — from a standard Excel input file. No backend, no data leaves the browser.

---

## Features

| Tab | What it shows |
|-----|---------------|
| **Home** | Headline headcount KPIs, onshore/offshore doughnut, monthly FTE ramp chart, programme cost & price at a target margin |
| **By project** | Headcount breakdown by project group with drill-down to level mix |
| **By level** | Onshore vs offshore headcount by level band |
| **By pod** | Pod-by-pod headcount with level drill-down |
| **Pricing** | Per-group and per-level cost/price tables using actual LCR rates from the file |
| **Reinvent compliance** | Level mix vs Low/Mid/High-Touch staffing model targets |

### Key behaviours

- **Per-resource cost formula** — `LCR (col R) × Total Days × hours` where hours = 8 for onshore (US), 9 for offshore (India / AR / other)
- **Margin → Price** — target margin % is set once on the Home tab and shared across all pricing views
- **Persistence** — the uploaded file is stored in IndexedDB so data survives a page refresh without re-uploading

---

## Getting started

### Prerequisites

- Node.js 18+
- npm 9+

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174).

### Build for production

```bash
npm run build
```

Output goes to `dist/` and can be hosted on any static file host (Vercel, Netlify, GitHub Pages, etc.).

---

## Input file

Use the included template: **`staffing_input_template.xlsx`**

### Requirements

- The workbook must contain a sheet named exactly **`Staffing Plan`**
- **Row 1** — programme title (merged, ignored by the parser)
- **Row 2** — column headers (ignored by the parser)
- **Rows 3+** — one resource per row; rows with `Total FTE = 0` are skipped

### Column mapping

| Excel col | Index | Field | Description |
|-----------|-------|-------|-------------|
| A | 0 | Program | Programme name |
| E | 4 | Project | Group used in all breakdowns |
| F | 5 | Pod Name | Sub-team / pod |
| I | 8 | Project Role | Job title |
| M | 12 | Location | `USA` · `India` · `Argentina` (see below) |
| N | 13 | Name | Resource name; blank = TBD |
| O | 14 | Enterprise ID | EID; blank = counted as TBD |
| P | 15 | Level Band | See valid values below |
| Q | 16 | Bill Code | Rate fallback ($/hr) |
| R | 17 | **LCR** | **Primary rate** used for all cost calculations ($/hr) |
| T | 19 | Total FTE | Sum of monthly FTE; must be > 0 |
| U–AJ | 20–35 | M1–M16 | Monthly FTE allocations |
| AK | 36 | Total Days | Total staffed days |
| AL | 37 | Cost | Pre-calculated cost (for reference) |

### Location values

| Value(s) | Classification |
|----------|---------------|
| `USA`, `US`, `United States`, `Onshore` | Onshore — 8 hrs/day |
| `India`, `IN`, or anything else | Offshore India — 9 hrs/day |
| `Argentina`, `AR` | Offshore Argentina — 9 hrs/day |

### Valid level bands

```
6-Senior Manager
7-Manager
8-Associate Manager
9-Team Lead/Consultant
10-Senior Analyst
11-Analyst
12-Associate
```

---

## Tech stack

| Layer | Library |
|-------|---------|
| UI framework | React 19 + Vite |
| Excel parsing | SheetJS (xlsx) |
| Charts | Recharts |
| Icons | Tabler Icons |
| Persistence | IndexedDB (via `src/storage/fileStore.js`) |

---

## Project structure

```
src/
├── App.jsx                    # App shell, nav, IndexedDB restore
├── styles.js                  # Design tokens and shared style objects
├── parsers/
│   └── parseStaffingModel.js  # Excel → staffing data structure
├── tabs/
│   ├── HomeTab.jsx            # Home dashboard
│   ├── StaffingTab.jsx        # Tab container + By project/level/pod views
│   └── PricingTab.jsx         # Cost & pricing drill-downs
├── data/
│   ├── hardcoded.js           # 20-person sample data (shown before file upload)
│   └── staffingDetail.js      # Sample person-level rows
└── storage/
    └── fileStore.js           # IndexedDB save/load/delete helpers
```

---

## Input template

`staffing_input_template.xlsx` is included in this repo. Open the **Instructions** sheet inside the file for a full column reference and worked examples. Replace the sample rows with your programme data and upload via the app.
