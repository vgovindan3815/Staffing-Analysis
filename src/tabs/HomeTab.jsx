import { fmtN } from "../styles.js";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const US_COL  = "#2563EB";   // bright blue — onshore
const OFF_COL = "#F97316";   // orange — offshore India
const AR_COL  = "#8B5CF6";   // purple — Argentina
const PRP_COL = "#A100FF";   // Accenture purple — totals

const MONTH_LABELS = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M13","M14","M15","M16"];

function isOnshore(loc) {
  const u = (loc ?? "").toUpperCase();
  return u === "USA" || u === "US" || u.startsWith("UNITED STATES") || u === "ONSHORE";
}

function computeCostsFromDetail(detail) {
  if (!detail?.length) return null;
  let onCost = 0, offCost = 0, hasData = false;
  for (const r of detail) {
    if (r.billCode == null || !r.totalDays) continue;
    hasData = true;
    const hrs = isOnshore(r.location) ? 8 : 9;
    const cost = r.billCode * r.totalDays * hrs;
    if (isOnshore(r.location)) onCost += cost;
    else                       offCost += cost;
  }
  if (!hasData) return null;
  return { onCost, offCost, totalCost: onCost + offCost };
}

// Compute monthly FTE totals from liveDetail, split onshore/offshore.
function computeMonthlyRamp(detail, staffing) {
  if (detail?.length > 0) {
    return MONTH_LABELS.map((label, i) => {
      let on = 0, off = 0;
      for (const r of detail) {
        const fte = r.months?.[i] ?? 0;
        if (isOnshore(r.location)) on += fte;
        else                       off += fte;
      }
      return { label, on: +on.toFixed(1), off: +off.toFixed(1), total: +(on + off).toFixed(1) };
    });
  }
  // Fallback: distribute total headcount evenly across 16 months using hardcoded split
  const us  = staffing.us ?? 0;
  const off = (staffing.india ?? 0) + (staffing.argentina ?? 0);
  return MONTH_LABELS.map(label => ({
    label, on: us, off, total: us + off,
  }));
}

function fmtCost(v) {
  if (!v || v === 0) return "—";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  return "$" + (v / 1e3).toFixed(0) + "K";
}

function BigMetric({ label, value, sub, accentColor }) {
  return (
    <div style={{
      background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12,
      padding:"24px 24px", position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accentColor }} />
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:"#AAAAAA", marginBottom:10 }}>
        {label}
      </div>
      <div style={{ fontSize:48, fontWeight:800, color:"#0A0A0A", lineHeight:1, letterSpacing:-1.5 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:12, color:"#AAAAAA", marginTop:8 }}>{sub}</div>}
    </div>
  );
}

function CostCard({ label, value, sub, accentColor, large }) {
  return (
    <div style={{
      background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12,
      padding:"22px 24px", position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:accentColor }} />
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:"#AAAAAA", marginBottom:10 }}>
        {label}
      </div>
      <div style={{ fontSize:large ? 40 : 32, fontWeight:800, color:accentColor, lineHeight:1, letterSpacing:-0.5 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:12, color:"#AAAAAA", marginTop:8 }}>{sub}</div>}
    </div>
  );
}

function ChartLabel({ children }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:"#AAAAAA", marginBottom:10 }}>
      {children}
    </div>
  );
}

export default function HomeTab({ staffing, liveDetail, margin, setMargin }) {
  const total    = staffing.total ?? 0;
  const us       = staffing.us ?? 0;
  const india    = staffing.india ?? 0;
  const ar       = staffing.argentina ?? 0;
  const offshore = india + ar;
  const named    = staffing.named ?? total;
  const namedPct = total > 0 ? Math.round(named / total * 100) : 0;
  const onPct    = total > 0 ? Math.round(us / total * 100) : 0;
  const offPct   = 100 - onPct;
  const barWidth = onPct;

  const costs    = computeCostsFromDetail(liveDetail);
  const hasCosts = costs !== null;
  const priceMultiplier = margin < 100 ? 1 / (1 - margin / 100) : 1;

  const monthlyData = computeMonthlyRamp(liveDetail, staffing);

  const donutData = [
    { name:"Onshore (US)", value:us,       color:US_COL  },
    { name:"India",        value:india,     color:OFF_COL },
    ar > 0 && { name:"Argentina", value:ar, color:AR_COL },
  ].filter(Boolean);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── Headcount cards ── */}
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:"#AAAAAA" }}>
        Headcount
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
        <BigMetric label="Total headcount" value={fmtN(total)}    sub={`${onPct}% onshore · ${offPct}% offshore`} accentColor={PRP_COL} />
        <BigMetric label="Onshore (US)"    value={fmtN(us)}       sub={`${onPct}% of total`}                      accentColor={US_COL}  />
        <BigMetric label="Offshore"        value={fmtN(offshore)} sub={india > 0 && ar > 0 ? `${fmtN(india)} India · ${fmtN(ar)} Argentina` : `${offPct}% of total`} accentColor={OFF_COL} />
        <BigMetric label="Named resources" value={fmtN(named)}    sub={`${namedPct}% named · ${fmtN(total - named)} TBD`} accentColor="#888888" />
      </div>

      {/* ── Charts row: split bar + doughnut + monthly ramp ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 200px 1fr", gap:14, alignItems:"stretch" }}>

        {/* Split bar */}
        <div style={{ background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12, padding:"20px 24px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            <ChartLabel>Onshore / offshore split</ChartLabel>
            <div style={{ display:"flex", gap:16 }}>
              {[
                { label:"US",        color:US_COL,  count:us    },
                { label:"India",     color:OFF_COL, count:india },
                ar > 0 && { label:"Argentina", color:AR_COL, count:ar },
              ].filter(Boolean).map(({ label, color, count }) => (
                <span key={label} style={{ fontSize:12, color:"#555" }}>
                  <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:color, marginRight:5, verticalAlign:1 }} />
                  {label} <strong style={{ color:"#111" }}>{fmtN(count)}</strong>
                </span>
              ))}
            </div>
          </div>
          <div style={{ height:12, borderRadius:6, overflow:"hidden", background:"#F0F0F2", display:"flex" }}>
            <div style={{ width:barWidth+"%", background:US_COL }} />
            {ar > 0 && <div style={{ width:(total > 0 ? ar/total*100 : 0)+"%", background:AR_COL }} />}
            <div style={{ flex:1, background:OFF_COL }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"#AAAAAA" }}>
            <span>{onPct}% onshore</span>
            <span>{offPct}% offshore</span>
          </div>
        </div>

        {/* Doughnut chart */}
        <div style={{ background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12, padding:"16px 12px", display:"flex", flexDirection:"column", alignItems:"center" }}>
          <ChartLabel>Location mix</ChartLabel>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                paddingAngle={2} dataKey="value" strokeWidth={0}>
                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                formatter={(v, name) => [fmtN(v), name]}
                contentStyle={{ fontSize:11, border:"0.5px solid #E8E8E8", borderRadius:6 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:4, width:"100%", marginTop:4 }}>
            {donutData.map(d => (
              <div key={d.name} style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                <span style={{ color:"#666" }}>
                  <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:d.color, marginRight:5, verticalAlign:1 }} />
                  {d.name}
                </span>
                <strong style={{ color:"#111" }}>{fmtN(d.value)}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly ramp chart */}
        <div style={{ background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12, padding:"16px 20px" }}>
          <ChartLabel>Monthly headcount ramp (FTE)</ChartLabel>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top:4, right:4, left:-20, bottom:0 }} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize:9, fill:"#AAAAAA" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9, fill:"#AAAAAA" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v, name) => [v.toFixed(1) + " FTE", name]}
                contentStyle={{ fontSize:11, border:"0.5px solid #E8E8E8", borderRadius:6 }}
              />
              <Legend wrapperStyle={{ fontSize:10, paddingTop:4 }} />
              <Bar dataKey="on"  name="Onshore"  stackId="a" fill={US_COL}  radius={[0,0,0,0]} />
              <Bar dataKey="off" name="Offshore" stackId="a" fill={OFF_COL} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── Programme cost & pricing ── */}
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:"#AAAAAA", marginTop:4 }}>
        Programme cost &amp; pricing
      </div>

      {hasCosts ? (
        <>
          <div style={{ background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12, padding:"18px 24px", display:"flex", alignItems:"center", gap:20 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:"#AAAAAA", marginBottom:6 }}>
                Target margin %
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <input
                  type="number" min="0" max="99" step="0.5"
                  value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                  style={{
                    width:90, padding:"6px 10px", fontSize:20, fontWeight:700,
                    border:"1px solid #D9B3FF", borderRadius:6, color:"#000",
                    background:"#FAFAFA", outline:"none",
                  }}
                />
                <span style={{ fontSize:14, color:"#888" }}>%</span>
              </div>
            </div>
            <div style={{ width:1, height:48, background:"#E8E8E8" }} />
            <div style={{ fontSize:13, color:"#666", lineHeight:1.8 }}>
              Price = Total cost ÷ (1 − margin%)<br />
              <span style={{ fontSize:12, color:"#AAA" }}>
                = {fmtCost(costs.totalCost)} ÷ (1 − {margin.toFixed(1)}%) = <strong style={{ color:PRP_COL }}>{fmtCost(costs.totalCost * priceMultiplier)}</strong>
              </span>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
            <CostCard label="Onshore cost"  value={fmtCost(costs.onCost)}    sub="LCR × days × 8 hrs (US)"          accentColor={US_COL}  />
            <CostCard label="Offshore cost" value={fmtCost(costs.offCost)}   sub="LCR × days × 9 hrs (India / AR)"  accentColor={OFF_COL} />
            <CostCard label="Total cost"    value={fmtCost(costs.totalCost)} sub="per-resource LCR × days × hours"  accentColor="#444"    />
            <CostCard label="Total price"   value={fmtCost(costs.totalCost * priceMultiplier)}
              sub={`at ${margin.toFixed(1)}% margin`} accentColor={PRP_COL} large />
          </div>
        </>
      ) : (
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"16px 20px", fontSize:13, color:"#92400E" }}>
          <i className="ti ti-info-circle" style={{ marginRight:8 }} />
          Upload your staffing file to see cost and pricing figures.
        </div>
      )}

    </div>
  );
}
