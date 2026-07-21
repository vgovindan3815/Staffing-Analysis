const ACCENT = "#A100FF";
const BG_CARD = "#111827";
const BORDER  = "#1E293B";
const TEXT_H  = "#F8FAFC";
const TEXT_B  = "#94A3B8";
const TEXT_M  = "rgba(255,255,255,0.35)";

const COLUMNS = [
  { col:"A / Program",       header:"program",         required:false, description:"Programme name — same value in all rows" },
  { col:"E / Project",       header:"project",          required:true,  description:"Group name used in all breakdowns (e.g. App Migration)" },
  { col:"F / Pod Name",      header:"pod name",         required:false, description:"Sub-team / pod (e.g. Migration Pod 1)" },
  { col:"I / Project Role",  header:"project role",     required:false, description:"Job title or skill profile" },
  { col:"M / Location",      header:"location",         required:true,  description:"USA · India · Argentina — controls onshore (8 hrs) vs offshore (9 hrs)" },
  { col:"N / Name",          header:"name",             required:false, description:"Resource name — leave blank for TBD roles" },
  { col:"O / Enterprise ID", header:"enterprise id",    required:false, description:"EID — used to count Named vs TBD; blank = TBD" },
  { col:"P / Level Band",    header:"level band",       required:true,  description:"See valid values below. Any band ending with 'Leadership' is auto-normalised." },
  { col:"Q / Bill Code",     header:"bill code",        required:false, description:"Fallback rate ($/hr) — used only when LCR is blank" },
  { col:"R / LCR",           header:"lcr",              required:true,  description:"Labour Cost Rate ($/hr) — primary rate for all cost calculations" },
  { col:"T / Total FTE",     header:"total fte",        required:true,  description:"Sum of monthly FTE fractions — rows with 0 are skipped" },
  { col:"U–AJ / Months",     header:"M1–M24 or Jun-24", required:false, description:"Monthly FTE allocation. Auto-detected by column header name. Up to 24 months." },
  { col:"AK / Total Days",   header:"total days",       required:true,  description:"Total staffed days for the resource" },
  { col:"AL / Cost",         header:"cost",             required:false, description:"Pre-calculated cost — imported for reference/cross-validation only" },
];

const LEVELS = [
  "Leadership (any band ending with 'Leadership')",
  "5-Associate Director","6-Senior Manager","7-Manager",
  "8-Associate Manager","9-Team Lead/Consultant",
  "10-Senior Analyst","11-Analyst","12-Associate",
];

const LOCATIONS = [
  { value:"USA, US, United States, Onshore", type:"Onshore", hrs:"8 hrs/day" },
  { value:"India, IN, or any other value",    type:"Offshore", hrs:"9 hrs/day" },
  { value:"Argentina, AR",                   type:"Offshore (AR)", hrs:"9 hrs/day" },
];

export default function HelpTab() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:900 }}>

      <div>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:4, color:TEXT_H }}>File format &amp; column reference</h2>
        <p style={{ fontSize:13, color:TEXT_B, lineHeight:1.7 }}>
          Upload any Excel (.xlsx / .xls) file with a sheet named exactly <strong style={{ color:TEXT_H }}>Staffing Plan</strong>.
          Columns are detected by header name — they can be in any order.
          Row 1 = programme title, Row 2 = column headers, Row 3 onwards = data.
        </p>
      </div>

      {/* Column table */}
      <div style={{ background:BG_CARD, border:`1px solid ${BORDER}`, borderRadius:10, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", background:"#0F172A", borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, color:TEXT_M }}>
          Column reference
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#0F172A" }}>
              {["Template position","Header name","Required","Description"].map((h,i) => (
                <th key={i} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:TEXT_M, textTransform:"uppercase", letterSpacing:0.5, borderBottom:`1px solid ${BORDER}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLUMNS.map((c, i) => (
              <tr key={i} style={{ background: i%2===1 ? "rgba(255,255,255,0.03)" : "transparent" }}>
                <td style={{ padding:"10px 14px", fontSize:12, color:TEXT_B, whiteSpace:"nowrap" }}>{c.col}</td>
                <td style={{ padding:"10px 14px" }}>
                  <code style={{ background:"rgba(161,0,255,0.2)", color:"#C084FC", padding:"2px 7px", borderRadius:4, fontSize:12, fontWeight:600 }}>{c.header}</code>
                </td>
                <td style={{ padding:"10px 14px" }}>
                  {c.required
                    ? <span style={{ color:"#10B981", fontWeight:600, fontSize:12 }}>✓ Required</span>
                    : <span style={{ color:TEXT_M, fontSize:12 }}>Optional</span>}
                </td>
                <td style={{ padding:"10px 14px", fontSize:12, color:TEXT_B, lineHeight:1.5 }}>{c.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Location values */}
      <div style={{ background:BG_CARD, border:`1px solid ${BORDER}`, borderRadius:10, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", background:"#0F172A", borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, color:TEXT_M }}>
          Location values
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              {["Accepted values","Type","Hours/day"].map((h,i) => (
                <th key={i} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:TEXT_M, textTransform:"uppercase", letterSpacing:0.5, borderBottom:`1px solid ${BORDER}`, background:"#0F172A" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOCATIONS.map((l, i) => (
              <tr key={i} style={{ background: i%2===1 ? "rgba(255,255,255,0.03)" : "transparent" }}>
                <td style={{ padding:"10px 14px", fontSize:12, color:TEXT_B }}><code style={{ fontSize:12, background:"rgba(255,255,255,0.06)", color:TEXT_H }}>{l.value}</code></td>
                <td style={{ padding:"10px 14px", fontSize:12, fontWeight:600, color: l.type.startsWith("Offshore") ? "#FB923C" : "#60A5FA" }}>{l.type}</td>
                <td style={{ padding:"10px 14px", fontSize:12, color:TEXT_B }}>{l.hrs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Level bands */}
      <div style={{ background:BG_CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"16px" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, color:TEXT_M, marginBottom:12 }}>Valid level bands</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {LEVELS.map(l => (
            <code key={l} style={{ background:"rgba(161,0,255,0.2)", color:"#C084FC", padding:"4px 10px", borderRadius:6, fontSize:12 }}>{l}</code>
          ))}
        </div>
      </div>

      {/* Month format */}
      <div style={{ background:BG_CARD, border:`1px solid ${BORDER}`, borderRadius:10, padding:"16px" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, color:TEXT_M, marginBottom:8 }}>Month column format</div>
        <p style={{ fontSize:13, color:TEXT_B, lineHeight:1.7, marginBottom:10 }}>
          Month columns are auto-detected by header name. Both formats are supported and can be mixed. Up to 24 months.
        </p>
        <div style={{ display:"flex", gap:16 }}>
          <div>
            <div style={{ fontSize:11, color:TEXT_M, marginBottom:6 }}>Numeric</div>
            <div style={{ display:"flex", gap:6 }}>
              {["M1","M2","M3","...","M24"].map(m => <code key={m} style={{ background:"rgba(255,255,255,0.06)", color:TEXT_H, padding:"3px 8px", borderRadius:4, fontSize:12 }}>{m}</code>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, color:TEXT_M, marginBottom:6 }}>Named</div>
            <div style={{ display:"flex", gap:6 }}>
              {["Jun-24","Jul-24","Aug-24","...","May-26"].map(m => <code key={m} style={{ background:"rgba(255,255,255,0.06)", color:TEXT_H, padding:"3px 8px", borderRadius:4, fontSize:12 }}>{m}</code>)}
            </div>
          </div>
        </div>
      </div>

      {/* Cost formula */}
      <div style={{ background:"rgba(161,0,255,0.15)", border:"1px solid rgba(161,0,255,0.35)", borderRadius:10, padding:"16px" }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6, color:ACCENT, marginBottom:8 }}>Cost calculation formula</div>
        <code style={{ fontSize:14, color:TEXT_H, display:"block", marginBottom:8, background:"transparent" }}>Cost = LCR ($/hr) × Total Days × hours per day</code>
        <div style={{ fontSize:13, color:TEXT_B }}>
          Onshore (US): <strong style={{ color:TEXT_H }}>8 hours/day</strong> &nbsp;·&nbsp; Offshore (India / AR / other): <strong style={{ color:TEXT_H }}>9 hours/day</strong><br />
          Price = Total Cost ÷ (1 − margin%)
        </div>
      </div>

    </div>
  );
}
