/* global React, MOCK, Icon, Pill, StatTile, KeyVal, SectionHead, ProcessRow, LockOverlay, utilTone, tempTone, Sparkline, TimeChart, RadialGauge, Meter, Donut */
// Dashboard, GpuDetail, History, Queue, Terminal screens

const { useState, useEffect, useRef, useMemo } = React;

const GPU_COLORS = {
  "RTX 3060": "var(--accent)",
  "RTX 3080": "oklch(0.7 0.15 200)",
  "RTX 4090": "oklch(0.7 0.15 30)",
};

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ goDetail, chartType }) {
  const { SERVER, GPUS, HISTORY, DISK, NET } = MOCK;
  const totalProcesses = MOCK.PROCESSES.length;
  const xLabels = useMemo(() => Array.from({ length: 60 }, (_, i) => `-${59 - i}m`), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1320 }}>
      {/* Server header */}
      <div className="surface" style={{ padding: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, var(--accent) 0%, oklch(0.65 0.15 200) 100%)",
            display: "grid", placeItems: "center", color: "white",
            boxShadow: "0 10px 24px -8px color-mix(in oklab, var(--accent) 60%, transparent)",
          }}>
            <Icon name="server" size={26} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 22, letterSpacing: "-0.02em", fontWeight: 700 }}>{SERVER.hostname}</h1>
              <Pill tone="ok" dot>線上</Pill>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
              <span className="num">{SERVER.ip}</span>
              <span>·</span>
              <span>{SERVER.os}</span>
              <span>·</span>
              <span>CUDA <span className="num">{SERVER.cudaVersion}</span></span>
              <span>·</span>
              <span>Driver <span className="num">{SERVER.driverVersion}</span></span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 22 }}>
          <MiniStat label="負載均值" values={SERVER.loadAvg.map(v => v.toFixed(2)).join(" / ")} />
          <MiniStat label="運行時間" values={SERVER.uptime} />
          <MiniStat label="進程數" values={totalProcesses} />
        </div>
      </div>

      {/* Top stat row — system overall */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {(() => {
          const gpuAvg = GPUS.length ? Math.round(GPUS.reduce((a, g) => a + g.util, 0) / GPUS.length) : 0;
          const gpuSub = `${GPUS.length} 張卡 · ${GPUS.filter(g => !g.locked).length} 解鎖`;
          const cpuPct = SERVER.cpuPct ?? 0;
          const ramPct = SERVER.ramPct ?? 0;
          const ramSub = (SERVER.ramUsed && SERVER.ramTotal)
            ? `${SERVER.ramUsed.toFixed(1)} / ${SERVER.ramTotal} GB` : "—";
          const diskUsed  = DISK.reduce((a, d) => a + d.usedGB, 0);
          const diskTotal = DISK.reduce((a, d) => a + d.totalGB, 0);
          const diskPct   = diskTotal > 0 ? Math.round(diskUsed / diskTotal * 100) : 0;
          const diskSub   = diskTotal > 0 ? `${diskUsed.toFixed(1)} / ${diskTotal.toFixed(1)} GB` : "—";
          return <>
            <StatTile icon="gpu" label="GPU 平均使用率" value={gpuAvg} unit="%" sub={gpuSub} gradient="var(--grad-gpu)" />
            <StatTile icon="cpu" label="CPU" value={cpuPct} unit="%" sub="即時使用率" gradient="var(--grad-cpu)" accent="oklch(0.65 0.15 200)" />
            <StatTile icon="ram" label="RAM" value={ramPct} unit="%" sub={ramSub} gradient="var(--grad-ram)" accent="oklch(0.7 0.13 80)" />
            <StatTile icon="disk" label="儲存使用" value={diskPct} unit="%" sub={diskSub} gradient="var(--grad-disk)" accent="oklch(0.65 0.15 320)" />
          </>;
        })()}
      </div>

      {/* GPU cards — filtered to unlocked only */}
      <div>
        <SectionHead title="我的 GPU" hint="點擊卡片進入詳細頁"
          action={<Pill tone="accent" dot>RTX 3060</Pill>}
        />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 560px)", gap: 16 }}>
          {GPUS.filter(g => !g.locked).map(g => (
            <GpuCard key={g.id} gpu={g} onClick={() => goDetail(g.id)} />
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="grid-collapse">
        <div className="surface" style={{ padding: 20 }}>
          <SectionHead title="過去 1 小時使用率" hint="GPU · CPU · RAM" />
          <TimeChart
            type={chartType}
            xLabels={xLabels}
            series={[
              { label: "GPU", values: HISTORY.gpuUtil, color: "var(--accent)" },
              { label: "CPU", values: HISTORY.cpuUtil, color: "oklch(0.65 0.15 200)" },
              { label: "RAM", values: HISTORY.ramUtil, color: "oklch(0.7 0.13 80)" },
            ]}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <SectionHead title="儲存空間" />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {DISK.map(d => {
              const pct = (d.used / d.total) * 100;
              return (
                <div key={d.mount}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{d.mount}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      <span className="num" style={{ fontWeight: 600 }}>{d.used}</span>
                      <span className="num"> / {d.total}</span> GB · {d.fs}
                    </span>
                  </div>
                  <Meter value={pct} color={pct > 80 ? "var(--crit)" : pct > 65 ? "var(--warn)" : "var(--accent)"} />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            <SectionHead title="網路流量" hint={NET.iface} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <NetStat label="↓ Rx" rate={NET.rxRate} total={NET.rxTotal} color="var(--ok)" values={MOCK.HISTORY.netRx} />
              <NetStat label="↑ Tx" rate={NET.txRate} total={NET.txTotal} color="var(--info)" values={MOCK.HISTORY.netTx} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1000px) {
          .grid-collapse { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function MiniStat({ label, values }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div className="num" style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{values}</div>
    </div>
  );
}

function NetStat({ label, rate, total, color, values }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
        <span className="num" style={{ fontSize: 12, fontWeight: 600 }}>{rate} <span className="muted" style={{ fontSize: 10 }}>MB/s</span></span>
      </div>
      <Sparkline values={values} color={color} width={170} height={36} />
      <div className="num" style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>累計 {total} GB</div>
    </div>
  );
}

function GpuCard({ gpu, onClick }) {
  const memPct = (gpu.memUsed / gpu.memTotal) * 100;
  const inner = (
    <div className="surface gpu-card" style={{
      padding: 20,
      cursor: gpu.locked ? "default" : "pointer",
      transition: "transform 200ms ease, box-shadow 200ms ease",
      position: "relative",
      overflow: "hidden",
    }}
      onClick={onClick}
    >
      {!gpu.locked && (
        <div style={{
          position: "absolute", top: 0, right: 0, width: 200, height: 200,
          background: `radial-gradient(circle at top right, color-mix(in oklab, ${GPU_COLORS[gpu.model]} 14%, transparent), transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon name="gpu" size={14} color={GPU_COLORS[gpu.model]} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>NVIDIA</span>
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>{gpu.model}</h3>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }} className="num">{gpu.memTotal} GB · {gpu.pcie}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {gpu.locked ? <Pill tone="neutral" dot>受限</Pill> : <Pill tone="ok" dot>運作中</Pill>}
          {!gpu.locked && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
              詳細 <Icon name="arrow-up-right" size={12} />
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 22, position: "relative" }}>
        <RadialGauge value={gpu.util} label="GPU" sublabel={`${gpu.power}W`} color={GPU_COLORS[gpu.model]} size={120} strokeWidth={10} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <Meter
            label="VRAM"
            valueLabel={`${gpu.memUsed} / ${gpu.memTotal} GB`}
            value={memPct}
            color={GPU_COLORS[gpu.model]}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MicroStat icon="thermo" label="溫度" value={gpu.temp} unit="°C" tone={tempTone(gpu.temp)} />
            <MicroStat icon="power" label="風扇" value={gpu.fan} unit="%" tone={gpu.fan > 80 ? "warn" : "ok"} />
          </div>
        </div>
      </div>

      {!gpu.locked && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), oklch(0.65 0.15 200))",
            color: "white", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700,
          }}>{gpu.user[0].toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{gpu.user}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{gpu.job}</div>
          </div>
        </div>
      )}

      <style>{`
        .gpu-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
      `}</style>
    </div>
  );

  return (
    <LockOverlay locked={gpu.locked} gpu={gpu.model}>
      {inner}
    </LockOverlay>
  );
}

function MicroStat({ icon, label, value, unit, tone }) {
  const toneColor = { ok: "var(--ok)", warn: "var(--warn)", crit: "var(--crit)" }[tone] || "var(--text)";
  return (
    <div style={{
      padding: "8px 10px",
      background: "var(--bg-sunken)",
      borderRadius: 10,
      border: "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: 2,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
        <Icon name={icon} size={11} />
        {label}
      </div>
      <div className="num" style={{ fontSize: 16, fontWeight: 600, color: toneColor }}>
        {value}<span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 2, fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

/* ---------------- GPU DETAIL ---------------- */
function GpuDetail({ chartType, goDashboard }) {
  const gpu = MOCK.GPUS[0];
  const xLabels = useMemo(() => Array.from({ length: 60 }, (_, i) => `-${59 - i}m`), []);

  if (!gpu) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, gap: 12, color: "var(--text-muted)" }}>
        <span className="live-dot" />
        <span style={{ fontSize: 14 }}>正在連線並取得資料…</span>
      </div>
    );
  }

  const myProcs = MOCK.PROCESSES.filter(p => p.gpu === gpu.index || p.gpu === 0);
  const memPct = (gpu.memUsed / gpu.memTotal) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1320 }}>
      <div style={{ display: "none" }} />

      {/* Hero */}
      <div className="surface hero-collapse" style={{ padding: 24, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 28, alignItems: "center" }}>
        <RadialGauge value={gpu.util} label="使用率" sublabel="即時" size={170} strokeWidth={14} color="var(--accent)" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em", fontWeight: 700 }}>NVIDIA {gpu.model}</h1>
            <Pill tone="ok" dot>運作中</Pill>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {gpu.memTotal} GB · {gpu.pcie}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 12 }} className="hero-stats">
            <BigStat label="VRAM" value={gpu.memUsed.toFixed(3)} unit={`/${gpu.memTotal} GB`} />
            <BigStat label="溫度" value={gpu.temp} unit="°C" tone={tempTone(gpu.temp)} />
            <BigStat label="功耗" value={gpu.power} unit={`/${gpu.powerCap} W`} />
            <BigStat label="風扇" value={gpu.fan} unit="%" />
          </div>
        </div>
      </div>

      {/* Chart row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-collapse">
        <div className="surface" style={{ padding: 20 }}>
          <SectionHead title="GPU 使用率 · VRAM · 溫度" hint="過去 60 分鐘 · 1 分鐘間隔"
            action={<Pill tone="accent" dot>即時</Pill>}
          />
          <TimeChart
            type={chartType}
            xLabels={xLabels}
            series={[
              { label: "使用率 %", values: MOCK.HISTORY.gpuUtil, color: "var(--accent)" },
              { label: "VRAM %", values: MOCK.HISTORY.gpuMem, color: "oklch(0.7 0.15 30)" },
              { label: "溫度 ÷ 1℃", values: MOCK.HISTORY.gpuTemp, color: "oklch(0.7 0.13 80)" },
            ]}
          />
        </div>
        <div className="surface" style={{ padding: 20 }}>
          <SectionHead title="VRAM 配置" />
          {(() => {
            const procColors = ["var(--accent)", "oklch(0.7 0.13 200)", "oklch(0.7 0.15 30)", "oklch(0.7 0.13 80)"];
            const procMemGB  = myProcs.map(p => p.mem / 1024);
            const usedByProcs = procMemGB.reduce((a, v) => a + v, 0);
            const freeGB = Math.max(0, gpu.memTotal - gpu.memUsed);
            return (
              <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 18 }}>
                <Donut used={gpu.memUsed} total={gpu.memTotal} color="var(--accent)" size={120} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {myProcs.map((p, i) => (
                    <MemSlice key={p.pid}
                      label={p.cmd.split(/\s+/)[0].split("/").pop().slice(0, 24)}
                      value={procMemGB[i]}
                      total={gpu.memTotal}
                      color={procColors[i % procColors.length]}
                    />
                  ))}
                  <MemSlice label="可用" value={freeGB} total={gpu.memTotal} color="var(--border-strong)" />
                </div>
              </div>
            );
          })()}
          <KeyVal k="已用 / 總計" v={`${gpu.memUsed.toFixed(3)} / ${gpu.memTotal} GB`} />
          <KeyVal k="使用率" v={`${gpu.util} %`} />
          <KeyVal k="PCIe" v={gpu.pcie} />
        </div>
      </div>

      {/* Processes */}
      <div className="surface" style={{ padding: 20 }}>
        <SectionHead title="執行中的進程" hint={`${myProcs.length} 個進程使用此 GPU`} action={<button style={refreshBtn}><Icon name="refresh" size={12} /> 重新整理</button>} />
        <ProcessTable rows={myProcs} locked={false} />
      </div>
    </div>
  );
}

/* ---------------- FILE BROWSER ---------------- */
function FileBrowser() {
  const [path, setPath] = useState("~");
  const [crumbs, setCrumbs] = useState(["~"]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPath = async (p) => {
    setLoading(true);
    setSelected(null);
    try {
      const res = await API.fetch(`/api/files?path=${encodeURIComponent(p)}`);
      setRawItems(res.items || []);
    } catch {
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPath(path); }, []);

  const items = rawItems.filter(f =>
    !filter || f.name.toLowerCase().includes(filter.toLowerCase())
  );

  const enterDir = (name) => {
    const newPath = path === "~" ? `~/${name}` : `${path}/${name}`;
    setCrumbs([...crumbs, name]);
    setPath(newPath);
    loadPath(newPath);
    setSelected(null);
  };
  const upTo = (i) => {
    const newCrumbs = crumbs.slice(0, i + 1);
    const newPath = newCrumbs.join("/");
    setCrumbs(newCrumbs);
    setPath(newPath);
    loadPath(newPath);
    setSelected(null);
  };

  return (
    <div className="surface" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{
        padding: "16px 20px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>檔案瀏覽</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12, fontFamily: "var(--font-mono)" }}>
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                <button onClick={() => upTo(i)} style={{
                  background: "transparent", border: "none", padding: "2px 6px", borderRadius: 6,
                  fontSize: 12, fontFamily: "var(--font-mono)",
                  color: i === crumbs.length - 1 ? "var(--text)" : "var(--text-muted)",
                  fontWeight: i === crumbs.length - 1 ? 600 : 500,
                  cursor: "pointer",
                }}>{c}</button>
                {i < crumbs.length - 1 && <span style={{ color: "var(--text-dim)" }}>/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="搜尋檔名…"
            style={{
              padding: "8px 12px", fontSize: 12, fontFamily: "inherit",
              background: "var(--bg-sunken)", border: "1px solid var(--border)",
              borderRadius: 999, color: "var(--text)", outline: "none",
              width: 180,
            }} />
          <button style={refreshBtn} onClick={() => loadPath(path)}>
            <Icon name="refresh" size={12} /> {loading ? "載入中…" : "重新整理"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 280px" : "1fr", minHeight: 320 }} className="fb-grid">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ ...th, width: "60%" }}>名稱</th>
                <th style={th}>大小</th>
                <th style={{ ...th, textAlign: "right", paddingRight: 24 }}>修改時間</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.name}
                  onClick={() => f.type === "dir" ? enterDir(f.name) : setSelected(f)}
                  style={{
                    borderTop: "1px solid var(--border)",
                    cursor: "pointer",
                    background: selected?.name === f.name ? "var(--accent-soft)" : "transparent",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => { if (selected?.name !== f.name) e.currentTarget.style.background = "var(--bg-sunken)"; }}
                  onMouseLeave={(e) => { if (selected?.name !== f.name) e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                    <FileIcon type={f.type} />
                    <span className="mono" style={{ fontSize: 13, fontWeight: f.type === "dir" ? 600 : 500 }}>{f.name}</span>
                    {f.badge === "active" && <Pill tone="ok" dot>運行中</Pill>}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="num" style={{ color: "var(--text-muted)", fontSize: 12 }}>{f.size}</span>
                  </td>
                  <td style={{ padding: "10px 24px 10px 12px", textAlign: "right" }}>
                    <span className="num" style={{ color: "var(--text-dim)", fontSize: 12 }}>{f.mod}</span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>沒有符合的檔案</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && (
          <div style={{ borderLeft: "1px solid var(--border)", padding: 20, background: "var(--bg-sunken)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <FileIcon type={selected.type} large />
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-all" }}>{selected.name}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 4,
              }}>✕</button>
            </div>
            <KeyVal k="類型" v={selected.type.toUpperCase()} mono={false} />
            <KeyVal k="大小" v={selected.size} />
            <KeyVal k="修改" v={selected.mod} />
            <KeyVal k="路徑" v={`~/${selected.name}`} />
            <KeyVal k="權限" v="rw-r--r--" />
            <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-dim)" }}>
              <Icon name="info" size={11} /> 唯讀模式 — 不支援下載或編輯
            </div>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 880px) {
          .fb-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function FileIcon({ type, large = false }) {
  const s = large ? 28 : 16;
  const colors = {
    dir:  { bg: "var(--accent-soft)", fg: "var(--accent)" },
    py:   { bg: "var(--info-soft)",   fg: "var(--info)" },
    yaml: { bg: "var(--warn-soft)",   fg: "var(--warn)" },
    txt:  { bg: "var(--bg-sunken)",   fg: "var(--text-muted)" },
    log:  { bg: "var(--bg-sunken)",   fg: "var(--text-muted)" },
    md:   { bg: "var(--bg-sunken)",   fg: "var(--text-muted)" },
    ckpt: { bg: "var(--ok-soft)",     fg: "var(--ok)" },
  };
  const c = colors[type] || colors.txt;
  const labels = { dir: "DIR", py: "py", yaml: "yml", txt: "txt", log: "log", md: "md", ckpt: "pt" };
  return (
    <span style={{
      width: large ? 40 : 26,
      height: large ? 40 : 26,
      borderRadius: large ? 10 : 6,
      background: c.bg,
      color: c.fg,
      display: "grid", placeItems: "center",
      fontSize: large ? 11 : 9,
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      letterSpacing: "0.04em",
      flexShrink: 0,
    }}>
      {type === "dir" ? <Icon name="queue" size={large ? 18 : 11} /> : labels[type] || "•"}
    </span>
  );
}

function BigStat({ label, value, unit, tone }) {
  const toneColor = { ok: "var(--ok)", warn: "var(--warn)", crit: "var(--crit)" }[tone] || "var(--text)";
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: toneColor }}>{value}</span>
        <span className="num" style={{ fontSize: 11, color: "var(--text-muted)" }}>{unit}</span>
      </div>
    </div>
  );
}

function MemSlice({ label, value, total, color }) {
  const pct = (value / total) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
          {label}
        </span>
        <span className="num">{Number(value).toFixed(3)} GB</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-sunken)", borderRadius: 999 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

function ProcessTable({ rows, locked }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={th}>PID</th>
            <th style={th}>GPU</th>
            <th style={th}>使用者</th>
            <th style={th}>VRAM</th>
            <th style={th}>命令</th>
            <th style={{ ...th, textAlign: "right" }}>啟動</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => <ProcessRow key={p.pid} p={p} locked={locked} />)}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  padding: "10px 12px",
  fontSize: 10, fontWeight: 700,
  color: "var(--text-dim)",
  letterSpacing: "0.08em", textTransform: "uppercase",
  borderBottom: "1px solid var(--border)",
};

const refreshBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "6px 12px",
  background: "var(--bg-sunken)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  fontSize: 12, color: "var(--text-muted)", fontWeight: 500,
};

/* ---------------- HISTORY ---------------- */

const RANGE_INTERVAL_MINS = { "1h": 0.5, "6h": 3, "24h": 12, "7d": 84 };

function makeXLabels(n, range) {
  const step = RANGE_INTERVAL_MINS[range] || 0.5;
  return Array.from({ length: n }, (_, i) => {
    const mins = (n - 1 - i) * step;
    if (mins === 0) return "now";
    if (mins >= 1440) return `-${Math.round(mins / 1440)}d`;
    if (mins >= 60)   return `-${Math.round(mins / 60)}h`;
    return `-${Math.round(mins)}m`;
  });
}

function History({ chartType }) {
  const [range, setRange]     = useState("1h");
  const [hist, setHist]       = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    API.fetch(`/api/history?range=${range}`)
      .then(data => setHist(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const n      = hist.gpuUtil?.length || 0;
  const xLabels = useMemo(() => makeXLabels(n, range), [n, range]);

  const charts = [
    { title: "GPU 使用率", key: "gpuUtil", color: "var(--accent)",          unit: "%" },
    { title: "VRAM",       key: "gpuMem",  color: "oklch(0.7 0.15 30)",    unit: "%" },
    { title: "GPU 溫度",   key: "gpuTemp", color: "oklch(0.75 0.15 50)",   unit: "°C" },
    { title: "CPU",        key: "cpuUtil", color: "oklch(0.65 0.15 200)",  unit: "%" },
    { title: "RAM",        key: "ramUtil", color: "oklch(0.7 0.13 80)",    unit: "%" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1320 }}>
      <div className="surface" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>歷史紀錄</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            {loading ? "載入中…" : `解析度 ${RANGE_INTERVAL_MINS[range] < 1 ? `${RANGE_INTERVAL_MINS[range]*60}s` : `${RANGE_INTERVAL_MINS[range]}min`} · ${n} 筆`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, padding: 4, background: "var(--bg-sunken)", borderRadius: 999, border: "1px solid var(--border)" }}>
          {["1h", "6h", "24h", "7d"].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: "6px 14px",
              background: range === r ? "var(--surface)" : "transparent",
              border: "none", borderRadius: 999,
              fontSize: 12, fontWeight: 600,
              color: range === r ? "var(--text)" : "var(--text-muted)",
              boxShadow: range === r ? "var(--shadow-sm)" : "none",
            }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: loading ? 0.5 : 1, transition: "opacity 200ms" }}>
        {charts.map(({ title, key, color, unit }) => (
          <ChartCard
            key={key}
            title={title}
            sub={`RTX 3060 · ${range}`}
            series={[{ label: `${title} ${unit}`, values: hist[key] || [], color }]}
            chartType={chartType}
            xLabels={xLabels}
          />
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, sub, series, chartType, xLabels }) {
  return (
    <div className="surface" style={{ padding: 14 }}>
      <SectionHead title={title} hint={sub} />
      <TimeChart type={chartType} series={series} xLabels={xLabels} height={150} showLegend={false} />
    </div>
  );
}

/* ---------------- QUEUE ---------------- */
function QueueScreen() {
  const procs = MOCK.PROCESSES;
  const gpus  = MOCK.GPUS;

  const gpuName = (p) => {
    const g = gpus.find(g => g.index === p.gpu || g.model === p.gpu);
    return g ? g.model : p.gpu ?? "—";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1320 }}>
      <div className="surface" style={{ padding: 22 }}>
        <SectionHead
          title="執行中的任務"
          hint={`${procs.length} 個進程正在使用 GPU`}
          action={<Pill tone="ok" dot>即時</Pill>}
        />

        {procs.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 13 }}>
            目前沒有 GPU 進程
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={th}>PID</th>
                  <th style={th}>使用者</th>
                  <th style={th}>GPU</th>
                  <th style={th}>VRAM</th>
                  <th style={th}>進程 / 命令</th>
                </tr>
              </thead>
              <tbody>
                {procs.map((p, i) => {
                  const memGB = (p.mem / 1024).toFixed(3);
                  return (
                    <tr key={p.pid} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: i === 0 ? "var(--accent-soft)" : "var(--bg-sunken)",
                            color: i === 0 ? "var(--accent)" : "var(--text-muted)",
                            display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700,
                          }}>{i + 1}</span>
                          <span className="num" style={{ fontWeight: 600 }}>{p.pid}</span>
                        </div>
                      </td>
                      <td style={td}>
                        <Pill tone="accent">{p.user}</Pill>
                      </td>
                      <td style={td}>
                        <span className="mono" style={{ fontSize: 12 }}>{gpuName(p)}</span>
                      </td>
                      <td style={td}>
                        <span className="num" style={{ fontWeight: 600 }}>{memGB}</span>
                        <span className="num" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4 }}>GB</span>
                      </td>
                      <td style={{ ...td, maxWidth: 560 }}>
                        <code style={{
                          fontSize: 12, color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          wordBreak: "break-all", whiteSpace: "pre-wrap",
                        }}>{p.cmd}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-GPU summary */}
      {gpus.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {gpus.map(g => {
            const gProcs = procs.filter(p => p.gpu === g.index || p.gpu === g.model);
            const memPct = (g.memUsed / g.memTotal) * 100;
            return (
              <div key={g.id} className="surface" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{g.model}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {gProcs.length} 個進程
                    </div>
                  </div>
                  <Pill tone={g.util >= 90 ? "crit" : g.util >= 70 ? "warn" : "ok"} dot>
                    {g.util}%
                  </Pill>
                </div>
                <Meter
                  label="VRAM"
                  valueLabel={`${g.memUsed.toFixed(3)} / ${g.memTotal} GB`}
                  value={memPct}
                  color="var(--accent)"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const td = { padding: "12px 12px", borderBottom: "0" };

/* ---------------- TERMINAL (real WebSocket PTY) ---------------- */
function Terminal() {
  const outputRef = useRef(null);
  const inputRef  = useRef(null);
  const wsRef     = useRef(null);
  const bottomRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lines, setLines] = useState([]);

  const appendText = (text) => {
    setLines(prev => {
      // Naively split on \r\n or \n, keeping VT100 codes as-is
      const newLines = text.split(/\r?\n/);
      if (prev.length === 0) return newLines.filter(Boolean);
      const updated = [...prev];
      updated[updated.length - 1] += newLines[0];
      return [...updated, ...newLines.slice(1)];
    });
    setTimeout(() => bottomRef.current?.scrollIntoView({ block: "end" }), 20);
  };

  useEffect(() => {
    const token = API.getToken();
    if (!token) { appendText("Not authenticated.\r\n"); return; }

    const wsUrl = API.base.replace(/^http/, "ws") + `/ws/terminal?token=${token}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen  = () => { setConnected(true); inputRef.current?.focus(); };
    ws.onclose = () => { setConnected(false); appendText("\r\n[連線已關閉]\r\n"); };
    ws.onerror = () => appendText("\r\n[WebSocket 錯誤]\r\n");
    ws.onmessage = (e) => {
      const txt = typeof e.data === "string"
        ? e.data
        : new TextDecoder().decode(e.data);
      appendText(txt);
    };

    return () => ws.close();
  }, []);

  const sendInput = (e) => {
    e.preventDefault();
    const val = inputRef.current?.value ?? "";
    if (!val && e.key !== "Enter") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(val + "\n");
      inputRef.current.value = "";
    }
  };

  return (
    <div className="surface" style={{
      maxWidth: 1320, padding: 0, overflow: "hidden",
      background: "oklch(0.16 0.015 265)",
      color: "oklch(0.92 0.01 130)",
      borderColor: "oklch(0.28 0.02 265)",
    }}>
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid oklch(0.28 0.02 265)",
        display: "flex", alignItems: "center", gap: 8, fontSize: 12,
        color: "oklch(0.7 0.01 130)",
      }}>
        <Icon name="term" size={13} />
        <span style={{ fontFamily: "var(--font-mono)" }}>eclab313@140.113.73.82</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {connected ? <><span className="live-dot" /><span className="num">已連線</span></> : <span className="num" style={{ color: "var(--crit)" }}>未連線</span>}
        </span>
      </div>
      <div ref={outputRef} onClick={() => inputRef.current?.focus()}
        style={{ padding: 18, fontFamily: "var(--font-mono)", fontSize: 13, height: 460, overflowY: "auto", lineHeight: 1.55 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ whiteSpace: "pre-wrap", color: "oklch(0.85 0.005 130)" }}>{l}</div>
        ))}
        <form onSubmit={sendInput} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <input ref={inputRef}
            onKeyDown={(e) => { if (e.key === "Enter") { sendInput(e); } }}
            autoFocus disabled={!connected}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--font-mono)", fontSize: 13, color: "oklch(0.92 0.01 130)",
            }} />
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function FilesScreen() {
  return <div style={{ maxWidth: 1320 }}><FileBrowser /></div>;
}

Object.assign(window, { Dashboard, GpuDetail, History, QueueScreen, Terminal, FilesScreen });
