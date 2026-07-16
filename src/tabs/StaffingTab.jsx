import { useState, useRef } from "react";
import { s, fmtN, pct } from "../styles.js";
import { TEAL, LEVEL_COL, GROUP_COL } from "../data/hardcoded.js";
import { STAFFING_DETAIL } from "../data/staffingDetail.js";
import { formatSavedAt } from "../storage/fileStore.js";
import Kpi      from "../components/Kpi.jsx";
import BarRow   from "../components/BarRow.jsx";
import SplitBar from "../components/SplitBar.jsx";
import PricingTab from "./PricingTab.jsx";
import HomeTab from "./HomeTab.jsx";
import HomeSidebar from "../components/HomeSidebar.jsx";
import HelpTab from "./HelpTab.jsx";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

const US_COL  = "#185FA5";
const OFF_COL = "#009CA6";

// Reinvent staffing guidelines
const REINVENT = {
  LT: {
    label: "Low Touch",
    onPct: 9, offPct: 91,
    blendedLCR: 33.57, costToServe: 43.64,
    levels: {
      "Leadership":    { on: 21.05, off: 0.85 },
      "5-Associate Director":    { on: 0,     off: 0    },
      "6-Senior Manager":        { on: 52.63, off: 3.00 },
      "7-Manager":               { on: 26.32, off: 6.00 },
      "8-Associate Manager":     { on: 0,     off: 11.15 },
      "9-Team Lead/Consultant":  { on: 0,     off: 16.00 },
      "10-Senior Analyst":       { on: 0,     off: 23.00 },
      "11-Analyst":              { on: 0,     off: 20.00 },
    },
  },
  MT: {
    label: "Mid Touch",
    onPct: 18, offPct: 82,
    blendedLCR: 46.91, costToServe: 60.99,
    levels: {
      "Leadership":    { on: 9,  off: 0.85 },
      "5-Associate Director":    { on: 0,  off: 0    },
      "6-Senior Manager":        { on: 45, off: 3.00 },
      "7-Manager":               { on: 45, off: 6.00 },
      "8-Associate Manager":     { on: 0,  off: 11.15 },
      "9-Team Lead/Consultant":  { on: 0,  off: 16.00 },
      "10-Senior Analyst":       { on: 0,  off: 23.00 },
      "11-Analyst":              { on: 0,  off: 20.00 },
    },
  },
  HT: {
    label: "High Touch",
    onPct: 25, offPct: 75,
    blendedLCR: 54.34, costToServe: 70.64,
    levels: {
      "Leadership":    { on: 12, off: 0.85 },
      "5-Associate Director":    { on: 0,  off: 0    },
      "6-Senior Manager":        { on: 29, off: 3.00 },
      "7-Manager":               { on: 29, off: 6.00 },
      "8-Associate Manager":     { on: 29, off: 11.15 },
      "9-Team Lead/Consultant":  { on: 0,  off: 16.00 },
      "10-Senior Analyst":       { on: 0,  off: 23.00 },
      "11-Analyst":              { on: 0,  off: 20.00 },
    },
  },
};

function gapColor(gap) {
  const abs = Math.abs(gap);
  if (abs <= 3)  return "var(--color-text-success)";
  if (abs <= 8)  return "#B45309";
  return "var(--color-text-danger)";
}
function gapBg(gap) {
  const abs = Math.abs(gap);
  if (abs <= 3)  return "var(--color-background-success)";
  if (abs <= 8)  return "#FFFBEB";
  return "var(--color-background-danger)";
}
function gapIcon(gap) {
  const abs = Math.abs(gap);
  if (abs <= 3) return "ti-circle-check";
  if (abs <= 8) return "ti-alert-triangle";
  return "ti-circle-x";
}

function locSplit(l, DAYS) {
  const total    = l.totalDays ?? (l.people * DAYS);
  const usCount  = l.us    ?? 0;
  const offCount = (l.india ?? 0) + (l.ar ?? 0);
  const locTotal = usCount + offCount;
  if (locTotal === 0) return { usDays: 0, offDays: 0 };
  return { usDays: total * (usCount / locTotal), offDays: total * (offCount / locTotal) };
}

function computeDerivedLCR(staffing) {
  const DAYS = staffing.daysPerPerson ?? 320;
  let onCost = 0, onDays = 0, offCost = 0, offDays = 0;
  for (const l of (staffing.levels ?? [])) {
    const base   = l.bill ?? 0;
    const onBill  = l.billOn  ?? base;
    const offBill = l.billOff ?? base;
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
  return { onLCR, offLCR, blended };
}

function isOnshore(loc) {
  const u = (loc ?? "").toUpperCase();
  return u === "USA" || u === "US" || u.startsWith("UNITED STATES") || u === "ONSHORE";
}

function computeCosts(detail) {
  if (!detail?.length) return null;
  let onCost = 0, offCost = 0, hasData = false;
  for (const r of detail) {
    if (r.billCode == null || !r.totalDays) continue;
    hasData = true;
    const hrs = isOnshore(r.location) ? 8 : 9;
    const cost = r.billCode * r.totalDays * hrs;
    if (isOnshore(r.location)) onCost += cost; else offCost += cost;
  }
  return hasData ? { onCost, offCost, totalCost: onCost + offCost } : null;
}

function ReinventSection({ staffing }) {
  const [touch, setTouch] = useState("MT");

  const guide = REINVENT[touch];

  const onCount  = staffing.us ?? 0;
  const offCount = (staffing.india ?? 0) + (staffing.argentina ?? 0);
  const total    = onCount + offCount;

  const actualOnPct  = total > 0 ? onCount  / total * 100 : 0;
  const actualOffPct = total > 0 ? offCount / total * 100 : 0;

  const onLevels  = staffing.levels.filter(l => (l.us ?? 0) > 0);
  const offLevels = staffing.levels.filter(l => ((l.india ?? 0) + (l.ar ?? 0)) > 0);
  const levelOnPct  = l => onCount  > 0 ? (l.us ?? 0) / onCount  * 100 : 0;
  const levelOffPct = l => offCount > 0 ? ((l.india ?? 0) + (l.ar ?? 0)) / offCount * 100 : 0;
  const allBands = Object.keys(guide.levels);

  const { onLCR: parsedOnLCR, offLCR: parsedOffLCR, blended: actualBlendedLCR } = computeDerivedLCR(staffing);

  const locGap = actualOnPct - guide.onPct;

  const targetOnCount  = Math.round(total * guide.onPct  / 100);
  const targetOffCount = Math.round(total * guide.offPct / 100);

  const normOnPct  = l => targetOnCount  > 0 ? (l.us ?? 0) / targetOnCount  * 100 : 0;
  const normOffPct = l => targetOffCount > 0 ? ((l.india ?? 0) + (l.ar ?? 0)) / targetOffCount * 100 : 0;

  const GapBadge = ({ gap }) => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"1px 6px", borderRadius:4, background:gapBg(gap), color:gapColor(gap), fontWeight:500 }}>
      <i className={`ti ${gapIcon(gap)}`} style={{ fontSize:11 }} />
      {gap > 0 ? "+" : ""}{gap.toFixed(1)}pp
    </span>
  );

  const LevelTable = ({ title, color, levels, actualPctFn, normPctFn, guideKey }) => (
    <div style={{ ...s.card, overflow:"hidden", padding:0 }}>
      <div style={{ padding:"9px 14px", borderBottom:"1px solid #E0E0E0", fontSize:12, fontWeight:700, letterSpacing:0.4, textTransform:"uppercase", color }}>
        {title}
      </div>
      <table style={s.tbl}>
        <thead>
          <tr>
            {["Level band","Actual %","Normalised %","Target %","Gap"].map((h,i) => (
              <th key={i} style={{ ...s.th, ...(i>=1?s.thR:{}), fontSize:12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allBands.map(band => {
            const lvl       = levels.find(l => l.band === band);
            const actualPct = lvl ? actualPctFn(lvl) : 0;
            const normPct   = lvl ? normPctFn(lvl)   : 0;
            const targetPct = guide.levels[band]?.[guideKey] ?? 0;
            if (targetPct === 0 && actualPct < 0.5) return null;
            const gap = normPct - targetPct;
            return (
              <tr key={band}>
                <td style={{ ...s.td, fontSize:13 }}>
                  <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:LEVEL_COL[band]||TEAL, marginRight:8, verticalAlign:1 }} />
                  {band}
                </td>
                <td style={{ ...s.td, ...s.tdR, fontSize:13, color:"#888888" }}>{actualPct.toFixed(1)}%</td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:600, fontSize:13 }}>{normPct.toFixed(1)}%</td>
                <td style={{ ...s.td, ...s.tdR, color:"#444444", fontSize:13 }}>{targetPct.toFixed(1)}%</td>
                <td style={{ ...s.td, ...s.tdR, fontSize:13 }}>
                  <GapBadge gap={gap} />
                </td>
              </tr>
            );
          })}
          <tr style={{ background:"#F5F5F5" }}>
            <td colSpan={5} style={{ ...s.td, fontSize:12, color:"#888888", fontStyle:"italic", padding:"8px 12px" }}>
              Normalised % = actual headcount ÷ target pool ({guideKey === "on" ? targetOnCount : targetOffCount} people at {guideKey === "on" ? guide.onPct : guide.offPct}% of {total})
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const EconResult = ({ label, actual, target, unit="$" }) => {
    if (actual === null || actual === 0) return null;
    const gap = actual - target;
    const gapPct = gap / target * 100;
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 0", borderBottom:"1px solid #EBEBEB" }}>
        <span style={{ fontSize:13, color:"#444444" }}>{label}</span>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:18, fontWeight:700 }}>{unit}{actual.toFixed(2)}</span>
          <span style={{ fontSize:12, color:"#888888" }}>target {unit}{target.toFixed(2)}</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px",
            borderRadius:4, background:gapBg(gapPct), color:gapColor(gapPct), fontWeight:500, fontSize:12 }}>
            <i className={`ti ${gapIcon(gapPct)}`} style={{ fontSize:12 }} />
            {gap > 0 ? "+" : ""}{unit}{Math.abs(gap).toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <span style={{ fontSize:13, color:"#444444" }}>Reinvent model:</span>
        <div style={{ display:"flex", gap:4 }}>
          {Object.entries(REINVENT).map(([key, g]) => (
            <button key={key} onClick={() => setTouch(key)}
              style={{ padding:"6px 14px", fontSize:13, borderRadius:6, cursor:"pointer", fontWeight:touch===key?600:400,
                background: touch===key ? TEAL : "#F5F5F5",
                color: touch===key ? "white" : "#444444",
                border: touch===key ? "none" : "1px solid #E0E0E0" }}>
              {g.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize:12, color:"#888888", marginLeft:4 }}>
          Gap ≤ 3pp <i className="ti ti-circle-check" style={{ color:"var(--color-text-success)", fontSize:12 }} /> · 3–8pp <i className="ti ti-alert-triangle" style={{ color:"#B45309", fontSize:12 }} /> · &gt;8pp <i className="ti ti-circle-x" style={{ color:"var(--color-text-danger)", fontSize:12 }} />
        </span>
      </div>

      <div style={{ ...s.card, padding:"12px 16px" }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.5, textTransform:"uppercase", color:"var(--color-text-secondary)", marginBottom:10 }}>Location mix</div>
        <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr 1fr 1fr", gap:10, marginBottom:12, alignItems:"center" }}>
          <div style={{ background:"var(--color-background-secondary)", borderRadius:6, padding:"8px 12px", gridRow:"1", textAlign:"center" }}>
            <div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:2 }}>Total</div>
            <div style={{ fontSize:16, fontWeight:700 }}>{total}</div>
          </div>
          {[
            { label:"Onshore actual",  count:onCount,        pct:actualOnPct,  color:US_COL,  sub:"people" },
            { label:"Offshore actual", count:offCount,       pct:actualOffPct, color:OFF_COL, sub:"people" },
            { label:"Onshore target",  count:targetOnCount,  pct:guide.onPct,  color:US_COL,  sub:`at ${guide.onPct}%`, faded:true },
            { label:"Offshore target", count:targetOffCount, pct:guide.offPct, color:OFF_COL, sub:`at ${guide.offPct}%`, faded:true },
          ].map(({label, count, pct: pctVal, color, sub, faded}) => (
            <div key={label} style={{ background: "var(--color-background-secondary)", borderRadius:6, padding:"8px 12px", border: faded ? "0.5px dashed var(--color-border-tertiary)" : "0.5px solid var(--color-border-tertiary)" }}>
              <div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginBottom:2 }}>{label}</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:16, fontWeight:700, color: faded ? "var(--color-text-secondary)" : color }}>{pctVal.toFixed(0)}%</span>
                <span style={{ fontSize:12, color:"var(--color-text-secondary)", fontWeight:500 }}>{count}</span>
                <span style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
          <span style={{ color:"var(--color-text-secondary)" }}>Onshore gap:</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:4, background:gapBg(locGap), color:gapColor(locGap), fontWeight:500 }}>
            <i className={`ti ${gapIcon(locGap)}`} style={{ fontSize:12 }} />
            {locGap > 0 ? "+" : ""}{locGap.toFixed(1)}pp vs {guide.label} target ({guide.onPct}% onshore)
          </span>
          <span style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>— level mix below uses target pool ({targetOnCount} on · {targetOffCount} off) as denominator</span>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <LevelTable title="Onshore (US) — level mix" color={US_COL}
          levels={onLevels} actualPctFn={levelOnPct} normPctFn={normOnPct} guideKey="on" />
        <LevelTable title="Offshore (India + AR) — level mix" color={OFF_COL}
          levels={offLevels} actualPctFn={levelOffPct} normPctFn={normOffPct} guideKey="off" />
      </div>

      <div style={{ ...s.card, padding:14 }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:0.5, textTransform:"uppercase", color:"var(--color-text-secondary)", marginBottom:4 }}>Level mix — normalised vs target</div>
        <div style={{ fontSize:11, color:"var(--color-text-tertiary)", marginBottom:10 }}>
          Solid bars use target pool size as denominator ({targetOnCount} on · {targetOffCount} off), removing location-mix distortion
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={allBands.map(band => {
              const onLvl  = onLevels.find(l => l.band === band);
              const offLvl = offLevels.find(l => l.band === band);
              return {
                band: band.replace(/^\d+-/, ""),
                onNorm:    onLvl  ? +normOnPct(onLvl).toFixed(1)   : 0,
                onTarget:  guide.levels[band]?.on  ?? 0,
                offNorm:   offLvl ? +normOffPct(offLvl).toFixed(1)  : 0,
                offTarget: guide.levels[band]?.off ?? 0,
              };
            })}
            margin={{ top:4, right:12, left:0, bottom:40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
            <XAxis dataKey="band" tick={{ fontSize:10, fill:"var(--color-text-tertiary)" }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize:10, fill:"var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v, name) => [`${v}%`, name]} contentStyle={{ fontSize:11, border:"0.5px solid var(--color-border-tertiary)", borderRadius:6 }} />
            <Legend wrapperStyle={{ fontSize:11 }} />
            <Bar dataKey="onNorm"    name="On normalised"  fill={US_COL}  barSize={8} radius={[2,2,0,0]} />
            <Bar dataKey="onTarget"  name="On target"      fill={US_COL}  barSize={8} radius={[2,2,0,0]} fillOpacity={0.35} />
            <Bar dataKey="offNorm"   name="Off normalised" fill={OFF_COL} barSize={8} radius={[2,2,0,0]} />
            <Bar dataKey="offTarget" name="Off target"     fill={OFF_COL} barSize={8} radius={[2,2,0,0]} fillOpacity={0.35} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...s.card, padding:"16px 20px" }}>
        <div style={{ fontSize:13, fontWeight:700, letterSpacing:0.4, textTransform:"uppercase",
          color:"#444444", marginBottom:16, paddingBottom:10, borderBottom:"1px solid #EBEBEB" }}>
          Economics
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
          {[
            { label:"Onshore blended LCR", value:parsedOnLCR, sub:"derived from level mix" },
            { label:"Offshore blended LCR", value:parsedOffLCR, sub:"derived from level mix" },
            { label:"Overall blended LCR",  value:actualBlendedLCR, sub:"weighted by staffed days", accent:true },
          ].map(k => (
            <div key={k.label} style={{ background:"#F5F5F5", borderRadius:8, padding:"12px 16px",
              border: k.accent ? "1px solid #D9B3FF" : "1px solid #E0E0E0" }}>
              <div style={{ fontSize:12, color:"#888888", marginBottom:6, textTransform:"uppercase", letterSpacing:0.4 }}>
                {k.label}
              </div>
              <div style={{ fontSize:22, fontWeight:700, color: k.accent ? "#A100FF" : "#000000" }}>
                ${k.value.toFixed(2)}<span style={{ fontSize:13, fontWeight:400, color:"#888888" }}>/hr</span>
              </div>
              <div style={{ fontSize:12, color:"#888888", marginTop:4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ background:"#F5F5F5", borderRadius:6, padding:"12px 16px",
          fontFamily:"var(--font-mono)", fontSize:12, lineHeight:2.0, marginBottom:16,
          border:"1px solid #E0E0E0" }}>
          <div style={{ color:"#888888" }}>Blended LCR = (onshore% × onshore LCR) + (offshore% × offshore LCR)</div>
          <div>= ({actualOnPct.toFixed(1)}% × ${parsedOnLCR.toFixed(2)}) + ({actualOffPct.toFixed(1)}% × ${parsedOffLCR.toFixed(2)})</div>
          <div>= ${(actualOnPct/100*parsedOnLCR).toFixed(2)} + ${(actualOffPct/100*parsedOffLCR).toFixed(2)}
          </div>
          <div style={{ borderTop:"1px solid #E0E0E0", marginTop:6, paddingTop:6, fontWeight:700 }}>
            = ${actualBlendedLCR.toFixed(2)}/hr
          </div>
        </div>

        <EconResult label="Blended LCR ($/hr)" actual={actualBlendedLCR} target={guide.blendedLCR} />
      </div>
    </div>
  );
}

function synthesiseLevels(entity, allLevels, totUs, totIndia, totAr, DAYS) {
  const frOn  = totUs    > 0 ? (entity.us    ?? 0) / totUs    : 0;
  const frOff = totIndia > 0 ? (entity.india ?? 0) / totIndia : 0;
  const frAr  = totAr    > 0 ? (entity.ar    ?? 0) / totAr    : 0;
  return allLevels.map(l => {
    const us     = Math.round((l.us    ?? 0) * frOn);
    const india  = Math.round((l.india ?? 0) * frOff);
    const ar     = Math.round((l.ar    ?? 0) * frAr);
    const people = us + india + ar;
    if (people === 0) return null;
    const totalDays = l.people > 0
      ? Math.round((l.totalDays ?? l.people * DAYS) * people / l.people)
      : people * DAYS;
    return { band: l.band, people, us, india, ar, totalDays };
  }).filter(Boolean);
}

const sectionHdrStyle = {
  fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase",
  color: "var(--color-text-secondary)", padding: "6px 12px 4px",
  borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 4,
};

const dot = (color) => ({
  display:"inline-block", width:8, height:8, borderRadius:"50%",
  background:color, marginRight:4, verticalAlign:1,
});

const MONTH_LABELS = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M13","M14","M15","M16"];
const LOC_COL = { USA: US_COL, India: OFF_COL, Argentina: "#B45309" };

function PersonDetailView({ entityType, entityName, levelBand, liveDetail, onBack, onBackToLevel }) {
  const rows = (liveDetail?.length > 0 ? liveDetail : STAFFING_DETAIL).filter(r => {
    const matchEntity = entityType === "group"
      ? r.group === entityName
      : r.pod   === entityName;
    return matchEntity && r.level === levelBand;
  });

  const locColor = loc => {
    for (const [k, v] of Object.entries(LOC_COL)) {
      if (loc.toUpperCase().includes(k.toUpperCase())) return v;
    }
    return "var(--color-text-secondary)";
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--color-text-secondary)" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-text-secondary)", fontSize:12, padding:0, display:"flex", alignItems:"center", gap:3 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:13 }} />
          {entityType === "group" ? "All role groups" : "All pods"}
        </button>
        <span>/</span>
        <button onClick={onBackToLevel} style={{ background:"none", border:"none", cursor:"pointer", color:TEAL, fontSize:12, padding:0 }}>
          {entityName}
        </button>
        <span>/</span>
        <span style={{ color:"var(--color-text-primary)", fontWeight:500 }}>
          <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:LEVEL_COL[levelBand]||TEAL, marginRight:5, verticalAlign:1 }} />
          {levelBand}
        </span>
        <span style={{ marginLeft:8, fontSize:11, color:"var(--color-text-tertiary)" }}>— {rows.length} resource{rows.length !== 1 ? "s" : ""}</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ ...s.card, padding:24, textAlign:"center", color:"var(--color-text-tertiary)", fontSize:12 }}>
          No individual rows found for this combination.
        </div>
      ) : (
        <div style={{ ...s.card, padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ ...s.tbl, minWidth:1100 }}>
              <thead>
                <tr>
                  {["Group","Pod","Role / Skill Profile","Location","Enterprise ID","Level",
                    ...MONTH_LABELS,"Total Days"].map((h,i) => (
                    <th key={i} style={{
                      ...s.th,
                      ...(i >= 6 ? s.thR : {}),
                      whiteSpace:"nowrap",
                      fontSize:10,
                      padding:"5px 8px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx} style={{ background: idx%2===1 ? "var(--color-background-secondary)" : undefined }}>
                    <td style={{ ...s.td, fontSize:11, whiteSpace:"nowrap" }}>{r.group}</td>
                    <td style={{ ...s.td, fontSize:11, whiteSpace:"nowrap" }}>{r.pod}</td>
                    <td style={{ ...s.td, fontSize:11 }}>{r.role}</td>
                    <td style={{ ...s.td, fontSize:11, color: locColor(r.location), fontWeight:500, whiteSpace:"nowrap" }}>{r.location}</td>
                    <td style={{ ...s.td, fontSize:11, fontFamily:"var(--font-mono)", color:"var(--color-text-secondary)" }}>
                      {r.eid ?? <span style={{ color:"var(--color-text-tertiary)" }}>TBD</span>}
                    </td>
                    <td style={{ ...s.td, fontSize:11 }}>
                      <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:LEVEL_COL[r.level]||TEAL, marginRight:5, verticalAlign:1 }} />
                      {r.level}
                    </td>
                    {(r.months ?? []).map((m, mi) => (
                      <td key={mi} style={{ ...s.td, ...s.tdR, fontSize:10, padding:"4px 6px",
                        color: m > 0 ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
                        {m > 0 ? (Number.isInteger(m) ? m : m.toFixed(2)) : "—"}
                      </td>
                    ))}
                    <td style={{ ...s.td, ...s.tdR, fontSize:11, fontWeight:600 }}>
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

function DetailLevelView({ detail, totalDays, total, onBack, DAYS, offshore, liveDetail }) {
  const levels = detail.levels;
  const onshoreTotal  = levels.reduce((a, l) => a + (l.us ?? 0), 0);
  const offshoreTotal = levels.reduce((a, l) => a + (l.india ?? 0) + (l.ar ?? 0), 0);
  const groupPeople   = onshoreTotal + offshoreTotal;
  const onshoreLevels  = levels.filter(l => (l.us ?? 0) > 0);
  const offshoreLevels = levels.filter(l => ((l.india ?? 0) + (l.ar ?? 0)) > 0);

  const groupTotalDays = levels.reduce((a, l) => a + (l.totalDays ?? l.people * DAYS), 0);

  const usDays  = l => (l.totalDays ?? l.people * DAYS) * ((l.us ?? 0) / l.people);
  const offDays = l => (l.totalDays ?? l.people * DAYS) * (((l.india ?? 0) + (l.ar ?? 0)) / l.people);

  const [personDetail, setPersonDetail] = useState(null);

  if (personDetail) {
    return (
      <PersonDetailView
        entityType={detail.type}
        entityName={detail.name}
        levelBand={personDetail}
        liveDetail={liveDetail}
        onBack={onBack}
        onBackToLevel={() => setPersonDetail(null)}
      />
    );
  }

  const LevelSection = ({ title, color, rows, sectionPeople, daysFn, peopleKey }) => (
    <div style={s.card}>
      <div style={{ ...sectionHdrStyle, color }}>
        {title} · {sectionPeople} resources
      </div>
      <table style={s.tbl}>
        <thead>
          <tr>
            {["Level band","People",`% within ${peopleKey==="us"?"onshore":"offshore"}`,`% of ${detail.type} days`,""].map((h,i) => (
              <th key={i} style={{ ...s.th, ...(i>=1?s.thR:{}) }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(l => {
            const lPeople = l[peopleKey] ?? (peopleKey === "us" ? (l.us ?? 0) : (l.india ?? 0) + (l.ar ?? 0));
            const lDays   = daysFn(l);
            return (
              <tr key={l.band} onClick={() => setPersonDetail(l.band)}
                style={{ cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.background="var(--color-background-secondary)"}
                onMouseLeave={e => e.currentTarget.style.background=""}>
                <td style={s.td}>
                  <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:LEVEL_COL[l.band]||TEAL, marginRight:8, verticalAlign:1 }} />
                  {l.band}
                </td>
                <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{Math.round(lPeople)}</td>
                <td style={{ ...s.td, ...s.tdR, color:"var(--color-text-secondary)" }}>
                  {sectionPeople > 0 ? Math.round(lPeople / sectionPeople * 100) + "%" : "—"}
                </td>
                <td style={{ ...s.td, ...s.tdR }}>
                  {groupTotalDays > 0 ? (lDays / groupTotalDays * 100).toFixed(1) + "%" : "—"}
                </td>
                <td style={{ ...s.td, ...s.tdR, fontSize:10, color:"var(--color-text-tertiary)" }}>
                  <i className="ti ti-chevron-right" />
                </td>
              </tr>
            );
          })}
          <tr style={{ background:"var(--color-background-secondary)" }}>
            <td style={{ ...s.td, fontWeight:500 }}>Subtotal</td>
            <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{sectionPeople}</td>
            <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>100%</td>
            <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>
              {groupTotalDays > 0 ? (rows.reduce((a,l)=>a+daysFn(l),0)/groupTotalDays*100).toFixed(1)+"%" : "—"}
            </td>
            <td style={s.td} />
          </tr>
        </tbody>
      </table>
    </div>
  );

  const onPct  = groupPeople > 0 ? Math.round(onshoreTotal / groupPeople * 100) : 0;
  const offPct = groupPeople > 0 ? Math.round(offshoreTotal / groupPeople * 100) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div>
        <button
          onClick={onBack}
          style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-text-secondary)", fontSize:12, padding:0, display:"flex", alignItems:"center", gap:4 }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize:13 }} />
          {detail.type === "group" ? "All role groups" : "All pods"}
        </button>
        <div style={{ fontSize:15, fontWeight:600, marginTop:4 }}>{detail.name}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        <div style={{ ...s.card, padding:"10px 14px" }}>
          <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:2 }}>Total resources</div>
          <div style={{ fontSize:20, fontWeight:700 }}>{groupPeople}</div>
          <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{onshoreTotal} US · {offshoreTotal} offshore</div>
        </div>
        <div style={{ ...s.card, padding:"10px 14px" }}>
          <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:2 }}>Onshore</div>
          <div style={{ fontSize:20, fontWeight:700, color:US_COL }}>{onPct}%</div>
          <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{onshoreTotal} US resources</div>
        </div>
        <div style={{ ...s.card, padding:"10px 14px" }}>
          <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:2 }}>Offshore</div>
          <div style={{ fontSize:20, fontWeight:700, color:OFF_COL }}>{offPct}%</div>
          <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{offshoreTotal} offshore resources</div>
        </div>
        <div style={{ ...s.card, padding:"10px 14px" }}>
          <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:2 }}>Staffed days</div>
          <div style={{ fontSize:20, fontWeight:700 }}>{fmtN(Math.round(groupTotalDays))}</div>
          <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{groupPeople > 0 ? Math.round(groupTotalDays/groupPeople) : 0}d per person avg</div>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {onshoreLevels.length > 0 && (
          <LevelSection
            title="Onshore (US)" color={US_COL}
            rows={onshoreLevels} sectionPeople={onshoreTotal}
            daysFn={usDays} peopleKey="us"
          />
        )}
        {offshoreLevels.length > 0 && (
          <LevelSection
            title="Offshore (India + AR)" color={OFF_COL}
            rows={offshoreLevels} sectionPeople={offshoreTotal}
            daysFn={offDays} peopleKey="offshore"
          />
        )}
      </div>
    </div>
  );
}

export default function StaffingTab({ staffing, isLive, loading, storedName, storedDate, onStaffingUpload, liveDetail, monthLabels }) {
  const [view, setView]     = useState("home");
  const [dragOver, setDragOver] = useState(false);
  const [detail, setDetail] = useState(null);
  const [margin, setMargin] = useState(23);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const fileInputRef = useRef(null);
  const resizing = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(0);

  const startResize = (e) => {
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = sidebarWidth;
    document.addEventListener("mousemove", onResize);
    document.addEventListener("mouseup", stopResize);
  };
  const onResize = (e) => {
    if (!resizing.current) return;
    const delta = e.clientX - startX.current;
    setSidebarWidth(Math.min(480, Math.max(200, startW.current + delta)));
  };
  const stopResize = () => {
    resizing.current = false;
    document.removeEventListener("mousemove", onResize);
    document.removeEventListener("mouseup", stopResize);
  };

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onStaffingUpload) onStaffingUpload(file);
  }
  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (file && onStaffingUpload) onStaffingUpload(file);
    e.target.value = "";
  }

  const DAYS      = staffing.daysPerPerson ?? 320;
  const total     = staffing.total;
  const named     = staffing.named ?? total;
  const totalDays = staffing.totalDays ?? total * DAYS;
  const offshore  = (staffing.india ?? 0) + (staffing.argentina ?? 0);

  const costs = computeCosts(liveDetail);

  const subTabs = [
    { id:"home",     label:"Home" },
    { id:"groups",   label:"By project" },
    { id:"levels",   label:"By level" },
    { id:"pods",     label:"By pod" },
    { id:"pricing",  label:"Pricing" },
    { id:"reinvent", label:"Reinvent compliance" },
    { id:"help",     label:"Help" },
  ];

  // Upload strip — always shown
  const UploadStrip = (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", borderRadius:8, cursor:"pointer", border:`0.5px dashed ${dragOver ? TEAL : "var(--color-border-tertiary)"}`, background: dragOver ? "var(--color-background-info)" : "var(--color-background-secondary)", fontSize:12, color:"var(--color-text-secondary)", transition:"border-color 0.15s, background 0.15s", flexShrink:0 }}
    >
      <i className="ti ti-file-upload" style={{ fontSize:16, color: TEAL }} />
      <span>
        {loading
          ? "Refreshing resources…"
          : isLive
            ? <>Resources loaded from <strong style={{ color:"var(--color-text-primary)" }}>{storedName}</strong>{storedDate ? ` · ${formatSavedAt(storedDate)}` : ""} — drop a new staffing file here to refresh</>
            : "Drop the Staffing Models file here (or click) to load live resource data — only this tab will refresh"
        }
      </span>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={handleFileInput} />
    </div>
  );

  // Tab bar
  const TabBar = (
    <div style={{ display:"flex", gap:0, background:"#FFFFFF", borderBottom:"1px solid #E8E8E8", padding:"0 4px", flexShrink:0 }}>
      {subTabs.map(t => (
        <button key={t.id} onClick={() => { setView(t.id); setDetail(null); }} style={{
          padding:"12px 16px", fontSize:12, border:"none", background:"none",
          borderBottom: view===t.id ? "2px solid #A100FF" : "2px solid transparent",
          color: view===t.id ? "#A100FF" : "#777777",
          fontWeight: view===t.id ? 700 : 500,
          cursor:"pointer", letterSpacing:0.1, transition:"color 0.15s, border-color 0.15s",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );

  // Content for non-home views
  const NonHomeContent = detail !== null ? (
    <DetailLevelView
      detail={detail}
      totalDays={totalDays}
      total={total}
      onBack={() => setDetail(null)}
      DAYS={DAYS}
      offshore={offshore}
      liveDetail={liveDetail}
    />
  ) : (
    <>
      {view === "groups" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 220px", gap:14, alignItems:"start" }}>
          <div style={s.card}>
            <table style={s.tbl}>
              <thead>
                <tr>
                  {["Role group","People","US","India","Staffed days","% of total","Onshore %"].map((h,i) => (
                    <th key={i} style={{ ...s.th, ...(i>=1?s.thR:{}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffing.groups.map(g => {
                  const gDays = g.totalDays ?? g.people * DAYS;
                  const realLevels = staffing.byGroupLevel?.[g.name];
                  const levels = realLevels?.length > 0
                    ? realLevels
                    : synthesiseLevels(g, staffing.levels, staffing.us, staffing.india ?? 0, staffing.argentina ?? 0, DAYS);
                  const hasDetail = levels.length > 0;
                  return (
                    <tr key={g.name}
                      onClick={() => { if (hasDetail) setDetail({ name: g.name, type:"group", levels }); }}
                      style={{ cursor: hasDetail ? "pointer" : "default" }}>
                      <td style={s.td}>
                        <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:GROUP_COL[g.name]||TEAL, marginRight:8, verticalAlign:1 }} />
                        {g.name}
                      </td>
                      <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{g.people}</td>
                      <td style={{ ...s.td, ...s.tdR }}>{g.us}</td>
                      <td style={{ ...s.td, ...s.tdR }}>{g.india}</td>
                      <td style={{ ...s.td, ...s.tdR }}>{fmtN(Math.round(gDays))}</td>
                      <td style={{ ...s.td, ...s.tdR, color:"var(--color-text-secondary)" }}>{pct(gDays, totalDays)}</td>
                      <td style={{ ...s.td, ...s.tdR, color: g.us/g.people>0.5?"var(--color-text-success)":"var(--color-text-secondary)" }}>
                        {Math.round(g.us/g.people*100)}%
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background:"var(--color-background-secondary)" }}>
                  <td style={{ ...s.td, fontWeight:500 }}>Total</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{staffing.groups.reduce((a,g)=>a+g.people,0)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{staffing.groups.reduce((a,g)=>a+g.us,0)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{staffing.groups.reduce((a,g)=>a+(g.india??0),0)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{fmtN(Math.round(totalDays))}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>100%</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{Math.round(staffing.us/total*100)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ ...s.card, padding:14 }}>
            <div style={s.sectionHdr}>Group size ranking</div>
            {staffing.groups.map(g => (
              <BarRow key={g.name} label={g.name.slice(0,22)} value={g.people} max={staffing.groups[0].people} color={GROUP_COL[g.name]||TEAL} right={`${g.people}p`} sub={pct(g.people,total)} />
            ))}
          </div>
        </div>
      )}

      {view === "levels" && (() => {
        const onshoreTotal  = staffing.us;
        const offshoreTotal = offshore;
        const onshoreLevels  = staffing.levels.filter(l => (l.us ?? 0) > 0);
        const offshoreLevels = staffing.levels.filter(l => ((l.india ?? 0) + (l.ar ?? 0)) > 0);

        const LevelSection = ({ title, color, rows, sectionPeople, daysFn, peopleKey }) => (
          <div style={s.card}>
            <div style={{ ...sectionHdrStyle, color: color }}>
              {title} · {sectionPeople} resources
            </div>
            <table style={s.tbl}>
              <thead>
                <tr>
                  {["Level band","People",`% within ${peopleKey==="us"?"onshore":"offshore"}`,"Overall % of days"].map((h,i) => (
                    <th key={i} style={{ ...s.th, ...(i>=1?s.thR:{}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(l => {
                  const lPeople = l[peopleKey] ?? (peopleKey === "us" ? (l.us ?? 0) : (l.india ?? 0) + (l.ar ?? 0));
                  const lDays   = daysFn(l);
                  return (
                    <tr key={l.band}>
                      <td style={s.td}>
                        <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:LEVEL_COL[l.band]||TEAL, marginRight:8, verticalAlign:1 }} />
                        {l.band}
                      </td>
                      <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{Math.round(lPeople)}</td>
                      <td style={{ ...s.td, ...s.tdR, color:"var(--color-text-secondary)" }}>
                        {sectionPeople > 0 ? Math.round(lPeople / sectionPeople * 100) + "%" : "—"}
                      </td>
                      <td style={{ ...s.td, ...s.tdR }}>
                        {totalDays > 0 ? (lDays / totalDays * 100).toFixed(1) + "%" : "—"}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background:"var(--color-background-secondary)" }}>
                  <td style={{ ...s.td, fontWeight:500 }}>Subtotal</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{sectionPeople}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>100%</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>
                    {totalDays > 0 ? (rows.reduce((a,l)=>a+daysFn(l),0)/totalDays*100).toFixed(1)+"%" : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );

        const usDays  = l => (l.totalDays ?? l.people * DAYS) * ((l.us ?? 0) / l.people);
        const offDays = l => (l.totalDays ?? l.people * DAYS) * (((l.india ?? 0) + (l.ar ?? 0)) / l.people);

        return (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <LevelSection
                title="Onshore (US)" color={US_COL}
                rows={onshoreLevels} sectionPeople={onshoreTotal}
                daysFn={usDays} peopleKey="us"
              />
              <LevelSection
                title="Offshore (India + AR)" color={OFF_COL}
                rows={offshoreLevels} sectionPeople={offshoreTotal}
                daysFn={offDays} peopleKey="offshore"
              />
            </div>
            <div style={{ ...s.card, padding:"8px 12px", display:"flex", gap:20, fontSize:11, color:"var(--color-text-secondary)" }}>
              <span><span style={dot(US_COL)} />US (onshore)</span>
              <span><span style={dot(OFF_COL)} />India (offshore)</span>
              <span><span style={dot("#B45309")} />Argentina (offshore)</span>
              <span style={{ marginLeft:"auto" }}>
                Overall % = share of total programme staffed days ({fmtN(Math.round(totalDays))}d)
              </span>
            </div>
          </div>
        );
      })()}

      {view === "pods" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 220px", gap:14, alignItems:"start" }}>
          <div style={s.card}>
            <table style={s.tbl}>
              <thead>
                <tr>
                  {["Pod name","People","US","India","Staffed days","% of total","Onshore %"].map((h,i) => (
                    <th key={i} style={{ ...s.th, ...(i>=1?s.thR:{}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffing.pods.map(p => {
                  const pDays = p.totalDays ?? p.people * DAYS;
                  const realLevels = staffing.byPodLevel?.[p.name];
                  const levels = realLevels?.length > 0
                    ? realLevels
                    : synthesiseLevels(p, staffing.levels, staffing.us, staffing.india ?? 0, staffing.argentina ?? 0, DAYS);
                  const hasDetail = levels.length > 0;
                  return (
                    <tr key={p.name}
                      onClick={() => { if (hasDetail) setDetail({ name: p.name, type:"pod", levels }); }}
                      style={{ cursor: hasDetail ? "pointer" : "default" }}>
                      <td style={s.td}>
                        <span style={{ fontSize:10, background:"var(--color-background-secondary)", color:"var(--color-text-secondary)", padding:"1px 6px", borderRadius:4, marginRight:6 }}>{p.group.slice(0,12)}</span>
                        {p.name}
                      </td>
                      <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{p.people}</td>
                      <td style={{ ...s.td, ...s.tdR }}>{p.us}</td>
                      <td style={{ ...s.td, ...s.tdR }}>{p.india}</td>
                      <td style={{ ...s.td, ...s.tdR }}>{fmtN(Math.round(pDays))}</td>
                      <td style={{ ...s.td, ...s.tdR, color:"var(--color-text-secondary)" }}>{pct(pDays, totalDays)}</td>
                      <td style={{ ...s.td, ...s.tdR, color: p.us/p.people>0.5?"var(--color-text-success)":"var(--color-text-secondary)" }}>
                        {Math.round(p.us/p.people*100)}%
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background:"var(--color-background-secondary)" }}>
                  <td style={{ ...s.td, fontWeight:500 }}>Total</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{staffing.pods.reduce((a,p)=>a+p.people,0)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{staffing.pods.reduce((a,p)=>a+p.us,0)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{staffing.pods.reduce((a,p)=>a+p.india,0)}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{fmtN(Math.round(totalDays))}</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>—</td>
                  <td style={{ ...s.td, ...s.tdR, fontWeight:500 }}>{Math.round(staffing.us/total*100)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ ...s.card, padding:14 }}>
            <div style={s.sectionHdr}>Pod size ranking</div>
            {staffing.pods.slice(0,10).map(p => (
              <BarRow key={p.name} label={p.name.slice(0,28)} value={p.people} max={staffing.pods[0].people} color={GROUP_COL[p.group]||TEAL} right={`${p.people}p`} sub={pct(p.people,total)} />
            ))}
          </div>
        </div>
      )}

      {view === "pricing" && (
        <PricingTab staffing={staffing} liveDetail={liveDetail} margin={margin} setMargin={setMargin} />
      )}

      {view === "reinvent" && (
        <ReinventSection staffing={staffing} />
      )}

      {view === "help" && (
        <HelpTab />
      )}
    </>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {UploadStrip}

      {view === "home" && detail === null ? (
        <div style={{ display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 180px)", minHeight:500 }}>
          {/* Purple sidebar */}
          <div style={{ width: sidebarWidth, minWidth:200, maxWidth:480, flexShrink:0, overflow:"hidden" }}>
            <HomeSidebar staffing={staffing} costs={costs} margin={margin} setMargin={setMargin} />
          </div>
          {/* Drag handle */}
          <div onMouseDown={startResize} style={{ width:4, cursor:"col-resize", background:"rgba(161,0,255,0.15)", flexShrink:0 }} />
          {/* Right content */}
          <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>
            {TabBar}
            <HomeTab staffing={staffing} liveDetail={liveDetail} monthLabels={monthLabels} />
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
          {TabBar}
          <div style={{ flex:1, overflow:"auto", padding:"20px 24px" }}>
            {NonHomeContent}
          </div>
        </div>
      )}
    </div>
  );
}
