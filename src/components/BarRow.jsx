import { s } from "../styles.js";

export default function BarRow({ label, value, max, color, right, sub }) {
  const w = max ? Math.round(value / max * 100) : 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
      <span style={{ fontSize:12, color:"var(--color-text-secondary)", width:180, flexShrink:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</span>
      <div style={s.barBg}><div style={s.bar(w, color)} /></div>
      <span style={{ fontSize:12, fontWeight:500, color:"var(--color-text-primary)", minWidth:50, textAlign:"right" }}>{right}</span>
      {sub && <span style={{ fontSize:11, color:"var(--color-text-tertiary)", minWidth:38, textAlign:"right" }}>{sub}</span>}
    </div>
  );
}
