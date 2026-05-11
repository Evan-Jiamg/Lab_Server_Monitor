"""
Per-server rolling history.
State is keyed by server_key ("user@host") so reconnects preserve history.

Resolution tiers (~120 points each):
  1h  — every poll      (30 s)
  6h  — every 6th poll  (3 min)
  24h — every 24th      (12 min)
  7d  — every 168th     (84 min)
"""

import time
from collections import deque, defaultdict
from typing import Optional

from parsers import (
    GPU_QUERY, PROC_QUERY,
    parse_gpus, parse_processes, parse_meminfo,
    parse_cpu_stat, calc_cpu_pct,
    parse_disk, parse_net_bytes, parse_server_info,
)

RESOLUTIONS = {
    "1h":  (1,   120),
    "6h":  (6,   120),
    "24h": (24,  120),
    "7d":  (168, 120),
}

# ── Per-server state ────────────────────────────────────────────────────────────

def _new_server_state() -> dict:
    return {
        "stores":      {r: defaultdict(lambda: deque(maxlen=pts)) for r, (_, pts) in RESOLUTIONS.items()},
        "poll_count":  0,
        "prev_cpu":    None,
        "prev_net":    None,
    }

_state: dict[str, dict] = {}   # server_key → state dict


def _get(server_key: str) -> dict:
    if server_key not in _state:
        _state[server_key] = _new_server_state()
    return _state[server_key]


def get_range(server_key: str, r: str) -> dict[str, list]:
    if r not in RESOLUTIONS:
        r = "1h"
    return {k: list(v) for k, v in _get(server_key)["stores"][r].items()}


# ── Core fetch ─────────────────────────────────────────────────────────────────

def fetch_all(sess) -> dict:
    st = _get(sess.server_key)

    gpus_raw  = sess.run(GPU_QUERY)
    procs_raw = sess.run(PROC_QUERY)
    mem_raw   = sess.run("cat /proc/meminfo")
    cpu_raw   = sess.run("cat /proc/stat | head -1")
    disk_raw  = sess.run("df -k")
    net_raw   = sess.run("cat /proc/net/dev")
    hostname  = sess.run("hostname -f 2>/dev/null || hostname")
    uptime_p  = sess.run("uptime -p")
    kernel    = sess.run("uname -r")
    loadavg   = sess.run("cat /proc/loadavg")
    iface     = sess.run(
        "awk 'NR>2 && $1!~/lo:/{split($1,a,\":\");print a[1];exit}' /proc/net/dev"
    ) or "eth0"

    gpus   = parse_gpus(gpus_raw)
    procs  = parse_processes(procs_raw, sess.username)
    mem    = parse_meminfo(mem_raw)
    disk   = parse_disk(disk_raw)
    server = parse_server_info(sess.host, hostname, uptime_p, kernel, loadavg)

    # CPU delta
    cpu_stat    = parse_cpu_stat(cpu_raw)
    cpu_pct     = calc_cpu_pct(st["prev_cpu"], cpu_stat)
    st["prev_cpu"] = cpu_stat

    # Net rate
    net_now = parse_net_bytes(net_raw, iface)
    rx_rate = tx_rate = 0.0
    if net_now and st["prev_net"] and st["prev_net"].get("iface") == iface:
        elapsed = time.time() - st["prev_net"]["ts"]
        if elapsed > 0:
            rx_rate = max(0.0, round((net_now["rx"] - st["prev_net"]["rx"]) / elapsed / 1_048_576, 2))
            tx_rate = max(0.0, round((net_now["tx"] - st["prev_net"]["tx"]) / elapsed / 1_048_576, 2))
    if net_now:
        st["prev_net"] = {**net_now, "iface": iface, "ts": time.time()}

    # Append sample to resolution stores
    avg_util = round(sum(g["util"] for g in gpus) / len(gpus), 1) if gpus else 0
    avg_mem  = round(sum(g["memUsed"] / g["memTotal"] * 100 for g in gpus) / len(gpus), 1) if gpus else 0
    avg_temp = round(sum(g["temp"]   for g in gpus) / len(gpus), 1) if gpus else 0
    sample   = {"gpuUtil": avg_util, "gpuMem": avg_mem, "gpuTemp": avg_temp,
                "cpuUtil": cpu_pct,  "ramUtil": mem["pct"]}

    st["poll_count"] += 1
    for r, (every, _) in RESOLUTIONS.items():
        if st["poll_count"] % every == 0:
            for key, val in sample.items():
                st["stores"][r][key].append(val)

    return {
        "server":    server,
        "gpus":      gpus,
        "processes": procs,
        "mem":       mem,
        "cpu":       {"pct": cpu_pct},
        "disk":      disk,
        "net":       {"iface": iface, "rxRate": rx_rate, "txRate": tx_rate},
        "history":   get_range(sess.server_key, "1h"),
    }
