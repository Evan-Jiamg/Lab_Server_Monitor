/* global React */
// SVG chart primitives — line/area/bar/donut/sparkline + radial gauge

const { useMemo, useState, useRef, useEffect } = React;

function buildPath(values, w, h, padX = 0, padY = 4) {
  const max = 100;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const step = innerW / (values.length - 1 || 1);
  return values.map((v, i) => {
    const x = padX + i * step;
    const y = padY + innerH - (v / max) * innerH;
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function buildArea(values, w, h, padX = 0, padY = 4) {
  const linePath = buildPath(values, w, h, padX, padY);
  return `${linePath} L${(w - padX).toFixed(2)} ${(h - padY).toFixed(2)} L${padX.toFixed(2)} ${(h - padY).toFixed(2)} Z`;
}

function Sparkline({ values, color = "var(--accent)", width = 120, height = 36, fill = true, strokeWidth = 1.6 }) {
  const id = useMemo(() => "spk_" + Math.random().toString(36).slice(2, 9), []);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={buildArea(values, width, height, 0, 3)} fill={`url(#${id})`} />}
      <path d={buildPath(values, width, height, 0, 3)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Major chart with axes, grid, hover crosshair
function TimeChart({
  series,                 // [{ label, values, color }]
  height = 280,
  yMax = 100,
  yUnit = "%",
  yTicks = [0, 25, 50, 75, 100],
  type = "area",          // 'area' | 'line' | 'bar'
  xLabels,                // optional time labels
  showLegend = true,
}) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, e.contentRect.width)));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const padL = 40, padR = 12, padT = 14, padB = 28;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const n = series[0]?.values.length || 0;
  const step = n > 1 ? innerW / (n - 1) : innerW;
  const xAt = (i) => padL + i * step;
  const yAt = (v) => padT + innerH - (v / yMax) * innerH;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < padL || x > w - padR) { setHover(null); return; }
    const i = Math.round((x - padL) / step);
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const onLeave = () => setHover(null);

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={onLeave} style={{ display: "block" }}>
        <defs>
          {series.map((s, idx) => (
            <linearGradient key={idx} id={`grad_${idx}_${s.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* y grid */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={yAt(t)} x2={w - padR} y2={yAt(t)} stroke="var(--border)" strokeDasharray="2 4" />
            <text x={padL - 8} y={yAt(t) + 4} fontSize="11" textAnchor="end" fill="var(--text-dim)" fontFamily="var(--font-mono)">
              {t}{yUnit}
            </text>
          </g>
        ))}

        {/* x labels */}
        {xLabels && xLabels.map((lbl, i) => (
          (i === 0 || i === xLabels.length - 1 || i % Math.ceil(n / 6) === 0) ? (
            <text key={i} x={xAt(i)} y={height - 8} fontSize="11" textAnchor="middle" fill="var(--text-dim)" fontFamily="var(--font-mono)">{lbl}</text>
          ) : null
        ))}

        {/* series */}
        {series.map((s, idx) => {
          if (type === "bar") {
            const barW = Math.max(2, step * 0.55);
            return (
              <g key={idx}>
                {s.values.map((v, i) => (
                  <rect key={i}
                    x={xAt(i) - barW / 2}
                    y={yAt(v)}
                    width={barW}
                    height={innerH - (yAt(v) - padT)}
                    fill={s.color}
                    opacity={0.85}
                    rx={2}
                  />
                ))}
              </g>
            );
          }
          const lp = s.values.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)}`).join(" ");
          const ap = `${lp} L${xAt(n - 1).toFixed(2)} ${(padT + innerH).toFixed(2)} L${padL.toFixed(2)} ${(padT + innerH).toFixed(2)} Z`;
          return (
            <g key={idx}>
              {type === "area" && <path d={ap} fill={`url(#grad_${idx}_${s.label})`} />}
              <path d={lp} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* hover crosshair */}
        {hover != null && (
          <g>
            <line x1={xAt(hover)} y1={padT} x2={xAt(hover)} y2={padT + innerH} stroke="var(--border-strong)" strokeDasharray="3 3" />
            {series.map((s, idx) => (
              <circle key={idx} cx={xAt(hover)} cy={yAt(s.values[hover])} r="4.5" fill="var(--surface)" stroke={s.color} strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>

      {/* tooltip */}
      {hover != null && (
        <div style={{
          position: "relative",
          marginTop: -height + (height * 0.15),
          marginLeft: Math.min(Math.max(xAt(hover) + 12, padL), w - 180),
          width: 168,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-sm)",
          boxShadow: "var(--shadow-md)",
          padding: "8px 10px",
          fontSize: 12,
          pointerEvents: "none",
          zIndex: 5,
        }}>
          <div className="muted mono" style={{ fontSize: 11, marginBottom: 4 }}>
            {xLabels ? xLabels[hover] : `t-${n - 1 - hover}m`}
          </div>
          {series.map((s, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                {s.label}
              </span>
              <span className="num" style={{ fontWeight: 600 }}>{s.values[hover]}{yUnit}</span>
            </div>
          ))}
        </div>
      )}

      {showLegend && (
        <div style={{ display: "flex", gap: 16, paddingLeft: padL, marginTop: 4, flexWrap: "wrap" }}>
          {series.map((s) => (
            <span key={s.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Radial ring gauge for utilization %
function RadialGauge({ value, label, sublabel, size = 130, strokeWidth = 12, color = "var(--accent)" }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="num" style={{ fontSize: size * 0.26, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {Math.round(value)}<span style={{ fontSize: size * 0.13, color: "var(--text-muted)", fontWeight: 500 }}>%</span>
        </div>
        {label && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>}
        {sublabel && <div className="num" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

// Linear meter
function Meter({ value, max = 100, color = "var(--accent)", height = 8, label, valueLabel, hint }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ width: "100%" }}>
      {(label || valueLabel) && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: "var(--text-muted)" }}>{label}</span>
          <span className="num" style={{ fontWeight: 600 }}>{valueLabel}</span>
        </div>
      )}
      <div style={{ height, background: "var(--bg-sunken)", borderRadius: 999, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 600ms cubic-bezier(0.2, 0.7, 0.2, 1)" }} />
      </div>
      {hint && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// Donut for memory split etc
function Donut({ used, total, color = "var(--accent)", size = 100, label = "VRAM" }) {
  const pct = (used / total) * 100;
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{used.toFixed(3)}</div>
        <div className="num" style={{ fontSize: 11, color: "var(--text-muted)" }}>/ {total} GB</div>
      </div>
    </div>
  );
}

Object.assign(window, { Sparkline, TimeChart, RadialGauge, Meter, Donut });
