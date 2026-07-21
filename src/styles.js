export const s = {
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
  },
  kpiGrid: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 },
  kpi: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "16px 18px",
    position: "relative",
    overflow: "hidden",
  },
  kpiLabel: { fontSize:10, fontWeight:700, color:"var(--text-m)", marginBottom:8, textTransform:"uppercase", letterSpacing:0.6 },
  kpiVal:   { fontSize:22, fontWeight:700, color:"var(--text-h)", letterSpacing:-0.3, lineHeight:1 },
  kpiSub:   { fontSize:11, color:"var(--text-b)", marginTop:6, letterSpacing:0.2 },
  tbl: { width:"100%", borderCollapse:"collapse", fontSize:12 },
  th: {
    background: "var(--bg-app)",
    fontWeight: 700,
    fontSize: 10,
    color: "var(--text-m)",
    padding: "10px 14px",
    textAlign: "left",
    borderBottom: "1px solid var(--border)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  thR: { textAlign:"right" },
  td:  { padding:"11px 14px", borderBottom:"1px solid var(--border)", color:"var(--text-b)" },
  tdR: { textAlign:"right", fontVariantNumeric:"tabular-nums", color:"var(--text-b)" },
  sectionHdr: { fontSize:12, fontWeight:700, marginBottom:10, color:"var(--text-m)", letterSpacing:-0.1 },
  bar:   (w, col) => ({ height:5, width:w+"%", background:col, borderRadius:3, minWidth:w>0?2:0 }),
  barBg: { height:5, background:"var(--border)", borderRadius:3, overflow:"hidden", flex:2 },
};

export const fmt$ = (v, dp=2) => v === 0 ? "—" : "$" + (v/1e6).toFixed(dp) + "M";
export const fmtN = v => Math.round(v).toLocaleString();
export const fmtK = v => v === 0 ? "—" : "~$" + Math.round(v/1000) + "K";
export const pct  = (a, b) => b ? (a/b*100).toFixed(1)+"%" : "—";
