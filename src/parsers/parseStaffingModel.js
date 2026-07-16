import * as XLSX from "xlsx";

const DAYS_PER_PERSON = 320;

export const LEVEL_ORDER = [
  "Accenture Leadership",
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

// Staffing Plan sheet (FXF_Staffing_Plan V1_Consolidated_TSA_exit+Day2):
// Row 0 = programme title, row 1 = column headers, data from row 2
// 0=Program, 1=SolutionType, 3=RoleGroup, 5=PodName, 8=ProjectRole
// 12=Location, 13=Name, 14=EnterpriseID, 15=LevelBand, 16=BillCode
// 19=TotalFTE, 20-35=M1-M16(Jun-Sep), 36=TotalDays
const COLS = {
  program: 0, roleGroup: 3, project: 4, pod: 5, role: 8,
  location: 12, name: 13, enterpriseId: 14,
  levelBand: 15, billCode: 16, lcr: 17, fte: 19, totalDays: 36, cost: 37,
};

function normaliseGroup(g) {
  // lowercase variants from the sheet
  if (g === "data portfolio") return "Data Portfolio";
  return g;
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
  const dataRows = raw.slice(2);

  const podMap        = {};
  const levelMap      = {};
  const groupMap      = {};
  const groupLevelMap = {};
  const podLevelMap   = {};

  let totalPeople = 0, totalUs = 0, totalIndia = 0, totalAr = 0, totalDaysSum = 0, namedCount = 0;

  for (const row of dataRows) {
    const roleGroup    = String(row[COLS.project] ?? "").trim();
    const podName      = String(row[COLS.pod]          ?? "").trim().replace(/\s+/g, " ");
    const location     = String(row[COLS.location]     ?? "").trim();
    const enterpriseId = String(row[COLS.enterpriseId] ?? "").trim();
    const levelBand    = String(row[COLS.levelBand]    ?? "").trim();
    const billCode     = row[COLS.billCode]  != null ? parseFloat(row[COLS.billCode])  : null;
    const lcr          = row[COLS.lcr]       != null ? parseFloat(row[COLS.lcr])       : null;
    const rate         = lcr ?? billCode; // prefer LCR (col 17); fall back to bill code (col 16)
    const totalFte     = row[COLS.fte]       != null ? parseFloat(row[COLS.fte])       : 0;
    const totalDaysCol = row[COLS.totalDays] != null ? parseFloat(row[COLS.totalDays]) : null;

    // Each row = 1 person/role. col[fte] = sum of monthly FTE fractions.
    // Exclude blank rows and zero-allocation rows.
    if (!roleGroup && !podName) continue;
    if (totalFte <= 0) continue;

    const people = 1;  // one row = one person
    const days   = (totalDaysCol != null && totalDaysCol > 0) ? totalDaysCol : DAYS_PER_PERSON;

    // Location classification — explicit matches to avoid false positives
    const loc   = location.toUpperCase();
    const isUs  = loc === "USA" || loc === "US" || loc.startsWith("UNITED STATES") || loc === "ONSHORE";
    const isAr  = loc.startsWith("ARGENTINA") || loc === "AR";
    // Canada, Brazil, Malaysia, Costa Rica, Philippines → treated as offshore (India bucket)
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
      if (!pod.group && roleGroup) pod.group = roleGroup; // project name as group label
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

  // Derive per-location blended bill rates from accumulated cost/day sums
  function withBillRates(obj) {
    const billOn  = obj._onDays  > 0 ? obj._onCost  / obj._onDays  : null;
    const billOff = obj._offDays > 0 ? obj._offCost / obj._offDays : null;
    const { _onCost, _onDays, _offCost, _offDays, ...rest } = obj;
    return { ...rest, billOn, billOff };
  }

  // Round floats for display; sort level by canonical order
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
    const roleGroup = String(row[COLS.project] ?? "").trim();
    if (!roleGroup) continue;
    const totalFte = row[COLS.fte] != null ? parseFloat(row[COLS.fte]) : 0;
    if (totalFte <= 0) continue;
    const months = [];
    for (let m = 20; m <= 35; m++) months.push(row[m] != null ? Math.round(Number(row[m]) * 100) / 100 : 0);
    detail.push({
      program:  String(row[COLS.program]  ?? "").trim(),
      group:    roleGroup,
      pod:      String(row[COLS.pod]      ?? "").trim().replace(/\s+/g, " "),
      role:     String(row[COLS.role]     ?? "").trim(),
      location: String(row[COLS.location] ?? "").trim(),
      name:     row[COLS.name]         ? String(row[COLS.name]).trim()         : null,
      eid:      row[COLS.enterpriseId] ? String(row[COLS.enterpriseId]).trim() : null,
      level:    String(row[COLS.levelBand] ?? "").trim(),
      billCode: row[COLS.lcr] != null ? parseFloat(row[COLS.lcr]) : (row[COLS.billCode] != null ? parseFloat(row[COLS.billCode]) : null),
      cost: row[COLS.cost] != null ? parseFloat(row[COLS.cost]) : null,
      months,
      totalDays: row[COLS.totalDays] != null ? Math.round(Number(row[COLS.totalDays]) * 100) / 100 : 0,
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
  };
}
