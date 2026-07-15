import { s } from "../styles.js";

export default function Kpi({ label, value, sub, accent }) {
  return (
    <div style={{ ...s.kpi, ...(accent ? { background:"var(--color-background-info)" } : {}) }}>
      <div style={{ ...s.kpiLabel, ...(accent ? { color:"var(--color-text-info)" } : {}) }}>{label}</div>
      <div style={{ ...s.kpiVal,   ...(accent ? { color:"var(--color-text-info)" } : {}) }}>{value}</div>
      {sub && <div style={{ ...s.kpiSub, ...(accent ? { color:"var(--color-text-info)", opacity:0.75 } : {}) }}>{sub}</div>}
    </div>
  );
}
