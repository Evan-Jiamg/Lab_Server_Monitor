/* global React */
// Data layer — real API with mock fallback

// ── API config ─────────────────────────────────────────────────────────────────
const API_BASE = "";

let _authToken = null;

function setToken(t) { _authToken = t; }
function getToken()  { return _authToken; }

async function apiFetch(path, opts = {}, overrideToken = null) {
  const token = overrideToken ?? _authToken;
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || res.statusText), { status: res.status });
  }
  return res.json();
}

window.API = { base: API_BASE, fetch: apiFetch, setToken, getToken };

// ── Preset servers ─────────────────────────────────────────────────────────────
window.PRESET_SERVERS = [
  { id: "s1", label: "eclab-3060",  host: "140.113.73.82",  port: 22,   user: "eclab313",   need2fa: false },
  { id: "s2", label: "evan-jiamg", host: "140.113.26.164", port: 2222, user: "evan-jiamg", need2fa: true  },
];

// ── Mock data (shown before first real fetch) ──────────────────────────────────

const SERVER_MOCK = {
  hostname: "140.113.73.82",
  ip: "140.113.73.82",
  os: "Linux",
  kernel: "—",
  uptime: "—",
  cudaVersion: "—",
  driverVersion: "—",
  loadAvg: [0, 0, 0],
};

const GPUS_MOCK = [];
const PROCESSES_MOCK = [];
const QUEUE_MOCK = [];

function genSeriesDet(points, base, amp, freq, phase = 0, noise = 2) {
  const out = [];
  for (let i = 0; i < points; i++) {
    const v = base + Math.sin(i * freq + phase) * amp + (Math.sin(i * freq * 3.7 + phase) * amp * 0.25) + (Math.random() - 0.5) * noise;
    out.push(Math.max(0, Math.min(100, Number(v.toFixed(1)))));
  }
  return out;
}

const HISTORY_MOCK = {
  gpuUtil: genSeriesDet(60, 0, 5, 0.18, 0, 2),
  gpuMem:  genSeriesDet(60, 0, 3, 0.08, 1.2, 1),
  gpuTemp: genSeriesDet(60, 0, 3, 0.14, 0.4, 1),
  cpuUtil: genSeriesDet(60, 0, 5, 0.22, 2.1, 2),
  ramUtil: genSeriesDet(60, 0, 3, 0.05, 1.8, 1),
  netRx:   genSeriesDet(60, 0, 5, 0.3, 0, 2),
  netTx:   genSeriesDet(60, 0, 5, 0.32, 1.1, 2),
};

const DISK_MOCK = [];
const NET_MOCK  = { iface: "—", rxRate: 0, txRate: 0, rxTotal: 0, txTotal: 0 };
const FILES_MOCK = { cwd: "/home/eclab313", crumbs: ["~"], items: [] };

window.MOCK = {
  SERVER: SERVER_MOCK,
  GPUS: GPUS_MOCK,
  PROCESSES: PROCESSES_MOCK,
  QUEUE: QUEUE_MOCK,
  HISTORY: HISTORY_MOCK,
  DISK: DISK_MOCK,
  NET: NET_MOCK,
  FILES: FILES_MOCK,
};
