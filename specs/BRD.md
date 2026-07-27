# Business Requirements Document (BRD)
## Staffing Analysis Tool

| Field | Value |
|-------|-------|
| Document version | 1.0 |
| Status | Draft |
| Author | Venkat Govindan |
| Date | July 2026 |

---

## 1. Executive Summary

The **Staffing Analysis Tool** is an internal browser-based application that enables delivery leads and finance stakeholders to upload a staffing plan Excel file and instantly visualise headcount, location mix, level distribution, cost estimates, and alignment to Accenture's Reinvent and Mainframe Modernization delivery models — all without any data leaving the user's device.

---

## 2. Business Context

Staffing planning for large-scale delivery engagements is currently managed in Excel workbooks shared across teams. Stakeholders cannot quickly answer questions such as:

- How many people are onshore versus offshore per role group or pod?
- What is our blended Labour Cost Rate (LCR) and how does it compare to the target for a given touch model?
- Which resources are still TBD, and what is our TBD exposure as a percentage?
- What is the total cost of the program and what price should be quoted at a given margin?

Answering these questions requires manual Excel manipulation, is error-prone, and cannot be shared easily in a meeting context.

---

## 3. Objectives

1. Eliminate manual Excel analysis for staffing reviews.
2. Provide a single, shareable URL that any team member can open — no login or server required.
3. Give leadership real-time insight into headcount, cost, and delivery model alignment.
4. Support filtering by program, location, and role group to enable drill-down during client conversations.
5. Protect data privacy: all file processing must remain local to the browser.

---

## 4. Stakeholders

| Role | Interest |
|------|----------|
| Delivery Lead | Headcount planning, TBD tracking, pod/group mix |
| Finance | Cost estimation, margin calculation, LCR analysis |
| Workforce / Resourcing | Level band distribution, onshore/offshore split |
| Client-facing Partner | Executive summary, Reinvent model alignment |
| Program Manager | Cross-program view, pod composition |

---

## 5. Scope

### In scope
- Upload and parse a staffing plan Excel file (`.xlsx`, `.xls`).
- Display aggregated staffing data across six analytical views: Executive Summary, Projects, Staffing, Pods, Cost & Financials, Reinvent.
- Filter all views by Program and Location (US / India / Argentina).
- Drill into any role group or pod to see level-band breakdown and individual person detail.
- Compare actual staffing mix to Reinvent touch model (Low / Mid / High Touch) and Mainframe Modernization (Re-Platform, Re-Factor) targets.
- Calculate estimated program cost using Labour Cost Rate and staffed days; apply a configurable margin to derive price.
- Persist the uploaded file in the browser (IndexedDB) so the view survives a page refresh.
- Render correctly in both light and dark themes.

### Out of scope
- Server-side storage or multi-user collaboration.
- Authentication or role-based access control.
- Integration with HR or workforce management systems.
- Editing staffing data within the tool.
- Export to PDF or Excel.

---

## 6. Functional Requirements

### FR-01 File Upload
- The system must accept `.xlsx` and `.xls` files via drag-drop or file picker.
- The file must contain a sheet named **"Staffing Plan"**.
- Row 1 (zero-indexed) must contain column headers; data rows begin at row 2.
- The system must detect and map column headers case-insensitively using a set of accepted aliases (see System Spec §5.1).
- Required columns: role group, location, level band, LCR rate, FTE count, total staffed days.
- On a missing required column the system must display a clear error listing which columns were not found.
- Month columns are detected automatically by regex (`M1`–`M16` or `Jan-YY`–`Dec-YY` format).

### FR-02 Data Persistence
- The uploaded file must be saved to browser IndexedDB on successful parse.
- On next page load the stored file must be automatically re-parsed and the view restored.
- The user must be able to clear the stored file and revert to sample data.
- A privacy notice must be visible, stating that no data leaves the device.

### FR-03 Program Filter
- When the uploaded file contains a `Program` column (or alias), a "Program" multi-select filter must appear in a sticky bar below the tab navigation.
- Selecting one or more programs must re-aggregate all staffing metrics (totals, groups, pods, levels, byGroupLevel, byPodLevel) from the filtered detail rows.
- All tabs must reflect the program selection simultaneously.
- Deselecting all programs must restore full-dataset view.

### FR-04 Location Filter
- The sidebar must show toggles for US, India, and Argentina with live headcount shown per location.
- Activating a location filter must narrow all data and cost calculations to the selected locations.

### FR-05 Executive Summary Tab
- Display total headcount, named vs TBD count, onshore/offshore split, and staffed days.
- Show month-by-month staffing ramp chart (M1–M16).
- Highlight key risks: TBD exposure percentage, largest role group.

### FR-06 Projects Tab (Role Groups)
- List all role groups with: people, US, India, staffed days, % of total, onshore %.
- Support multi-select filter by role group.
- % of total must be calculated relative to the currently visible filtered set (sum = 100%).
- Show a horizontal bar chart ranking groups by people.
- Clicking a group must open a drill-down showing level-band breakdown for that group.

### FR-07 Staffing Tab (Level Bands)
- Show two side-by-side panels: Onshore (US) and Offshore (India + Argentina).
- Each panel lists level bands with people count, % within pool, and % of total staffed days.

### FR-08 Pods Tab
- List all pods with: people, US, India, staffed days, % of total, onshore %.
- Support multi-select filter by pod.
- Clicking a pod must open a drill-down with the same level-band breakdown as the Projects drill-down.

### FR-09 Cost & Financials Tab
- Display cost by role group using a horizontal stacked bar chart (onshore / offshore cost segments).
- Show total cost, price at target margin, and blended LCR.
- Clicking a role group must open a drill-down with cost by level band.
- Allow editing the margin % in the sidebar; price must update reactively.

### FR-10 Reinvent Tab
- Support selection of delivery model type: **Reinvent** (LT/MT/HT) or **Mainframe Modernization** (Re-Platform, Re-Factor — each with HT/MT/LT variants).
- Display actual onshore/offshore mix against model target.
- Show per-level band: Actual %, Normalized %, Target %, and Gap (colour-coded green/amber/red).
- Render a grouped bar chart comparing normalized vs target by level band.
- Display economics KPIs: onshore LCR, offshore LCR, blended LCR vs target.

### FR-11 Drill-down — Level Detail
- From Projects or Pods drill-down, clicking a level band row must show all individual people in that band for that entity.
- Person table columns: Group, Pod, Role/Skill Profile, Location, Enterprise ID, Level, M1–M16 months, Total Days.

### FR-12 Theme
- The application must support a light and dark theme, toggleable via a switch in the navbar.
- Theme choice must persist in `localStorage`.

### FR-13 Chatbot
- A floating AI chatbot widget must be available on all tabs.
- The chatbot must assist with interpreting staffing data and answering delivery model questions.

---

## 7. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | All file parsing and data processing must occur in the browser — no data transmitted to any server. |
| NFR-02 | The application must load and render within 3 seconds on a standard corporate laptop on a typical office network. |
| NFR-03 | Parsing a staffing file with up to 500 rows must complete within 2 seconds. |
| NFR-04 | The application must function without a backend, authentication, or database. |
| NFR-05 | The application must be deployable as a static bundle to Vercel or any static host. |
| NFR-06 | The UI must be usable on a 1280 × 800 viewport minimum (laptop screen). |
| NFR-07 | The application must not store or transmit personally identifiable information (names, Enterprise IDs) outside the local browser session. |

---

## 8. Assumptions

1. Users have access to a staffing plan in the expected Excel format.
2. The Excel file will contain a sheet tab named exactly "Staffing Plan".
3. LCR / Labour Cost Rate values are expressed in dollars per day.
4. Staffed days are expressed as a decimal number (e.g., 320 = one FTE for 16 months at 20 days/month).
5. The "Program" column in the Excel file represents the engagement or workstream name (column A).
6. TBD resources are identified by a blank or "TBD" Enterprise ID.

---

## 9. Constraints

- The tool is for **internal use only** and must not be shared with clients.
- No backend infrastructure may be provisioned — the tool must remain a pure static web application.
- Accenture brand colours and design conventions must be followed (primary: `#A100FF`).

---

## 10. Acceptance Criteria

| Criterion | Pass Condition |
|-----------|---------------|
| File upload | A valid staffing Excel file parses without error and all tabs populate |
| Invalid file | A clear error message appears listing missing columns |
| Program filter | Selecting a program filters all six tabs; deselecting restores full data |
| % of total | Sum of % of total column = 100% for the current visible set |
| Reinvent gap | Gap badges are green (≤ 3 pp), amber (≤ 8 pp), red (> 8 pp) |
| Cost calculation | Total price = totalCost / (1 − margin%) and updates on margin change |
| Persistence | Refreshing the page restores the previously uploaded file |
| Privacy | Browser DevTools Network tab shows zero outbound requests containing staffing data |
| Theme | Light/dark toggle switches all UI colours; preference survives refresh |
