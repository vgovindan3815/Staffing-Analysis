import { RATE_RNR, RATE_REPL, RATE_CBR } from "./pricing.js";

// Map Cost Per EAI disposition labels → App Master / Solution Book labels
// null = no match (e.g. Replace rows delivered by a third party)
// Pattern-based canonical lookup — handles annotated Back Office labels like
// "R&R — Standard  (119 apps + Tririga reallocation)" and
// "Replace (New App-High) — Tririga  ·  Delivered by Deloitte  (1 app)"
function getCanonical(disp) {
  // Any row mentioning "Deloitte" → delivered externally, no internal cost
  if (disp.includes("Deloitte")) return null;

  if (disp.startsWith("R&R — Standard")   || disp.startsWith("R&R - Standard"))   return "Remediate and Retain";
  if (disp.startsWith("R&R — Low Effort") || disp.startsWith("R&R - Low Effort")) return "Remediate and Retain";
  if (disp.startsWith("Clone — Medium/Rehost")    || disp.startsWith("Clone - Medium/Rehost"))    return "Clone";
  if (disp.startsWith("Clone — Day 2 New Build")  || disp.startsWith("Clone - Day 2 New Build"))  return "Clone";
  if (disp.startsWith("Replace (New Platform)"))  return "Replace (New Platform)";
  if (disp.startsWith("Replace (New App-High)"))  return "Replace (New App-High)";
  if (disp.startsWith("Replace (New App Med)"))   return "Replace (New App Med)";
  if (disp.startsWith("Complex Big Rock"))        return "Complex Big Rock";

  return undefined;
}

// Clone rows: apps come from Cost Per EAI (App Master can't distinguish Medium from D2)
function isCloneRow(disp) {
  return disp.startsWith("Clone — Medium/Rehost") || disp.startsWith("Clone - Medium/Rehost")
      || disp.startsWith("Clone — Day 2 New Build") || disp.startsWith("Clone - Day 2 New Build");
}


function getRate(dispLabel) {
  if (dispLabel.includes("Replace") || dispLabel.includes("Deloitte")) return RATE_REPL;
  if (dispLabel.includes("Complex Big Rock")) return RATE_CBR;
  return RATE_RNR;
}

export function mergeData(costData, amData, sbData, sfData) {
  // Debug: log all disposition names and their canonical mappings
  console.log("[mergeData] Disposition name → canonical mapping:");
  for (const [portName, portCost] of Object.entries(costData)) {
    portCost.groups.forEach(g =>
      g.dispositions.forEach(d => {
        const canonical = getCanonical(d.disp);
        const status = canonical === undefined ? "❌ NO MAPPING" : canonical === null ? "→ null (Deloitte, stf→0)" : `→ "${canonical}"`;
        console.log(`  [${portName}] "${d.disp}" ${status}  stf=${d.stf} oh=${d.oh}`);
      })
    );
  }

  const portfolios = {};

  for (const [portName, portCost] of Object.entries(costData)) {
    if (portName.startsWith("_")) continue;
    const amPort = (amData.portfolios ?? amData)[portName] ?? {};
    const sbPort = sbData[portName] ?? {};

    const groups = portCost.groups.map(group => {
      const dispositions = group.dispositions.map(disp => {
        const canonical = getCanonical(disp.disp);

        // apps count — prefer App Master unless this is a Clone row
        let apps = disp.apps;
        if (canonical && !isCloneRow(disp.disp)) {
          const amApps = amPort.byDisposition?.[canonical]
            ?? amPort.byDisposition?.[" " + canonical]
            ?? null;
          if (amApps != null) apps = amApps;
        }

        // epApp — baseline from Cost Per EAI col D.
        // Clone Medium/D2 have different d/App values (41 vs 55) — the Solution Book lumps
        // them under a single "Clone" entry and would collapse both to one value, so skip
        // the SB override for Clone rows and keep the per-subtype Cost Per EAI values.
        let epApp = disp.epApp ?? null;
        if (canonical && !isCloneRow(disp.disp)) {
          const sbEpApp = sbPort[canonical]?.epApp;
          if (sbEpApp != null) epApp = sbEpApp;
        }

        // Deloitte rows: retain pricing as coordination cost is included in CTA
        return { ...disp, apps, epApp, rate: getRate(disp.disp) };
      });

      return { ...group, dispositions };
    });

    portfolios[portName] = { ...portCost, groups };
  }

  return {
    portfolios,
    staffing: sfData,
    scope: amData.scope ?? null,
    initiatives: costData._initiatives ?? null,
  };
}

// Converts merged portfolios object → array shape that existing tabs consume
const PORTFOLIO_ORDER = ["Commercial", "Operations", "Technology Platforms", "Back Office"];

export function toPortfoliosArray(mergedPortfolios) {
  return PORTFOLIO_ORDER.map(name => {
    const port = mergedPortfolios[name];
    if (!port) return null;

    return {
      name,
      apps: port.groups.reduce((s, g) => s + g.dispositions.reduce((s2, d) => s2 + d.apps, 0), 0),
      groups: port.groups.map(g => ({
        label: g.label,
        apps:  g.dispositions.reduce((s, d) => s + d.apps, 0),
        rows:  g.dispositions.map(d => ({
          disp:  d.disp,
          apps:  d.apps,
          epApp: d.epApp,
          stf:   d.stf,
          oh:    d.oh,
          rate:  d.rate,
          note:  d.note,
        })),
        plat: {
          total_days: g.platTracks.reduce((s, t) => s + t.days, 0),
          total_cost: g.platTotalCost,
          tracks: g.platTracks,
        },
      })),
    };
  }).filter(Boolean);
}

// Converts parsed staffing data → shape that StaffingTab consumes
export function toStaffingShape(sfData) {
  return {
    total:         sfData.summary.total,
    named:         sfData.summary.named ?? sfData.summary.total,
    us:            sfData.summary.us,
    india:         sfData.summary.india,
    argentina:     sfData.summary.argentina,
    months:        16,
    daysPerPerson: 320,
    totalDays:     sfData.summary.totalDays,
    pods: sfData.byPod.map(p => ({
      name:      p.name,
      people:    p.people,
      us:        p.us,
      india:     p.india,
      group:     p.group,
      totalDays: p.totalDays,
    })),
    levels: sfData.byLevel.map(l => ({
      band:      l.band,
      people:    l.people,
      bill:      l.bill,
      us:        l.us,
      india:     l.india,
      ar:        l.ar,
      totalDays: l.totalDays,
    })),
    groups: sfData.byGroup.map(g => ({
      name:      g.name,
      people:    g.people,
      us:        g.us,
      india:     g.india,
      totalDays: g.totalDays,
    })),
    byGroupLevel: sfData.byGroupLevel ?? {},
    byPodLevel:   sfData.byPodLevel   ?? {},
    detail:       sfData.detail       ?? [],
  };
}
