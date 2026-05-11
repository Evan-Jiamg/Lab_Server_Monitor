/* global React, ReactDOM, MOCK, API, Login, Shell, GpuDetail, History, QueueScreen,
   Terminal, FilesScreen, useTweaks, TweaksPanel, TweakSection, TweakRadio */

const { useState, useEffect, useCallback, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "style": "aurora",
  "chartType": "line",
  "density": "comfortable"
}/*EDITMODE-END*/;

const POLL_MS = 30_000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function applySnapshot(snap) {
  if (snap.server)    Object.assign(window.MOCK.SERVER, snap.server);
  if (snap.gpus)      window.MOCK.GPUS      = snap.gpus;
  if (snap.processes) window.MOCK.PROCESSES = snap.processes.map(p => ({ ...p, gpu: 0 }));
  if (snap.disk)      window.MOCK.DISK      = snap.disk;
  if (snap.net)       Object.assign(window.MOCK.NET, snap.net);
  if (snap.mem) {
    window.MOCK.SERVER.ramUsed  = snap.mem.usedGB;
    window.MOCK.SERVER.ramTotal = snap.mem.totalGB;
    window.MOCK.SERVER.ramPct   = snap.mem.pct;
  }
  if (snap.cpu)     window.MOCK.SERVER.cpuPct = snap.cpu.pct;
  if (snap.history !== undefined) window.MOCK.HISTORY = snap.history;
}

// ── App ────────────────────────────────────────────────────────────────────────

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // servers: [{id, host, user, token, label}]
  const [servers,        setServers]        = useState([]);
  const [activeId,       setActiveId]       = useState(null);
  const [loginErr,       setLoginErr]       = useState("");
  const [route,          setRoute]          = useState("detail");
  const [dataVersion,    setDataVersion]    = useState(0);
  const pollRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme",   tweaks.theme);
    document.documentElement.setAttribute("data-style",   tweaks.style);
    document.documentElement.setAttribute("data-density", tweaks.density);
  }, [tweaks.theme, tweaks.style, tweaks.density]);

  // ── Polling ────────────────────────────────────────────────────────────────

  const pollOnce = useCallback(async (token) => {
    try {
      const snap = await API.fetch("/api/status", {}, token);
      applySnapshot(snap);
      setDataVersion(v => v + 1);
    } catch (e) {
      if (e.status === 401) removeServer(token);
    }
  }, []);

  const startPolling = useCallback((token) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollOnce(token);
    pollRef.current = setInterval(() => pollOnce(token), POLL_MS);
  }, [pollOnce]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // ── Server management ──────────────────────────────────────────────────────

  const addServer = useCallback((host, user, token, label) => {
    const id = uid();
    const entry = { id, host, user, token, label: label || host };
    setServers(prev => [...prev, entry]);
    return id;
  }, []);

  const removeServer = useCallback((token) => {
    setServers(prev => {
      const next = prev.filter(s => s.token !== token);
      if (next.length === 0) { stopPolling(); setActiveId(null); }
      return next;
    });
  }, [stopPolling]);

  const switchServer = useCallback((id) => {
    setServers(prev => {
      const s = prev.find(s => s.id === id);
      if (!s) return prev;
      // Clear stale data from the previous server immediately
      window.MOCK.GPUS = [];
      window.MOCK.PROCESSES = [];
      window.MOCK.HISTORY = {};
      API.setToken(s.token);
      startPolling(s.token);
      setActiveId(id);
      return prev;
    });
  }, [startPolling]);

  // ── Login (first server) ───────────────────────────────────────────────────

  const handleLogin = useCallback(async (creds) => {
    setLoginErr("");
    try {
      const res = await API.fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ host: creds.host, port: creds.port ?? 22, user: creds.user, password: creds.pw, code: creds.code || "" }),
      });
      API.setToken(res.token);
      const id = addServer(res.host, res.user, res.token, creds.label);
      setActiveId(id);
      startPolling(res.token);
      setRoute("detail");
    } catch (e) {
      setLoginErr(e.message || "登入失敗");
    }
  }, [addServer, startPolling]);

  // ── Add server from sidebar ────────────────────────────────────────────────

  const handleAddServer = useCallback(async (creds) => {
    const res = await API.fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ host: creds.host, port: creds.port ?? 22, user: creds.user, password: creds.pw, code: creds.code || "" }),
    });
    const id = addServer(res.host, res.user, res.token, creds.label);
    switchServer(id);   // auto-switch to new server
  }, [addServer, switchServer]);

  // ── Logout (disconnect one server) ────────────────────────────────────────

  const handleLogout = useCallback(() => {
    const active = servers.find(s => s.id === activeId);
    if (!active) return;
    stopPolling();
    API.fetch("/api/logout", { method: "POST" }, active.token).catch(() => {});
    const remaining = servers.filter(s => s.id !== activeId);
    setServers(remaining);
    if (remaining.length > 0) {
      const next = remaining[remaining.length - 1];
      API.setToken(next.token);
      setActiveId(next.id);
      startPolling(next.token);
    } else {
      API.setToken(null);
      setActiveId(null);
    }
  }, [servers, activeId, stopPolling, startPolling]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeServer = servers.find(s => s.id === activeId) || null;

  if (!activeServer) {
    return (
      <React.Fragment>
        <Login onLogin={handleLogin} loginErr={loginErr} />
        <Tweaks tweaks={tweaks} setTweak={setTweak} />
      </React.Fragment>
    );
  }

  const screens = {
    detail:   <GpuDetail   key={dataVersion} chartType={tweaks.chartType} goDashboard={() => setRoute("detail")} />,
    history:  <History     key={dataVersion} chartType={tweaks.chartType} />,
    queue:    <QueueScreen key={dataVersion} />,
    files:    <FilesScreen key={dataVersion} />,
    terminal: <Terminal />,
  };

  return (
    <React.Fragment>
      <Shell
        current={route}
        onNav={setRoute}
        onLogout={handleLogout}
        theme={tweaks.theme}
        onToggleTheme={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
        user={activeServer.user}
        servers={servers}
        activeId={activeId}
        onSwitchServer={switchServer}
        onAddServer={handleAddServer}
      >
        <div key={route}>{screens[route]}</div>
      </Shell>
      <Tweaks tweaks={tweaks} setTweak={setTweak} />
    </React.Fragment>
  );
}

function Tweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="外觀">
        <TweakRadio label="主題" value={tweaks.theme} onChange={(v) => setTweak("theme", v)}
          options={[{ value: "light", label: "淺色" }, { value: "dark", label: "深色" }]} />
        <TweakRadio label="風格" value={tweaks.style} onChange={(v) => setTweak("style", v)}
          options={[{ value: "aurora", label: "Aurora" }, { value: "mono", label: "Mono" }, { value: "glass", label: "Glass" }]} />
      </TweakSection>
      <TweakSection title="圖表">
        <TweakRadio label="樣式" value={tweaks.chartType} onChange={(v) => setTweak("chartType", v)}
          options={[{ value: "line", label: "折線" }, { value: "bar", label: "長條" }]} />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
