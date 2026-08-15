import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search, MapPin, Briefcase, Calendar, Bookmark, BookmarkCheck, ExternalLink,
  X, Menu, Sun, Moon, User, LogOut, Plus, Edit2, Trash2, Eye, Clock,
  CheckCircle2, AlertCircle, Building2, GraduationCap, TrendingUp, RefreshCw,
  ChevronDown, LayoutGrid, List, Loader2, Mail, Lock, EyeOff, ArrowRight,
  Sparkles, Users, Filter as FilterIcon, ShieldCheck, Ticket, ShieldAlert,
  KeyRound, Image as ImageIcon, UserCheck, Crown, Inbox, Check, Ban
} from "lucide-react";

/* ============================================================
   CONSTANTS
============================================================ */
const YEARS = [2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029];
const JOB_TYPES = ["Full-time", "Internship", "Part-time", "Contract"];
const WORK_MODES = ["Onsite", "Remote", "Hybrid"];
const EXPERIENCE = ["Fresher", "0-1 yrs", "1-3 yrs", "3-5 yrs", "5+ yrs"];
const PAGE_SIZE = 9;
const SUPER_ADMIN = "giridharchitirala@gmail.com";
const DEFAULT_ADMINS = ["giridharchitirala@gmail.com", "chitiralagiridhar@gmail.com", "shanmukgiridhar@gmail.com"];

const THEME = {
  light: {
    "--bg": "#F7F5F0", "--bg-alt": "#FFFFFF", "--card": "#FFFFFF", "--card-alt": "#FFFBF0",
    "--ink": "#14213D", "--ink-soft": "#4A5568", "--muted": "#93927f",
    "--accent": "#FFB627", "--accent-ink": "#5C3D00", "--accent2": "#E85D4C",
    "--border": "#E6E1D3", "--success": "#1F8A4C", "--danger": "#D6453B", "--shadow": "0 1px 2px rgba(20,33,61,0.06)"
  },
  dark: {
    "--bg": "#0E1420", "--bg-alt": "#131A29", "--card": "#161E30", "--card-alt": "#1B2438",
    "--ink": "#EDEFF5", "--ink-soft": "#B8BFCF", "--muted": "#6B7488",
    "--accent": "#FFB627", "--accent-ink": "#2A1C00", "--accent2": "#FF7A64",
    "--border": "#26304A", "--success": "#4ADE80", "--danger": "#FF6B6B", "--shadow": "0 1px 2px rgba(0,0,0,0.4)"
  }
};
const RAINBOW = ["#E85D4C", "#FFB627", "#1F8A4C", "#3B82F6", "#A855F7", "#EC4899", "#F59E0B", "#14B8A6"];

/* ============================================================
   HELPERS
============================================================ */
const uid = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const obf = (s) => { try { return btoa(unescape(encodeURIComponent(s))); } catch { return s; } };
const isValidUrl = (s) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(s.trim());
const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};
const daysLeft = (deadline) => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
};
const hueFromString = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
};
const initials = (name) => (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("");
const isAdminUser = (u) => !!u && (DEFAULT_ADMINS.includes(u.username) || u.isAdmin === true);
const isSuperAdminUser = (u) => !!u && u.username === SUPER_ADMIN;

/* ============================================================
   SMALL UI PRIMITIVES
============================================================ */
function Avatar({ name, size = 36 }) {
  const hue = hueFromString(name || "user");
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: `hsl(${hue} 55% 42%)`, color: "#fff",
        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
        fontSize: size * 0.38, flexShrink: 0
      }}
      className="flex items-center justify-center"
    >
      {initials(name)}
    </div>
  );
}

function CompanyLogo({ job, size = 38 }) {
  const [broken, setBroken] = useState(false);
  if (job.imageUrl && !broken) {
    return (
      <img
        src={job.imageUrl}
        alt={`${job.companyName} logo`}
        onError={() => setBroken(true)}
        style={{ width: size, height: size, borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
      />
    );
  }
  return <Avatar name={job.companyName} size={size} />;
}

function ColorfulText({ text }) {
  const words = text.split(" ");
  let idx = 0;
  return (
    <span className="display-font font-bold">
      {words.map((w, wi) => (
        <span key={wi}>
          {w.split("").map((ch) => {
            const c = RAINBOW[idx % RAINBOW.length];
            idx++;
            return <span key={idx} style={{ color: c }}>{ch}</span>;
          })}
          {wi < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: { background: "var(--card-alt)", color: "var(--ink-soft)", border: "1px solid var(--border)" },
    accent: { background: "var(--accent)", color: "var(--accent-ink)" },
    success: { background: "rgba(31,138,76,0.12)", color: "var(--success)" },
    danger: { background: "rgba(214,69,59,0.12)", color: "var(--danger)" },
    outline: { background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--border)" }
  };
  return (
    <span
      style={{ ...tones[tone], fontFamily: "'IBM Plex Mono', monospace" }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  );
}

function IconBtn({ icon: Icon, onClick, active, label, danger }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        border: "1px solid var(--border)",
        background: active ? "var(--accent)" : "var(--card)",
        color: active ? "var(--accent-ink)" : danger ? "var(--danger)" : "var(--ink-soft)"
      }}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
    >
      <Icon size={16} />
    </button>
  );
}

function Toasts({ toasts, remove }) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            background: "var(--card)", border: `1px solid var(--border)`,
            borderLeft: `4px solid ${t.type === "error" ? "var(--danger)" : t.type === "success" ? "var(--success)" : "var(--accent)"}`,
            color: "var(--ink)", boxShadow: "var(--shadow)"
          }}
          className="rounded-lg px-4 py-3 text-sm flex items-start gap-2 animate-[fadein_.2s_ease]"
        >
          {t.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: "var(--success)" }} /> :
           t.type === "error" ? <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--danger)" }} /> :
           <Sparkles size={16} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="shrink-0 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   JOB CARD  (ticket-stub / placement-badge signature design)
============================================================ */
function JobCard({ job, onOpen, onApply, onSave, saved, applied, onEdit, onDelete, isOwner, compact, canModerate }) {
  const isNew = Date.now() - new Date(job.postedAt).getTime() < 86400000;
  const dl = daysLeft(job.deadline);
  const expired = dl !== null && dl < 0;

  return (
    <div
      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
      className={`rounded-2xl overflow-hidden flex ${compact ? "flex-row items-stretch" : "flex-col"} transition-transform hover:-translate-y-0.5`}
    >
      <div onClick={() => onOpen(job)} className={`p-5 flex-1 cursor-pointer ${compact ? "flex items-center gap-4" : ""}`}>
        <div className={compact ? "flex items-center gap-3 flex-1 min-w-0" : ""}>
          <div className="flex items-center gap-3 mb-2">
            <CompanyLogo job={job} size={38} />
            <div className="min-w-0">
              <p style={{ color: "var(--ink)" }} className="font-semibold leading-tight truncate">{job.title || job.companyName}</p>
              <p style={{ color: "var(--ink-soft)", fontFamily: "'IBM Plex Mono', monospace" }} className="text-xs truncate">{job.companyName}</p>
            </div>
            {isNew && <Badge tone="accent">NEW</Badge>}
            {expired && <Badge tone="danger">EXPIRED</Badge>}
          </div>
          {!compact && job.description && (
            <p style={{ color: "var(--ink-soft)" }} className="text-sm line-clamp-2 mb-3">{job.description}</p>
          )}
          {job.requirements.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {job.requirements.slice(0, compact ? 2 : 4).map((r, i) => (
                <Badge key={i} tone="neutral">{r}</Badge>
              ))}
              {job.requirements.length > (compact ? 2 : 4) && (
                <Badge tone="outline">+{job.requirements.length - (compact ? 2 : 4)} more</Badge>
              )}
            </div>
          )}
          <div style={{ color: "var(--muted)" }} className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><MapPin size={12} />{job.location || "Not specified"}</span>
            <span className="flex items-center gap-1"><Briefcase size={12} />{job.jobType}</span>
            <span className="flex items-center gap-1"><GraduationCap size={12} />{job.openToAll ? "All batches" : (job.eligibleYears || []).join(", ")}</span>
            <span className="flex items-center gap-1"><Eye size={12} />{job.views}</span>
            <span className="flex items-center gap-1"><Clock size={12} />{timeAgo(job.postedAt)}</span>
          </div>
        </div>
      </div>

      {/* perforated ticket-stub apply section */}
      <div
        style={{ borderLeft: `2px dashed var(--border)`, background: "var(--card-alt)", minWidth: compact ? 132 : "auto" }}
        className={`flex ${compact ? "flex-col justify-center items-center gap-2 px-4" : "flex-row items-center justify-between px-5 py-3"}`}
      >
        {!compact && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--muted)" }} className="text-[10px]">
            {job.salaryMin || job.salaryMax ? `₹${job.salaryMin || "?"}–${job.salaryMax || "?"} LPA` : "Salary N/A"}
          </div>
        )}
        <div className="flex items-center gap-2">
          <IconBtn icon={saved ? BookmarkCheck : Bookmark} active={saved} onClick={() => onSave(job)} label="Save job" />
          {(isOwner || canModerate) ? (
            <>
              {isOwner && <IconBtn icon={Edit2} onClick={() => onEdit(job)} label="Edit job" />}
              <IconBtn icon={Trash2} onClick={() => onDelete(job)} label="Delete job" danger />
            </>
          ) : null}
          {!isOwner && (
            <button
              onClick={() => onApply(job)}
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              className="h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 hover:brightness-95 active:scale-95 transition"
            >
              {applied ? <CheckCircle2 size={14} /> : <ExternalLink size={14} />}
              {applied ? "Applied" : "Apply"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   JOB MODAL
============================================================ */
function JobModal({ job, onClose, onApply, onSave, saved, applied }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  if (!job) return null;
  const dl = daysLeft(job.deadline);
  return (
    <div onClick={onClose} className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: "rgba(10,14,22,0.55)" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {job.imageUrl && (
          <img src={job.imageUrl} alt="" style={{ width: "100%", height: 140, objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
        )}
        <div style={{ borderBottom: "1px solid var(--border)" }} className="p-5 flex items-start gap-3">
          <CompanyLogo job={job} size={46} />
          <div className="flex-1 min-w-0">
            <p style={{ color: "var(--ink)" }} className="font-bold text-lg leading-tight">{job.title || job.companyName}</p>
            <p style={{ color: "var(--ink-soft)", fontFamily: "'IBM Plex Mono', monospace" }} className="text-sm">{job.companyName}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--ink-soft)" }}><X size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{job.jobType}</Badge>
            <Badge tone="neutral">{job.workMode}</Badge>
            <Badge tone="neutral">{job.experience}</Badge>
            {job.openToAll ? <Badge tone="outline">All batches</Badge> : (job.eligibleYears || []).map(y => <Badge key={y} tone="outline">{y}</Badge>)}
            {dl !== null && (dl < 0 ? <Badge tone="danger">Deadline passed</Badge> : <Badge tone="success">{dl} days left to apply</Badge>)}
          </div>
          {job.description && (
            <div>
              <p style={{ color: "var(--ink)" }} className="font-semibold text-sm mb-1">About the role</p>
              <p style={{ color: "var(--ink-soft)" }} className="text-sm whitespace-pre-line">{job.description}</p>
            </div>
          )}
          {job.requirements.length > 0 && (
            <div>
              <p style={{ color: "var(--ink)" }} className="font-semibold text-sm mb-1">Requirements</p>
              <ul className="list-disc list-inside space-y-1">
                {job.requirements.map((r, i) => <li key={i} style={{ color: "var(--ink-soft)" }} className="text-sm">{r}</li>)}
              </ul>
            </div>
          )}
          <div style={{ color: "var(--muted)" }} className="grid grid-cols-2 gap-2 text-xs">
            <span className="flex items-center gap-1"><MapPin size={12} />{job.location || "Not specified"}</span>
            <span className="flex items-center gap-1"><Users size={12} />₹{job.salaryMin || "?"}–{job.salaryMax || "?"} LPA</span>
            <span className="flex items-center gap-1"><Eye size={12} />{job.views} views</span>
            <span className="flex items-center gap-1"><Clock size={12} />Posted {timeAgo(job.postedAt)}</span>
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--border)" }} className="p-4 flex items-center gap-2">
          <IconBtn icon={saved ? BookmarkCheck : Bookmark} active={saved} onClick={() => onSave(job)} label="Save job" />
          <button
            onClick={() => onApply(job)}
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            className="flex-1 h-11 rounded-lg font-semibold flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition"
          >
            {applied ? <CheckCircle2 size={16} /> : <ExternalLink size={16} />}
            {applied ? "Applied — open link again" : "Apply now"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   POST / EDIT JOB FORM
============================================================ */
function JobForm({ initial, onSubmit, onCancel }) {
  const [f, setF] = useState(initial || {
    companyName: "", title: "", applyLink: "", description: "", requirementsText: "",
    location: "", workMode: "Onsite", jobType: "Full-time", experience: "Fresher",
    salaryMin: "", salaryMax: "", eligibleYears: [], openToAll: true, deadline: "", imageUrl: ""
  });
  const [errors, setErrors] = useState({});
  const [imgBroken, setImgBroken] = useState(false);
  const firstRef = useRef(null);
  useEffect(() => { firstRef.current?.focus(); }, []);

  const toggleYear = (y) => setF(s => ({
    ...s, eligibleYears: s.eligibleYears.includes(y) ? s.eligibleYears.filter(v => v !== y) : [...s.eligibleYears, y]
  }));

  const validate = () => {
    const e = {};
    if (!f.companyName.trim()) e.companyName = "Company name is required";
    if (!f.applyLink.trim()) e.applyLink = "Apply link is required";
    else if (!isValidUrl(f.applyLink)) e.applyLink = "Enter a valid URL (starting with http/https)";
    if (f.imageUrl.trim() && !isValidUrl(f.imageUrl)) e.imageUrl = "Enter a valid image URL";
    if (!f.openToAll && f.eligibleYears.length === 0) e.eligibleYears = "Pick at least one passout year or mark 'Open to all'";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({
      ...f,
      companyName: f.companyName.trim(),
      title: f.title.trim(),
      requirements: f.requirementsText.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    });
  };

  const field = (label, key, node, err) => (
    <div>
      <label style={{ color: "var(--ink)" }} className="text-sm font-medium block mb-1">{label}</label>
      {node}
      {err && <p style={{ color: "var(--danger)" }} className="text-xs mt-1">{err}</p>}
    </div>
  );
  const inputStyle = { background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--ink)" };
  const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2";

  return (
    <div className="space-y-4 max-w-2xl">
      <div style={{ background: "rgba(255,182,39,0.1)", border: "1px solid var(--border)" }} className="rounded-lg px-3 py-2 text-xs flex items-center gap-2" >
        <ShieldCheck size={14} style={{ color: "var(--accent2)" }} />
        <span style={{ color: "var(--ink-soft)" }}>Only <b>Company name</b> and <b>Apply link</b> are mandatory. Everything else is optional.</span>
      </div>

      {field("Company name *", "companyName",
        <input ref={firstRef} style={inputStyle} className={inputCls} value={f.companyName}
          onChange={e => setF({ ...f, companyName: e.target.value })} placeholder="e.g. Nimbus Systems" />, errors.companyName)}

      {field("Apply link *", "applyLink",
        <input style={inputStyle} className={inputCls} value={f.applyLink}
          onChange={e => setF({ ...f, applyLink: e.target.value })} placeholder="https://company.com/careers/apply" />, errors.applyLink)}

      {field("Job title", "title",
        <input style={inputStyle} className={inputCls} value={f.title}
          onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Frontend Engineer" />)}

      {field("Company logo / job photo URL", "imageUrl",
        <div className="flex items-center gap-3">
          <input style={inputStyle} className={inputCls} value={f.imageUrl}
            onChange={e => { setF({ ...f, imageUrl: e.target.value }); setImgBroken(false); }} placeholder="https://.../logo.png" />
          {f.imageUrl && !imgBroken && (
            <img src={f.imageUrl} alt="" onError={() => setImgBroken(true)}
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
          )}
        </div>, errors.imageUrl)}

      {field(`Description (${f.description.length}/1000)`, "description",
        <textarea style={inputStyle} className={inputCls} rows={4} maxLength={1000} value={f.description}
          onChange={e => setF({ ...f, description: e.target.value })} placeholder="Role summary, responsibilities..." />)}

      {field("Requirements (comma or newline separated)", "requirements",
        <textarea style={inputStyle} className={inputCls} rows={2} value={f.requirementsText}
          onChange={e => setF({ ...f, requirementsText: e.target.value })} placeholder="React, Node.js, DSA, Communication" />)}

      <div className="grid grid-cols-2 gap-4">
        {field("Location", "location",
          <input style={inputStyle} className={inputCls} value={f.location}
            onChange={e => setF({ ...f, location: e.target.value })} placeholder="Bengaluru, IN" />)}
        {field("Work mode", "workMode",
          <select style={inputStyle} className={inputCls} value={f.workMode} onChange={e => setF({ ...f, workMode: e.target.value })}>
            {WORK_MODES.map(w => <option key={w}>{w}</option>)}
          </select>)}
        {field("Job type", "jobType",
          <select style={inputStyle} className={inputCls} value={f.jobType} onChange={e => setF({ ...f, jobType: e.target.value })}>
            {JOB_TYPES.map(w => <option key={w}>{w}</option>)}
          </select>)}
        {field("Experience level", "experience",
          <select style={inputStyle} className={inputCls} value={f.experience} onChange={e => setF({ ...f, experience: e.target.value })}>
            {EXPERIENCE.map(w => <option key={w}>{w}</option>)}
          </select>)}
        {field("Salary min (LPA)", "salaryMin",
          <input type="number" style={inputStyle} className={inputCls} value={f.salaryMin}
            onChange={e => setF({ ...f, salaryMin: e.target.value })} placeholder="4" />)}
        {field("Salary max (LPA)", "salaryMax",
          <input type="number" style={inputStyle} className={inputCls} value={f.salaryMax}
            onChange={e => setF({ ...f, salaryMax: e.target.value })} placeholder="8" />)}
        {field("Application deadline", "deadline",
          <input type="date" style={inputStyle} className={inputCls} value={f.deadline}
            onChange={e => setF({ ...f, deadline: e.target.value })} />)}
      </div>

      <div>
        <label style={{ color: "var(--ink)" }} className="text-sm font-medium flex items-center gap-2 mb-2">
          <input type="checkbox" checked={f.openToAll} onChange={e => setF({ ...f, openToAll: e.target.checked })} />
          Open to all passout years
        </label>
        {!f.openToAll && (
          <div className="flex flex-wrap gap-2">
            {YEARS.map(y => (
              <button key={y} type="button" onClick={() => toggleYear(y)}
                style={{
                  border: "1px solid var(--border)",
                  background: f.eligibleYears.includes(y) ? "var(--accent)" : "var(--bg-alt)",
                  color: f.eligibleYears.includes(y) ? "var(--accent-ink)" : "var(--ink-soft)",
                  fontFamily: "'IBM Plex Mono', monospace"
                }}
                className="px-3 py-1 rounded-full text-xs font-medium">
                {y}
              </button>
            ))}
          </div>
        )}
        {errors.eligibleYears && <p style={{ color: "var(--danger)" }} className="text-xs mt-1">{errors.eligibleYears}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={submit} style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          className="px-5 py-2.5 rounded-lg font-semibold text-sm hover:brightness-95 active:scale-95 transition flex items-center gap-2">
          <CheckCircle2 size={16} />{initial ? "Save changes" : "Post job"}
        </button>
        <button onClick={onCancel} style={{ border: "1px solid var(--border)", color: "var(--ink-soft)" }}
          className="px-5 py-2.5 rounded-lg font-medium text-sm">Cancel</button>
      </div>
    </div>
  );
}

/* ============================================================
   AUTH FORMS (email-as-username) + FORGOT PASSWORD
============================================================ */
function AuthForms({ mode, setMode, onLogin, onSignup, onForgotLookup, onResetPassword, loading }) {
  const [showPw, setShowPw] = useState(false);
  const [l, setL] = useState({ email: "", password: "" });
  const [s, setS] = useState({ name: "", email: "", password: "", confirm: "", passoutYear: "" });
  const [fEmail, setFEmail] = useState("");
  const [fStep, setFStep] = useState(1);
  const [fNew, setFNew] = useState({ password: "", confirm: "" });
  const [err, setErr] = useState("");

  const inputStyle = { background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--ink)" };
  const inputCls = "w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none";
  const plainCls = "w-full rounded-lg px-3 py-2.5 text-sm outline-none";

  const submitLogin = () => {
    if (!isValidEmail(l.email)) return setErr("Enter a valid email address");
    if (!l.password) return setErr("Enter your password");
    setErr(""); onLogin(l.email.trim().toLowerCase(), l.password);
  };
  const submitSignup = () => {
    if (!s.name.trim() || !s.email.trim() || !s.password) return setErr("Fill all required fields");
    if (!isValidEmail(s.email)) return setErr("Enter a valid email address — it will be your username");
    if (s.password.length < 6) return setErr("Password must be at least 6 characters");
    if (s.password !== s.confirm) return setErr("Passwords do not match");
    setErr(""); onSignup(s);
  };

  const submitForgotStep1 = async () => {
    if (!isValidEmail(fEmail)) return setErr("Enter a valid email address");
    setErr("");
    const found = await onForgotLookup(fEmail.trim().toLowerCase());
    if (!found) { setErr("No account found with that email"); return; }
    setFStep(2);
  };
  const submitForgotStep2 = async () => {
    if (fNew.password.length < 6) return setErr("Password must be at least 6 characters");
    if (fNew.password !== fNew.confirm) return setErr("Passwords do not match");
    setErr("");
    await onResetPassword(fEmail.trim().toLowerCase(), fNew.password);
    setMode("login");
  };

  return (
    <div className="max-w-sm mx-auto py-8">
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }} className="rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Ticket size={20} style={{ color: "var(--accent)" }} />
          <p style={{ color: "var(--ink)" }} className="font-bold text-lg">
            {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
          </p>
        </div>
        <p style={{ color: "var(--muted)" }} className="text-xs mb-5">
          {mode === "login" ? "Log in with your email to apply, save jobs and post openings."
            : mode === "signup" ? "Your email becomes your unique username — sign up to browse, post and apply in real time."
            : "For this demo, we verify by matching your registered email — a production version would email you a secure reset link."}
        </p>

        {err && (
          <div style={{ background: "rgba(214,69,59,0.1)", color: "var(--danger)" }} className="rounded-lg px-3 py-2 text-xs mb-4 flex items-center gap-2">
            <AlertCircle size={14} />{err}
          </div>
        )}

        {mode === "login" && (
          <div className="space-y-3">
            <div className="relative">
              <Mail size={15} style={{ color: "var(--muted)" }} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input style={inputStyle} className={inputCls} placeholder="Email" value={l.email}
                onChange={e => setL({ ...l, email: e.target.value })} onKeyDown={e => e.key === "Enter" && submitLogin()} />
            </div>
            <div className="relative">
              <Lock size={15} style={{ color: "var(--muted)" }} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input style={inputStyle} className={inputCls + " pr-9"} type={showPw ? "text" : "password"} placeholder="Password" value={l.password}
                onChange={e => setL({ ...l, password: e.target.value })} onKeyDown={e => e.key === "Enter" && submitLogin()} />
              <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div className="text-right">
              <button onClick={() => { setErr(""); setFStep(1); setMode("forgot"); }} style={{ color: "var(--accent2)" }} className="text-xs font-semibold">Forgot password?</button>
            </div>
            <button onClick={submitLogin} disabled={loading} style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Log in
            </button>
          </div>
        )}

        {mode === "signup" && (
          <div className="space-y-3">
            <input style={inputStyle} className={plainCls} placeholder="Full name * (must be unique)" value={s.name}
              onChange={e => setS({ ...s, name: e.target.value })} />
            <input style={inputStyle} className={plainCls} placeholder="Email * (this is your username)" value={s.email}
              onChange={e => setS({ ...s, email: e.target.value })} />
            <select style={inputStyle} className={plainCls} value={s.passoutYear}
              onChange={e => setS({ ...s, passoutYear: e.target.value })}>
              <option value="">Your passout year (optional)</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="relative">
              <input style={inputStyle} className="w-full rounded-lg px-3 py-2.5 pr-9 text-sm outline-none" type={showPw ? "text" : "password"}
                placeholder="Password (min 6 chars) *" value={s.password} onChange={e => setS({ ...s, password: e.target.value })} />
              <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <input style={inputStyle} className={plainCls} type={showPw ? "text" : "password"}
              placeholder="Confirm password *" value={s.confirm} onChange={e => setS({ ...s, confirm: e.target.value })}
              onKeyDown={e => e.key === "Enter" && submitSignup()} />
            <button onClick={submitSignup} disabled={loading} style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-95 active:scale-95 transition disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Create account
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <div className="space-y-3">
            {fStep === 1 ? (
              <>
                <div className="relative">
                  <Mail size={15} style={{ color: "var(--muted)" }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input style={inputStyle} className={inputCls} placeholder="Your registered email" value={fEmail}
                    onChange={e => setFEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submitForgotStep1()} />
                </div>
                <button onClick={submitForgotStep1} style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
                  <KeyRound size={16} /> Find my account
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <Lock size={15} style={{ color: "var(--muted)" }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input style={inputStyle} className={inputCls} type="password" placeholder="New password" value={fNew.password}
                    onChange={e => setFNew({ ...fNew, password: e.target.value })} />
                </div>
                <div className="relative">
                  <Lock size={15} style={{ color: "var(--muted)" }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input style={inputStyle} className={inputCls} type="password" placeholder="Confirm new password" value={fNew.confirm}
                    onChange={e => setFNew({ ...fNew, confirm: e.target.value })} onKeyDown={e => e.key === "Enter" && submitForgotStep2()} />
                </div>
                <button onClick={submitForgotStep2} style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Reset password
                </button>
              </>
            )}
          </div>
        )}

        <p style={{ color: "var(--muted)" }} className="text-xs text-center mt-4">
          {mode === "login" && <>New here? <button onClick={() => { setErr(""); setMode("signup"); }} style={{ color: "var(--accent2)" }} className="font-semibold">Sign up</button></>}
          {mode === "signup" && <>Already have an account? <button onClick={() => { setErr(""); setMode("login"); }} style={{ color: "var(--accent2)" }} className="font-semibold">Log in</button></>}
          {mode === "forgot" && <>Remembered it? <button onClick={() => { setErr(""); setMode("login"); }} style={{ color: "var(--accent2)" }} className="font-semibold">Back to log in</button></>}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN PANEL
============================================================ */
function AdminPanel({ users, jobs, adminRequests, onDeleteJob, isSuper, onApproveRequest }) {
  const [tab, setTab] = useState("overview");
  const pending = adminRequests.filter(r => r.status === "pending");

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Crown size={20} style={{ color: "var(--accent)" }} />
        <p className="display-font text-2xl font-bold" style={{ color: "var(--ink)" }}>Admin panel</p>
      </div>
      <p style={{ color: "var(--muted)" }} className="text-sm mb-5">
        {isSuper ? "You're the super admin — you approve new admin requests." : "You have admin access to moderate posts."}
      </p>
      <div className="flex gap-2 mb-5 flex-wrap">
        {[["overview", "Overview"], ["jobs", `All jobs (${jobs.length})`], ["users", `All users (${users.length})`]]
          .concat(isSuper ? [["requests", `Requests (${pending.length})`]] : [])
          .map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ background: tab === k ? "var(--accent)" : "var(--card)", color: tab === k ? "var(--accent-ink)" : "var(--ink-soft)", border: "1px solid var(--border)" }}
              className="px-3 py-1.5 rounded-full text-sm font-medium">{l}</button>
          ))}
      </div>

      {tab === "overview" && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-2xl p-5">
            <p style={{ color: "var(--muted)" }} className="text-xs">Total users</p>
            <p className="text-2xl font-bold" style={{ color: "var(--ink)", fontFamily: "'IBM Plex Mono', monospace" }}>{users.length}</p>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-2xl p-5">
            <p style={{ color: "var(--muted)" }} className="text-xs">Total jobs live</p>
            <p className="text-2xl font-bold" style={{ color: "var(--ink)", fontFamily: "'IBM Plex Mono', monospace" }}>{jobs.length}</p>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-2xl p-5">
            <p style={{ color: "var(--muted)" }} className="text-xs">Admins</p>
            <p className="text-2xl font-bold" style={{ color: "var(--ink)", fontFamily: "'IBM Plex Mono', monospace" }}>{users.filter(isAdminUser).length + DEFAULT_ADMINS.filter(e => !users.some(u => u.username === e)).length}</p>
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <div className="space-y-2">
          {jobs.length === 0 && <EmptyState text="No jobs posted yet." />}
          {jobs.map(j => (
            <div key={j.id} style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <CompanyLogo job={j} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{j.title || j.companyName}</p>
                  <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{j.companyName} · posted by {j.postedByName}</p>
                </div>
              </div>
              <IconBtn icon={Trash2} onClick={() => onDeleteJob(j)} label="Delete job" danger />
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.username} style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={u.name} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{u.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>{u.username}</p>
                </div>
              </div>
              {isAdminUser(u) && <Badge tone="accent"><Crown size={11} />Admin</Badge>}
            </div>
          ))}
        </div>
      )}

      {tab === "requests" && isSuper && (
        <div className="space-y-2">
          {adminRequests.length === 0 && <EmptyState text="No admin access requests yet." />}
          {adminRequests.slice().reverse().map(r => (
            <div key={r.id} style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{r.name} <span style={{ color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }} className="font-normal text-xs">{r.email}</span></p>
                {r.status === "pending" ? <Badge tone="accent">Pending</Badge> : r.status === "approved" ? <Badge tone="success">Approved</Badge> : <Badge tone="danger">Rejected</Badge>}
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--ink-soft)" }}>{r.reason || "No reason provided."}</p>
              <p className="text-[11px] mb-2" style={{ color: "var(--muted)" }}>Requested {timeAgo(r.requestedAt)}</p>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => onApproveRequest(r.id, true)} style={{ background: "var(--success)", color: "#fff" }} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><Check size={13} />Approve</button>
                  <button onClick={() => onApproveRequest(r.id, false)} style={{ border: "1px solid var(--border)", color: "var(--danger)" }} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"><Ban size={13} />Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN APP
============================================================ */
export default function App() {
  const [theme, setTheme] = useState("light");
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);
  const [view, setView] = useState("feed"); // feed | post | dashboard | profile | login | signup | forgot | admin
  const [authLoading, setAuthLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [openJob, setOpenJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [dashTab, setDashTab] = useState("posted"); // posted | applied | saved
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAdminRequestBox, setShowAdminRequestBox] = useState(false);
  const [adminReason, setAdminReason] = useState("");

  const [filters, setFilters] = useState({
    year: "all", jobType: "all", workMode: "all", location: "", search: "", sortBy: "newest"
  });

  const t = THEME[theme];

  const addToast = useCallback((message, type = "info") => {
    const id = uid("toast");
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 3500);
  }, []);

  /* ---------- storage layer ---------- */
  const loadAll = useCallback(async (silent) => {
    try {
      let u = [], j = [], ar = [];
      try { const r = await window.storage.get("users_all", true); u = r ? JSON.parse(r.value) : []; } catch { u = []; }
      try { const r = await window.storage.get("jobs_all", true); j = r ? JSON.parse(r.value) : []; } catch { j = []; }
      try { const r = await window.storage.get("admin_requests_all", true); ar = r ? JSON.parse(r.value) : []; } catch { ar = []; }
      setUsers(u);
      setJobs(j.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)));
      setAdminRequests(ar);
      setLastUpdated(Date.now());
      setStorageError(false);
      // keep currentUser in sync with latest stored copy (e.g. after admin approval)
      setCurrentUser(cu => cu ? (u.find(x => x.username === cu.username) || cu) : cu);
    } catch (e) {
      setStorageError(true);
      if (!silent) addToast("Couldn't reach storage. Check your connection and retry.", "error");
    } finally {
      setInitialLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadAll(false); }, [loadAll]);
  useEffect(() => {
    const iv = setInterval(() => loadAll(true), 5000);
    return () => clearInterval(iv);
  }, [loadAll]);

  useEffect(() => { const h = setTimeout(() => setFilters(f => ({ ...f, search: searchInput })), 300); return () => clearTimeout(h); }, [searchInput]);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filters]);

  const saveUsers = async (arr) => { setUsers(arr); await window.storage.set("users_all", JSON.stringify(arr), true); };
  const saveJobs = async (arr) => { setJobs(arr.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))); await window.storage.set("jobs_all", JSON.stringify(arr), true); };
  const saveAdminRequests = async (arr) => { setAdminRequests(arr); await window.storage.set("admin_requests_all", JSON.stringify(arr), true); };

  const loadPersonal = async (username) => {
    try { const r = await window.storage.get(`saved_${username}`, false); setSavedIds(r ? JSON.parse(r.value) : []); } catch { setSavedIds([]); }
    try { const r = await window.storage.get(`applied_${username}`, false); setAppliedIds(r ? JSON.parse(r.value) : []); } catch { setAppliedIds([]); }
  };

  /* ---------- auth ---------- */
  const handleLogin = async (email, password) => {
    setAuthLoading(true);
    try {
      const r = await window.storage.get("users_all", true).catch(() => null);
      const list = r ? JSON.parse(r.value) : [];
      const found = list.find(u => u.username === email);
      if (!found || found.passwordObf !== obf(password)) { addToast("Invalid email or password", "error"); return; }
      setCurrentUser(found);
      setUsers(list);
      await loadPersonal(found.username);
      setView("feed");
      addToast(`Welcome back, ${found.name}!`, "success");
    } finally { setAuthLoading(false); }
  };

  const handleSignup = async (s) => {
    setAuthLoading(true);
    try {
      const r = await window.storage.get("users_all", true).catch(() => null);
      const list = r ? JSON.parse(r.value) : [];
      const emailLower = s.email.trim().toLowerCase();
      if (list.some(u => u.username === emailLower)) { addToast("That email is already registered", "error"); return; }
      if (list.some(u => u.name.trim().toLowerCase() === s.name.trim().toLowerCase())) { addToast("That display name is already taken — try another", "error"); return; }
      const newUser = {
        username: emailLower, name: s.name.trim(), email: emailLower,
        passwordObf: obf(s.password), passoutYear: s.passoutYear || null, createdAt: new Date().toISOString(),
        isAdmin: DEFAULT_ADMINS.includes(emailLower)
      };
      const newList = [...list, newUser];
      await saveUsers(newList);
      setCurrentUser(newUser);
      setSavedIds([]); setAppliedIds([]);
      setView("feed");
      addToast(newUser.isAdmin ? "Account created — admin access granted!" : "Account created! You're logged in.", "success");
    } catch { addToast("Signup failed, please try again", "error"); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => {
    setCurrentUser(null); setSavedIds([]); setAppliedIds([]); setView("feed");
    addToast("Logged out", "info");
  };

  const handleForgotLookup = async (email) => {
    try {
      const r = await window.storage.get("users_all", true).catch(() => null);
      const list = r ? JSON.parse(r.value) : [];
      return list.some(u => u.username === email);
    } catch { return false; }
  };
  const handleResetPassword = async (email, newPassword) => {
    try {
      const r = await window.storage.get("users_all", true).catch(() => null);
      const list = r ? JSON.parse(r.value) : [];
      const next = list.map(u => u.username === email ? { ...u, passwordObf: obf(newPassword) } : u);
      await saveUsers(next);
      addToast("Password reset. Please log in with your new password.", "success");
    } catch { addToast("Couldn't reset password, try again", "error"); }
  };

  const requireAuth = () => {
    if (!currentUser) { addToast("Please log in first", "error"); setView("login"); return false; }
    return true;
  };

  /* ---------- admin ---------- */
  const requestAdminAccess = async () => {
    if (!currentUser) return;
    if (isAdminUser(currentUser)) { addToast("You're already an admin", "info"); return; }
    if (adminRequests.some(r => r.email === currentUser.username && r.status === "pending")) { addToast("Your request is already pending", "info"); return; }
    const reqObj = { id: uid("req"), email: currentUser.username, name: currentUser.name, reason: adminReason.trim(), status: "pending", requestedAt: new Date().toISOString() };
    await saveAdminRequests([...adminRequests, reqObj]);
    setShowAdminRequestBox(false); setAdminReason("");
    addToast(`Request sent to ${SUPER_ADMIN} for approval`, "success");
  };

  const approveAdminRequest = async (id, approve) => {
    if (!isSuperAdminUser(currentUser)) return;
    const req = adminRequests.find(r => r.id === id);
    if (!req) return;
    const nextRequests = adminRequests.map(r => r.id === id ? { ...r, status: approve ? "approved" : "rejected" } : r);
    await saveAdminRequests(nextRequests);
    if (approve) {
      const nextUsers = users.map(u => u.username === req.email ? { ...u, isAdmin: true } : u);
      await saveUsers(nextUsers);
    }
    addToast(approve ? `${req.name} is now an admin` : `Request from ${req.name} rejected`, approve ? "success" : "info");
  };

  /* ---------- job actions ---------- */
  const handlePostJob = async (data) => {
    if (!requireAuth()) return;
    const job = {
      id: editingJob ? editingJob.id : uid("job"),
      ...data,
      postedBy: editingJob ? editingJob.postedBy : currentUser.username,
      postedByName: editingJob ? editingJob.postedByName : currentUser.name,
      postedAt: editingJob ? editingJob.postedAt : new Date().toISOString(),
      views: editingJob ? editingJob.views : 0
    };
    let newJobs;
    if (editingJob) newJobs = jobs.map(j => j.id === job.id ? job : j);
    else newJobs = [...jobs, job];
    await saveJobs(newJobs);
    addToast(editingJob ? "Job updated" : "Job posted — everyone can see it now!", "success");
    setEditingJob(null);
    setView("feed");
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Delete "${job.title || job.companyName}" at ${job.companyName}?`)) return;
    await saveJobs(jobs.filter(j => j.id !== job.id));
    addToast("Job deleted", "info");
  };

  const handleApply = async (job) => {
    if (!requireAuth()) return;
    if (job.postedBy === currentUser.username) { addToast("You can't apply to your own posting", "error"); return; }
    window.open(job.applyLink, "_blank", "noopener,noreferrer");
    if (!appliedIds.includes(job.id)) {
      const next = [...appliedIds, job.id];
      setAppliedIds(next);
      try { await window.storage.set(`applied_${currentUser.username}`, JSON.stringify(next), false); } catch {}
      addToast("Marked as applied. Good luck!", "success");
    }
  };

  const handleSave = async (job) => {
    if (!requireAuth()) return;
    const next = savedIds.includes(job.id) ? savedIds.filter(id => id !== job.id) : [...savedIds, job.id];
    setSavedIds(next);
    try { await window.storage.set(`saved_${currentUser.username}`, JSON.stringify(next), false); } catch {}
    addToast(savedIds.includes(job.id) ? "Removed from saved" : "Saved for later", "info");
  };

  const handleOpenJob = async (job) => {
    setOpenJob(job);
    setRecentlyViewed(rv => [job.id, ...rv.filter(id => id !== job.id)].slice(0, 5));
    const next = jobs.map(j => j.id === job.id ? { ...j, views: j.views + 1 } : j);
    setJobs(next);
    try { await window.storage.set("jobs_all", JSON.stringify(next), true); } catch {}
  };

  /* ---------- derived data ---------- */
  const filteredJobs = useMemo(() => {
    let list = [...jobs];
    if (filters.year !== "all") list = list.filter(j => j.openToAll || (j.eligibleYears || []).includes(Number(filters.year)));
    if (filters.jobType !== "all") list = list.filter(j => j.jobType === filters.jobType);
    if (filters.workMode !== "all") list = list.filter(j => j.workMode === filters.workMode);
    if (filters.location.trim()) list = list.filter(j => (j.location || "").toLowerCase().includes(filters.location.toLowerCase()));
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(j => (j.title || "").toLowerCase().includes(q) || j.companyName.toLowerCase().includes(q) || j.requirements.some(r => r.toLowerCase().includes(q)));
    }
    switch (filters.sortBy) {
      case "oldest": list.sort((a, b) => new Date(a.postedAt) - new Date(b.postedAt)); break;
      case "salary": list.sort((a, b) => (Number(b.salaryMax) || 0) - (Number(a.salaryMax) || 0)); break;
      case "company": list.sort((a, b) => a.companyName.localeCompare(b.companyName)); break;
      default: list.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    }
    return list;
  }, [jobs, filters]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.year !== "all") chips.push({ key: "year", label: `Batch ${filters.year}` });
    if (filters.jobType !== "all") chips.push({ key: "jobType", label: filters.jobType });
    if (filters.workMode !== "all") chips.push({ key: "workMode", label: filters.workMode });
    if (filters.location) chips.push({ key: "location", label: filters.location });
    if (filters.search) chips.push({ key: "search", label: `"${filters.search}"` });
    return chips;
  }, [filters]);

  const clearFilter = (key) => {
    if (key === "search") setSearchInput("");
    setFilters(f => ({ ...f, [key]: key === "location" || key === "search" ? "" : "all" }));
  };
  const clearAllFilters = () => { setSearchInput(""); setFilters({ year: "all", jobType: "all", workMode: "all", location: "", search: "", sortBy: filters.sortBy }); };

  const totalCompanies = useMemo(() => new Set(jobs.map(j => j.companyName.toLowerCase())).size, [jobs]);
  const jobsToday = useMemo(() => jobs.filter(j => Date.now() - new Date(j.postedAt).getTime() < 86400000).length, [jobs]);
  const trendingCompanies = useMemo(() => {
    const counts = {};
    jobs.forEach(j => { counts[j.companyName] = (counts[j.companyName] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [jobs]);

  const myJobs = useMemo(() => currentUser ? jobs.filter(j => j.postedBy === currentUser.username) : [], [jobs, currentUser]);
  const myApplied = useMemo(() => jobs.filter(j => appliedIds.includes(j.id)), [jobs, appliedIds]);
  const mySaved = useMemo(() => jobs.filter(j => savedIds.includes(j.id)), [jobs, savedIds]);
  const myAdminRequest = useMemo(() => currentUser ? adminRequests.find(r => r.email === currentUser.username) : null, [adminRequests, currentUser]);
  const pendingAdminCount = useMemo(() => adminRequests.filter(r => r.status === "pending").length, [adminRequests]);

  /* ---------- render helpers ---------- */
  const navBtn = (key, label, Icon, badge) => (
    <button
      onClick={() => { setView(key); setMobileNav(false); }}
      style={{ color: view === key ? "var(--accent-ink)" : "var(--ink-soft)", background: view === key ? "var(--accent)" : "transparent" }}
      className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 whitespace-nowrap"
    >
      <Icon size={15} />{label}
      {badge > 0 && <span style={{ background: "var(--danger)", color: "#fff" }} className="text-[10px] px-1.5 rounded-full">{badge}</span>}
    </button>
  );

  const selectStyle = { background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--ink)" };

  return (
    <div style={t} className="min-h-screen w-full" data-theme={theme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { font-family: 'IBM Plex Sans', sans-serif; }
        .display-font { font-family: 'Space Grotesk', sans-serif; }
        @keyframes fadein { from { opacity:0; transform:translateY(-4px);} to {opacity:1; transform:translateY(0);} }
        ::selection { background: var(--accent); color: var(--accent-ink); }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 8px; }
      `}</style>

      <div style={{ background: "var(--bg)", color: "var(--ink)" }} className="min-h-screen">
        <Toasts toasts={toasts} remove={(id) => setToasts(ts => ts.filter(t => t.id !== id))} />

        {/* HEADER */}
        <header style={{ background: "var(--bg-alt)", borderBottom: "1px solid var(--border)" }} className="sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView("feed")}>
              <div style={{ background: "var(--accent)", color: "var(--accent-ink)" }} className="w-8 h-8 rounded-lg flex items-center justify-center">
                <Ticket size={17} />
              </div>
              <span className="display-font font-bold text-lg" style={{ color: "var(--ink)" }}>CampusHire</span>
              <span className="hidden sm:flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(31,138,76,0.12)", color: "var(--success)", fontFamily: "'IBM Plex Mono', monospace" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--success)" }} /> LIVE
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navBtn("feed", "Browse jobs", Briefcase)}
              {navBtn("post", "Post a job", Plus)}
              {currentUser && navBtn("dashboard", "Dashboard", LayoutGrid)}
              {currentUser && isAdminUser(currentUser) && navBtn("admin", "Admin", Crown, isSuperAdminUser(currentUser) ? pendingAdminCount : 0)}
            </nav>

            <div className="flex items-center gap-2">
              <IconBtn icon={theme === "light" ? Moon : Sun} onClick={() => setTheme(th => th === "light" ? "dark" : "light")} label="Toggle theme" />
              <IconBtn icon={RefreshCw} onClick={() => loadAll(false)} label="Refresh" />
              {currentUser ? (
                <button onClick={() => setView("profile")} className="flex items-center gap-2">
                  <Avatar name={currentUser.name} size={32} />
                </button>
              ) : (
                <button onClick={() => setView("login")} style={{ background: "var(--accent)", color: "var(--accent-ink)" }} className="px-3 py-2 rounded-lg text-sm font-semibold hidden sm:block">
                  Log in
                </button>
              )}
              <button className="md:hidden" onClick={() => setMobileNav(v => !v)} style={{ color: "var(--ink-soft)" }}><Menu size={20} /></button>
            </div>
          </div>
          {mobileNav && (
            <div className="md:hidden flex flex-col px-4 pb-3 gap-1">
              {navBtn("feed", "Browse jobs", Briefcase)}
              {navBtn("post", "Post a job", Plus)}
              {currentUser ? navBtn("dashboard", "Dashboard", LayoutGrid) : navBtn("login", "Log in", User)}
              {currentUser && isAdminUser(currentUser) && navBtn("admin", "Admin", Crown, isSuperAdminUser(currentUser) ? pendingAdminCount : 0)}
            </div>
          )}
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {initialLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-2xl h-44 animate-pulse" />
              ))}
            </div>
          ) : storageError ? (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-2xl p-8 text-center">
              <AlertCircle size={28} className="mx-auto mb-2" style={{ color: "var(--danger)" }} />
              <p style={{ color: "var(--ink)" }} className="font-semibold mb-1">Couldn't connect to storage</p>
              <p style={{ color: "var(--muted)" }} className="text-sm mb-4">Check your connection and try again.</p>
              <button onClick={() => loadAll(false)} style={{ background: "var(--accent)", color: "var(--accent-ink)" }} className="px-4 py-2 rounded-lg text-sm font-semibold">Retry</button>
            </div>
          ) : view === "login" || view === "signup" || view === "forgot" ? (
            <AuthForms mode={view} setMode={setView} onLogin={handleLogin} onSignup={handleSignup}
              onForgotLookup={handleForgotLookup} onResetPassword={handleResetPassword} loading={authLoading} />
          ) : view === "post" ? (
            currentUser ? (
              <div>
                <p className="display-font text-2xl font-bold mb-1" style={{ color: "var(--ink)" }}>{editingJob ? "Edit job posting" : "Post a new job"}</p>
                <p style={{ color: "var(--muted)" }} className="text-sm mb-6">Only company name and apply link are mandatory — every candidate on CampusHire will see this instantly.</p>
                <JobForm
                  initial={editingJob ? { ...editingJob, requirementsText: editingJob.requirements.join(", "), imageUrl: editingJob.imageUrl || "" } : null}
                  onSubmit={handlePostJob}
                  onCancel={() => { setEditingJob(null); setView("feed"); }}
                />
              </div>
            ) : (
              <div className="text-center py-16">
                <ShieldCheck size={32} className="mx-auto mb-3" style={{ color: "var(--accent)" }} />
                <p style={{ color: "var(--ink)" }} className="font-semibold mb-1">Log in to post a job</p>
                <p style={{ color: "var(--muted)" }} className="text-sm mb-4">Only registered users can post openings.</p>
                <button onClick={() => setView("login")} style={{ background: "var(--accent)", color: "var(--accent-ink)" }} className="px-4 py-2 rounded-lg text-sm font-semibold">Log in / Sign up</button>
              </div>
            )
          ) : view === "admin" && currentUser && isAdminUser(currentUser) ? (
            <AdminPanel users={users} jobs={jobs} adminRequests={adminRequests} onDeleteJob={handleDeleteJob}
              isSuper={isSuperAdminUser(currentUser)} onApproveRequest={approveAdminRequest} />
          ) : view === "profile" && currentUser ? (
            <div className="max-w-md">
              <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar name={currentUser.name} size={52} />
                  <div>
                    <p className="font-bold text-lg flex items-center gap-2" style={{ color: "var(--ink)" }}>
                      {currentUser.name}
                      {isAdminUser(currentUser) && <Badge tone="accent"><Crown size={11} />Admin</Badge>}
                    </p>
                    <p className="text-sm" style={{ color: "var(--muted)", fontFamily: "'IBM Plex Mono', monospace" }}>{currentUser.username}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div style={{ background: "var(--card-alt)" }} className="rounded-lg p-3">
                    <p style={{ color: "var(--muted)" }} className="text-xs">Passout year</p>
                    <p style={{ color: "var(--ink)" }}>{currentUser.passoutYear || "Not set"}</p>
                  </div>
                  <div style={{ background: "var(--card-alt)" }} className="rounded-lg p-3">
                    <p style={{ color: "var(--muted)" }} className="text-xs">Jobs posted</p>
                    <p style={{ color: "var(--ink)" }}>{myJobs.length}</p>
                  </div>
                  <div style={{ background: "var(--card-alt)" }} className="rounded-lg p-3 col-span-2">
                    <p style={{ color: "var(--muted)" }} className="text-xs">Member since</p>
                    <p style={{ color: "var(--ink)" }}>{new Date(currentUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {!isAdminUser(currentUser) && (
                  <div style={{ background: "var(--card-alt)", border: "1px solid var(--border)" }} className="rounded-lg p-3">
                    {myAdminRequest ? (
                      <p className="text-xs flex items-center gap-2" style={{ color: "var(--ink-soft)" }}>
                        <ShieldAlert size={14} />
                        {myAdminRequest.status === "pending" ? "Your admin access request is pending approval." : myAdminRequest.status === "approved" ? "Your admin request was approved!" : "Your admin request was rejected."}
                      </p>
                    ) : showAdminRequestBox ? (
                      <div className="space-y-2">
                        <textarea value={adminReason} onChange={e => setAdminReason(e.target.value)} rows={2}
                          style={{ background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--ink)" }}
                          className="w-full rounded-lg px-2 py-1.5 text-xs outline-none" placeholder="Why do you need admin access?" />
                        <div className="flex gap-2">
                          <button onClick={requestAdminAccess} style={{ background: "var(--accent)", color: "var(--accent-ink)" }} className="px-3 py-1.5 rounded-lg text-xs font-semibold">Send request</button>
                          <button onClick={() => setShowAdminRequestBox(false)} style={{ color: "var(--muted)" }} className="text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAdminRequestBox(true)} className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--accent2)" }}>
                        <UserCheck size={13} /> Request admin access (approved by {SUPER_ADMIN})
                      </button>
                    )}
                  </div>
                )}

                <button onClick={handleLogout} style={{ border: "1px solid var(--border)", color: "var(--danger)" }} className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                  <LogOut size={15} /> Log out
                </button>
              </div>
            </div>
          ) : view === "dashboard" && currentUser ? (
            <div>
              <p className="display-font text-2xl font-bold mb-4" style={{ color: "var(--ink)" }}>My dashboard</p>
              <div className="flex gap-2 mb-5">
                {[["posted", `Posted (${myJobs.length})`], ["applied", `Applied (${myApplied.length})`], ["saved", `Saved (${mySaved.length})`]].map(([k, l]) => (
                  <button key={k} onClick={() => setDashTab(k)}
                    style={{ background: dashTab === k ? "var(--accent)" : "var(--card)", color: dashTab === k ? "var(--accent-ink)" : "var(--ink-soft)", border: "1px solid var(--border)" }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium">{l}</button>
                ))}
              </div>
              {(dashTab === "posted" ? myJobs : dashTab === "applied" ? myApplied : mySaved).length === 0 ? (
                <EmptyState text={`No ${dashTab} jobs yet.`} />
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {(dashTab === "posted" ? myJobs : dashTab === "applied" ? myApplied : mySaved).map(j => (
                    <JobCard key={j.id} job={j} onOpen={handleOpenJob} onApply={handleApply} onSave={handleSave}
                      saved={savedIds.includes(j.id)} applied={appliedIds.includes(j.id)}
                      isOwner={dashTab === "posted"} onEdit={(job) => { setEditingJob(job); setView("post"); }} onDelete={handleDeleteJob} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* HERO / STATS */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-2xl p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="display-font text-2xl font-bold" style={{ color: "var(--ink)" }}>Every opening, sorted by batch.</p>
                  <p style={{ color: "var(--muted)" }} className="text-sm mt-1">
                    {lastUpdated ? `Updated ${timeAgo(new Date(lastUpdated).toISOString())}` : "Loading..."} · Synced live for every signed-in user
                  </p>
                </div>
                <div className="flex gap-4">
                  <Stat label="Jobs live" value={jobs.length} />
                  <Stat label="Companies" value={totalCompanies} />
                  <Stat label="Posted today" value={jobsToday} />
                  <Stat label="Members" value={users.length} />
                </div>
              </div>

              {trendingCompanies.length > 0 && (
                <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
                  <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--muted)" }}><TrendingUp size={13} /> Trending:</span>
                  {trendingCompanies.map(([name, count]) => (
                    <Badge key={name} tone="outline">{name} · {count}</Badge>
                  ))}
                </div>
              )}

              {/* FILTER BAR */}
              <div style={{ background: "var(--card)", border: "1px solid var(--border)" }} className="rounded-2xl p-4 mb-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} style={{ color: "var(--muted)" }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                    <input style={selectStyle} className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none" placeholder="Search title, company or skill..."
                      value={searchInput} onChange={e => setSearchInput(e.target.value)} />
                  </div>
                  <select style={selectStyle} className="rounded-lg px-3 py-2 text-sm" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
                    <option value="all">All passout years</option>
                    {YEARS.map(y => <option key={y} value={y}>Batch {y}</option>)}
                  </select>
                  <select style={selectStyle} className="rounded-lg px-3 py-2 text-sm" value={filters.jobType} onChange={e => setFilters(f => ({ ...f, jobType: e.target.value }))}>
                    <option value="all">All job types</option>
                    {JOB_TYPES.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select style={selectStyle} className="rounded-lg px-3 py-2 text-sm" value={filters.workMode} onChange={e => setFilters(f => ({ ...f, workMode: e.target.value }))}>
                    <option value="all">Any work mode</option>
                    {WORK_MODES.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <input style={selectStyle} className="rounded-lg px-3 py-2 text-sm w-36" placeholder="Location" value={filters.location}
                    onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} />
                  <select style={selectStyle} className="rounded-lg px-3 py-2 text-sm" value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="salary">Highest salary</option>
                    <option value="company">Company A–Z</option>
                  </select>
                  <div className="flex gap-1">
                    <IconBtn icon={LayoutGrid} active={viewMode === "grid"} onClick={() => setViewMode("grid")} label="Grid view" />
                    <IconBtn icon={List} active={viewMode === "list"} onClick={() => setViewMode("list")} label="List view" />
                  </div>
                </div>
                {activeFilterChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {activeFilterChips.map(c => (
                      <button key={c.key} onClick={() => clearFilter(c.key)} style={{ background: "var(--card-alt)", border: "1px solid var(--border)", color: "var(--ink-soft)" }} className="text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {c.label} <X size={11} />
                      </button>
                    ))}
                    <button onClick={clearAllFilters} style={{ color: "var(--accent2)" }} className="text-xs font-semibold">Clear all</button>
                  </div>
                )}
              </div>

              <p style={{ color: "var(--muted)" }} className="text-sm mb-3">{filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""} found</p>

              {filteredJobs.length === 0 ? (
                <EmptyState text="No jobs match your filters yet." action={activeFilterChips.length ? { label: "Clear filters", onClick: clearAllFilters } : null} />
              ) : (
                <>
                  <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
                    {filteredJobs.slice(0, visibleCount).map(j => (
                      <JobCard key={j.id} job={j} onOpen={handleOpenJob} onApply={handleApply} onSave={handleSave}
                        saved={savedIds.includes(j.id)} applied={appliedIds.includes(j.id)} compact={viewMode === "list"}
                        isOwner={currentUser && j.postedBy === currentUser.username}
                        canModerate={currentUser && isAdminUser(currentUser)}
                        onEdit={(job) => { setEditingJob(job); setView("post"); }} onDelete={handleDeleteJob} />
                    ))}
                  </div>
                  {visibleCount < filteredJobs.length && (
                    <div className="text-center mt-6">
                      <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} style={{ border: "1px solid var(--border)", color: "var(--ink)" }} className="px-5 py-2 rounded-lg text-sm font-medium">
                        Load more ({filteredJobs.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>

        <footer style={{ borderTop: "1px solid var(--border)" }} className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span style={{ color: "var(--muted)" }}>Synced live across every signed-in user · no page refresh needed</span>
          <ColorfulText text="Organized by Shanmuk" />
        </footer>

        <JobModal job={openJob} onClose={() => setOpenJob(null)} onApply={handleApply} onSave={handleSave}
          saved={openJob ? savedIds.includes(openJob.id) : false} applied={openJob ? appliedIds.includes(openJob.id) : false} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="display-font text-xl font-bold" style={{ color: "var(--ink)", fontFamily: "'IBM Plex Mono', monospace" }}>{value}</p>
      <p className="text-[11px]" style={{ color: "var(--muted)" }}>{label}</p>
    </div>
  );
}

function EmptyState({ text, action }) {
  return (
    <div style={{ background: "var(--card)", border: "1px dashed var(--border)" }} className="rounded-2xl p-12 text-center">
      <Building2 size={28} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
      <p style={{ color: "var(--ink-soft)" }} className="text-sm mb-3">{text}</p>
      {action && (
        <button onClick={action.onClick} style={{ background: "var(--accent)", color: "var(--accent-ink)" }} className="px-4 py-2 rounded-lg text-sm font-semibold">
          {action.label}
        </button>
      )}
    </div>
  );
}