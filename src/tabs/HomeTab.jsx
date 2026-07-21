import { fmtN } from "../styles.js";
import { LEVEL_ORDER } from "../parsers/parseStaffingModel.js";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area,
} from "recharts";

// Dark theme tokens
const BG_CARD     = "#111827";
const BG_CARD2    = "#1a2234";
const BORDER      = "#1E293B";
const TEXT_H      = "#F8FAFC";
const TEXT_B      = "#94A3B8";
const TEXT_M      = "rgba(255,255,255,0.35)";

const US_COL      = "#60A5FA";
const OFF_COL     = "#FB923C";
const AR_COL      = "#C084FC";
const NAMED_COL   = "#A100FF";
const TBD_COL     = "#334155";
const POD_COL     = "#8B5CF6";
const SUCCESS_COL = "#10B981";
const WARNING_COL = "#F59E0B";

const CARD         = { background:BG_CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:16 };
const SECTION_LABEL = { fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:TEXT_M, marginBottom:12 };
const CHART_LABEL   = { fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:TEXT_M, marginBottom:10 };
const TT_STYLE      = { fontSize:11, background:BG_CARD2, border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT_H };

function isOnshore(loc) {
  const u = (loc ?? "").toUpperCase();
  return u === "USA" || u === "US" || u.startsWith("UNITED STATES") || u === "ONSHORE";
}

function fmtCost(v) {
  if (v == null || isNaN(v) || v === 0) return "—";
  if (v >= 1e9) return "$" + (v/1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  return "$" + (v / 1e3).toFixed(0) + "K";
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

function computeMonthlyRamp(detail, staffing, monthLabels) {
  const labels = monthLabels?.length > 0 ? monthLabels : Array.from({ length: 16 }, (_, i) => `M${i + 1}`);
  if (detail?.length > 0) {
    return labels.map((label, i) => {
      let on = 0, off = 0;
      for (const r of detail) {
        const fte = r.months?.[i] ?? 0;
        if (isOnshore(r.location)) on += fte;
        else                       off += fte;
      }
      return { label, on: +on.toFixed(1), off: +off.toFixed(1) };
    });
  }
  const us  = staffing.us ?? 0;
  const off = (staffing.india ?? 0) + (staffing.argentina ?? 0);
  return labels.map(label => ({ label, on: us, off }));
}

function computeGroupCosts(detail) {
  const map = {};
  for (const r of detail) {
    if (r.billCode == null || !r.totalDays) continue;
    const hrs = isOnshore(r.location) ? 8 : 9;
    const cost = r.billCode * r.totalDays * hrs;
    map[r.group] = (map[r.group] || 0) + cost;
  }
  return Object.entries(map)
    .map(([name, cost]) => ({
      name: name && name.length > 22 ? name.slice(0, 22) + "…" : (name || "Unknown"),
      cost: Math.round(cost),
    }))
    .sort((a, b) => b.cost - a.cost);
}

function computePodCosts(detail) {
  const map = {};
  for (const r of detail) {
    if (r.billCode == null || !r.totalDays) continue;
    const hrs = isOnshore(r.location) ? 8 : 9;
    const cost = r.billCode * r.totalDays * hrs;
    const pod = r.pod || "Unknown";
    map[pod] = (map[pod] || 0) + cost;
  }
  return Object.entries(map)
    .map(([name, cost]) => ({
      name: name.length > 22 ? name.slice(0, 22) + "…" : name,
      cost: Math.round(cost),
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);
}

function computeCostRamp(detail, monthLabels) {
  const n = monthLabels?.length || 16;
  const result = Array.from({ length: n }, (_, i) => ({
    label: monthLabels?.[i] ?? `M${i + 1}`,
    on: 0,
    off: 0,
  }));
  for (const r of detail) {
    if (r.billCode == null) continue;
    const hrs = isOnshore(r.location) ? 8 : 9;
    (r.months ?? []).forEach((fte, i) => {
      if (i < n && fte > 0) {
        const cost = fte * r.billCode * hrs * 20;
        if (isOnshore(r.location)) result[i].on  += cost;
        else                        result[i].off += cost;
      }
    });
  }
  return result.map(r => ({ ...r, on: +(r.on / 1e6).toFixed(3), off: +(r.off / 1e6).toFixed(3) }));
}

/* ── KPI Ribbon ───────────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, valueColor }) {
  return (
    <div style={{ background:BG_CARD, border:`1px solid ${BORDER}`, borderRadius:12, padding:"14px 16px" }}>
      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.8, color:TEXT_M, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, letterSpacing:-1, color: valueColor || TEXT_H, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:TEXT_B, marginTop:5 }}>{sub}</div>}
    </div>
  );
}

/* ── Named / TBD ring ─────────────────────────────────────────────────────── */
function NamedTBDRing({ staffing }) {
  const named = staffing.named ?? 0;
  const total = staffing.total ?? 0;
  const tbd   = Math.max(0, total - named);
  const pct   = total > 0 ? Math.round(named / total * 100) : 0;
  const data  = [
    { name: "Named", value: named, color: NAMED_COL },
    { name: "TBD",   value: tbd,   color: TBD_COL   },
  ].filter(d => d.value > 0);

  return (
    <div style={CARD}>
      <div style={CHART_LABEL}>Named vs TBD</div>
      <div style={{ position:"relative" }}>
        <ResponsiveContainer width="100%" height={130}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={58}
              paddingAngle={2} dataKey="value" strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v, name) => [fmtN(v), name]} contentStyle={TT_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)",
          textAlign:"center", pointerEvents:"none",
        }}>
          <div style={{ fontSize:18, fontWeight:800, color: NAMED_COL }}>{pct}%</div>
          <div style={{ fontSize:9, color:TEXT_M, marginTop:1 }}>named</div>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:6 }}>
        {data.map(d => (
          <div key={d.name} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
            <span style={{ color:TEXT_B }}>
              <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:d.color, marginRight:6, verticalAlign:1 }} />
              {d.name}
            </span>
            <span style={{ fontWeight:700, color:TEXT_H }}>{fmtN(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Level mix horizontal bar ─────────────────────────────────────────── */
function LevelMixBar({ staffing }) {
  const levels = staffing.levels ?? {};
  const data = LEVEL_ORDER
    .filter(l => levels[l] && (levels[l].on > 0 || levels[l].off > 0))
    .map(l => ({
      name: l.replace(/^N-/, ""),
      on:  levels[l].on  ?? 0,
      off: levels[l].off ?? 0,
    }));

  if (data.length === 0) return null;

  return (
    <div style={CARD}>
      <div style={CHART_LABEL}>Level mix (headcount)</div>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28 + 30)}>
        <BarChart data={data} layout="vertical" margin={{ top:4, right:20, left:4, bottom:4 }} barSize={10}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
          <XAxis type="number" tick={{ fontSize:9, fill:TEXT_M }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize:9, fill:TEXT_B }} axisLine={false} tickLine={false} width={50} />
          <Tooltip formatter={(v, name) => [fmtN(v) + " FTE", name]} contentStyle={TT_STYLE} />
          <Legend wrapperStyle={{ fontSize:10, paddingTop:4, color:TEXT_B }} />
          <Bar dataKey="on"  name="Onshore"  stackId="a" fill={US_COL}  radius={[0,0,0,0]} />
          <Bar dataKey="off" name="Offshore" stackId="a" fill={OFF_COL} radius={[0,3,3,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Cost by project group ────────────────────────────────────────────── */
function GroupCostBar({ detail }) {
  const data = computeGroupCosts(detail);
  if (data.length === 0) return null;
  const costTick = v => v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : "$" + (v / 1e3).toFixed(0) + "K";
  return (
    <div style={CARD}>
      <div style={CHART_LABEL}>Cost by project group</div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 26 + 30)}>
        <BarChart data={data} layout="vertical" margin={{ top:4, right:20, left:4, bottom:4 }} barSize={10}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
          <XAxis type="number" tick={{ fontSize:9, fill:TEXT_M }} axisLine={false} tickLine={false} tickFormatter={costTick} />
          <YAxis type="category" dataKey="name" tick={{ fontSize:9, fill:TEXT_B }} axisLine={false} tickLine={false} width={110} />
          <Tooltip formatter={v => [fmtCost(v), "Est. cost"]} contentStyle={TT_STYLE} />
          <Bar dataKey="cost" name="Est. cost" fill={US_COL} radius={[0,3,3,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Top 10 pods by cost ──────────────────────────────────────────────── */
function PodCostBar({ detail }) {
  const data = computePodCosts(detail);
  if (data.length === 0) return null;
  const costTick = v => v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : "$" + (v / 1e3).toFixed(0) + "K";
  return (
    <div style={CARD}>
      <div style={CHART_LABEL}>Top 10 pods by cost</div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 26 + 30)}>
        <BarChart data={data} layout="vertical" margin={{ top:4, right:20, left:4, bottom:4 }} barSize={10}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
          <XAxis type="number" tick={{ fontSize:9, fill:TEXT_M }} axisLine={false} tickLine={false} tickFormatter={costTick} />
          <YAxis type="category" dataKey="name" tick={{ fontSize:9, fill:TEXT_B }} axisLine={false} tickLine={false} width={110} />
          <Tooltip formatter={v => [fmtCost(v), "Est. cost"]} contentStyle={TT_STYLE} />
          <Bar dataKey="cost" name="Est. cost" fill={POD_COL} radius={[0,3,3,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Blended LCR by level ─────────────────────────────────────────────── */
function LCRByLevel({ staffing }) {
  const levels = staffing.levels ?? {};
  const data = LEVEL_ORDER
    .filter(l => levels[l] && (levels[l].billOn > 0 || levels[l].billOff > 0))
    .map(l => ({
      name:    l.replace(/^N-/, ""),
      onshore: levels[l].billOn  ?? 0,
      offshore:levels[l].billOff ?? 0,
    }));

  if (data.length === 0) return null;
  const rateTick = v => "$" + v.toFixed(0);

  return (
    <div style={CARD}>
      <div style={CHART_LABEL}>Blended LCR by level</div>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28 + 30)}>
        <BarChart data={data} layout="vertical" margin={{ top:4, right:20, left:4, bottom:4 }} barSize={8}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} horizontal={false} />
          <XAxis type="number" tick={{ fontSize:9, fill:TEXT_M }} axisLine={false} tickLine={false} tickFormatter={rateTick} />
          <YAxis type="category" dataKey="name" tick={{ fontSize:9, fill:TEXT_B }} axisLine={false} tickLine={false} width={50} />
          <Tooltip formatter={(v, name) => ["$" + v.toFixed(2) + "/hr", name]} contentStyle={TT_STYLE} />
          <Legend wrapperStyle={{ fontSize:10, paddingTop:4, color:TEXT_B }} />
          <Bar dataKey="onshore"  name="Onshore LCR"  fill={US_COL}  radius={[0,3,3,0]} />
          <Bar dataKey="offshore" name="Offshore LCR" fill={OFF_COL} radius={[0,3,3,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Monthly cost estimate ────────────────────────────────────────────── */
function MonthlyCostRamp({ detail, monthLabels }) {
  const data = computeCostRamp(detail, monthLabels);
  const mTick = v => "$" + v.toFixed(1) + "M";
  return (
    <div style={CARD}>
      <div style={CHART_LABEL}>Monthly cost estimate (approx.)</div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top:4, right:4, left:-10, bottom:0 }} barSize={data.length > 16 ? 7 : 10}>
          <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize:9, fill:TEXT_M }} axisLine={false} tickLine={false}
            interval={data.length > 12 ? 1 : 0} angle={data.length > 16 ? -35 : 0}
            textAnchor={data.length > 16 ? "end" : "middle"} height={data.length > 16 ? 40 : 20} />
          <YAxis tick={{ fontSize:9, fill:TEXT_M }} axisLine={false} tickLine={false} tickFormatter={mTick} width={52} />
          <Tooltip formatter={(v, name) => ["$" + Number(v).toFixed(2) + "M", name]} contentStyle={TT_STYLE} />
          <Legend wrapperStyle={{ fontSize:10, paddingTop:4, color:TEXT_B }} />
          <Bar dataKey="on"  name="Onshore"  stackId="a" fill={US_COL}  radius={[0,0,0,0]} />
          <Bar dataKey="off" name="Offshore" stackId="a" fill={OFF_COL} radius={[3,3,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */
export default function HomeTab({ staffing, liveDetail, monthLabels }) {
  const us      = staffing.us ?? 0;
  const india   = staffing.india ?? 0;
  const ar      = staffing.argentina ?? 0;
  const total   = staffing.total ?? 0;
  const named   = staffing.named ?? total;
  const tbd     = total - named;
  const namedPct = total > 0 ? Math.round(named / total * 100) : 0;
  const onPct    = total > 0 ? Math.round(us / total * 100) : 0;
  const costs    = computeCosts(liveDetail);

  const donutData = [
    { name:"Onshore (US)", value:us,    color:US_COL  },
    { name:"India",        value:india, color:OFF_COL },
    ar > 0 && { name:"Argentina", value:ar, color:AR_COL },
  ].filter(Boolean);

  const monthlyData = computeMonthlyRamp(liveDetail, staffing, monthLabels);
  const hasDetail   = liveDetail?.length > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, padding:"20px 24px" }}>

      {/* ── KPI Ribbon ──────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        <KpiCard
          label="Total workforce"
          value={total}
          sub={`${named} named · ${tbd} TBD`}
        />
        <KpiCard
          label="Programme cost"
          value={costs ? fmtCost(costs.totalCost) : "—"}
          sub={costs ? `${fmtCost(costs.onCost)} on · ${fmtCost(costs.offCost)} off` : "Upload file to see cost"}
        />
        <KpiCard
          label="Onshore mix"
          value={`${onPct}%`}
          valueColor={US_COL}
          sub={`${us} US resources`}
        />
        <KpiCard
          label="Named resources"
          value={`${namedPct}%`}
          valueColor={SUCCESS_COL}
          sub={`${named} confirmed`}
        />
        <KpiCard
          label="TBD exposure"
          value={tbd}
          valueColor={tbd > 0 ? WARNING_COL : SUCCESS_COL}
          sub="roles unconfirmed"
        />
      </div>

      {/* ── Overview ────────────────────────────────────────────────── */}
      <div>
        <div style={SECTION_LABEL}>Overview</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:16 }}>

          {/* Location mix donut */}
          <div style={CARD}>
            <div style={CHART_LABEL}>Location mix</div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                  paddingAngle={2} dataKey="value" strokeWidth={0}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [fmtN(v), name]} contentStyle={TT_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:6 }}>
              {donutData.map(d => (
                <div key={d.name} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                  <span style={{ color:TEXT_B }}>
                    <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:d.color, marginRight:6, verticalAlign:1 }} />
                    {d.name}
                  </span>
                  <span style={{ fontWeight:700, color:TEXT_H }}>
                    {fmtN(d.value)}{" "}
                    <span style={{ color:TEXT_M, fontWeight:400 }}>
                      ({total > 0 ? Math.round(d.value / total * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Named / TBD ring */}
          <NamedTBDRing staffing={staffing} />

          {/* Level mix horizontal bar */}
          <LevelMixBar staffing={staffing} />

        </div>
      </div>

      {/* ── Headcount ramp ──────────────────────────────────────────── */}
      <div>
        <div style={SECTION_LABEL}>Headcount ramp</div>
        <div style={CARD}>
          <div style={CHART_LABEL}>Monthly headcount ramp (FTE)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top:4, right:4, left:-22, bottom:0 }} barSize={monthlyData.length > 16 ? 7 : 10}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize:9, fill:TEXT_M }} axisLine={false} tickLine={false}
                interval={monthlyData.length > 12 ? 1 : 0} angle={monthlyData.length > 16 ? -35 : 0}
                textAnchor={monthlyData.length > 16 ? "end" : "middle"} height={monthlyData.length > 16 ? 40 : 20} />
              <YAxis tick={{ fontSize:9, fill:TEXT_M }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, name) => [v.toFixed(1) + " FTE", name]} contentStyle={TT_STYLE} />
              <Legend wrapperStyle={{ fontSize:10, paddingTop:4, color:TEXT_B }} />
              <Bar dataKey="on"  name="Onshore"  stackId="a" fill={US_COL}  radius={[0,0,0,0]} />
              <Bar dataKey="off" name="Offshore" stackId="a" fill={OFF_COL} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Cost breakdown (only when liveDetail present) ───────────── */}
      {hasDetail && (
        <div>
          <div style={SECTION_LABEL}>Cost breakdown</div>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <GroupCostBar detail={liveDetail} />
              <PodCostBar   detail={liveDetail} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <LCRByLevel      staffing={staffing} />
              <MonthlyCostRamp detail={liveDetail} monthLabels={monthLabels} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
