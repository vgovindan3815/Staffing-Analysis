# System Specification
## Staffing Analysis Tool

| Field | Value |
|-------|-------|
| Document version | 1.0 |
| Status | Draft |
| Author | Venkat Govindan |
| Date | July 2026 |

---

## 1. System Overview

The Staffing Analysis Tool is a **client-side React single-page application** built with Vite. It has no backend. All data parsing, aggregation, and rendering occurs in the user's browser. The application is deployed as a static bundle on Vercel at `https://staffing-analysis.vercel.app/`.

**Technology stack:**

| Layer | Technology |
|-------|-----------|
| UI framework | React 19 |
| Build tool | Vite 8 |
| Charting | Recharts |
| Excel parsing | SheetJS (xlsx) |
| Local persistence | IndexedDB (via custom `fileStore.js`) |
| Deployment | Vercel (static) |
| Styling | Inline styles + CSS custom properties (no CSS framework) |

---

## 2. Repository Structure

```
src/
├── App.jsx                    # Root component — layout, routing, global state
├── main.jsx                   # React entry point
├── styles.js                  # Shared style token helpers (s.card, s.tbl, etc.)
│
├── components/
│   ├── HomeSidebar.jsx        # Persistent left sidebar (upload, filters, cost KPIs)
│   ├── Kpi.jsx                # Single KPI tile component
│   ├── BarRow.jsx             # Horizontal proportional bar row
│   ├── SplitBar.jsx           # Onshore/offshore split bar
│   ├── MultiSelect.jsx        # Multi-select dropdown with search (theme-aware)
│   └── Chatbot.jsx            # Floating AI chatbot widget
│
├── tabs/
│   ├── HomeTab.jsx            # Executive Summary tab
│   ├── StaffingTab.jsx        # Host for Projects, Staffing, Pods, Reinvent tabs
│   ├── PricingTab.jsx         # Cost & Financials tab
│   └── HelpTab.jsx            # Help & column reference tab
│
├── parsers/
│   └── parseStaffingModel.js  # Excel → normalised data object
│
├── compute/
│   ├── mergeData.js           # toStaffingShape() — parser output → UI shape
│   ├── reaggregate.js         # reaggregateStaffing() — re-aggregate from filtered detail
│   └── pricing.js             # Rate constants
│
├── data/
│   ├── hardcoded.js           # Sample STAFFING object, colours, rate constants
│   └── staffingDetail.js      # Sample STAFFING_DETAIL person-level rows (fallback)
│
└── storage/
    └── fileStore.js           # IndexedDB save/load/delete helpers
```

---

## 3. Architecture

### 3.1 Data Flow

```
User uploads Excel file
        │
        ▼
  parseStaffingModel(wb)          ← parseStaffingModel.js
  (reads "Staffing Plan" sheet,
   detects headers, aggregates
   groups / pods / levels)
        │
        ▼
  toStaffingShape(parsed)         ← mergeData.js
  (reshapes to UI-ready object)
        │
        ▼
  App.jsx — global state
  ┌──────────────────────────────────┐
  │  staffing (full)                 │
  │  liveDetail (all rows)           │
  │  filteredDetail (loc filter)     │
  │  programFilteredDetail           │
  │  filteredStaffing                │  ← reaggregateStaffing() when program filter active
  └──────────────────────────────────┘
        │
        ▼
  HomeSidebar ◄──── costs, locFilter
  StaffingTab ◄──── filteredStaffing, programFilteredDetail
  (routes to sub-tabs by view state)
```

### 3.2 Tab Routing

Tab navigation is implemented as a `view` string in `App.jsx` state. `StaffingTab` receives `view` and `setView` as props and renders the appropriate content. There is no React Router — no URL changes on tab switch.

| `view` value | Rendered content |
|-------------|-----------------|
| `"home"` | `<HomeTab>` |
| `"groups"` | Projects / Role Groups view |
| `"levels"` | Staffing / Level Bands view |
| `"pods"` | Pods view |
| `"pricing"` | `<PricingTab>` |
| `"reinvent"` | `<ReinventSection>` |
| `"help"` | `<HelpTab>` |

When a drill-down is active (`detail !== null` in `StaffingTab`), the drill-down view replaces the active tab content.

---

## 4. State Management

All state is managed with React `useState` and `useMemo`. There is no external state management library.

### 4.1 App-level state (`App.jsx`)

| State | Type | Description |
|-------|------|-------------|
| `parsedStaffing` | `{ staffing, detail, monthLabels } \| null` | Result of parsing the uploaded file |
| `isLive` | `boolean` | True when a user file is loaded (vs sample data) |
| `loading` | `boolean` | True during IndexedDB restore or file parse |
| `storedName` | `string \| null` | Filename of the persisted file |
| `storedDate` | `number \| null` | Timestamp of last save |
| `monthLabels` | `string[]` | Column headers for M1–M16 |
| `view` | `string` | Active tab ID |
| `margin` | `number` | Target margin % for price calculation (default 23) |
| `sidebarWidth` | `number` | Draggable sidebar width in px (default 280) |
| `locFilter` | `Set<string>` | Active location filters ("US" / "India" / "Argentina") |
| `programFilter` | `Set<string>` | Active program filters |
| `theme` | `"dark" \| "light"` | UI theme (persisted to `localStorage`) |

### 4.2 Derived state (useMemo)

| Derived | Source | Description |
|---------|--------|-------------|
| `staffing` | `parsedStaffing?.staffing ?? STAFFING` | Active staffing shape (live or sample) |
| `liveDetail` | `parsedStaffing?.detail ?? null` | Raw per-person rows from parser |
| `filteredDetail` | `liveDetail + locFilter` | Location-filtered detail rows |
| `allPrograms` | `liveDetail` | Sorted unique program names |
| `programFilteredDetail` | `filteredDetail + programFilter` | Program + location filtered rows |
| `filteredStaffing` | `programFilteredDetail` | Re-aggregated staffing shape when program filter is active |

### 4.3 StaffingTab-level state

| State | Type | Description |
|-------|------|-------------|
| `detail` | `object \| null` | Active drill-down (group or pod) |
| `groupFilter` | `Set<string>` | Role group sub-filter (Projects tab) |
| `podFilter` | `Set<string>` | Pod sub-filter (Pods tab) |

---

## 5. Data Parsing

### 5.1 parseStaffingModel (`src/parsers/parseStaffingModel.js`)

**Input:** An XLSX `Workbook` object (from SheetJS).

**Sheet:** `"Staffing Plan"`. Throws if not present.

**Row layout:**
- Row 0: Program title (optional header row — not parsed).
- Row 1: Column headers (case-insensitive).
- Rows 2+: Data rows.

**Header aliases** (accepted column names per field):

| Field | Accepted names |
|-------|---------------|
| `program` | program, programme, program name, programme name |
| `project` (→ `group`) | project, projects, project (e), role group, rolegroup, group, project group, project name, work group |
| `pod` | pod name, pod, team, team name, squad |
| `role` | project role, role, skill profile, job title, title |
| `location` | location, loc, country, site |
| `name` | name, resource name, full name, employee name |
| `enterpriseId` | enterprise id, enterprise_id, eid, enterpriseid, employee id, emp id, id |
| `levelBand` | level band, levelband, level, band, grade, job level, seniority |
| `billCode` | bill code, billcode, billing code, bill rate, billing rate |
| `lcr` | lcr, labour cost rate, labor cost rate, lcr rate, cost rate, rate |
| `fte` | total fte, fte, totalfte, headcount, hc |
| `totalDays` | total days, totaldays, staffed days, days, total staffed days |
| `cost` | cost, total cost, annual cost |

**Required fields:** `project`, `location`, `levelBand`, `lcr`, `fte`, `totalDays`.

**Month column detection:** Regex `^m\d{1,2}$` (e.g., `M1`) or `^(jan|feb|…|dec)[-\s/]?\d{2,4}$` (e.g., `Jan-25`). Fallback: columns between `fte` and `totalDays`.

**Row filtering:** Rows where `totalFte ≤ 0` or both `roleGroup` and `podName` are empty are skipped.

**Level normalization:** Any band ending in "leadership" (case-insensitive) is normalized to `"Leadership"`.

**LCR resolution:** `rate = lcr ?? billCode` (LCR column preferred; falls back to bill code column).

**Output object:**

```js
{
  summary: { total, us, india, argentina, named, totalDays },
  byPod:        [{ name, people, us, india, ar, group, totalDays }],
  byLevel:      [{ band, people, bill, us, india, ar, totalDays, billOn, billOff }],
  byGroup:      [{ name, people, us, india, ar, totalDays }],
  byGroupLevel: { [groupName]: [...level rows] },
  byPodLevel:   { [podName]:   [...level rows] },
  detail:       [{ program, group, pod, role, location, name, eid,
                   level, billCode, cost, months: number[], totalDays }],
  monthLabels:  string[],
}
```

**`billOn` / `billOff`** are computed by accumulating `days × rate` weighted by location, then dividing by total days for that pool — giving the weighted average LCR for onshore and offshore independently.

### 5.2 toStaffingShape (`src/compute/mergeData.js`)

Converts the parser output into the shape consumed by `StaffingTab`:

```js
{
  total, named, us, india, argentina,
  months: 16, daysPerPerson: 320, totalDays,
  groups:       byGroup,
  pods:         byPod,
  levels:       byLevel,
  byGroupLevel: byGroupLevel,
  byPodLevel:   byPodLevel,
  detail:       detail,
}
```

### 5.3 reaggregateStaffing (`src/compute/reaggregate.js`)

Re-runs the same aggregation logic as `parseStaffingModel` but from the already-parsed `detail` array. Called when `programFilter` is active so that all tab metrics reflect the filtered subset.

Produces the same output shape as `toStaffingShape`. Uses `LEVEL_ORDER` from `parseStaffingModel.js` to sort `byLevel` results.

---

## 6. Level Band Ordering

```js
export const LEVEL_ORDER = [
  "Leadership",
  "5-Associate Director",
  "6-Senior Manager",
  "7-Manager",
  "8-Associate Manager",
  "9-Team Lead/Consultant",
  "10-Senior Analyst",
  "11-Analyst",
  "12-Associate",
  "subk",
];
```

---

## 7. Cost Calculation

**In `App.jsx` — `computeCosts(detail)`:**

```
onCost  = Σ (billCode × totalDays × 8)   for onshore rows
offCost = Σ (billCode × totalDays × 9)   for offshore rows
totalCost = onCost + offCost
```

Hours per day: 8 onshore, 9 offshore (standard Accenture billing convention).

**Price at margin (`HomeSidebar`):**

```
price = totalCost / (1 − margin / 100)
```

`margin` is editable via an inline number input in the sidebar (default 23%).

**Blended LCR (`computeDerivedLCR` in `StaffingTab`):**

For each level band: accumulates `days × billOn` for onshore and `days × billOff` for offshore, then divides by total days for the respective pool. Blended LCR = total cost / total days across all levels.

---

## 8. Reinvent Model Comparisons

### 8.1 Touch models (Reinvent)

Three touch models: Low Touch (LT), Mid Touch (MT), High Touch (HT). Each defines:
- `onPct` / `offPct` — target overall onshore/offshore percentage split.
- `blendedLCR` — target blended LCR in $/day.
- `costToServe` — target cost-to-serve in $/day.
- Per-level targets: `{ on: %, off: % }` — expected % of the onshore or offshore pool at each level.

### 8.2 Mainframe Modernization models

Two deal types: Re-Platform, Re-Factor. Each has HT/MT/LT variants with the same structure as above but different per-level distributions.

### 8.3 Gap calculation

For each level band and pool (onshore / offshore):

```
actualPct = people_in_level_in_pool / total_pool_people × 100
targetPct = model.levels[band].on  (or .off)

gap = actualPct − targetPct
```

Gap colour coding: `|gap| ≤ 3 pp` → green; `≤ 8 pp` → amber; `> 8 pp` → red.

### 8.4 Normalized percentage

Normalized % removes TBD people from the denominator, showing the distribution for named resources only. It is computed as:

```
normalizedPct = people_in_level / named_people_in_pool × 100
```

---

## 9. Filtering Architecture

### 9.1 Location filter

Operated via `locFilter` (Set) in `App.jsx`. Applied to produce `filteredDetail`:

| Location value | Matches |
|----------------|---------|
| `"US"` | `USA`, `US`, `UNITED STATES*`, `ONSHORE` |
| `"India"` | Any location not matching US or Argentina |
| `"Argentina"` | `ARGENTINA*`, `AR` |

### 9.2 Program filter

Operated via `programFilter` (Set) in `App.jsx`. Applied to `filteredDetail` to produce `programFilteredDetail`. When active, `reaggregateStaffing(programFilteredDetail)` is called to produce `filteredStaffing`. This filtered shape is passed to all tabs via `StaffingTab`.

The Program filter bar is rendered in `App.jsx` between the tab sub-header and main content area. It is only displayed when `isLive` and `allPrograms.length > 0`.

### 9.3 Role group and pod sub-filters

These are local to `StaffingTab` (group view uses `groupFilter`, pods view uses `podFilter`). They filter the already-aggregated group/pod list returned by the active `filteredStaffing`.

---

## 10. Persistence

**Storage:** Browser `IndexedDB`, key `"staffing-v1"`.

**`fileStore.js` API:**

| Function | Description |
|----------|-------------|
| `saveFile(key, file)` | Stores `{ name, type, data: ArrayBuffer, savedAt }` |
| `loadFile(key)` | Returns stored record or `null` |
| `deleteFile(key)` | Removes record |
| `storedToFile(record)` | Reconstructs a `File` object from the stored record |

On app mount, `loadFile` is called. If a record exists, the file is re-parsed and state is restored silently. If `loadFile` fails (e.g., private/incognito window), the error is swallowed and the app starts with sample data.

---

## 11. Theming

CSS custom properties are defined on `document.documentElement` via `data-theme` attribute (`"dark"` or `"light"`).

| Variable | Dark | Light |
|----------|------|-------|
| `--bg-app` | `#0A0A14` | `#F4F6FA` |
| `--bg-card` | `#12121F` | `#FFFFFF` |
| `--bg-sidebar` | `#0D0D1A` | `#EEF1F8` |
| `--border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.10)` |
| `--text-h` | `#FFFFFF` | `#0A0A14` |
| `--text-b` | `#CBD5E1` | `#374151` |
| `--text-m` | `#64748B` | `#6B7280` |

All components use these variables via `var(--*)`. The navbar and accent colour (`#A100FF`) are fixed regardless of theme.

---

## 12. Key Components

### MultiSelect (`src/components/MultiSelect.jsx`)

Props: `options: string[]`, `selected: Set<string>`, `onChange: (Set) => void`, `placeholder: string`, `label: string`.

Features: searchable dropdown, select-all / clear, selection count display. Fully theme-aware (all colours via CSS vars). When `selected.size > 0`, trigger renders in Accenture purple (`#A100FF`).

### HomeSidebar (`src/components/HomeSidebar.jsx`)

Always visible left panel. Contains:
1. File upload zone (drag-drop, click-to-browse, or stored file info with replace/clear actions).
2. Location filter (US / India / Argentina toggles with live headcount).
3. Program cost summary (on/off/total cost from `computeCosts`; editable margin; computed price).
4. Quick insights (largest role group, TBD exposure, on/off ratio).

### InfoTip (`StaffingTab.jsx` — inline component)

Configurable tooltip component. Props: `placement` ("center" / "right" / "left"), `direction` ("up" / "down"). Direction controls whether the popup appears above or below the badge (used to avoid clipping when the trigger is near the top of a scroll container).

---

## 13. Sample / Fallback Data

When no file is uploaded:

- `STAFFING` (from `hardcoded.js`) — aggregated sample shape with 20 anonymised people across 3 role groups, 4 pods, 5 level bands.
- `STAFFING_DETAIL` (from `staffingDetail.js`) — fallback person-level rows used in drill-down when `liveDetail` is null.

The application is fully functional with sample data; no file upload is required to explore the UI.

---

## 14. Deployment

**Platform:** Vercel (static hosting).

**Build command:** `npm run build` → Vite bundles to `dist/`.

**Production branch:** `main` on GitHub (`https://github.com/vgovindan3815/Staffing-Analysis`).

**Deployment trigger:** Push to `main` branch. Vercel auto-deploys.

**Note:** A parallel `master` branch is kept in sync with `main`. All feature commits must be pushed to both: `git push origin master main`.

---

## 15. Security and Privacy Considerations

- No data is transmitted to any server. All file reading, parsing, and computation occurs in the browser via the Web APIs (`FileReader`, `ArrayBuffer`, `IndexedDB`).
- No authentication is implemented — the tool relies on Accenture's network and device access controls.
- The application must not be shared externally. A "For internal purpose only" notice is shown in the navbar.
- Enterprise IDs and resource names stored in `IndexedDB` remain on the local device only.
- The `IndexedDB` store is cleared when the user clicks "Clear" or the browser's site data is cleared.
