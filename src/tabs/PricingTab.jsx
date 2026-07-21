import { useState } from "react";
import { s, fmtN } from "../styles.js";
import { LEVEL_COL, GROUP_COL, TEAL } from "../data/hardcoded.js";
import { STAFFING_DETAIL } from "../data/staffingDetail.js";

const US_COL  = "#185FA5";
const OFF_COL = "#009CA6";
const ON_HRS  = 8;
const OFF_HRS = 9;

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtM(v) {
  if (v === 0) return "—";
  if (Math.abs(v) >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  return "$" + (v / 1e3).toFixed(0) + "K";
}
function fmtHr(v) { return "$" + v.toFixed(2) + "/hr"; }

// Build bill-rate lookup from staffing.levels.
// Returns { on, off } per band — live data has per-location blended rates;
// hardcoded data falls back to the single bill rate for both.
function buildBillLookup(levels) {
  const map = {};
  for (const l of levels) {
    const base = l.bill ?? 0;
    map[l.band] = {
      on:  l.billOn  ?? base,
      off: l.billOff ?? base,
    };
  }
  return map;
}

// Split totalDays into onshore/offshore using location headcounts as weights.
// us+india+ar can exceed l.people in the hardcoded data, so normalise against
// the actual location sum rather than l.people to keep splits within totalDays.
function locSplit(l, DAYS) {
  const total    = l.totalDays ?? (l.people * DAYS);
  const usCount  = l.us    ?? 0;
  const offCount = (l.india ?? 0) + (l.ar ?? 0);
  const locTotal = usCount + offCount;
  if (locTotal === 0) return { usDays: 0, offDays: 0, total };
  return {
    usDays:  total * (usCount  / locTotal),
    offDays: total * (offCount / locTotal),
    total,
  };
}

// Resolve on/off bill rates for a level row.
// Prefer per-location rates from the row itself (live data),
// then the lookup table (overall level blended), then zero.
function billRates(l, billByBand) {
  const lookup = billByBand[l.band] ?? { on: 0, off: 0 };
  return {
    onBill:  l.billOn  ?? lookup.on,
    offBill: l.billOff ?? lookup.off,
  };
}

// Compute blended LCR split by onshore / offshore using level distribution
function computeBlendedLCR(levels, DAYS, billByBand) {
  let onCost = 0, onDays = 0, offCost = 0, offDays = 0;
  for (const l of levels) {
    const { onBill, offBill } = billRates(l, billByBand);
    const { usDays, offDays: offD } = locSplit(l, DAYS);
    onCost  += usDays * onBill;
    onDays  += usDays;
    offCost += offD   * offBill;
    offDays += offD;
  }
  const onLCR  = onDays  > 0 ? onCost  / onDays  : 0;
  const offLCR = offDays > 0 ? offCost / offDays : 0;
  const allDays = onDays + offDays;
  const blended = allDays > 0 ? (onCost + offCost) / allDays : 0;
  return { onLCR, offLCR, blended, onCost, offCost, onDays, offDays };
}

// For a set of level rows with byGroupLevel data, compute per-group costs
function groupRowCost(groupLevels, billByBand, DAYS) {
  let onCost = 0, offCost = 0, onDays = 0, offDays = 0;
  for (const l of groupLevels) {
    const { onBill, offBill } = billRates(l, billByBand);
    const { usDays, offDays: offD } = locSplit(l, DAYS);
    onCost  += usDays * onBill  * ON_HRS;
    offCost += offD   * offBill * OFF_HRS;
    onDays  += usDays;
    offDays += offD;
  }
  return { onCost, offCost, totalCost: onCost + offCost, onDays, offDays };
}

function synthesiseLevels(entity, allLevels, totUs, totIndia, totAr, DAYS) {
  const frOn  = totUs    > 0 ? (entity.us    ?? 0) / totUs    : 0;
  const frOff = totIndia > 0 ? (entity.india ?? 0) / totIndia : 0;
  const frAr  = totAr    > 0 ? (entity.ar    ?? 0) / totAr    : 0;
  return allLevels.map(l => {
    const us    = Math.round((l.us    ?? 0) * frOn);
    const india = Math.round((l.india ?? 0) * frOff);
    const ar    = Math.round((l.ar    ?? 0) * frAr);
    const people = us + india + ar;
    if (people === 0) return null;
    const totalDays = l.people > 0
      ? Math.round((l.totalDays ?? l.people * DAYS) * people / l.people)
      : people * DAYS;
    return { band: l.band, people, us, india, ar, totalDays };
  }).filter(Boolean);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function isOnshoreLocation(loc) {
  const u = (loc ?? "").toUpperCase();
  return u === "USA" || u === "US" || u.startsWith("UNITED STATES") || u === "ONSHORE";
}

// Compute blended LCR for a group+level+location directly from person rows.
// Returns null when liveDetail is unavailable or has no matching rows with billCode.
function computeLiveGroupLevelLCR(liveDetail, groupName, levelBand, locationKey) {
  if (!liveDetail?.length) return null;
  const rows = liveDetail.filter(r =>
    r.group === groupName &&
    r.level === levelBand &&
    (locationKey === "us" ? isOnshoreLocation(r.location) : !isOnshoreLocation(r.location))
  );
  let cost = 0, days = 0;
  for (const r of rows) {
    if (r.billCode != null && r.totalDays > 0) {
      cost += r.billCode * r.totalDays;
      days += r.totalDays;
    }
  }
  return days > 0 ? cost / days : null;
}

// ── Person detail view ────────────────────────────────────────────────────────

const MONTH_LABELS = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M13","M14","M15","M16"];

function PersonDetailView({ entityType, entityName, levelBand, locationKey, liveDetail, onBack, onBackLabel, onBackToLevel }) {
  const detail = liveDetail?.length > 0 ? liveDetail : STAFFING_DETAIL;
  const rows = detail.filter(r => {
    if (levelBand && r.level !== levelBand) return false;
    if (entityType === "group") { if (r.group !== entityName) return false; }
    else if (entityType !== "all") { if (r.pod !== entityName) return false; }
    if (locationKey === "us")  return isOnshoreLocation(r.location);
    if (locationKey === "off") return !isOnshoreLocation(r.location);
    return true;
  });

  const locColor = loc => {
    if (loc.toUpperCase().includes("USA") || loc.toUpperCase().includes("US")) return US_COL;
    if (loc.toUpperCase().includes("ARGENTINA") || loc.toUpperCase().includes("AR")) return "#B45309";
    return OFF_COL;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#94A3B8", flexWrap:"wrap" }}>
        <button onClick={() => onBack("top")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8", fontSize:13, padding:0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:13, marginRight:4 }} />
          Pricing
        </button>
        {onBackLabel && (<>
          <span>/</span>
          <button onClick={() => onBack("mid")} style={{ background:"none", border:"none", cursor:"pointer", color:"#A100FF", fontSize:13, padding:0 }}>
            {onBackLabel}
          </button>
        </>)}
        {levelBand && (<>
          <span>/</span>
          <span style={{ color:"#F8FAFC", fontWeight:600 }}>
            <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:LEVEL_COL[levelBand]||TEAL, marginRight:5, verticalAlign:1 }} />
            {levelBand}
          </span>
        </>)}
        <span style={{ marginLeft:8, fontSize:12, color:"#94A3B8" }}>— {rows.length} resource{rows.length !== 1 ? "s" : ""}</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ ...s.card, padding:24, textAlign:"center", color:"#94A3B8", fontSize:13 }}>
          No individual rows found for this combination.
        </div>
      ) : (
        <div style={{ ...s.card, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ ...s.tbl, minWidth:1100 }}>
              <thead>
                <tr>
                  {["Group","Pod","Role / Skill Profile","Location","Enterprise ID","Level",
                    ...MONTH_LABELS,"Total Days"].map((h,i) => (
                    <th key={i} style={{
                      ...s.th,
                      ...(i >= 6 ? s.thR : {}),
                      whiteSpace:"nowrap", fontSize:11, padding:"6px 8px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} style={{ background: idx%2===1 ? "rgba(255,255,255,0.03)" : undefined }}>
                    <td style={{ ...s.td, fontSize:12, whiteSpace:"nowrap" }}>{r.group}</td>
                    <td style={{ ...s.td, fontSize:12, whiteSpace:"nowrap" }}>{r.pod}</td>
                    <td style={{ ...s.td, fontSize:12 }}>{r.role}</td>
                    <td style={{ ...s.td, fontSize:12, color:locColor(r.location), fontWeight:500, whiteSpace:"nowrap" }}>{r.location}</td>
                    <td style={{ ...s.td, fontSize:12, fontFamily:"var(--font-mono)", color:"#94A3B8" }}>
                      {r.eid ?? <span style={{ color:"rgba(255,255,255,0.25)" }}>TBD</span>}
                    </td>
                    <td style={{ ...s.td, fontSize:12 }}>
                      <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:LEVEL_COL[r.level]||TEAL, marginRight:5, verticalAlign:1 }} />
                      {r.level}
                    </td>
                    {(r.months ?? []).map((m, mi) => (
                      <td key={mi} style={{ ...s.td, ...s.tdR, fontSize:11, padding:"4px 6px",
                        color: m > 0 ? "#000000" : "#CCCCCC" }}>
                        {m > 0 ? (Number.isInteger(m) ? m : m.toFixed(2)) : "—"}
                      </td>
                    ))}
                    <td style={{ ...s.td, ...s.tdR, fontSize:12, fontWeight:600 }}>
                      {r.totalDays > 0 ? fmtN(Math.round(r.totalDays)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group level breakdown view ────────────────────────────────────────────────

function GroupLevelView({ groupName, groupLevels, billByBand, margin, DAYS, liveDetail, onBack }) {
  const [personView, setPersonView] = useState(null); // { band, locationKey }
  const price = margin < 100 ? 1 / (1 - margin / 100) : 1;

  if (personView !== null) {
    return (
      <PersonDetailView
        entityType="group"
        entityName={groupName}
        levelBand={personView.band}
        locationKey={personView.locationKey}
        liveDetail={liveDetail}
        onBack={(where) => { if (where === "top") onBack(); else setPersonView(null); }}
        onBackLabel={groupName}
        onBackToLevel={() => setPersonView(null)}
      />
    );
  }

  const { onCost, offCost, totalCost, onDays, offDays } = groupRowCost(groupLevels, billByBand, DAYS);

  const onLevels  = groupLevels.filter(l => (l.us ?? 0) > 0);
  const offLevels = groupLevels.filter(l => ((l.india ?? 0) + (l.ar ?? 0)) > 0);

  const LevelSection = ({ title, color, rows, locationKey }) => {
    const totDays = rows.reduce((a, l) => {
      const { usDays, offDays } = locSplit(l, DAYS);
      return a + (locationKey === "us" ? usDays : offDays);
    }, 0);
    const hrs = locationKey === "us" ? ON_HRS : OFF_HRS;
    const totCost = rows.reduce((a, l) => {
      const liveBill = computeLiveGroupLevelLCR(liveDetail, groupName, l.band, locationKey);
      const { onBill, offBill } = billRates(l, billByBand);
      const bill = liveBill ?? (locationKey === "us" ? onBill : offBill);
      const { usDays, offDays } = locSplit(l, DAYS);
      const days = locationKey === "us" ? usDays : offDays;
      return a + days * bill * hrs;
    }, 0);

    return (
      <div style={{ ...s.card, overflow:"hidden" }}>
        <div style={{ padding:"8px 14px", borderBottom:"1px solid #1E293B", fontSize:12, fontWeight:600,
          textTransform:"uppercase", letterSpacing:0.5, color }}>
          {title}
        </div>
        <table style={s.tbl}>
          <thead>
            <tr>
              {["Level band","LCR Rate","People","Days","Cost","Price",""].map((h,i) => (
                <th key={i} style={{ ...s.th, ...(i >= 1 && i < 6 ? s.thR : {}), fontSize:12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(l => {
              const liveBill = computeLiveGroupLevelLCR(liveDetail, groupName, l.band, locationKey);
              const { onBill, offBill } = billRates(l, billByBand);
              const bill = liveBill ?? (locationKey === "us" ? onBill : offBill);
              const { usDays, offDays } = locSplit(l, DAYS);
              const lPpl = locationKey === "us" ? (l.us ?? 0) : (l.india ?? 0) + (l.ar ?? 0);
              const days = locationKey === "us" ? usDays : offDays;
              const cost = days * bill * hrs;
              return (
                <tr key={l.band} style={{ cursor:"pointer" }}
                  onClick={() => setPersonView({ band: l.band, locationKey })}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background=""}>
                  <td style={{ ...s.td, fontSize:13 }}>
                    <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
                      background:LEVEL_COL[l.band]||TEAL, marginRight:8, verticalAlign:1 }} />
                    {l.band}
                  </td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, fontWeight:500, color:"#94A3B8" }}>{fmtHr(bill)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>{Math.round(lPpl)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, color:"#94A3B8" }}>{fmtN(Math.round(days))}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>{fmtM(cost)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, color:"#A100FF", fontWeight:600 }}>{fmtM(cost * price)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:12, color:"rgba(255,255,255,0.2)" }}><i className="ti ti-chevron-right" /></td>
                </tr>
              );
            })}
            <tr style={{ background:"rgba(255,255,255,0.03)" }}>
              <td style={{ ...s.td, fontWeight:600, fontSize:13 }}>Subtotal</td>
              <td style={{ ...s.td, ...s.tdR, fontSize:13, color:"#94A3B8" }}>blended</td>
              <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13 }}>
                {rows.reduce((a,l) => a + (locationKey==="us" ? (l.us??0) : (l.india??0)+(l.ar??0)), 0)}
              </td>
              <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13 }}>{fmtN(Math.round(totDays))}</td>
              <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13 }}>{fmtM(totCost)}</td>
              <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13, color:"#A100FF" }}>{fmtM(totCost * price)}</td>
              <td style={s.td} />
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Breadcrumb */}
      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#94A3B8" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"#94A3B8", fontSize:13, padding:0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:13, marginRight:4 }} />
          Pricing
        </button>
        <span>/</span>
        <span style={{ color:"#F8FAFC", fontWeight:600 }}>
          <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
            background:GROUP_COL[groupName]||TEAL, marginRight:6, verticalAlign:1 }} />
          {groupName}
        </span>
        <span style={{ marginLeft:8, fontSize:12, color:"#94A3B8" }}>— click a level to view individual resources</span>
      </div>

      {/* Summary strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[
          { label:"Total cost", value:fmtM(totalCost), color:"#F8FAFC" },
          { label:"Price (" + margin.toFixed(1) + "% margin)", value:fmtM(totalCost * price), color:"#A100FF" },
          { label:"On / Off split", value:`${fmtM(onCost)} / ${fmtM(offCost)}`, color:"#94A3B8" },
        ].map(k => (
          <div key={k.label} style={{ ...s.kpi }}>
            <div style={s.kpiLabel}>{k.label}</div>
            <div style={{ ...s.kpiVal, fontSize:20, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {onLevels.length > 0  && <LevelSection title="Onshore (US)"          color={US_COL}  rows={onLevels}  locationKey="us"  />}
        {offLevels.length > 0 && <LevelSection title="Offshore (India + AR)" color={OFF_COL} rows={offLevels} locationKey="off" />}
      </div>
    </div>
  );
}

// Compute total cost per person from liveDetail (same formula as HomeTab).
function computeCostsFromDetail(detail) {
  if (!detail?.length) return null;
  let onCost = 0, offCost = 0, hasData = false;
  for (const r of detail) {
    if (r.billCode == null || !r.totalDays) continue;
    hasData = true;
    const hrs = isOnshoreLocation(r.location) ? ON_HRS : OFF_HRS;
    const cost = r.billCode * r.totalDays * hrs;
    if (isOnshoreLocation(r.location)) onCost  += cost;
    else                               offCost += cost;
  }
  if (!hasData) return null;
  return { onCost, offCost, totalCost: onCost + offCost };
}

// ── Main PricingTab ───────────────────────────────────────────────────────────

export default function PricingTab({ staffing, liveDetail, margin, setMargin }) {
  const [drill, setDrill] = useState(null); // null | {type:"group",name,levels} | {type:"level",band,loc}

  const DAYS      = staffing.daysPerPerson ?? 320;
  const billByBand = buildBillLookup(staffing.levels);
  const { onLCR, offLCR, blended, onCost: totOnCost, offCost: totOffCost, onDays: totOnDays, offDays: totOffDays }
    = computeBlendedLCR(staffing.levels, DAYS, billByBand);
  const liveCosts    = computeCostsFromDetail(liveDetail);
  const totalCostAll = liveCosts
    ? liveCosts.totalCost
    : totOnCost * ON_HRS + totOffCost * OFF_HRS;
  const dispOnCost  = liveCosts ? liveCosts.onCost  : totOnCost  * ON_HRS;
  const dispOffCost = liveCosts ? liveCosts.offCost : totOffCost * OFF_HRS;
  const priceMultiplier = margin < 100 ? 1 / (1 - margin / 100) : 1;
  const priceHr = blended * priceMultiplier;

  // ── group-level cost rows ─────────────────────────────────────────────────
  const groupRows = staffing.groups.map(g => {
    const realLevels = staffing.byGroupLevel?.[g.name];
    const levels = realLevels?.length > 0
      ? realLevels
      : synthesiseLevels(g, staffing.levels, staffing.us, staffing.india ?? 0, staffing.argentina ?? 0, DAYS);
    const { onCost, offCost, totalCost } = groupRowCost(levels, billByBand, DAYS);
    return { ...g, levels, onCost, offCost, totalCost };
  }).sort((a, b) => b.totalCost - a.totalCost);

  // ── onshore / offshore level summary for bottom tables ────────────────────
  const onLevels  = staffing.levels.filter(l => (l.us ?? 0) > 0);
  const offLevels = staffing.levels.filter(l => ((l.india ?? 0) + (l.ar ?? 0)) > 0);

  // ── drill-down routing ────────────────────────────────────────────────────
  if (drill?.type === "person") {
    return (
      <PersonDetailView
        entityType={drill.entityType ?? "all"}
        entityName={drill.entityName}
        levelBand={drill.band}
        locationKey={drill.locationKey}
        liveDetail={liveDetail}
        onBack={(where) => {
          if (where === "top") setDrill(null);
          else if (drill.parent) setDrill(drill.parent);
          else setDrill(null);
        }}
        onBackLabel={drill.backLabel}
        onBackToLevel={() => drill.parent ? setDrill(drill.parent) : setDrill(null)}
      />
    );
  }

  if (drill?.type === "group") {
    return (
      <GroupLevelView
        groupName={drill.name}
        groupLevels={drill.levels}
        billByBand={billByBand}
        margin={margin}
        DAYS={DAYS}
        liveDetail={liveDetail}
        onBack={() => setDrill(null)}
      />
    );
  }

  // ── LCR inputs & KPIs ────────────────────────────────────────────────────
  const KPI = ({ label, value, sub, accent }) => (
    <div style={{ ...s.kpi, borderTop: accent ? "3px solid #A100FF" : "3px solid transparent" }}>
      <div style={s.kpiLabel}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color: accent ? "#A100FF" : "#F8FAFC", marginBottom:2 }}>{value}</div>
      {sub && <div style={s.kpiSub}>{sub}</div>}
    </div>
  );

  const LevelBottomTable = ({ title, color, rows, locationKey }) => {
    const totDays = rows.reduce((a, l) => {
      const { usDays, offDays } = locSplit(l, DAYS);
      return a + (locationKey === "us" ? usDays : offDays);
    }, 0);
    const hrs = locationKey === "us" ? ON_HRS : OFF_HRS;
    const totCost = rows.reduce((a, l) => {
      const { onBill, offBill } = billRates(l, billByBand);
      const bill = locationKey === "us" ? onBill : offBill;
      const { usDays, offDays } = locSplit(l, DAYS);
      const days = locationKey === "us" ? usDays : offDays;
      return a + days * bill * hrs;
    }, 0);

    return (
      <div style={{ ...s.card, overflow:"hidden" }}>
        <div style={{ padding:"8px 14px", borderBottom:"1px solid #1E293B",
          fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color }}>
          {title}
        </div>
        <table style={s.tbl}>
          <thead>
            <tr>
              {["Level band","LCR Rate","People","Days","Cost","Price",""].map((h,i) => (
                <th key={i} style={{ ...s.th, ...(i >= 1 && i < 6 ? s.thR : {}), fontSize:12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(l => {
              const { onBill, offBill } = billRates(l, billByBand);
              const bill = locationKey === "us" ? onBill : offBill;
              const { usDays, offDays } = locSplit(l, DAYS);
              const lPpl = locationKey === "us" ? (l.us ?? 0) : (l.india ?? 0) + (l.ar ?? 0);
              const days = locationKey === "us" ? usDays : offDays;
              const cost = days * bill * hrs;
              return (
                <tr key={l.band} style={{ cursor:"pointer" }}
                  onClick={() => setDrill({
                    type:"person", entityType:"all", band: l.band,
                    locationKey,
                    backLabel: null,
                    parent: null,
                  })}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background=""}>
                  <td style={{ ...s.td, fontSize:13 }}>
                    <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
                      background:LEVEL_COL[l.band]||TEAL, marginRight:8, verticalAlign:1 }} />
                    {l.band}
                  </td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, fontWeight:500, color:"#94A3B8" }}>{fmtHr(bill)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>{Math.round(lPpl)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, color:"#94A3B8" }}>{fmtN(Math.round(days))}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>{fmtM(cost)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, color:"#A100FF", fontWeight:600 }}>{fmtM(cost * priceMultiplier)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:12, color:"rgba(255,255,255,0.2)" }}><i className="ti ti-chevron-right" /></td>
                </tr>
              );
            })}
            <tr style={{ background:"rgba(255,255,255,0.03)" }}>
              <td style={{ ...s.td, fontWeight:600, fontSize:13 }}>Subtotal</td>
              <td style={{ ...s.td, ...s.tdR, fontSize:13, color:"#94A3B8" }}>blended</td>
              <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13 }}>
                {rows.reduce((a,l) => a + (locationKey==="us" ? (l.us??0) : (l.india??0)+(l.ar??0)), 0)}
              </td>
              <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13 }}>{fmtN(Math.round(totDays))}</td>
              <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13 }}>{fmtM(totCost)}</td>
              <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13, color:"#A100FF" }}>{fmtM(totCost * priceMultiplier)}</td>
              <td style={s.td} />
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── Top KPIs ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:10, alignItems:"start" }}>
        <KPI label="Onshore blended LCR"  value={fmtHr(onLCR)}  sub={`${fmtN(Math.round(totOnDays))} days × ${ON_HRS}hrs`} />
        <KPI label="Offshore blended LCR" value={fmtHr(offLCR)} sub={`${fmtN(Math.round(totOffDays))} days × ${OFF_HRS}hrs`} />
        <KPI label="Overall blended LCR"  value={fmtHr(blended)} sub="weighted by staffed days" accent />

        {/* Margin input + derived price */}
        <div style={{ background:"#111827", border:"1px solid #1E293B", borderRadius:8,
          padding:"10px 14px", minWidth:220 }}>
          <div style={{ fontSize:11, color:"#94A3B8", textTransform:"uppercase", letterSpacing:0.4, marginBottom:6 }}>
            Target margin %
          </div>
          <input
            type="number" min="0" max="99" step="0.5"
            value={margin}
            onChange={e => setMargin(parseFloat(e.target.value) || 0)}
            style={{ width:"100%", padding:"6px 10px", fontSize:18, fontWeight:700,
              border:"1px solid #1E293B", borderRadius:6, color:"#F8FAFC",
              background:"rgba(255,255,255,0.06)", outline:"none", marginBottom:8 }}
          />
          <div style={{ fontSize:11, color:"#94A3B8", textTransform:"uppercase", letterSpacing:0.4, marginBottom:3 }}>
            Derived price/hr
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:"#A100FF" }}>
            {fmtHr(priceHr)}
          </div>
          <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>
            = {fmtHr(blended)} ÷ (1 − {margin.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Total programme cost + price */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10 }}>
        <div style={{ ...s.kpi }}>
          <div style={s.kpiLabel}>Total programme cost</div>
          <div style={{ fontSize:22, fontWeight:700 }}>{fmtM(totalCostAll)}</div>
          <div style={s.kpiSub}>{liveCosts ? "per-resource LCR × days × hrs" : "LCR × days × hrs (8 on / 9 off)"}</div>
        </div>
        <div style={{ ...s.kpi }}>
          <div style={s.kpiLabel}>Onshore cost</div>
          <div style={{ fontSize:22, fontWeight:700, color:US_COL }}>{fmtM(dispOnCost)}</div>
          <div style={s.kpiSub}>{fmtHr(onLCR)} blended · {fmtN(Math.round(totOnDays))}d · 8 hrs</div>
        </div>
        <div style={{ ...s.kpi }}>
          <div style={s.kpiLabel}>Offshore cost</div>
          <div style={{ fontSize:22, fontWeight:700, color:OFF_COL }}>{fmtM(dispOffCost)}</div>
          <div style={s.kpiSub}>{fmtHr(offLCR)} blended · {fmtN(Math.round(totOffDays))}d · 9 hrs</div>
        </div>
        <div style={{ ...s.kpi, borderTop:"3px solid #A100FF" }}>
          <div style={s.kpiLabel}>Total programme price</div>
          <div style={{ fontSize:22, fontWeight:700, color:"#A100FF" }}>{fmtM(totalCostAll * priceMultiplier)}</div>
          <div style={s.kpiSub}>at {margin.toFixed(1)}% margin</div>
        </div>
      </div>

      {/* ── Project (group) level table ── */}
      <div>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:10, color:"#F8FAFC" }}>
          Pricing by role group
          <span style={{ fontSize:12, fontWeight:400, color:"#94A3B8", marginLeft:10 }}>click a row to drill into level detail</span>
        </div>
        <div style={{ ...s.card, overflow:"hidden" }}>
          <table style={s.tbl}>
            <thead>
              <tr>
                {["Role group","On People","Off People","Total","Onshore Cost","Offshore Cost",
                  "Total Cost","Price",""].map((h,i) => (
                  <th key={i} style={{ ...s.th, ...(i >= 1 && i < 8 ? s.thR : {}), fontSize:12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupRows.map(g => (
                <tr key={g.name} style={{ cursor:"pointer" }}
                  onClick={() => setDrill({ type:"group", name:g.name, levels:g.levels })}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background=""}>
                  <td style={{ ...s.td, fontSize:13 }}>
                    <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%",
                      background:GROUP_COL[g.name]||TEAL, marginRight:8, verticalAlign:1 }} />
                    {g.name}
                  </td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>{g.us}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>{(g.india ?? 0) + (g.ar ?? 0)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, fontWeight:500 }}>{g.people}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>{fmtM(g.onCost)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>{fmtM(g.offCost)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, fontWeight:600 }}>{fmtM(g.totalCost)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:13, color:"#A100FF", fontWeight:700 }}>
                    {fmtM(g.totalCost * priceMultiplier)}
                  </td>
                  <td style={{ ...s.td, ...s.tdR, fontSize:12, color:"rgba(255,255,255,0.2)" }}><i className="ti ti-chevron-right" /></td>
                </tr>
              ))}
              <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                <td style={{ ...s.td, fontWeight:700, fontSize:13 }}>Total</td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:700, fontSize:13 }}>{staffing.us}</td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:700, fontSize:13 }}>{(staffing.india ?? 0) + (staffing.argentina ?? 0)}</td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:700, fontSize:13 }}>{staffing.total}</td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:700, fontSize:13 }}>{fmtM(dispOnCost)}</td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:700, fontSize:13 }}>{fmtM(dispOffCost)}</td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:700, fontSize:13 }}>{fmtM(totalCostAll)}</td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:700, fontSize:13, color:"#A100FF" }}>{fmtM(totalCostAll * priceMultiplier)}</td>
                <td style={s.td} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom: Onshore | Offshore level tables ── */}
      <div>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:10, color:"#F8FAFC" }}>
          Pricing by level
          <span style={{ fontSize:12, fontWeight:400, color:"#94A3B8", marginLeft:10 }}>click a level to view individual resources</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <LevelBottomTable title="Onshore (US)"          color={US_COL}  rows={onLevels}  locationKey="us" />
          <LevelBottomTable title="Offshore (India + AR)" color={OFF_COL} rows={offLevels} locationKey="off" />
        </div>
      </div>

    </div>
  );
}
