import { useState } from "react";

const SIDEBAR_BG   = "#0D0020";
const SECTION_BG   = "rgba(161,0,255,0.07)";
const BORDER_COL   = "rgba(161,0,255,0.18)";
const ACCENT       = "#A100FF";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SUB     = "rgba(255,255,255,0.55)";
const US_COL       = "#60A5FA";
const OFF_COL      = "#FB923C";
const AR_COL       = "#C084FC";

function fmtN(n) { return n?.toLocaleString() ?? "—"; }
function fmtCost(v) {
  if (!v) return "—";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  return "$" + (v / 1e3).toFixed(0) + "K";
}

function SidebarSection({ id, icon, title, summary, expanded, onToggle, children }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER_COL}` }}>
      <button
        onClick={() => onToggle(id)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "16px 18px", background: "none", border: "none", cursor: "pointer",
          color: TEXT_PRIMARY, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: TEXT_SUB }}>{title}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: TEXT_PRIMARY, letterSpacing: -0.5, marginTop: 2 }}>{summary}</div>
        </div>
        <i className={`ti ti-chevron-${expanded ? "up" : "down"}`} style={{ fontSize: 14, color: ACCENT, flexShrink: 0 }} />
      </button>

      <div style={{
        overflow: "hidden",
        maxHeight: expanded ? 600 : 0,
        transition: "max-height 0.3s ease",
      }}>
        <div style={{ padding: "0 18px 18px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color, indent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${BORDER_COL}` }}>
      <span style={{ fontSize: 12, color: TEXT_SUB, paddingLeft: indent ? 12 : 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || TEXT_PRIMARY }}>{value}</span>
    </div>
  );
}

export default function HomeSidebar({ staffing, costs, margin, setMargin }) {
  const [expanded, setExpanded] = useState(new Set(["resources"]));

  const toggle = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const total    = staffing.total ?? 0;
  const us       = staffing.us ?? 0;
  const india    = staffing.india ?? 0;
  const ar       = staffing.argentina ?? 0;
  const offshore = india + ar;
  const named    = staffing.named ?? total;
  const tbd      = total - named;
  const onPct    = total > 0 ? Math.round(us / total * 100) : 0;
  const offPct   = 100 - onPct;
  const priceMultiplier = margin < 100 ? 1 / (1 - margin / 100) : 1;

  return (
    <div style={{
      background: SIDEBAR_BG,
      borderRight: `1px solid ${BORDER_COL}`,
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      height: "100%",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${BORDER_COL}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: ACCENT }}>Dashboard</div>
        <div style={{ fontSize: 13, color: TEXT_SUB, marginTop: 4 }}>Click a section to expand</div>
      </div>

      {/* Resources */}
      <SidebarSection id="resources" icon="👥" title="Resources" summary={fmtN(total) + " people"} expanded={expanded.has("resources")} onToggle={toggle}>
        <Row label="Total headcount" value={fmtN(total)} />
        <Row label="Onshore (US)" value={fmtN(us)} color={US_COL} />
        <Row label="Offshore" value={fmtN(offshore)} color={OFF_COL} />
        {india > 0 && <Row label="India" value={fmtN(india)} color={OFF_COL} indent />}
        {ar > 0 && <Row label="Argentina" value={fmtN(ar)} color={AR_COL} indent />}
        <Row label="Named" value={fmtN(named)} />
        <Row label="TBD" value={fmtN(tbd)} />
      </SidebarSection>

      {/* On/Off Ratio */}
      <SidebarSection id="ratio" icon="📊" title="On / Off Ratio" summary={`${onPct}% / ${offPct}%`} expanded={expanded.has("ratio")} onToggle={toggle}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: TEXT_SUB, marginBottom: 6 }}>
            <span>Onshore {onPct}%</span>
            <span>Offshore {offPct}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.1)", display: "flex", overflow: "hidden" }}>
            <div style={{ width: onPct + "%", background: US_COL, transition: "width 0.4s" }} />
            {ar > 0 && <div style={{ width: (total > 0 ? ar / total * 100 : 0) + "%", background: AR_COL }} />}
            <div style={{ flex: 1, background: OFF_COL }} />
          </div>
        </div>
        <Row label="Onshore (US)" value={fmtN(us) + " · " + onPct + "%"} color={US_COL} />
        <Row label="Offshore" value={fmtN(offshore) + " · " + offPct + "%"} color={OFF_COL} />
        {india > 0 && <Row label="India" value={fmtN(india)} color={OFF_COL} indent />}
        {ar > 0 && <Row label="Argentina" value={fmtN(ar)} color={AR_COL} indent />}
      </SidebarSection>

      {/* Cost */}
      <SidebarSection
        id="cost"
        icon="💰"
        title="Programme Cost"
        summary={costs ? fmtCost(costs.totalCost) : "Upload file"}
        expanded={expanded.has("cost")}
        onToggle={toggle}
      >
        {costs ? (
          <>
            <Row label="Onshore cost" value={fmtCost(costs.onCost)} color={US_COL} />
            <Row label="Offshore cost" value={fmtCost(costs.offCost)} color={OFF_COL} />
            <Row label="Total cost" value={fmtCost(costs.totalCost)} />

            {/* Margin input */}
            <div style={{ marginTop: 14, padding: "12px 0 4px", borderTop: `1px solid ${BORDER_COL}` }}>
              <div style={{ fontSize: 11, color: TEXT_SUB, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>Target margin %</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number" min="0" max="99" step="0.5"
                  value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value) || 0)}
                  style={{
                    width: 70, padding: "6px 8px", fontSize: 18, fontWeight: 700,
                    background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER_COL}`,
                    borderRadius: 6, color: TEXT_PRIMARY, outline: "none",
                    WebkitAppearance: "none",
                  }}
                />
                <span style={{ fontSize: 13, color: TEXT_SUB }}>%</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <Row label="Total price" value={fmtCost(costs.totalCost * priceMultiplier)} color={ACCENT} />
              </div>
              <div style={{ fontSize: 11, color: TEXT_SUB, marginTop: 6 }}>
                = {fmtCost(costs.totalCost)} ÷ (1 − {margin.toFixed(1)}%)
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: TEXT_SUB, textAlign: "center", padding: "12px 0" }}>
            Upload your staffing file<br />to see cost figures
          </div>
        )}
      </SidebarSection>
    </div>
  );
}
