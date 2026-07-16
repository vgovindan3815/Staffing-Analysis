import { fmtN } from "../styles.js";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const US_COL  = "#60A5FA";
const OFF_COL = "#FB923C";
const AR_COL  = "#C084FC";

function isOnshore(loc) {
  const u = (loc ?? "").toUpperCase();
  return u === "USA" || u === "US" || u.startsWith("UNITED STATES") || u === "ONSHORE";
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

export default function HomeTab({ staffing, liveDetail, monthLabels }) {
  const us      = staffing.us ?? 0;
  const india   = staffing.india ?? 0;
  const ar      = staffing.argentina ?? 0;
  const offshore = india + ar;
  const total   = staffing.total ?? 0;

  const donutData = [
    { name:"Onshore (US)", value:us,    color:US_COL  },
    { name:"India",        value:india, color:OFF_COL },
    ar > 0 && { name:"Argentina", value:ar, color:AR_COL },
  ].filter(Boolean);

  const monthlyData = computeMonthlyRamp(liveDetail, staffing, monthLabels);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20, padding:"20px 24px" }}>

      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:"#AAAAAA" }}>
        Dashboard
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:16 }}>

        {/* Doughnut */}
        <div style={{ background:"#FFF", border:"1px solid #E8E8E8", borderRadius:12, padding:"16px" }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:"#AAAAAA", marginBottom:10 }}>Location mix</div>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" strokeWidth={0}>
                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [fmtN(v), name]} contentStyle={{ fontSize:11, border:"0.5px solid #E8E8E8", borderRadius:6 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:6 }}>
            {donutData.map(d => (
              <div key={d.name} style={{ display:"flex", justifyContent:"space-between", fontSize:12 }}>
                <span style={{ color:"#666" }}>
                  <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:d.color, marginRight:6, verticalAlign:1 }} />
                  {d.name}
                </span>
                <span style={{ fontWeight:700, color:"#111" }}>{fmtN(d.value)} <span style={{ color:"#AAA", fontWeight:400 }}>({total > 0 ? Math.round(d.value/total*100) : 0}%)</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly ramp */}
        <div style={{ background:"#FFF", border:"1px solid #E8E8E8", borderRadius:12, padding:"16px 20px" }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:"#AAAAAA", marginBottom:10 }}>
            Monthly headcount ramp (FTE)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top:4, right:4, left:-22, bottom:0 }} barSize={monthlyData.length > 16 ? 7 : 10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize:9, fill:"#AAAAAA" }} axisLine={false} tickLine={false}
                interval={monthlyData.length > 12 ? 1 : 0} angle={monthlyData.length > 16 ? -35 : 0} textAnchor={monthlyData.length > 16 ? "end" : "middle"} height={monthlyData.length > 16 ? 40 : 20} />
              <YAxis tick={{ fontSize:9, fill:"#AAAAAA" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, name) => [v.toFixed(1) + " FTE", name]} contentStyle={{ fontSize:11, border:"0.5px solid #E8E8E8", borderRadius:6 }} />
              <Legend wrapperStyle={{ fontSize:10, paddingTop:4 }} />
              <Bar dataKey="on"  name="Onshore"  stackId="a" fill={US_COL}  radius={[0,0,0,0]} />
              <Bar dataKey="off" name="Offshore" stackId="a" fill={OFF_COL} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
