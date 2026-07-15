import { useState, useCallback, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { STAFFING } from "./data/hardcoded.js";
import { parseStaffingModel } from "./parsers/parseStaffingModel.js";
import { toStaffingShape } from "./compute/mergeData.js";
import { saveFile, loadFile, deleteFile, storedToFile } from "./storage/fileStore.js";
import StaffingTab from "./tabs/StaffingTab.jsx";

const STORAGE_KEY = "staffing-v1";

async function parseFile(file) {
  const buf    = await file.arrayBuffer();
  const wb     = XLSX.read(buf, { type: "array" });
  const parsed = parseStaffingModel(wb);
  const shaped = toStaffingShape(parsed);
  return { staffing: shaped, detail: parsed.detail };
}

export default function App() {
  const [parsedStaffing, setParsed]   = useState(null);
  const [isLive, setIsLive]           = useState(false);
  const [loading, setLoading]         = useState(true); // true on mount while we check IndexedDB
  const [storedName, setStoredName]   = useState(null);
  const [storedDate, setStoredDate]   = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const fileInputRef                  = useRef(null);

  // On mount: try to restore previously uploaded file from IndexedDB
  useEffect(() => {
    loadFile(STORAGE_KEY)
      .then(async (record) => {
        if (!record) return;
        const file = storedToFile(record);
        const data = await parseFile(file);
        setParsed(data);
        setIsLive(true);
        setStoredName(record.name);
        setStoredDate(record.savedAt);
      })
      .catch(() => {}) // silently ignore if IndexedDB unavailable
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await parseFile(file);
      await saveFile(STORAGE_KEY, file);
      setParsed(data);
      setIsLive(true);
      setStoredName(file.name);
      setStoredDate(Date.now());
    } catch (e) {
      alert("Failed to parse staffing file:\n" + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(async () => {
    await deleteFile(STORAGE_KEY).catch(() => {});
    setParsed(null);
    setIsLive(false);
    setStoredName(null);
    setStoredDate(null);
  }, []);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const staffing   = parsedStaffing?.staffing ?? STAFFING;
  const liveDetail = parsedStaffing?.detail   ?? null;

  // Spinner shown only during initial IndexedDB restore
  if (loading && !isLive && !parsedStaffing) {
    return (
      <div style={{ minHeight:"100vh", background:"#F0F0F2", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center", color:"#888" }}>
          <i className="ti ti-loader-2" style={{ fontSize:28, color:"#A100FF", display:"block", marginBottom:10 }} />
          <div style={{ fontSize:13 }}>Restoring last session…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F0F0F2", fontFamily:"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Navbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#0A0A0A",
        borderBottom: "2px solid #A100FF",
        padding: "0 28px",
        display: "flex", alignItems: "center", gap: 12, height: 52,
      }}>
        <span style={{ color:"#A100FF", fontWeight:800, fontSize:18, letterSpacing:-0.5 }}>◆</span>
        <span style={{ color:"#FFFFFF", fontWeight:600, fontSize:14, letterSpacing:-0.2 }}>Staffing Viewer</span>
        <span style={{ color:"rgba(255,255,255,0.15)", fontSize:11 }}>·</span>
        <span style={{ color:"rgba(255,255,255,0.4)", fontSize:12 }}>FXF Day 2 Program</span>
        <div style={{ flex:1 }} />
        {isLive ? (
          <span style={{
            fontSize:11, fontWeight:600, letterSpacing:0.3,
            color:"#16a34a", background:"#052e16",
            border:"1px solid #166534",
            borderRadius:20, padding:"3px 10px",
          }}>
            <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:"#22c55e", marginRight:5, verticalAlign:1 }} />
            Live · {storedName}
          </span>
        ) : (
          <span style={{
            fontSize:11, fontWeight:500, letterSpacing:0.4,
            color:"rgba(255,255,255,0.40)",
            background:"rgba(255,255,255,0.06)",
            border:"1px solid rgba(255,255,255,0.12)",
            borderRadius:20, padding:"3px 10px",
          }}>
            Sample data
          </span>
        )}
      </div>

      {/* File bar — shown when live */}
      {isLive && (
        <div style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E8E8E8",
          padding: "9px 28px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <i className="ti ti-file-spreadsheet" style={{ fontSize:14, color:"#A100FF" }} />
          <span style={{ fontSize:12, color:"#555", fontWeight:500 }}>
            {storedName}
            {storedDate && (
              <span style={{ color:"#AAAAAA", fontWeight:400, marginLeft:8 }}>
                · saved {new Date(storedDate).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}
              </span>
            )}
          </span>
          <div style={{ flex:1 }} />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background:"none", border:"1px solid #DEDEDE",
              borderRadius:6, color:"#444", fontSize:11,
              padding:"4px 12px", cursor:"pointer", fontWeight:500,
            }}>
            Replace file
          </button>
          <button
            onClick={handleReset}
            style={{
              background:"none", border:"1px solid #DEDEDE",
              borderRadius:6, color:"#999", fontSize:11,
              padding:"4px 10px", cursor:"pointer",
            }}>
            Clear
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={onFileChange} />
        </div>
      )}

      <div style={{ padding:"24px 28px 56px" }}>

        {/* Upload hero — only when not live */}
        {!isLive && (
          <div style={{ marginBottom:24 }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{
                background: dragOver ? "#F2E6FF" : "#FFFFFF",
                border: `1.5px dashed ${dragOver ? "#A100FF" : "#D9B3FF"}`,
                borderRadius: 12,
                padding: "40px 40px 36px",
                textAlign: "center",
                transition: "all 0.15s",
                cursor: "pointer",
                maxWidth: 560,
                margin: "0 auto",
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{
                width:52, height:52, borderRadius:12,
                background:"#F2E6FF", border:"1px solid #D9B3FF",
                display:"flex", alignItems:"center", justifyContent:"center",
                margin:"0 auto 16px",
              }}>
                <i className="ti ti-file-spreadsheet" style={{ fontSize:26, color:"#A100FF" }} />
              </div>
              <div style={{ fontSize:17, fontWeight:700, color:"#0A0A0A", marginBottom:6, letterSpacing:-0.2 }}>
                Upload your staffing file
              </div>
              <div style={{ fontSize:13, color:"#888", marginBottom:24, lineHeight:1.6 }}>
                Drop your Excel file with the <em>Staffing Plan</em> sheet.
                <br />Your file is stored in your browser — it persists across sessions.
              </div>
              {loading ? (
                <div style={{ fontSize:13, color:"#888" }}>
                  <i className="ti ti-loader-2" style={{ marginRight:6, color:"#A100FF" }} />
                  Parsing file…
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  style={{
                    background:"#A100FF", color:"#FFFFFF", border:"none",
                    borderRadius:8, padding:"9px 24px",
                    fontSize:13, fontWeight:600, cursor:"pointer", letterSpacing:0.2,
                  }}>
                  Choose file
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display:"none" }}
                onChange={onFileChange}
              />
            </div>
            <div style={{
              marginTop:10, background:"#FFFBEB", border:"1px solid #FDE68A",
              borderRadius:8, padding:"7px 14px", fontSize:11,
              color:"#92400E", textAlign:"center",
            }}>
              Showing anonymised sample data — upload your file to see live figures
            </div>
          </div>
        )}

        <StaffingTab
          staffing={staffing}
          isLive={isLive}
          loading={loading}
          storedName={storedName}
          storedDate={storedDate}
          onStaffingUpload={handleUpload}
          liveDetail={liveDetail}
        />
      </div>
    </div>
  );
}
