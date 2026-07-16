import { useState, useEffect, useRef } from "react";

const ACCENT = "#A100FF";

export default function MultiSelect({ options, selected, onChange, placeholder, label }) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const allSelected = selected.size === options.length;

  const toggle = (opt) => {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt); else next.add(opt);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(options));
  const clearAll  = () => onChange(new Set());

  const triggerLabel = selected.size === 0
    ? placeholder
    : `${selected.size} ${label}${selected.size > 1 ? "s" : ""} selected`;

  const hasSelection = selected.size > 0;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12,
          background: hasSelection ? "#F2E6FF" : "#F5F5F5",
          border: `1px solid ${hasSelection ? "#D9B3FF" : "#E0E0E0"}`,
          color: hasSelection ? ACCENT : "#555",
          fontWeight: hasSelection ? 600 : 400,
          whiteSpace: "nowrap",
        }}
      >
        <i className="ti ti-filter" style={{ fontSize: 12 }} />
        {triggerLabel}
        {hasSelection && (
          <span
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
            style={{ marginLeft: 2, color: ACCENT, fontWeight: 700, lineHeight: 1, padding: "0 2px", cursor: "pointer" }}
          >×</span>
        )}
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 11, marginLeft: 2, color: "#AAA" }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 999,
          background: "#FFF", border: "1px solid #E0E0E0", borderRadius: 10,
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)", width: 280,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #F0F0F0" }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: "100%", padding: "6px 10px", borderRadius: 6, fontSize: 12,
                border: "1px solid #E0E0E0", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Select all / Clear */}
          <div style={{ display: "flex", gap: 8, padding: "6px 12px", borderBottom: "1px solid #F0F0F0" }}>
            <button onClick={selectAll} style={{ fontSize: 11, color: ACCENT, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
              Select all
            </button>
            <span style={{ color: "#DDD" }}>|</span>
            <button onClick={clearAll} style={{ fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Clear
            </button>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#AAA" }}>
              {selected.size}/{options.length}
            </span>
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 12, color: "#AAA", textAlign: "center" }}>No matches</div>
            ) : filtered.map(opt => (
              <label key={opt} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer",
                background: selected.has(opt) ? "#F9F0FF" : "transparent",
                borderBottom: "0.5px solid #F5F5F5",
              }}>
                <input
                  type="checkbox"
                  checked={selected.has(opt)}
                  onChange={() => toggle(opt)}
                  style={{ accentColor: ACCENT, width: 14, height: 14, flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: "#333", flex: 1, lineHeight: 1.4 }}>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
