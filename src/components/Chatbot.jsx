import { useState, useRef, useEffect } from "react";

const ACCENT = "#A100FF";
const QA = [
  {
    keywords: ["cost", "calculat", "formula"],
    answer: "Cost = LCR ($/hr) × Total Days × hours/day. Onshore (US): 8 hrs/day. Offshore (India / AR / other): 9 hrs/day. The total is shown on the Home dashboard and Pricing tab.",
  },
  {
    keywords: ["lcr", "labour cost", "labor cost", "rate"],
    answer: "LCR (Labour Cost Rate) is the per-hour billing rate for each resource. It is read from the 'LCR' column of your Excel file (column R in the standard template). It takes priority over the Bill Code column.",
  },
  {
    keywords: ["column", "header", "field", "required", "missing"],
    answer: "Required columns: Project, Location, Level Band, LCR, Total FTE, Total Days. Optional but useful: Program, Pod Name, Project Role, Name, Enterprise ID, Bill Code, Cost. See the Help tab for the full list.",
  },
  {
    keywords: ["location", "onshore", "offshore", "india", "argentina", "usa"],
    answer: "Onshore (8 hrs/day): USA, US, United States, Onshore.\nOffshore (9 hrs/day): India, IN, Argentina, AR, or any other location value.",
  },
  {
    keywords: ["level", "band", "grade", "seniority"],
    answer: "Supported level bands: Leadership, 5-Associate Director, 6-Senior Manager, 7-Manager, 8-Associate Manager, 9-Team Lead/Consultant, 10-Senior Analyst, 11-Analyst, 12-Associate. Any band ending with 'Leadership' is normalised automatically.",
  },
  {
    keywords: ["upload", "file", "excel", "import", "how to"],
    answer: "Drop your Excel file on the upload area or click 'Choose file'. The file must have a sheet named exactly 'Staffing Plan'. Columns are detected by header name — order doesn't matter.",
  },
  {
    keywords: ["margin", "price", "pricing", "markup"],
    answer: "Set the target margin % in the Cost section of the sidebar (Home tab) or in the Pricing tab. Price = Total Cost ÷ (1 − margin%). Both tabs share the same margin value.",
  },
  {
    keywords: ["month", "ramp", "timeline", "m1", "m2", "jun", "monthly"],
    answer: "Month columns are auto-detected from your file. They can be labelled M1/M2/... or as actual months like Jun-24, Jul-24. Up to 24 months are supported. The ramp chart on the Home tab shows FTE by month split by onshore/offshore.",
  },
  {
    keywords: ["incognito", "private", "persist", "save", "storage", "refresh"],
    answer: "Your file is stored in browser IndexedDB and survives page refreshes. In private/incognito mode, the file is lost when you close or refresh the tab.",
  },
  {
    keywords: ["named", "tbd", "enterprise id", "eid"],
    answer: "A resource is 'Named' when they have an Enterprise ID filled in. Rows with a blank or 'TBD' Enterprise ID are counted as TBD in the headcount metrics.",
  },
  {
    keywords: ["reinvent", "compliance", "touch", "low touch", "mid touch", "high touch"],
    answer: "The Reinvent compliance tab compares your level mix against Low Touch, Mid Touch, and High Touch staffing model targets. It highlights gaps using colour-coded badges.",
  },
  {
    keywords: ["help", "template", "download", "guide"],
    answer: "The Help tab (in the top navigation) lists all required and optional column names with examples. You can also download staffing_input_template.xlsx from the GitHub repo.",
  },
  {
    keywords: ["pod", "group", "project", "team"],
    answer: "Resources are grouped by the 'Project' column (not Role Group). Each project group can have multiple pods. You can drill into groups and pods in the 'By project' and 'By pod' tabs.",
  },
  {
    keywords: ["format", "xlsx", "xls", "spreadsheet"],
    answer: "The app accepts .xlsx and .xls Excel files. The file must contain a sheet named 'Staffing Plan' with a title row on row 1, column headers on row 2, and data from row 3 onwards.",
  },
  {
    keywords: ["vercel", "deploy", "host", "sharepoint", "online"],
    answer: "The app is fully client-side — no backend. It can be hosted on Vercel, Netlify, GitHub Pages, or any static host. It cannot run directly from SharePoint as SharePoint blocks ES module scripts.",
  },
];

const FALLBACK = "I'm not sure about that. Try asking about: cost calculation, LCR, required columns, location values, level bands, file upload, margin/pricing, monthly ramp, or file format.";

function matchAnswer(input) {
  const lower = input.toLowerCase();
  let best = null, bestCount = 0;
  for (const qa of QA) {
    const count = qa.keywords.filter(k => lower.includes(k)).length;
    if (count > bestCount) { best = qa.answer; bestCount = count; }
  }
  return best ?? FALLBACK;
}

export default function Chatbot() {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I can answer questions about this app. Try asking about cost calculation, required columns, file upload, or pricing." },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const answer = matchAnswer(text);
    setMessages(m => [...m, { role: "user", text }, { role: "bot", text: answer }]);
    setInput("");
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
      {open && (
        <div style={{
          width: 340, background: "#FFFFFF", borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)", border: "1px solid #E8E8E8",
          display: "flex", flexDirection: "column", overflow: "hidden", maxHeight: 480,
        }}>
          {/* Header */}
          <div style={{ background: ACCENT, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "#FFF", fontWeight: 700, fontSize: 14 }}>Staffing Assistant</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Ask me anything about this app</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#FFF", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "8px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                  background: m.role === "user" ? ACCENT : "#F5F5F5",
                  color: m.role === "user" ? "#FFF" : "#111",
                  borderBottomRightRadius: m.role === "user" ? 3 : 10,
                  borderBottomLeftRadius: m.role === "bot" ? 3 : 10,
                  whiteSpace: "pre-wrap",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts */}
          <div style={{ padding: "0 14px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["How is cost calculated?", "What columns are required?", "How does pricing work?"].map(q => (
              <button key={q} onClick={() => { setInput(q); }}
                style={{ fontSize: 11, padding: "4px 8px", background: "#F2E6FF", color: ACCENT, border: "1px solid #D9B3FF", borderRadius: 20, cursor: "pointer", fontWeight: 500 }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "8px 12px 12px", borderTop: "1px solid #F0F0F0", display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask a question…"
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #E0E0E0", borderRadius: 8, fontSize: 13, outline: "none" }}
            />
            <button onClick={send} style={{ background: ACCENT, color: "#FFF", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 52, height: 52, borderRadius: "50%", background: ACCENT, border: "none",
          color: "#FFF", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(161,0,255,0.4)", transition: "transform 0.2s",
        }}
        title="Staffing Assistant"
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
