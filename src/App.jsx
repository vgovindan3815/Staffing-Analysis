import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { STAFFING } from "./data/hardcoded.js";
import { parseStaffingModel } from "./parsers/parseStaffingModel.js";
import { toStaffingShape } from "./compute/mergeData.js";
import { saveFile, loadFile, deleteFile, storedToFile } from "./storage/fileStore.js";
import StaffingTab from "./tabs/StaffingTab.jsx";
import HomeSidebar from "./components/HomeSidebar.jsx";
import Chatbot from "./components/Chatbot.jsx";

const STORAGE_KEY = "staffing-v1";

const BG_APP     = "var(--bg-app)";
const BG_SIDEBAR = "var(--bg-sidebar)";
const BORDER     = "var(--border)";
const TEXT_B     = "var(--text-b)";
const TEXT_M     = "var(--text-m)";

const TABS = [
  { id: "home",     label: "Executive summary" },
  { id: "groups",   label: "Projects" },
  { id: "levels",   label: "Staffing" },
  { id: "pods",     label: "Pods" },
  { id: "pricing",  label: "Cost & financials" },
  { id: "reinvent", label: "Reinvent" },
  { id: "help",     label: "Help" },
];

async function parseFile(file) {
  const buf    = await file.arrayBuffer();
  const wb     = XLSX.read(buf, { type: "array" });
  const parsed = parseStaffingModel(wb);
  const shaped = toStaffingShape(parsed);
  return { staffing: shaped, detail: parsed.detail, monthLabels: parsed.monthLabels };
}

export default function App() {
  const [parsedStaffing, setParsed]   = useState(null);
  const [isLive, setIsLive]           = useState(false);
  const [loading, setLoading]         = useState(true);
  const [storedName, setStoredName]   = useState(null);
  const [storedDate, setStoredDate]   = useState(null);
  const [monthLabels, setMonthLabels] = useState([]);
  const [view, setView]               = useState("home");
  const [margin, setMargin]           = useState(23);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [locFilter, setLocFilter]     = useState(new Set());
  const [theme, setTheme]             = useState(() => localStorage.getItem('sa-theme') || 'dark');
  const resizing = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sa-theme', theme);
  }, [theme]);

  // On mount: try to restore previously uploaded file from IndexedDB
  useEffect(() => {
    loadFile(STORAGE_KEY)
      .then(async (record) => {
        if (!record) return;
        const file = storedToFile(record);
        const data = await parseFile(file);
        setParsed(data);
        setMonthLabels(data.monthLabels ?? []);
        setIsLive(true);
        setStoredName(record.name);
        setStoredDate(record.savedAt);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await parseFile(file);
      await saveFile(STORAGE_KEY, file);
      setParsed(data);
      setMonthLabels(data.monthLabels ?? []);
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

  const startResize = (e) => {
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = sidebarWidth;
    document.addEventListener("mousemove", onResize);
    document.addEventListener("mouseup", stopResize);
  };
  const onResize = (e) => {
    if (!resizing.current) return;
    const delta = e.clientX - startX.current;
    setSidebarWidth(Math.min(480, Math.max(200, startW.current + delta)));
  };
  const stopResize = () => {
    resizing.current = false;
    document.removeEventListener("mousemove", onResize);
    document.removeEventListener("mouseup", stopResize);
  };

  const staffing   = parsedStaffing?.staffing ?? STAFFING;
  const liveDetail = parsedStaffing?.detail   ?? null;

  const filteredDetail = useMemo(() => {
    if (!liveDetail) return null;
    if (locFilter.size === 0) return liveDetail;
    return liveDetail.filter(r => {
      const onshore   = isOnshore(r.location);
      const argentina = isArgentina(r.location);
      const india     = !onshore && !argentina;
      if (locFilter.has("US")        && onshore)    return true;
      if (locFilter.has("India")     && india)       return true;
      if (locFilter.has("Argentina") && argentina)   return true;
      return false;
    });
  }, [liveDetail, locFilter]);

  // Spinner shown only during initial IndexedDB restore
  if (loading && !isLive && !parsedStaffing) {
    return (
      <div style={{ minHeight:"100vh", background:BG_APP, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center", color:"#888" }}>
          <i className="ti ti-loader-2" style={{ fontSize:28, color:"#A100FF", display:"block", marginBottom:10 }} />
          <div style={{ fontSize:13 }}>Restoring last session…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:BG_APP, fontFamily:"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display:"flex", flexDirection:"column" }}>

      {/* Navbar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#0A0A14",
        borderBottom: "2px solid #A100FF",
        padding: "0 28px",
        display: "flex", alignItems: "center", gap: 12, height: 52,
        flexShrink: 0,
      }}>
        <span style={{ color:"#A100FF", fontWeight:800, fontSize:18, letterSpacing:-0.5 }}>◆</span>
        <span style={{ color:"#FFFFFF", fontWeight:600, fontSize:14, letterSpacing:-0.2 }}>Staffing Analysis</span>
        <span style={{ color:"rgba(255,255,255,0.25)", fontSize:11, fontStyle:"italic", fontWeight:400 }}>For internal purpose only</span>
        <div style={{ flex:1 }} />
        {/* Theme toggle — pill switch */}
        <button
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#CBD5E1', fontSize: 11, padding: '4px 8px',
            marginRight: 6,
          }}
        >
          <span style={{ fontSize: 13, opacity: theme === 'light' ? 1 : 0.45 }}>☀️</span>
          <div style={{
            width: 34, height: 18, borderRadius: 9, position: 'relative',
            background: theme === 'dark' ? '#A100FF' : 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2,
              left: theme === 'dark' ? 16 : 2,
              width: 12, height: 12, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 13, opacity: theme === 'dark' ? 1 : 0.45 }}>🌙</span>
        </button>
        {isLive ? (
          <span style={{
            fontSize:11, fontWeight:600, letterSpacing:0.3,
            color:"#16a34a", background:"#052e16",
            border:`1px solid ${BORDER}`,
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
            border:`1px solid ${BORDER}`,
            borderRadius:20, padding:"3px 10px",
          }}>
            Sample data
          </span>
        )}
      </div>

      {/* Tab sub-header */}
      <div style={{
        position: "sticky", top: 52, zIndex: 90,
        background: BG_APP,
        borderBottom: `1px solid ${BORDER}`,
        display: "flex", alignItems: "stretch", height: 44,
        flexShrink: 0,
      }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} style={{
            padding: "0 18px", height: "100%", border: "none", background: "none",
            cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
            fontWeight: view === tab.id ? 600 : 400,
            color: view === tab.id ? "#A100FF" : TEXT_B,
            borderBottom: view === tab.id ? "2px solid #A100FF" : "2px solid transparent",
            transition: "color 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Main content: sidebar + content */}
      <div style={{ display: "flex", flexDirection: "row", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* Sidebar — always visible */}
        <div style={{ width: sidebarWidth, minWidth: 200, maxWidth: 480, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <HomeSidebar
            staffing={staffing}
            costs={filteredDetail ? computeCosts(filteredDetail) : null}
            margin={margin}
            setMargin={setMargin}
            isLive={isLive}
            storedName={storedName}
            storedDate={storedDate}
            onUpload={handleUpload}
            onReset={handleReset}
            liveDetail={filteredDetail}
            locFilter={locFilter}
            setLocFilter={setLocFilter}
            allLocations={["US","India","Argentina"]}
          />
        </div>

        {/* Drag handle */}
        <div onMouseDown={startResize} style={{ width: 4, cursor: "col-resize", background: "rgba(161,0,255,0.12)", flexShrink: 0 }} />

        {/* Content area */}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <StaffingTab
            view={view}
            setView={setView}
            staffing={staffing}
            isLive={isLive}
            loading={loading}
            storedName={storedName}
            storedDate={storedDate}
            liveDetail={filteredDetail}
            monthLabels={monthLabels}
            margin={margin}
            setMargin={setMargin}
          />
        </div>
      </div>

      <Chatbot />

      {/* Footer — privacy notice */}
      <div style={{
        borderTop: `1px solid ${BORDER}`,
        background: BG_SIDEBAR,
        padding: "12px 28px",
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 11, color: TEXT_M,
        flexShrink: 0,
      }}>
        <i className="ti ti-shield-lock" style={{ fontSize: 13, color: "#A100FF", flexShrink: 0 }} />
        <span>
          <strong style={{ color: TEXT_B }}>Privacy notice:</strong> Uploaded files are processed locally in your browser only. No data leaves your device or is stored by this application. Note: if you are using a private or incognito window, the file will not be remembered after you close or refresh the tab.
        </span>
      </div>
    </div>
  );
}

function isOnshore(loc) {
  const u = (loc ?? "").toUpperCase();
  return u === "USA" || u === "US" || u.startsWith("UNITED STATES") || u === "ONSHORE";
}

function isArgentina(loc) {
  const u = (loc ?? "").toUpperCase();
  return u.startsWith("ARGENTINA") || u === "AR";
}

function computeCosts(detail) {
  if (!detail?.length) return null;
  let onCost = 0, offCost = 0, hasData = false;
  for (const r of detail) {
    if (r.billCode == null || !r.totalDays) continue;
    hasData = true;
    const hrs = isOnshore(r.location) ? 8 : 9;
    const cost = r.billCode * r.totalDays * hrs;
    if (isOnshore(r.location)) onCost += cost; else offCost += cost;
  }
  return hasData ? { onCost, offCost, totalCost: onCost + offCost } : null;
}
