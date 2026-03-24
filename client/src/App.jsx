import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";
import { useMsal } from "@azure/msal-react";
import { loginRequest, EDITOR_GROUP_ID } from "./authConfig";

const BRANCHES = ["All Branches", "Farmingdale", "Bohemia", "Bohemia - Aero"];

const DEMO_ACCOUNTS = [
  { id: 1, name: "Sarah Mitchell",  email: "s.mitchell@company.com",  role: "editor", branch: null,          avatar: "SM" },
  { id: 2, name: "James Kowalski",  email: "j.kowalski@company.com",  role: "editor", branch: null,          avatar: "JK" },
  { id: 3, name: "Dana Reyes",      email: "d.reyes@company.com",     role: "viewer", branch: "Farmingdale", avatar: "DR" },
  { id: 4, name: "Tom Nguyen",      email: "t.nguyen@company.com",    role: "viewer", branch: "Bohemia",     avatar: "TN" },
  { id: 5, name: "Lisa Park",       email: "l.park@company.com",      role: "viewer", branch: null,          avatar: "LP" },
];

const STATUS_CONFIG = {
  "In Transit":        { color: "#2563EB", bg: "#EFF6FF", dot: "#3B82F6", calBg: "#DBEAFE", calColor: "#1D4ED8" },
  "Received":          { color: "#16A34A", bg: "#F0FDF4", dot: "#16A34A", calBg: "#DCFCE7", calColor: "#15803D" },
  "Exception / Issue": { color: "#DC2626", bg: "#FEF2F2", dot: "#DC2626", calBg: "#FEE2E2", calColor: "#B91C1C" },
};

const STATUSES = ["In Transit", "Received", "Exception / Issue"];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const SEED_SUPPLIERS = ["Acme Manufacturing","Global Parts Co.","Pacific Supply Group","Horizon Industrial","Vertex Suppliers LLC","Blue Ridge Materials"];
const SEED_CARRIERS  = ["FedEx Freight","UPS Freight","XPO Logistics","Estes Express","Old Dominion","R+L Carriers","Saia","ABF Freight","Southeastern Freight Lines","Peninsula Truck Lines"];

const TIME_SLOTS = (() => {
  const slots = [{ label: "-- Select --", value: "" }];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const ampm = h >= 12 ? "PM" : "AM";
      const hour = h % 12 === 0 ? 12 : h % 12;
      const min  = m === 0 ? "00" : "30";
      const val  = `${String(h).padStart(2,"0")}:${min}`;
      slots.push({ label: `${hour}:${min} ${ampm}`, value: val });
    }
  }
  return slots;
})();

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatTimeWindow(start, end) {
  const s = formatTime(start), e = formatTime(end);
  if (s && e) return `${s} – ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return null;
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onMicrosoftLogin }) {
  const [showLocal, setShowLocal] = useState(false);
  const [localUser, setLocalUser] = useState("");
  const [localPass, setLocalPass] = useState("");
  const [localError, setLocalError] = useState("");
  const [hovered, setHovered] = useState(null);
  const [step, setStep] = useState("landing");

  const LOCAL_ADMIN = { username: "admin", password: "Johnstone2024!" };

  const handleLocalLogin = () => {
    if (localUser === LOCAL_ADMIN.username && localPass === LOCAL_ADMIN.password) {
      onLogin({ id: 0, name: "Admin", email: "admin@local", role: "editor", branch: null, avatar: "AD" });
    } else {
      setLocalError("Incorrect username or password.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #1a3a6b 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/logo.png" alt="Johnstone Supply" style={{ height: 80, width: "auto", margin: "0 auto 16px", display: "block" }} />
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 26 }}>Johnstone Supply ShipTrack</div>
          <div style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>Inbound Logistics Portal</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.35)" }}>
          {!showLocal ? (
            <>
              {step === "landing" ? (
                <div style={{ padding: "40px 40px 36px" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>Welcome back</div>
                  <div style={{ fontSize: 14, color: "#64748B", marginBottom: 32 }}>Sign in to access your shipment dashboard.</div>
                  <button onClick={onMicrosoftLogin} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "13px 20px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    <svg width="20" height="20" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
                    Sign in with Microsoft
                  </button>
                  <div style={{ textAlign: "center", marginTop: 24, color: "#94A3B8", fontSize: 12 }}>Microsoft Entra ID (Azure AD) · Single Sign-On</div>
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <button onClick={() => setStep("demo")} style={{ background: "none", border: "none", color: "#CBD5E1", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Demo access</button>
                    {" · "}
                    <button onClick={() => setShowLocal(true)} style={{ background: "none", border: "none", color: "#CBD5E1", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Emergency access</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>Demo accounts</div>
                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Select a demo account to preview permission levels</div>
                  </div>
                  {DEMO_ACCOUNTS.map(a => (
                    <button key={a.id} onClick={() => onLogin(a)} onMouseEnter={() => setHovered(a.id)} onMouseLeave={() => setHovered(null)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "12px 28px", border: "none", background: hovered === a.id ? "#F8FAFC" : "transparent", cursor: "pointer", fontFamily: "inherit" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #0F172A, #1E3A5F)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{a.avatar}</div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{a.email}</div>
                      </div>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: a.role === "editor" ? "#EFF6FF" : "#F1F5F9", color: a.role === "editor" ? "#2563EB" : "#64748B" }}>{a.role}</span>
                    </button>
                  ))}
                  <div style={{ padding: "10px 28px 18px" }}>
                    <button onClick={() => setStep("landing")} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: "36px 40px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Emergency Access</div>
              <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 24 }}>For authorized administrators only.</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Username</label>
                <input value={localUser} onChange={e => { setLocalUser(e.target.value); setLocalError(""); }} placeholder="Username" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0F172A", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div style={{ marginBottom: 6 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Password</label>
                <input type="password" value={localPass} onChange={e => { setLocalPass(e.target.value); setLocalError(""); }} onKeyDown={e => e.key === "Enter" && handleLocalLogin()} placeholder="Password" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${localError ? "#DC2626" : "#E2E8F0"}`, fontSize: 14, color: "#0F172A", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
                {localError && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4, fontWeight: 600 }}>⚠ {localError}</div>}
              </div>
              <button onClick={handleLocalLogin} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #0F172A, #1E3A5F)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 16 }}>Sign In</button>
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button onClick={() => { setShowLocal(false); setLocalError(""); setLocalUser(""); setLocalPass(""); }} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>← Back to Microsoft login</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {};
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />{status}
    </span>
  );
}

// ─── Combobox ─────────────────────────────────────────────────────────────────
function Combobox({ value, onChange, options, placeholder, onAddOption }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");

  useEffect(() => { setQuery(value || ""); }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    return options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
  }, [query, options]);

  const showAddNew = query.trim() && !options.some(o => o.toLowerCase() === query.trim().toLowerCase());

  const select = (val) => { onChange(val); setQuery(val); setOpen(false); };
  const addNew = () => { const val = query.trim(); if (val) { onAddOption(val); select(val); } };

  const handleKey = (e) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter") { e.preventDefault(); if (filtered.length > 0) select(filtered[0]); else if (showAddNew) addNew(); }
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input value={query} onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={handleKey} placeholder={placeholder}
          style={{ width: "100%", padding: "10px 36px 10px 12px", borderRadius: 8, border: `1.5px solid ${open ? "#3B82F6" : "#E2E8F0"}`, fontSize: 14, color: "#0F172A", outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#fff" }} />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", fontSize: 12, pointerEvents: "none" }}>▾</span>
      </div>
      {open && (filtered.length > 0 || showAddNew) && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1.5px solid #E2E8F0", zIndex: 999, overflow: "hidden", maxHeight: 220, overflowY: "auto" }}>
          {filtered.map(opt => (
            <button key={opt} onMouseDown={() => select(opt)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: opt === value ? "#EFF6FF" : "transparent", color: opt === value ? "#2563EB" : "#0F172A", fontSize: 13, fontWeight: opt === value ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
              {opt === value && <span style={{ marginRight: 6 }}>✓</span>}{opt}
            </button>
          ))}
          {showAddNew && (
            <>
              {filtered.length > 0 && <div style={{ height: 1, background: "#F1F5F9", margin: "4px 0" }} />}
              <button onMouseDown={addNew} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "transparent", color: "#16A34A", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#DCFCE7", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>+</span>
                Add "{query.trim()}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ shipment: s, onClose, onEdit, canEdit }) {
  const window2 = formatTimeWindow(s.etaStart, s.etaEnd);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, boxShadow: "0 25px 60px rgba(0,0,0,0.2)", overflow: "hidden", fontFamily: "'DM Sans', sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 4 }}>{s.id} · {s.branch}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{s.supplier}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: "#fff", fontSize: 20, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ marginBottom: 18 }}><StatusBadge status={s.status} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {[["PO Number", s.po], ["Pieces / Skids", s.pieces || "—"], ["Carrier", s.carrier], ["Contact Name", s.carrierContact || "—"]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#0F172A", fontFamily: label.includes("PO") ? "'DM Mono', monospace" : "inherit" }}>{val}</div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Expected Delivery</div>
              <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>{formatDate(s.eta)}</div>
              {window2 && <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>🕐 {window2}</div>}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Phone</div>
              {s.carrierPhone ? <a href={`tel:${s.carrierPhone}`} style={{ fontSize: 13, color: "#2563EB", textDecoration: "none" }}>{s.carrierPhone}</a> : <div style={{ fontSize: 13, color: "#0F172A" }}>—</div>}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Tracking #</div>
              <div style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#94A3B8", wordBreak: "break-all" }}>{s.tracking}</div>
            </div>
          </div>
          {s.notes && <div style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, fontSize: 13, color: "#475569", marginBottom: 16 }}><span style={{ fontWeight: 600, color: "#64748B" }}>Notes: </span>{s.notes}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
            {canEdit && <button onClick={() => onEdit(s)} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #0F172A, #1E3A5F)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Edit Shipment</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ shipment, onClose, onSave, onDelete, isNew, suppliers, carriers, onAddSupplier, onAddCarrier }) {
  const blank = { branch: "Farmingdale", supplier: "", po: "", carrier: "", carrierPhone: "", carrierContact: "", tracking: "", pieces: "", eta: "", etaStart: "", etaEnd: "", status: "In Transit", notes: "" };
  const [form, setForm] = useState(shipment || blank);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })); };

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0F172A", outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#fff" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 };
  const errStyle   = { fontSize: 11, color: "#DC2626", marginTop: 4, fontWeight: 600 };
  const req = <span style={{ color: "#DC2626" }}> *</span>;
  const borderErr = (k) => ({ ...inputStyle, borderColor: errors[k] ? "#DC2626" : "#E2E8F0" });

  const validate = () => {
    const e = {};
    if (!form.supplier.trim()) e.supplier = "Required";
    if (!form.po.trim())       e.po       = "Required";
    if (!form.carrier.trim())  e.carrier  = "Required";
    if (!form.tracking.trim()) e.tracking = "Required";
    if (!form.eta)             e.eta      = "Required";
    if (!form.etaStart)        e.etaStart = "Required";
    if (!form.etaEnd)          e.etaEnd   = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => { if (validate()) onSave(form); };

  const timeSelect = (key) => (
    <select value={form[key]} onChange={e => set(key, e.target.value)} style={{ ...borderErr(key), appearance: "none", WebkitAppearance: "none" }}>
      {TIME_SLOTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.18)", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)", padding: "22px 28px", flexShrink: 0 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 4 }}>{isNew ? "New Shipment" : `Editing ${form.id}`}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{isNew ? "Add Shipment" : "Edit Shipment"}</div>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Branch{req}</label>
            <select value={form.branch} onChange={e => set("branch", e.target.value)} style={inputStyle}>
              {BRANCHES.filter(b => b !== "All Branches").map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Supplier / Vendor{req}</label>
              <Combobox value={form.supplier} onChange={v => set("supplier", v)} options={suppliers} placeholder="e.g. Acme Manufacturing" onAddOption={onAddSupplier} />
              {errors.supplier && <div style={errStyle}>⚠ {errors.supplier}</div>}
            </div>
            <div>
              <label style={labelStyle}>PO Number{req}</label>
              <input value={form.po} onChange={e => set("po", e.target.value)} placeholder="e.g. PO-2024-0441" style={borderErr("po")} />
              {errors.po && <div style={errStyle}>⚠ {errors.po}</div>}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Pieces / Skids</label>
            <input value={form.pieces} onChange={e => set("pieces", e.target.value)} placeholder="e.g. 42 skids, 10 pieces" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Carrier{req}</label>
            <Combobox value={form.carrier} onChange={v => set("carrier", v)} options={carriers} placeholder="e.g. FedEx Freight" onAddOption={onAddCarrier} />
            {errors.carrier && <div style={errStyle}>⚠ {errors.carrier}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Contact Name</label>
              <input value={form.carrierContact} onChange={e => set("carrierContact", e.target.value)} placeholder="e.g. Mike Torres" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input value={form.carrierPhone} onChange={e => set("carrierPhone", e.target.value)} placeholder="e.g. 800-463-3339" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tracking Number{req}</label>
            <input value={form.tracking} onChange={e => set("tracking", e.target.value)} placeholder="e.g. 7489234701984" style={borderErr("tracking")} />
            {errors.tracking && <div style={errStyle}>⚠ {errors.tracking}</div>}
          </div>
          <div>
            <label style={labelStyle}>Expected Delivery</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 5 }}>Date{req}</div>
                <input type="date" value={form.eta} onChange={e => set("eta", e.target.value)} style={borderErr("eta")} />
                {errors.eta && <div style={errStyle}>⚠ {errors.eta}</div>}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 5 }}>Time From{req}</div>
                {timeSelect("etaStart")}
                {errors.etaStart && <div style={errStyle}>⚠ {errors.etaStart}</div>}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 5 }}>Time To{req}</div>
                {timeSelect("etaEnd")}
                {errors.etaEnd && <div style={errStyle}>⚠ {errors.etaEnd}</div>}
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Any additional notes..." style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>
        <div style={{ padding: "16px 28px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0, background: "#fff" }}>
          {!isNew && onDelete && (
            <button onClick={() => onDelete(form.id)} style={{ padding: "10px 20px", borderRadius: 8, border: "1.5px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginRight: "auto" }}>Delete Shipment</button>
          )}
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #0F172A, #1E3A5F)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{isNew ? "Add Shipment" : "Save Changes"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ shipments, onSelectShipment }) {
  const today = new Date();
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calMode, setCalMode]   = useState("month");
  const [weekOffset, setWeekOffset] = useState(0);

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const totalCells  = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const getWeekStart = (offset) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + offset * 7);
    d.setHours(0,0,0,0);
    return d;
  };
  const weekStart = getWeekStart(weekOffset);
  const weekDays  = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
  const weekLabel = () => {
    const s = weekDays[0], e = weekDays[6];
    if (s.getMonth() === e.getMonth()) return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
    return `${MONTHS_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTHS_SHORT[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  };

  const shipmentsByDate = useMemo(() => {
    const map = {};
    shipments.forEach(s => { if (!map[s.eta]) map[s.eta] = []; map[s.eta].push(s); });
    return map;
  }, [shipments]);

  const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y=>y-1); } else setCalMonth(m=>m-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y=>y+1); } else setCalMonth(m=>m+1); };

  const ShipChip = ({ s }) => {
    const cfg = STATUS_CONFIG[s.status] || {};
    const win = formatTimeWindow(s.etaStart, s.etaEnd);
    return (
      <button onClick={() => onSelectShipment(s)} style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 7px", borderRadius: 5, background: cfg.calBg, color: cfg.calColor, border: `1px solid ${cfg.calColor}22`, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4, overflow: "hidden", marginBottom: 3 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>📦 {s.supplier}</div>
        {win && <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.85, marginTop: 1 }}>🕐 {win}</div>}
        {s.pieces && <div style={{ fontSize: 9, opacity: 0.75, marginTop: 1 }}>📋 {s.pieces}</div>}
      </button>
    );
  };

  const monthCells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    const mm = String(calMonth+1).padStart(2,"0"), dd = String(dayNum).padStart(2,"0");
    const dateStr = `${calYear}-${mm}-${dd}`;
    const isToday = today.getFullYear()===calYear && today.getMonth()===calMonth && today.getDate()===dayNum;
    return { dayNum, dateStr, isToday, ships: shipmentsByDate[dateStr] || [] };
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={calMode==="month" ? prevMonth : () => setWeekOffset(o=>o-1)} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>‹</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{calMode==="month" ? `${MONTHS[calMonth]} ${calYear}` : weekLabel()}</div>
          <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 8, padding: 3, gap: 2 }}>
            {[["month","Month"],["week","Week"]].map(([m,l]) => (
              <button key={m} onClick={() => setCalMode(m)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: calMode===m ? "#fff" : "transparent", color: calMode===m ? "#0F172A" : "#94A3B8", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
            ))}
          </div>
        </div>
        <button onClick={calMode==="month" ? nextMonth : () => setWeekOffset(o=>o+1)} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>›</button>
      </div>

      {calMode === "month" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
            {DAYS_OF_WEEK.map(d => <div key={d} style={{ textAlign: "center", padding: "6px 0", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>{d}</div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {monthCells.map((cell, i) => (
              <div key={i} style={{ minHeight: 100, background: cell===null ? "transparent" : cell.isToday ? "#F0F7FF" : "#FAFBFC", borderRadius: 8, border: cell===null ? "none" : cell.isToday ? "2px solid #3B82F6" : "1.5px solid #E2E8F0", padding: cell===null ? 0 : "6px 5px", boxSizing: "border-box" }}>
                {cell !== null && (
                  <>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: cell.isToday ? "#3B82F6" : "transparent", color: cell.isToday ? "#fff" : "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: cell.isToday ? 800 : 500 }}>{cell.dayNum}</span>
                    </div>
                    {cell.ships.map(s => <ShipChip key={s.id} s={s} />)}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {calMode === "week" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <div key={i} style={{ textAlign: "center", padding: "8px 4px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{DAYS_SHORT[i]}</div>
                  <div style={{ marginTop: 4, width: 30, height: 30, borderRadius: "50%", background: isToday ? "#3B82F6" : "transparent", color: isToday ? "#fff" : "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: isToday ? 800 : 600, margin: "4px auto 0" }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              const ships = shipmentsByDate[toDateStr(d)] || [];
              return (
                <div key={i} style={{ minHeight: 160, background: isToday ? "#F0F7FF" : "#FAFBFC", borderRadius: 10, border: isToday ? "2px solid #3B82F6" : "1.5px solid #E2E8F0", padding: "10px 7px", boxSizing: "border-box" }}>
                  {ships.length === 0 ? <div style={{ fontSize: 11, color: "#E2E8F0", textAlign: "center", marginTop: 20 }}>—</div> : ships.map(s => <ShipChip key={s.id} s={s} />)}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
        {STATUSES.map(s => { const cfg = STATUS_CONFIG[s]; return <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: cfg.calBg, border: `1.5px solid ${cfg.calColor}`, flexShrink: 0 }} /><span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>{s}</span></div>; })}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8" }}>Click any shipment to view details</div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [shipments, setShipments]     = useState([]);
  const [suppliers, setSuppliers]     = useState(SEED_SUPPLIERS);
  const [carriers, setCarriers]       = useState(SEED_CARRIERS);
  const [loading, setLoading]         = useState(true);
  const [branch, setBranch]           = useState("All Branches");
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [editing, setEditing]         = useState(null);
  const [adding, setAdding]           = useState(false);
  const [viewing, setViewing]         = useState(null);
  const [selected, setSelected]       = useState(null);
  const [view, setView]               = useState("calendar");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { instance } = useMsal();

  // Handle Microsoft redirect response
  useEffect(() => {
    instance.handleRedirectPromise().then(result => {
      if (result) {
        const groups = result.idTokenClaims?.groups || [];
        const isEditor = groups.includes(EDITOR_GROUP_ID);
        setCurrentUser({
          id: result.account.localAccountId,
          name: result.account.name,
          email: result.account.username,
          role: isEditor ? "editor" : "viewer",
          branch: null,
          avatar: result.account.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
        });
      }
    }).catch(e => console.error(e));
  }, [instance]);

  // Load data from Supabase when user logs in
  useEffect(() => {
    if (!currentUser) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: shipData } = await supabase.from("shipments").select("*");
      const { data: supData }  = await supabase.from("suppliers").select("name");
      const { data: carData }  = await supabase.from("carriers").select("name");
      if (shipData) setShipments(shipData);
      if (supData && supData.length > 0) setSuppliers(supData.map(r => r.name));
      if (carData && carData.length > 0) setCarriers(carData.map(r => r.name));
      setLoading(false);
    };
    fetchData();
  }, [currentUser]);

  const canEdit = currentUser?.role === "editor";

  const handleLogin  = (a) => { setCurrentUser(a); if (a.branch) setBranch(a.branch); };
  const handleLogout = () => { setCurrentUser(null); setBranch("All Branches"); setUserMenuOpen(false); setSelected(null); instance.logoutRedirect().catch(e => console.error(e)); };

  const handleMicrosoftLogin = async () => {
    try {
      await instance.loginRedirect(loginRequest);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const branchShipments = useMemo(() => branch === "All Branches" ? shipments : shipments.filter(s => s.branch === branch), [shipments, branch]);

  const filtered = useMemo(() => branchShipments.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || [s.supplier, s.po, s.carrier, s.tracking, s.id, s.carrierContact, s.carrierPhone, s.pieces].some(v => v && v.toLowerCase().includes(q));
    return matchSearch && (filterStatus === "All" || s.status === filterStatus);
  }), [branchShipments, search, filterStatus]);

  const handleSave = async (form) => {
    if (adding) {
      const newId = `SHP-${String(shipments.length + 1).padStart(3, "0")}`;
      const newShipment = { ...form, id: newId };
      await supabase.from("shipments").insert([newShipment]);
      setShipments(s => [...s, newShipment]);
      setAdding(false);
    } else {
      await supabase.from("shipments").update(form).eq("id", form.id);
      setShipments(s => s.map(sh => sh.id === form.id ? form : sh));
      setEditing(null);
    }
  };

  const handleAddSupplier = async (name) => {
    await supabase.from("suppliers").insert([{ name }]);
    setSuppliers(s => [...s, name].sort());
  };

  const handleAddCarrier = async (name) => {
    await supabase.from("carriers").insert([{ name }]);
    setCarriers(c => [...c, name].sort());
  };

  const handleDelete = async (shipmentId) => {
    if (!window.confirm("Are you sure you want to delete this shipment? This cannot be undone.")) return;
    await supabase.from("shipments").delete().eq("id", shipmentId);
    setShipments(s => s.filter(sh => sh.id !== shipmentId));
    if (selected?.id === shipmentId) setSelected(null);
    setEditing(null);
    setViewing(null);
  };

  const isOverdue = (s) => s.status !== "Received" && new Date(s.eta) < new Date();
  const handleEditFromDetail = (s) => { setViewing(null); setEditing(s); };

  if (!currentUser) return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <LoginScreen onLogin={handleLogin} onMicrosoftLogin={handleMicrosoftLogin} />
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)", padding: "0 32px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="Johnstone Supply" style={{ height: 44, width: "auto" }} />
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Johnstone Supply ShipTrack</div>
              <div style={{ color: "#94A3B8", fontSize: 11, letterSpacing: "0.06em" }}>INBOUND LOGISTICS</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: 3, gap: 2 }}>
              {[["list","≡  List"],["calendar","⊞  Calendar"]].map(([v,l]) => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: view===v ? "#fff" : "transparent", color: view===v ? "#0F172A" : "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
              ))}
            </div>
            {canEdit && (
              <button onClick={() => setAdding(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Shipment
              </button>
            )}
            <div style={{ position: "relative" }}>
              <button onClick={() => setUserMenuOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 5px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>{currentUser.avatar}</div>
                <div><div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{currentUser.name.split(" ")[0]}</div><div style={{ color: "#94A3B8", fontSize: 10, textTransform: "capitalize" }}>{currentUser.role}</div></div>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>▾</span>
              </button>
              {userMenuOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", width: 220, zIndex: 200, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{currentUser.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{currentUser.email}</div>
                    <div style={{ marginTop: 8, display: "inline-flex", padding: "2px 8px", borderRadius: 10, background: canEdit ? "#EFF6FF" : "#F1F5F9", color: canEdit ? "#2563EB" : "#64748B", fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{canEdit ? "✏️ Editor" : "👁 Viewer"}</div>
                  </div>
                  <button onClick={handleLogout} style={{ width: "100%", padding: "12px 16px", border: "none", background: "none", textAlign: "left", fontSize: 13, color: "#DC2626", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "28px 32px" }} onClick={() => setUserMenuOpen(false)}>

        {!canEdit && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 10, background: "#F8FAFC", border: "1.5px solid #E2E8F0", marginBottom: 20, fontSize: 13, color: "#64748B" }}>
            👁 <span>You have <strong>view-only</strong> access. Contact an administrator to request edit permissions.</span>
          </div>
        )}

        {/* Branch Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>Branch</span>
          <div style={{ position: "relative" }}>
            <select value={branch} onChange={e => { setBranch(e.target.value); setSelected(null); setFilterStatus("All"); }} style={{ appearance: "none", WebkitAppearance: "none", padding: "9px 36px 9px 14px", borderRadius: 10, border: "1.5px solid #CBD5E1", background: "#fff", color: "#0F172A", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", outline: "none", minWidth: 180 }}>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#64748B", fontSize: 12 }}>▾</span>
          </div>
          {branch !== "All Branches" && <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "linear-gradient(135deg, #0F172A, #1E3A5F)", color: "#fff", fontSize: 12, fontWeight: 600 }}>📍 {branch}</div>}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          {view === "list" && (
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier, PO, carrier, contact..." style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0F172A", outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: "#fff" }} />
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {["All","In Transit","Received","Exception / Issue"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid", borderColor: filterStatus===s ? "#0F172A" : "#E2E8F0", background: filterStatus===s ? "#0F172A" : "#fff", color: filterStatus===s ? "#fff" : "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{s}</button>
            ))}
          </div>
        </div>

        {/* LIST VIEW */}
        {view === "list" && (
          <>
            {loading ? (
              <div style={{ textAlign: "center", padding: 48, color: "#94A3B8", fontSize: 14 }}>Loading shipments...</div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                      {["ID", ...(branch==="All Branches" ? ["Branch"] : []), "Supplier", "PO #", "Pieces/Skids", "Carrier", "Contact", "Phone", "Delivery Window", "Status", ...(canEdit ? [""] : [])].map(h => (
                        <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && <tr><td colSpan={12} style={{ padding: 48, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No shipments found.</td></tr>}
                    {filtered.map((s, i) => {
                      const win = formatTimeWindow(s.etaStart, s.etaEnd);
                      return (
                        <tr key={s.id} onClick={() => setSelected(selected?.id===s.id ? null : s)} style={{ borderBottom: "1px solid #F1F5F9", background: selected?.id===s.id ? "#F8FAFF" : i%2===0 ? "#fff" : "#FAFBFC", cursor: "pointer" }}>
                          <td style={{ padding: "12px 14px" }}><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#64748B" }}>{s.id}</span></td>
                          {branch === "All Branches" && <td style={{ padding: "12px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 6, background: "#F1F5F9", color: "#475569", fontSize: 11, fontWeight: 700 }}>{s.branch}</span></td>}
                          <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{s.supplier}</td>
                          <td style={{ padding: "12px 14px" }}><span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#475569" }}>{s.po}</span></td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569", fontWeight: 600 }}>{s.pieces || "—"}</td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569" }}>{s.carrier}</td>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: "#475569" }}>{s.carrierContact || "—"}</td>
                          <td style={{ padding: "12px 14px", fontSize: 12 }}>{s.carrierPhone ? <a href={`tel:${s.carrierPhone}`} style={{ color: "#2563EB", textDecoration: "none" }} onClick={e=>e.stopPropagation()}>{s.carrierPhone}</a> : "—"}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <div style={{ fontSize: 12, color: isOverdue(s) ? "#DC2626" : "#0F172A", fontWeight: 600 }}>{formatDate(s.eta)}{isOverdue(s) ? " ⚠" : ""}</div>
                            {win && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>🕐 {win}</div>}
                          </td>
                          <td style={{ padding: "12px 14px" }}><StatusBadge status={s.status} /></td>
                          {canEdit && (
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={e => { e.stopPropagation(); setEditing(s); }} style={{ padding: "5px 12px", borderRadius: 6, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                                <button onClick={e => { e.stopPropagation(); handleDelete(s.id); }} style={{ padding: "5px 12px", borderRadius: 6, border: "1.5px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selected && (
              <div style={{ marginTop: 16, background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", padding: "20px 24px", borderLeft: `4px solid ${STATUS_CONFIG[selected.status]?.dot}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Shipment Detail · {selected.branch}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{selected.supplier}</div>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
                  {[["PO Number", selected.po], ["Pieces / Skids", selected.pieces || "—"], ["Carrier", selected.carrier], ["Contact", selected.carrierContact || "—"]].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, color: "#0F172A", fontFamily: label.includes("PO") ? "'DM Mono', monospace" : "inherit" }}>{val}</div>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Delivery Window</div>
                    <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>{formatDate(selected.eta)}</div>
                    {formatTimeWindow(selected.etaStart, selected.etaEnd) && <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>🕐 {formatTimeWindow(selected.etaStart, selected.etaEnd)}</div>}
                  </div>
                </div>
                {selected.notes && <div style={{ marginTop: 14, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, fontSize: 13, color: "#475569" }}><span style={{ fontWeight: 600, color: "#64748B" }}>Notes: </span>{selected.notes}</div>}
              </div>
            )}
            <div style={{ marginTop: 12, color: "#94A3B8", fontSize: 12, textAlign: "right" }}>Showing {filtered.length} of {branchShipments.length} shipments{branch!=="All Branches" ? ` · ${branch}` : ""}</div>
          </>
        )}

        {/* CALENDAR VIEW */}
        {view === "calendar" && (
          <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", padding: "24px 28px" }}>
            <CalendarView shipments={filtered} onSelectShipment={setViewing} />
          </div>
        )}
      </div>

      {viewing && <DetailModal shipment={viewing} onClose={() => setViewing(null)} onEdit={handleEditFromDetail} canEdit={canEdit} />}
      {(editing || adding) && <EditModal shipment={editing} isNew={adding} onClose={() => { setEditing(null); setAdding(false); }} onSave={handleSave} onDelete={handleDelete} suppliers={suppliers} carriers={carriers} onAddSupplier={handleAddSupplier} onAddCarrier={handleAddCarrier} />}
    </div>
  );
}