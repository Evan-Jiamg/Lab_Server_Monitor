/* global React, MOCK, Sparkline, TimeChart, RadialGauge, Meter, Donut */
// Reusable UI bits — Card, Pill, StatTile, KeyVal, Icon, ProcessRow, etc.

const { useState, useEffect, useRef } = React;

// Inline icon set — minimal stroke icons
const Icon = ({ name, size = 16, color = "currentColor", strokeWidth = 1.8 }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "lock": return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case "unlock": return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>;
    case "cpu": return <svg {...props}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9z"/><path d="M3 10h2M3 14h2M19 10h2M19 14h2M10 3v2M14 3v2M10 19v2M14 19v2"/></svg>;
    case "ram": return <svg {...props}><rect x="2" y="8" width="20" height="9" rx="1.5"/><path d="M6 8v9M10 8v9M14 8v9M18 8v9"/></svg>;
    case "gpu": return <svg {...props}><rect x="2" y="6" width="20" height="11" rx="2"/><circle cx="8" cy="11.5" r="2.4"/><circle cx="16" cy="11.5" r="2.4"/><path d="M2 17l-1 3M22 17l1 3"/></svg>;
    case "disk": return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>;
    case "thermo": return <svg {...props}><path d="M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0z"/></svg>;
    case "power": return <svg {...props}><path d="M12 3v9"/><path d="M5.6 7.4a8 8 0 1 0 12.8 0"/></svg>;
    case "queue": return <svg {...props}><path d="M3 6h18M3 12h18M3 18h12"/></svg>;
    case "term": return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/></svg>;
    case "chart": return <svg {...props}><path d="M3 20h18"/><path d="M6 16V9M11 16V5M16 16v-4M21 16v-7"/></svg>;
    case "home": return <svg {...props}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>;
    case "server": return <svg {...props}><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><circle cx="7" cy="7" r="0.6" fill="currentColor"/><circle cx="7" cy="17" r="0.6" fill="currentColor"/></svg>;
    case "user": return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "key": return <svg {...props}><circle cx="8" cy="14" r="4"/><path d="M11 12l9-9M16 7l3 3"/></svg>;
    case "moon": return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>;
    case "sun": return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case "chevron-right": return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case "chevron-left": return <svg {...props}><path d="M15 6l-9 6 9 6"/></svg>;
    case "arrow-up-right": return <svg {...props}><path d="M7 17L17 7M9 7h8v8"/></svg>;
    case "settings": return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case "logout": return <svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
    case "play": return <svg {...props}><path d="M6 4l14 8-14 8z" fill="currentColor"/></svg>;
    case "refresh": return <svg {...props}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>;
    case "info": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>;
    case "wifi": return <svg {...props}><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="0.6" fill="currentColor"/></svg>;
    default: return null;
  }
};

// Status pill
function Pill({ tone = "neutral", children, dot = false }) {
  const tones = {
    neutral: { bg: "var(--bg-sunken)", fg: "var(--text-muted)", dot: "var(--text-dim)" },
    ok: { bg: "var(--ok-soft)", fg: "var(--ok)", dot: "var(--ok)" },
    warn: { bg: "var(--warn-soft)", fg: "var(--warn)", dot: "var(--warn)" },
    crit: { bg: "var(--crit-soft)", fg: "var(--crit)", dot: "var(--crit)" },
    info: { bg: "var(--info-soft)", fg: "var(--info)", dot: "var(--info)" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent)", dot: "var(--accent)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: t.bg, color: t.fg,
      padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot }} />}
      {children}
    </span>
  );
}

// Tone for utilization
function utilTone(v) {
  if (v >= 90) return "crit";
  if (v >= 70) return "warn";
  return "ok";
}
function tempTone(v) {
  if (v >= 80) return "crit";
  if (v >= 70) return "warn";
  return "ok";
}

// Big stat tile
function StatTile({ icon, label, value, unit, sub, accent = "var(--accent)", gradient }) {
  return (
    <div className="surface" style={{
      padding: "18px 20px",
      background: gradient || undefined,
      position: "relative",
      overflow: "hidden",
      minHeight: 116,
    }}>
      {gradient && (
        <div style={{
          position: "absolute", inset: 1,
          borderRadius: "calc(var(--r-lg) - 1px)",
          background: gradient,
          opacity: 1,
          pointerEvents: "none",
          zIndex: 0,
        }} />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            display: "grid", placeItems: "center",
            background: "color-mix(in oklab, var(--surface) 80%, transparent)",
            color: accent,
            border: "1px solid var(--border)",
          }}>
            <Icon name={icon} size={16} />
          </div>
          <span className="muted" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
        </div>
        <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="num" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</span>
          {unit && <span className="num muted" style={{ fontSize: 14, fontWeight: 500 }}>{unit}</span>}
        </div>
        {sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{sub}</div>}
      </div>
    </div>
  );
}

// Key/value row
function KeyVal({ k, v, mono = true }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{k}</span>
      <span className={mono ? "num" : ""} style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

// Section header
function SectionHead({ title, hint, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, paddingTop: 4 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>{title}</h2>
        {hint && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{hint}</div>}
      </div>
      {action}
    </div>
  );
}

// Process table row
function ProcessRow({ p, locked }) {
  const truncCmd = p.cmd.length > 64 ? p.cmd.slice(0, 64) + "…" : p.cmd;
  return (
    <tr style={{ borderTop: "1px solid var(--border)" }}>
      <td style={{ padding: "10px 12px" }}>
        <span className="num" style={{ fontWeight: 600, color: locked ? "var(--text-dim)" : "var(--text)" }}>{p.pid}</span>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <Pill tone="info">GPU{p.gpu}</Pill>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <span style={{ fontSize: 13, color: locked ? "var(--text-dim)" : "var(--text)" }}>
          {locked ? "•••" : p.user}
        </span>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <span className="num" style={{ fontWeight: 600 }}>{(p.mem / 1024).toFixed(1)}</span>
        <span className="num muted" style={{ fontSize: 11, marginLeft: 4 }}>GB</span>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <code style={{ fontSize: 12, color: locked ? "var(--text-dim)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {locked ? "•••••••••••••••••••" : truncCmd}
        </code>
      </td>
      <td style={{ padding: "10px 12px", textAlign: "right" }}>
        <span className="num muted" style={{ fontSize: 12 }}>{p.started}</span>
      </td>
    </tr>
  );
}

// Lock overlay for restricted GPUs
function LockOverlay({ children, locked, gpu }) {
  if (!locked) return children;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(4px)", opacity: 0.55, pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: "color-mix(in oklab, var(--surface) 35%, transparent)",
        backdropFilter: "blur(2px)",
        borderRadius: "var(--r-lg)",
      }}>
        <div className="surface" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow-md)" }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--bg-sunken)", display: "grid", placeItems: "center", color: "var(--text-muted)" }}>
            <Icon name="lock" size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{gpu} 受限</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>需要對應 GPU 的存取密碼</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Pill, StatTile, KeyVal, SectionHead, ProcessRow, LockOverlay, utilTone, tempTone });
