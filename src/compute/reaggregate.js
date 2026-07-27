import { LEVEL_ORDER } from "../parsers/parseStaffingModel.js";

function isOnshore(loc) {
  const u = (loc ?? "").toUpperCase();
  return u === "USA" || u === "US" || u.startsWith("UNITED STATES") || u === "ONSHORE";
}
function isArgentina(loc) {
  const u = (loc ?? "").toUpperCase();
  return u.startsWith("ARGENTINA") || u === "AR";
}

export function reaggregateStaffing(detail) {
  if (!detail?.length) return null;

  const podMap = {}, levelMap = {}, groupMap = {}, groupLevelMap = {}, podLevelMap = {};
  let totalPeople = 0, totalUs = 0, totalIndia = 0, totalAr = 0, totalDaysSum = 0, namedCount = 0;

  for (const r of detail) {
    const roleGroup  = r.group ?? "";
    const podName    = r.pod ?? "";
    const levelBand  = r.level ?? "";
    const loc        = r.location ?? "";
    const us         = isOnshore(loc);
    const ar         = isArgentina(loc);
    const india      = !us && !ar;
    const days       = r.totalDays > 0 ? r.totalDays : 320;
    const rate       = r.billCode ?? null;

    totalPeople += 1;
    totalDaysSum += days;
    if (us)    totalUs    += 1;
    if (india) totalIndia += 1;
    if (ar)    totalAr    += 1;
    if (r.eid && r.eid.toUpperCase() !== "TBD") namedCount += 1;

    // Pod
    if (podName) {
      if (!podMap[podName]) podMap[podName] = { name: podName, people: 0, us: 0, india: 0, ar: 0, totalDays: 0, group: roleGroup };
      const p = podMap[podName];
      p.people += 1; p.us += us ? 1 : 0; p.india += india ? 1 : 0; p.ar += ar ? 1 : 0; p.totalDays += days;
    }

    // Level
    if (levelBand) {
      if (!levelMap[levelBand]) levelMap[levelBand] = { band: levelBand, people: 0, us: 0, india: 0, ar: 0, totalDays: 0, bill: rate, _onCost: 0, _onDays: 0, _offCost: 0, _offDays: 0 };
      const lv = levelMap[levelBand];
      lv.people += 1; lv.us += us ? 1 : 0; lv.india += india ? 1 : 0; lv.ar += ar ? 1 : 0; lv.totalDays += days;
      if (rate != null) {
        if (us) { lv._onCost += days * rate; lv._onDays += days; }
        else    { lv._offCost += days * rate; lv._offDays += days; }
      }
    }

    // Group
    if (roleGroup) {
      if (!groupMap[roleGroup]) groupMap[roleGroup] = { name: roleGroup, people: 0, us: 0, india: 0, ar: 0, totalDays: 0 };
      const g = groupMap[roleGroup];
      g.people += 1; g.us += us ? 1 : 0; g.india += india ? 1 : 0; g.ar += ar ? 1 : 0; g.totalDays += days;
    }

    // Group-level
    if (roleGroup && levelBand) {
      if (!groupLevelMap[roleGroup]) groupLevelMap[roleGroup] = {};
      if (!groupLevelMap[roleGroup][levelBand]) groupLevelMap[roleGroup][levelBand] = { band: levelBand, people: 0, us: 0, india: 0, ar: 0, totalDays: 0, _onCost: 0, _onDays: 0, _offCost: 0, _offDays: 0 };
      const e = groupLevelMap[roleGroup][levelBand];
      e.people += 1; e.us += us ? 1 : 0; e.india += india ? 1 : 0; e.ar += ar ? 1 : 0; e.totalDays += days;
      if (rate != null) {
        if (us) { e._onCost += days * rate; e._onDays += days; }
        else    { e._offCost += days * rate; e._offDays += days; }
      }
    }

    // Pod-level
    if (podName && levelBand) {
      if (!podLevelMap[podName]) podLevelMap[podName] = {};
      if (!podLevelMap[podName][levelBand]) podLevelMap[podName][levelBand] = { band: levelBand, people: 0, us: 0, india: 0, ar: 0, totalDays: 0, _onCost: 0, _onDays: 0, _offCost: 0, _offDays: 0 };
      const e = podLevelMap[podName][levelBand];
      e.people += 1; e.us += us ? 1 : 0; e.india += india ? 1 : 0; e.ar += ar ? 1 : 0; e.totalDays += days;
      if (rate != null) {
        if (us) { e._onCost += days * rate; e._onDays += days; }
        else    { e._offCost += days * rate; e._offDays += days; }
      }
    }
  }

  function withBillRates(obj) {
    const billOn  = obj._onDays  > 0 ? obj._onCost  / obj._onDays  : null;
    const billOff = obj._offDays > 0 ? obj._offCost / obj._offDays : null;
    const { _onCost, _onDays, _offCost, _offDays, ...rest } = obj;
    return { ...rest, billOn, billOff };
  }

  const byLevel = LEVEL_ORDER.filter(l => levelMap[l]).map(l => withBillRates(levelMap[l]));
  const byGroup = Object.values(groupMap).sort((a, b) => b.people - a.people);
  const byPod   = Object.values(podMap).sort((a, b) => b.people - a.people);

  const byGroupLevel = {};
  for (const [g, lvls] of Object.entries(groupLevelMap)) {
    byGroupLevel[g] = LEVEL_ORDER.filter(l => lvls[l]).map(l => withBillRates(lvls[l]));
  }
  const byPodLevel = {};
  for (const [p, lvls] of Object.entries(podLevelMap)) {
    byPodLevel[p] = LEVEL_ORDER.filter(l => lvls[l]).map(l => withBillRates(lvls[l]));
  }

  return {
    total:         totalPeople,
    named:         namedCount,
    us:            totalUs,
    india:         totalIndia,
    argentina:     totalAr,
    totalDays:     Math.round(totalDaysSum),
    daysPerPerson: 320,
    months:        16,
    groups:        byGroup,
    pods:          byPod,
    levels:        byLevel,
    byGroupLevel,
    byPodLevel,
  };
}
