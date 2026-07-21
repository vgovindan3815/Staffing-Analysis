import { useState, useRef } from "react";

const BG_SIDEBAR  = "var(--bg-sidebar)";
const BORDER      = "var(--border-faint)";
const ACCENT      = "var(--accent)";
const TEXT_H      = "var(--text-h)";
const TEXT_B      = "var(--text-b2)";
const TEXT_M      = "var(--text-m)";
const US_COL      = "var(--us-col)";
const OFF_COL     = "var(--off-col)";
const AR_COL      = "var(--ar-col)";
const SUCCESS_COL = "var(--success)";
const WARNING_COL = "var(--warning)";

function fmtCost(v) {
  if (!v) return "—";
  if (v >= 1e9) return "$" + (v/1e9).toFixed(2) + "B";
  if (v >= 1e6) return "$" + (v/1e6).toFixed(1) + "M";
  return "$" + (v/1e3).toFixed(0) + "K";
}

function SbSection({ title, children }) {
  return (
    <div style={{ padding:"14px 16px", borderBottom:`1px solid ${BORDER}` }}>
      <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.8, color:TEXT_M, marginBottom:12 }}>{title}</div>
      {children}
    </div>
  );
}

export default function HomeSidebar({ staffing, costs, margin, setMargin, isLive, storedName, storedDate, onUpload, onReset, liveDetail, locFilter, setLocFilter, allLocations }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onUpload(f);
  };

  // Quick insights derived from data
  const total    = staffing.total ?? 0;
  const named    = staffing.named ?? total;
  const tbd      = total - named;
  const us       = staffing.us ?? 0;
  const offshore = (staffing.india ?? 0) + (staffing.argentina ?? 0);
  const largestGroup = staffing.groups?.[0];
  const tdbPct   = total > 0 ? Math.round(tbd / total * 100) : 0;

  // Cost from costs prop
  const totalCost = costs?.totalCost;

  // Location toggle
  const toggleLoc = (loc) => {
    setLocFilter(prev => {
      const next = new Set(prev);
      if (next.has(loc)) next.delete(loc); else next.add(loc);
      return next;
    });
  };
  const locActive = (loc) => locFilter.size === 0 || locFilter.has(loc);

  // Loc color mapping
  const locColor = { US: US_COL, India: OFF_COL, Argentina: AR_COL };
  const locCount = {
    US: us,
    India: staffing.india ?? 0,
    Argentina: staffing.argentina ?? 0,
  };

  return (
    <div style={{ background:BG_SIDEBAR, borderRight:`1px solid ${BORDER}`, display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>

      {/* Upload zone */}
      {!isLive ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            margin:"14px 12px 0", height:180,
            border:`1.5px dashed ${dragOver ? ACCENT : "rgba(161,0,255,0.35)"}`,
            borderRadius:12, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            cursor:"pointer", gap:10, flexShrink:0,
            background: dragOver ? "rgba(161,0,255,0.18)" : "rgba(161,0,255,0.06)",
            transition:"all 0.15s",
          }}
        >
          <i className="ti ti-file-spreadsheet" style={{ fontSize:30, color:ACCENT }} />
          <div style={{ fontSize:12, color:"var(--upload-text)", textAlign:"center", lineHeight:1.5 }}>
            Drag and drop<br />or click to upload
          </div>
          <div style={{ fontSize:10, color:"var(--upload-sub)" }}>.xlsx · .xls</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }}
            onChange={e => { const f=e.target.files?.[0]; if(f) onUpload(f); e.target.value=""; }} />
        </div>
      ) : (
        <div style={{ margin:"14px 12px 0", padding:14, background:"rgba(161,0,255,0.1)", border:"1px solid rgba(161,0,255,0.25)", borderRadius:12, flexShrink:0 }}>
          <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.7, color:"var(--text-m)", marginBottom:6 }}>Active file</div>
          <div style={{ fontSize:12, color:TEXT_H, fontWeight:600, wordBreak:"break-all", lineHeight:1.4, marginBottom:storedDate?8:10 }}>{storedName}</div>
          {storedDate && <div style={{ fontSize:10, color:TEXT_M, marginBottom:10 }}>
            {new Date(storedDate).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
          </div>}
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ flex:1, fontSize:11, fontWeight:600, padding:"6px 0", background:"rgba(161,0,255,0.2)", border:"1px solid rgba(161,0,255,0.4)", borderRadius:6, color:"#C084FC", cursor:"pointer" }}>
              Replace
            </button>
            <button onClick={onReset}
              style={{ flex:1, fontSize:11, padding:"6px 0", background:"var(--input-bg)", border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT_B, cursor:"pointer" }}>
              Clear
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }}
            onChange={e => { const f=e.target.files?.[0]; if(f) onUpload(f); e.target.value=""; }} />
        </div>
      )}

      <div style={{ height:1, background:BORDER, margin:"12px 0 0", flexShrink:0 }} />

      {/* Location filter */}
      <SbSection title="Location">
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {["US","India","Argentina"].map(loc => {
            const active = locActive(loc);
            const color  = locColor[loc];
            const count  = locCount[loc];
            return (
              <label key={loc} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 0" }}>
                <div
                  onClick={() => toggleLoc(loc)}
                  style={{
                    width:14, height:14, borderRadius:3, flexShrink:0,
                    background: active ? color : "transparent",
                    border: `1.5px solid ${active ? color : "var(--border-faint)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", transition:"all 0.15s",
                  }}
                >
                  {active && <i className="ti ti-check" style={{ fontSize:9, color:"#000", fontWeight:700 }} />}
                </div>
                <span style={{ fontSize:12, color:active ? TEXT_H : TEXT_B, flex:1 }}>{loc}</span>
                <span style={{ fontSize:11, color:TEXT_M }}>{count}</span>
              </label>
            );
          })}
          {locFilter.size > 0 && (
            <button onClick={() => setLocFilter(new Set())}
              style={{ fontSize:10, color:ACCENT, background:"none", border:"none", cursor:"pointer", textAlign:"left", padding:"2px 0", marginTop:2 }}>
              Clear filter
            </button>
          )}
        </div>
      </SbSection>

      {/* Cost + margin */}
      <SbSection title="Program cost">
        {costs ? (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:11, color:TEXT_B }}>Total</span>
              <span style={{ fontSize:13, fontWeight:700, color:TEXT_H }}>{fmtCost(totalCost)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:11, color:TEXT_M }}>Onshore</span>
              <span style={{ fontSize:11, color:US_COL }}>{fmtCost(costs.onCost)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:11, color:TEXT_M }}>Offshore</span>
              <span style={{ fontSize:11, color:OFF_COL }}>{fmtCost(costs.offCost)}</span>
            </div>
            <div style={{ borderTop:`1px solid ${BORDER}`, paddingTop:12 }}>
              <div style={{ fontSize:10, color:TEXT_M, marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Target margin %</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <input type="number" min="0" max="99" step="0.5" value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value)||0)}
                  style={{ width:64, padding:"5px 8px", fontSize:16, fontWeight:700, background:"var(--input-bg)", border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT_H, outline:"none" }} />
                <span style={{ fontSize:12, color:TEXT_M }}>%</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:TEXT_B }}>Total price</span>
                <span style={{ fontSize:13, fontWeight:700, color:ACCENT }}>
                  {fmtCost(totalCost / (1 - margin / 100))}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize:12, color:TEXT_M }}>Upload a file to see cost figures.</div>
        )}
      </SbSection>

      {/* Quick insights */}
      {total > 0 && (
        <SbSection title="Quick insights">
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {largestGroup && (
              <div>
                <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.6, color:ACCENT, marginBottom:2 }}>Largest project</div>
                <div style={{ fontSize:12, color:TEXT_H }}>{largestGroup.name}</div>
                <div style={{ fontSize:10, color:TEXT_M }}>{largestGroup.people} resources</div>
              </div>
            )}
            <div>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.6, color:tdbPct>20?WARNING_COL:SUCCESS_COL, marginBottom:2 }}>TBD exposure</div>
              <div style={{ fontSize:12, color:TEXT_H }}>{tbd} unconfirmed</div>
              <div style={{ fontSize:10, color:TEXT_M }}>{tdbPct}% of total workforce</div>
            </div>
            <div>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:.6, color:TEXT_M, marginBottom:2 }}>Onshore / offshore</div>
              <div style={{ fontSize:12, color:TEXT_H }}>{total > 0 ? Math.round(us/total*100) : 0}% US · {total > 0 ? Math.round(offshore/total*100) : 0}% offshore</div>
            </div>
          </div>
        </SbSection>
      )}
    </div>
  );
}
