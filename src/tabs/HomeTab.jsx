import { fmtN } from "../styles.js";

const HOURS = 8;
const US_COL  = "#185FA5";
const OFF_COL = "#0F6E56";
const PRP_COL = "#A100FF";

function locSplit(l, DAYS) {
  const total    = l.totalDays ?? (l.people * DAYS);
  const usCount  = l.us    ?? 0;
  const offCount = (l.india ?? 0) + (l.ar ?? 0);
  const locTotal = usCount + offCount;
  if (locTotal === 0) return { usDays: 0, offDays: 0, total };
  return { usDays: total * (usCount / locTotal), offDays: total * (offCount / locTotal), total };
}

function computeCosts(staffing) {
  const DAYS = staffing.daysPerPerson ?? 320;
  let onCost = 0, offCost = 0, onDays = 0, offDays = 0;
  for (const l of (staffing.levels ?? [])) {
    const onRate  = l.billOn  ?? l.bill ?? 0;
    const offRate = l.billOff ?? l.bill ?? 0;
    const { usDays, offDays: offD } = locSplit(l, DAYS);
    onCost  += usDays * onRate  * HOURS;
    offCost += offD   * offRate * HOURS;
    onDays  += usDays;
    offDays += offD;
  }
  return { onCost, offCost, totalCost: onCost + offCost, onDays, offDays };
}

function fmtCost(v) {
  if (v === 0) return "—";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  return "$" + (v / 1e3).toFixed(0) + "K";
}

function BigMetric({ label, value, sub, accentColor, wide }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E8E8E8",
      borderRadius: 12,
      padding: wide ? "28px 32px" : "24px 24px",
      position: "relative",
      overflow: "hidden",
      gridColumn: wide ? "span 2" : undefined,
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background: accentColor }} />
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:"#AAAAAA", marginBottom:10 }}>
        {label}
      </div>
      <div style={{ fontSize:48, fontWeight:800, color:"#0A0A0A", lineHeight:1, letterSpacing:-1.5 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize:12, color:"#AAAAAA", marginTop:8, letterSpacing:0.2 }}>{sub}</div>
      )}
    </div>
  );
}

function CostMetric({ label, value, sub, accentColor }) {
  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E8E8E8",
      borderRadius: 12,
      padding: "22px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background: accentColor }} />
      <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:0.7, color:"#AAAAAA", marginBottom:10 }}>
        {label}
      </div>
      <div style={{ fontSize:36, fontWeight:800, color: accentColor, lineHeight:1, letterSpacing:-0.5 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize:12, color:"#AAAAAA", marginTop:8 }}>{sub}</div>
      )}
    </div>
  );
}

export default function HomeTab({ staffing }) {
  const total   = staffing.total ?? 0;
  const us      = staffing.us ?? 0;
  const india   = staffing.india ?? 0;
  const ar      = staffing.argentina ?? 0;
  const offshore = india + ar;
  const named   = staffing.named ?? total;
  const namedPct = total > 0 ? Math.round(named / total * 100) : 0;
  const onPct   = total > 0 ? Math.round(us / total * 100) : 0;
  const offPct  = 100 - onPct;

  const { onCost, offCost, totalCost, onDays, offDays } = computeCosts(staffing);
  const hasCosts = totalCost > 0;

  const barWidth = total > 0 ? Math.round(us / total * 100) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* Section label */}
      <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:"#AAAAAA" }}>
        Headcount
      </div>

      {/* Hero headcount grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
        <BigMetric
          label="Total headcount"
          value={fmtN(total)}
          sub={`${onPct}% onshore · ${offPct}% offshore`}
          accentColor={PRP_COL}
        />
        <BigMetric
          label="Onshore (US)"
          value={fmtN(us)}
          sub={`${onPct}% of total`}
          accentColor={US_COL}
        />
        <BigMetric
          label="Offshore"
          value={fmtN(offshore)}
          sub={india > 0 && ar > 0 ? `${fmtN(india)} India · ${fmtN(ar)} Argentina` : `${offPct}% of total`}
          accentColor={OFF_COL}
        />
        <BigMetric
          label="Named resources"
          value={fmtN(named)}
          sub={`${namedPct}% named · ${fmtN(total - named)} TBD`}
          accentColor="#888888"
        />
      </div>

      {/* On / off split bar */}
      <div style={{ background:"#FFFFFF", border:"1px solid #E8E8E8", borderRadius:12, padding:"20px 24px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, color:"#AAAAAA" }}>
            Onshore / offshore split
          </span>
          <div style={{ display:"flex", gap:18 }}>
            {[
              { label:"US", color:US_COL, count:us },
              { label:"India", color:OFF_COL, count:india },
              ar > 0 && { label:"Argentina", color:"#B45309", count:ar },
            ].filter(Boolean).map(({ label, color, count }) => (
              <span key={label} style={{ fontSize:12, color:"#555" }}>
                <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:color, marginRight:6, verticalAlign:1 }} />
                {label} <strong style={{ color:"#111" }}>{fmtN(count)}</strong>
              </span>
            ))}
          </div>
        </div>
        <div style={{ height:12, borderRadius:6, overflow:"hidden", background:"#F0F0F2", display:"flex" }}>
          <div style={{ width: barWidth + "%", background:US_COL, transition:"width 0.4s ease" }} />
          {ar > 0 && (
            <div style={{ width: (total > 0 ? ar / total * 100 : 0) + "%", background:"#B45309" }} />
          )}
          <div style={{ flex:1, background:OFF_COL }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"#AAAAAA" }}>
          <span>{onPct}% onshore</span>
          <span>{offPct}% offshore</span>
        </div>
      </div>

      {/* Cost section */}
      {hasCosts && (<>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, color:"#AAAAAA", marginTop:4 }}>
          Programme cost
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
          <CostMetric
            label="Onshore cost"
            value={fmtCost(onCost)}
            sub={`${fmtN(Math.round(onDays))} staffed days`}
            accentColor={US_COL}
          />
          <CostMetric
            label="Offshore cost"
            value={fmtCost(offCost)}
            sub={`${fmtN(Math.round(offDays))} staffed days`}
            accentColor={OFF_COL}
          />
          <CostMetric
            label="Total programme cost"
            value={fmtCost(totalCost)}
            sub={`${fmtN(Math.round(onDays + offDays))} total staffed days`}
            accentColor={PRP_COL}
          />
        </div>
      </>)}

      {!hasCosts && (
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"14px 18px", fontSize:13, color:"#92400E" }}>
          <i className="ti ti-info-circle" style={{ marginRight:8 }} />
          Upload your staffing file to see cost figures — sample data does not include LCR rates.
        </div>
      )}

    </div>
  );
}
