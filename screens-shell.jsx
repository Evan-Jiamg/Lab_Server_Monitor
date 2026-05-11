/* global React, MOCK, Icon, Pill, StatTile, KeyVal, SectionHead, ProcessRow, LockOverlay, utilTone, tempTone, Sparkline, TimeChart, RadialGauge, Meter, Donut */
// Screens — Login, Dashboard, GpuDetail, History, plus shared Shell

const { useState, useEffect, useRef, useMemo } = React;

/* ---------------- SERVER FORM (shared by Login + Modal) ---------------- */
function ServerForm({ presets, onSubmit, submitLabel = "連線", loginErr, autoFocusPw = false }) {
  const [selectedId, setSelectedId] = useState(presets[0]?.id ?? "custom");
  const [pw,   setPw]   = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // custom fields (shown when no preset selected)
  const [cHost, setCHost] = useState("");
  const [cPort, setCPort] = useState("22");
  const [cUser, setCUser] = useState("");

  const preset     = presets.find(p => p.id === selectedId);
  const isCustom   = selectedId === "custom";
  const need2fa    = preset?.need2fa ?? false;
  const canSubmit  = pw && (isCustom ? cHost && cUser : true);

  const submit = async (e) => {
    e?.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const creds = preset
        ? { host: preset.host, port: preset.port, user: preset.user, pw, code, label: preset.label }
        : { host: cHost, port: Number(cPort) || 22, user: cUser, pw, code, label: cHost };
      await onSubmit(creds);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
      {/* Server selector */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${presets.length + 1}, 1fr)`, gap: 8 }}>
        {presets.map(p => {
          const active = selectedId === p.id;
          return (
            <button key={p.id} type="button" onClick={() => setSelectedId(p.id)} style={{
              padding: "10px 8px",
              background: active ? "var(--accent-soft)" : "var(--bg-sunken)",
              border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "left",
              transition: "all 120ms",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--accent)" : "var(--text)" }}>{p.label}</div>
              <div className="num" style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                {p.host}{p.port !== 22 ? `:${p.port}` : ""}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{p.user}</div>
            </button>
          );
        })}
        {/* Custom option */}
        <button type="button" onClick={() => setSelectedId("custom")} style={{
          padding: "10px 8px",
          background: isCustom ? "var(--accent-soft)" : "var(--bg-sunken)",
          border: `1.5px solid ${isCustom ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "var(--r-md)", cursor: "pointer", textAlign: "left",
          transition: "all 120ms",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isCustom ? "var(--accent)" : "var(--text-muted)" }}>自訂</div>
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>其他伺服器</div>
        </button>
      </div>

      {/* Custom fields */}
      {isCustom && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={cHost} onChange={e => setCHost(e.target.value)} className="login-input" placeholder="Host / IP" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
            <input value={cUser} onChange={e => setCUser(e.target.value)} className="login-input" placeholder="使用者名稱" />
            <input value={cPort} onChange={e => setCPort(e.target.value)} className="login-input" placeholder="Port" />
          </div>
        </div>
      )}

      {/* Password */}
      <input type="password" value={pw} onChange={e => setPw(e.target.value)}
        className="login-input" placeholder="SSH 密碼" autoFocus={autoFocusPw} />

      {/* 2FA code */}
      {(need2fa || isCustom) && (
        <input value={code} onChange={e => setCode(e.target.value)}
          className="login-input"
          placeholder={need2fa ? "驗證碼（每次不同）" : "驗證碼（選填）"} />
      )}

      {loginErr && (
        <div style={{ padding: "9px 12px", borderRadius: "var(--r-md)", background: "var(--crit-soft)", color: "var(--crit)", fontSize: 12 }}>
          {loginErr}
        </div>
      )}

      <button type="submit" disabled={busy || !canSubmit} style={{
        background: "var(--accent)", color: "var(--accent-fg)", border: "none",
        borderRadius: "var(--r-md)", padding: "12px 18px",
        fontSize: 14, fontWeight: 600, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 8px 20px -8px color-mix(in oklab, var(--accent) 70%, transparent)",
        opacity: (busy || !canSubmit) ? 0.5 : 1, transition: "opacity 120ms",
      }}>
        {busy ? "連線中…" : submitLabel}
      </button>
    </form>
  );
}

/* ---------------- LOGIN ---------------- */
function Login({ onLogin, loginErr }) {
  /* global PRESET_SERVERS */
  return (
    <div className="screen" style={{
      minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
      background: "radial-gradient(1100px 560px at 70% -10%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 60%), radial-gradient(800px 440px at -10% 110%, color-mix(in oklab, var(--info) 14%, transparent), transparent 60%), var(--bg)",
    }}>
      <div style={{ width: "min(440px, 100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: "linear-gradient(135deg, var(--accent) 0%, oklch(0.65 0.15 200) 100%)",
          display: "grid", placeItems: "center", color: "white",
          boxShadow: "0 12px 28px -8px color-mix(in oklab, var(--accent) 55%, transparent)",
        }}>
          <Icon name="server" size={24} />
        </div>
        <h1 style={{ fontSize: 22, margin: 0, letterSpacing: "-0.02em", fontWeight: 600 }}>Lab Monitor</h1>

        <ServerForm
          presets={PRESET_SERVERS}
          onSubmit={onLogin}
          submitLabel="進入"
          loginErr={loginErr}
          autoFocusPw
        />
      </div>

      <style>{`
        .login-input {
          width: 100%; padding: 12px 14px; font-size: 14px; font-family: inherit;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--r-md); color: var(--text); outline: none;
          transition: border-color 120ms, box-shadow 120ms; box-shadow: var(--shadow-sm);
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent);
        }
      `}</style>
    </div>
  );
}

/* ---------------- ADD SERVER MODAL ---------------- */
function AddServerModal({ onClose, onAdd }) {
  /* global PRESET_SERVERS */
  const [err, setErr] = useState("");

  const handleAdd = async (creds) => {
    setErr("");
    try {
      await onAdd(creds);
      onClose();
    } catch (ex) {
      setErr(ex.message || "連線失敗");
      throw ex;  // let ServerForm reset busy state
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="surface" style={{ width: "min(460px,100%)", padding: 28, borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>新增伺服器</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <ServerForm presets={PRESET_SERVERS} onSubmit={handleAdd} submitLabel="連線" loginErr={err} />
      </div>
    </div>
  );
}

/* ---------------- SHELL (sidebar + topbar + content) ---------------- */
function Shell({ children, current, onNav, onLogout, theme, onToggleTheme, user,
                 servers, activeId, onSwitchServer, onAddServer }) {
  const [navOpen,     setNavOpen]     = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "232px 1fr", minHeight: "100vh" }} className="shell-root">
      {/* Sidebar */}
      <aside className="sidebar" style={{
        background: "var(--bg-elev)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        padding: "22px 16px",
        position: "sticky", top: 0, height: "100vh",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px", marginBottom: 20 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent) 0%, oklch(0.65 0.15 200) 100%)",
            display: "grid", placeItems: "center", color: "white",
          }}>
            <Icon name="server" size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: "-0.005em" }}>Lab Monitor</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>v0.4.2</div>
          </div>
        </div>

        {/* ── Server list ── */}
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.1em", padding: "0 8px", marginBottom: 6 }}>
          伺服器
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 6 }}>
          {servers.map(s => {
            const active = s.id === activeId;
            return (
              <button key={s.id} onClick={() => onSwitchServer(s.id)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px",
                background: active ? "var(--accent-soft)" : "transparent",
                border: "none", borderRadius: "var(--r-md)", cursor: "pointer",
                textAlign: "left", transition: "background 120ms",
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: active ? "var(--ok)" : "var(--text-dim)",
                  boxShadow: active ? "0 0 0 2px color-mix(in oklab, var(--ok) 30%, transparent)" : "none",
                }} />
                <span style={{
                  fontSize: 12, fontWeight: active ? 600 : 500, flex: 1,
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{s.label}</span>
                <span style={{ fontSize: 10, color: active ? "var(--accent)" : "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                  {s.user}
                </span>
              </button>
            );
          })}
          <button onClick={() => setShowAddModal(true)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px",
            background: "transparent", border: "1px dashed var(--border)",
            borderRadius: "var(--r-md)", cursor: "pointer",
            fontSize: 12, color: "var(--text-dim)", fontWeight: 500,
          }}>
            <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span> 新增伺服器
          </button>
        </div>

        <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} />

        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.1em", padding: "0 8px", marginBottom: 8 }}>
          GPU 資訊
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 18 }}>
          <NavItem icon="gpu" label="資源監控" active={current === "detail"} onClick={() => onNav("detail")} />
          <NavItem icon="queue" label="任務序列" active={current === "queue"} onClick={() => onNav("queue")} />
          <NavItem icon="chart" label="歷史紀錄" active={current === "history"} onClick={() => onNav("history")} />
        </nav>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.1em", padding: "0 8px", marginBottom: 8 }}>
          系統
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavItem icon="disk" label="檔案總覽" active={current === "files"} onClick={() => onNav("files")} />
          <NavItem icon="term" label="SSH 終端機" active={current === "terminal"} onClick={() => onNav("terminal")} />
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="surface" style={{ padding: 10, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className="live-dot" />
              <span style={{ fontWeight: 600 }}>已連線</span>
            </div>
            <div className="num" style={{ color: "var(--text-muted)", fontSize: 10 }}>{MOCK.SERVER.hostname}</div>
            <div className="num" style={{ color: "var(--text-dim)", fontSize: 10 }}>uptime {MOCK.SERVER.uptime}</div>
          </div>
          <button onClick={onLogout} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 12px", background: "transparent",
            border: "1px solid var(--border)", borderRadius: "var(--r-md)",
            color: "var(--text-muted)", fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>
            <Icon name="logout" size={14} />
            中斷此伺服器
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-col" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{
          height: 60,
          padding: "0 28px",
          borderBottom: "1px solid var(--border)",
          background: "color-mix(in oklab, var(--bg) 75%, transparent)",
          backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="mobile-menu-btn" onClick={() => setNavOpen(!navOpen)}
              style={{ display: "none", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, width: 36, height: 36, color: "var(--text)" }}>
              <Icon name="queue" size={16} />
            </button>
            <span className="live-dot" />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {{
                detail: "資源監控 · RTX 3060",
                history: "歷史紀錄",
                queue: "任務序列",
                files: "檔案總覽",
                terminal: "SSH 終端機"
              }[current]}
            </h2>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }} className="num">
              · 更新於 {new Date().toLocaleTimeString("en-GB").slice(0, 5)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onToggleTheme} title="切換深淺色" style={{
              width: 36, height: 36, borderRadius: 10,
              background: "transparent", border: "1px solid var(--border)",
              display: "grid", placeItems: "center",
              color: "var(--text-muted)",
            }}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
            </button>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 5px 5px 12px",
              background: "var(--bg-sunken)",
              borderRadius: 999, border: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{user || "you"}</span>
              <span style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent) 0%, oklch(0.65 0.15 200) 100%)",
                color: "white", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700,
              }}>{(user || "y")[0].toUpperCase()}</span>
            </div>
          </div>
        </header>

        <div style={{ padding: "24px 28px 60px", flex: 1, minWidth: 0 }} className="screen">
          {children}
        </div>
      </main>

      <style>{`
        @media (max-width: 880px) {
          .shell-root { grid-template-columns: 1fr !important; }
          .sidebar {
            position: fixed !important; left: 0; top: 0;
            transform: ${navOpen ? "translateX(0)" : "translateX(-100%)"};
            width: 240px;
            z-index: 50;
            transition: transform 240ms ease;
            box-shadow: var(--shadow-lg);
          }
          .mobile-menu-btn { display: grid !important; place-items: center; }
        }
      `}</style>
      {navOpen && (
        <div onClick={() => setNavOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40,
        }} />
      )}
      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onAdd={onAddServer}
        />
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px",
      background: active ? "var(--accent-soft)" : "transparent",
      color: active ? "var(--accent)" : "var(--text-muted)",
      border: "none",
      borderRadius: "var(--r-md)",
      fontSize: 13, fontWeight: active ? 600 : 500,
      textAlign: "left",
      transition: "background 120ms",
    }}>
      <Icon name={icon} size={16} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 10, padding: "2px 7px", borderRadius: 999,
          background: active ? "color-mix(in oklab, var(--accent) 18%, transparent)" : "var(--bg-sunken)",
          color: active ? "var(--accent)" : "var(--text-dim)",
          fontWeight: 600,
        }}>{badge}</span>
      )}
    </button>
  );
}

Object.assign(window, { Login, Shell });
