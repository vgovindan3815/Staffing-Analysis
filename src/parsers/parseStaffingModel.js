import * as XLSX from "xlsx";

const DAYS_PER_PERSON = 320;

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

const HEADER_ALIASES = {
  program:      ["program", "programme", "program name", "programme name"],
  project:      ["project", "project (e)", "project(e)", "role group", "rolegroup", "group", "project group", "project name", "work group"],
  pod:          ["pod name", "pod", "team", "team name", "squad"],
  role:         ["project role", "role", "skill profile", "project role / skill profile", "job title", "title"],
  location:     ["location", "loc", "country", "site"],
  name:         ["name", "resource name", "full name", "employee name"],
  enterpriseId: ["enterprise id", "enterprise_id", "eid", "enterpriseid", "employee id", "emp id", "id"],
  levelBand:    ["level band", "levelband", "level", "band", "grade", "job level", "seniority"],
  billCode:     ["bill code", "billcode", "billing code", "bill rate", "billing rate"],
  lcr:          ["lcr", "labour cost rate", "labor cost rate", "lcr rate", "cost rate", "rate"],
  fte:          ["total fte", "fte", "totalfte", "headcount", "hc"],
  totalDays:    ["total days", "totaldays", "staffed days", "days", "total staffed days"],
  cost:         ["cost", "total cost", "annual cost"],
};

const REQUIRED_FIELDS = ["project", "location", "levelBand", "lcr", "fte", "totalDays"];

function normaliseGroup(g) {
  if (g === "data portfolio") return "Data Portfolio";
  return g;
}

function normaliseLevelBand(band) {
  if (band.toLowerCase().endsWith("leadership")) return "Leadership";
  return band;
}

export function parseStaffingModel(wb) {
  const ws = wb.Sheets["Staffing Plan"];
  if (!ws) {
    const available = Object.keys(wb.Sheets).join(", ");
    throw new Error(
      `The "Staffing Plan" sheet was not found in the uploaded Staffing file.\n` +
      `Please upload the correct file (FXF_Staffing_Plan V1_Consolidated_TSA_exit+Day2 or later).\n` +
      `Sheets found: ${available}`
    );
  }

  // Row 0 = programme title header; row 1 = column headers; data starts row 2
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Build colMap by scanning row 1 (header row) case-insensitively
  const headerRow = raw[1] ?? [];
  const colMap = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let ci = 0; ci < headerRow.length; ci++) {
      const cell = String(headerRow[ci] ?? "").trim().toLowerCase();
      if (aliases.includes(cell)) {
        colMap[field] = ci;
        break;
      }
    }
  }

  // Check required fields
  const missing = REQUIRED_FIELDS.filter(f => colMap[f] == null);
  if (missing.length > 0) {
    const foundHeaders = headerRow
      .map((h, i) => h != null ? `  Col ${String.fromCharCode(65 + i)}: "${String(h).trim()}"` : null)
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `Missing required columns: ${missing.join(", ")}.\n\n` +
      `Headers found in your file (row 2):\n${foundHeaders}\n\n` +
      `See the Help tab for accepted column names.`
    );
  }

  // Detect month columns by regex
  const MONTH_RE_NUM   = /^m\d{1,2}$/i;
  const MONTH_RE_NAMED = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-\s\/]?\d{2,4}$/i;
  const monthCols = [];
  for (let ci = 0; ci < headerRow.length; ci++) {
    const cell = String(headerRow[ci] ?? "").trim();
    if (MONTH_RE_NUM.test(cell) || MONTH_RE_NAMED.test(cell)) {
      monthCols.push({ col: ci, label: cell });
    }
  }
  // Sort by column index
  monthCols.sort((a, b) => a.col - b.col);

  const dataRows = raw.slice(2);

  const podMap        = {};
  const levelMap      = {};
  const groupMap      = {};
  const groupLevelMap = {};
  const podLevelMap   = {};

  let totalPeople = 0, totalUs = 0, totalIndia = 0, totalAr = 0, totalDaysSum = 0, namedCount = 0;

  for (const row of dataRows) {
    const roleGroup    = String(row[colMap.project] ?? "").trim();
    const podName      = String(row[colMap.pod]          ?? "").trim().replace(/\s+/g, " ");
    const location     = String(row[colMap.location]     ?? "").trim();
    const enterpriseId = String(row[colMap.enterpriseId] ?? "").trim();
    const levelBand    = normaliseLevelBand(String(row[colMap.levelBand] ?? "").trim());
    const billCode     = row[colMap.billCode]  != null ? parseFloat(row[colMap.billCode])  : null;
    const lcr          = row[colMap.lcr]       != null ? parseFloat(row[colMap.lcr])       : null;
    const rate         = lcr ?? billCode; // prefer LCR; fall back to bill code
    const totalFte     = row[colMap.fte]       != null ? parseFloat(row[colMap.fte])       : 0;
    const totalDaysCol = row[colMap.totalDays] != null ? parseFloat(row[colMap.totalDays]) : null;

    if (!roleGroup && !podName) continue;
    if (totalFte <= 0) continue;

    const people = 1;
    const days   = (totalDaysCol != null && totalDaysCol > 0) ? totalDaysCol : DAYS_PER_PERSON;

    const loc   = location.toUpperCase();
    const isUs  = loc === "USA" || loc === "US" || loc.startsWith("UNITED STATES") || loc === "ONSHORE";
    const isAr  = loc.startsWith("ARGENTINA") || loc === "AR";
    const isIndia = !isUs && !isAr;

    totalPeople    += people;
    totalDaysSum   += people * days;
    if (isUs)    totalUs    += people;
    if (isIndia) totalIndia += people;
    if (isAr)    totalAr    += people;
    const isNamed = enterpriseId.length > 0 && enterpriseId.toUpperCase() !== "TBD";
    if (isNamed) namedCount += people;

    // Pod aggregation
    if (podName) {
      if (!podMap[podName]) {
        podMap[podName] = { name: podName, people: 0, us: 0, india: 0, ar: 0, group: roleGroup || "Other", totalDays: 0 };
      }
      const pod = podMap[podName];
      pod.people    += people;
      pod.us        += isUs    ? people : 0;
      pod.india     += isIndia ? people : 0;
      pod.ar        += isAr    ? people : 0;
      pod.totalDays += people * days;
      if (!pod.group && roleGroup) pod.group = roleGroup;
    }

    // Level aggregation
    if (levelBand) {
      if (!levelMap[levelBand]) {
        levelMap[levelBand] = {
          band: levelBand, people: 0, bill: rate,
          us: 0, india: 0, ar: 0, totalDays: 0,
          _onCost: 0, _onDays: 0, _offCost: 0, _offDays: 0,
        };
      }
      const lv = levelMap[levelBand];
      lv.people    += people;
      lv.us        += isUs    ? people : 0;
      lv.india     += isIndia ? people : 0;
      lv.ar        += isAr    ? people : 0;
      lv.totalDays += people * days;
      if (lv.bill == null && rate != null) lv.bill = rate;
      if (rate != null) {
        if (isUs) { lv._onCost  += days * rate; lv._onDays  += days; }
        else      { lv._offCost += days * rate; lv._offDays += days; }
      }
    }

    // Group-level aggregation
    if (roleGroup && levelBand) {
      if (!groupLevelMap[roleGroup]) groupLevelMap[roleGroup] = {};
      const gl = groupLevelMap[roleGroup];
      if (!gl[levelBand]) gl[levelBand] = {
        band: levelBand, people: 0, us: 0, india: 0, ar: 0, totalDays: 0,
        _onCost: 0, _onDays: 0, _offCost: 0, _offDays: 0,
      };
      const e = gl[levelBand];
      e.people    += people;
      e.us        += isUs    ? people : 0;
      e.india     += isIndia ? people : 0;
      e.ar        += isAr    ? people : 0;
      e.totalDays += people * days;
      if (rate != null) {
        if (isUs) { e._onCost  += days * rate; e._onDays  += days; }
        else      { e._offCost += days * rate; e._offDays += days; }
      }
    }

    // Pod-level aggregation
    if (podName && levelBand) {
      if (!podLevelMap[podName]) podLevelMap[podName] = {};
      const pl = podLevelMap[podName];
      if (!pl[levelBand]) pl[levelBand] = {
        band: levelBand, people: 0, us: 0, india: 0, ar: 0, totalDays: 0,
        _onCost: 0, _onDays: 0, _offCost: 0, _offDays: 0,
      };
      const e = pl[levelBand];
      e.people    += people;
      e.us        += isUs    ? people : 0;
      e.india     += isIndia ? people : 0;
      e.ar        += isAr    ? people : 0;
      e.totalDays += people * days;
      if (rate != null) {
        if (isUs) { e._onCost  += days * rate; e._onDays  += days; }
        else      { e._offCost += days * rate; e._offDays += days; }
      }
    }

    // Role group aggregation
    if (roleGroup) {
      if (!groupMap[roleGroup]) {
        groupMap[roleGroup] = { name: roleGroup, people: 0, us: 0, india: 0, ar: 0, totalDays: 0 };
      }
      const grp = groupMap[roleGroup];
      grp.people    += people;
      grp.us        += isUs    ? people : 0;
      grp.india     += isIndia ? people : 0;
      grp.ar        += isAr    ? people : 0;
      grp.totalDays += people * days;
    }
  }

  function withBillRates(obj) {
    const billOn  = obj._onDays  > 0 ? obj._onCost  / obj._onDays  : null;
    const billOff = obj._offDays > 0 ? obj._offCost / obj._offDays : null;
    const { _onCost, _onDays, _offCost, _offDays, ...rest } = obj;
    return { ...rest, billOn, billOff };
  }

  const round = obj => ({ ...obj, people: Math.round(obj.people), us: Math.round(obj.us), india: Math.round(obj.india), ar: Math.round(obj.ar) });

  const byPod = Object.values(podMap).map(round).sort((a, b) => b.people - a.people);

  const byLevel = LEVEL_ORDER
    .filter(l => levelMap[l])
    .map(l => withBillRates(round(levelMap[l])));

  const byGroup = Object.values(groupMap).map(round).sort((a, b) => b.people - a.people);

  const total = Math.round(totalPeople);
  const us    = Math.round(totalUs);
  const india = Math.round(totalIndia);
  const ar    = Math.round(totalAr);

  const byGroupLevel = {};
  for (const [g, lvls] of Object.entries(groupLevelMap)) {
    byGroupLevel[g] = LEVEL_ORDER.filter(l => lvls[l]).map(l => withBillRates(round(lvls[l])));
  }
  const byPodLevel = {};
  for (const [p, lvls] of Object.entries(podLevelMap)) {
    byPodLevel[p] = LEVEL_ORDER.filter(l => lvls[l]).map(l => withBillRates(round(lvls[l])));
  }

  // Extract individual rows for person-level drill-down
  const detail = [];
  for (const row of dataRows) {
    const roleGroup = String(row[colMap.project] ?? "").trim();
    if (!roleGroup) continue;
    const totalFte = row[colMap.fte] != null ? parseFloat(row[colMap.fte]) : 0;
    if (totalFte <= 0) continue;
    const months = monthCols.map(mc => row[mc.col] != null ? Math.round(Number(row[mc.col]) * 100) / 100 : 0);
    detail.push({
      program:  String(row[colMap.program]      ?? "").trim(),
      group:    roleGroup,
      pod:      String(row[colMap.pod]          ?? "").trim().replace(/\s+/g, " "),
      role:     String(row[colMap.role]         ?? "").trim(),
      location: String(row[colMap.location]     ?? "").trim(),
      name:     row[colMap.name]         ? String(row[colMap.name]).trim()         : null,
      eid:      row[colMap.enterpriseId] ? String(row[colMap.enterpriseId]).trim() : null,
      level:    normaliseLevelBand(String(row[colMap.levelBand] ?? "").trim()),
      billCode: row[colMap.lcr] != null ? parseFloat(row[colMap.lcr]) : (row[colMap.billCode] != null ? parseFloat(row[colMap.billCode]) : null),
      cost:     row[colMap.cost] != null ? parseFloat(row[colMap.cost]) : null,
      months,
      totalDays: row[colMap.totalDays] != null ? Math.round(Number(row[colMap.totalDays]) * 100) / 100 : 0,
    });
  }

  return {
    summary: { total, us, india, argentina: ar, named: Math.round(namedCount), totalDays: Math.round(totalDaysSum) },
    byPod,
    byLevel,
    byGroup,
    byGroupLevel,
    byPodLevel,
    detail,
    monthLabels: monthCols.map(mc => mc.label),
  };
}
