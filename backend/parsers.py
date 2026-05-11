"""
Pure functions that turn raw SSH command output into structured dicts.
No side-effects, easy to unit-test.
"""

from typing import Optional


# ── GPU ────────────────────────────────────────────────────────────────────────

GPU_QUERY = (
    "nvidia-smi --query-gpu="
    "index,name,memory.total,memory.used,"
    "utilization.gpu,temperature.gpu,power.draw,power.limit,"
    "fan.speed,pcie.link.gen.current,pcie.link.width.current "
    "--format=csv,noheader,nounits"
)


def parse_gpus(raw: str) -> list[dict]:
    gpus = []
    for line in raw.splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 11:
            continue
        try:
            idx, name, mem_total, mem_used, util, temp, power, power_cap, fan, gen, width = parts[:11]
            gpus.append({
                "id":       f"gpu-{idx}",
                "index":    int(idx),
                "model":    name.replace("NVIDIA ", "").replace("GeForce ", ""),
                "memTotal": round(int(mem_total) / 1024, 1),
                "memUsed":  round(int(mem_used)  / 1024, 2),
                "util":     int(util),
                "temp":     int(temp),
                "power":    round(float(power)),
                "powerCap": round(float(power_cap)),
                "fan":      int(fan) if fan not in ("[N/A]", "N/A") else 0,
                "pcie":     f"Gen{gen} x{width}",
                "locked":   False,   # frontend decides lock per-user
            })
        except (ValueError, IndexError):
            continue
    return gpus


# ── Processes ──────────────────────────────────────────────────────────────────

PROC_QUERY = (
    "nvidia-smi --query-compute-apps="
    "pid,name,gpu_bus_id,used_memory,process_name "
    "--format=csv,noheader,nounits 2>/dev/null || true"
)


def parse_processes(raw: str, username: str) -> list[dict]:
    procs = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "No running" in line:
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 5:
            continue
        try:
            pid, name, _bus, mem_mb, cmd = parts[:5]
            procs.append({
                "pid":   int(pid),
                "gpu":   name.replace("NVIDIA ", "").replace("GeForce ", ""),
                "user":  username,
                "mem":   int(mem_mb),
                "cmd":   cmd,
            })
        except (ValueError, IndexError):
            continue
    return procs


# ── Memory ─────────────────────────────────────────────────────────────────────

def parse_meminfo(raw: str) -> dict:
    info = {}
    for line in raw.splitlines():
        parts = line.split()
        if len(parts) >= 2:
            try:
                info[parts[0].rstrip(":")] = int(parts[1])
            except ValueError:
                pass
    total_kb = info.get("MemTotal", 1)
    avail_kb = info.get("MemAvailable", 0)
    used_kb  = total_kb - avail_kb
    return {
        "totalGB": round(total_kb / 1024 / 1024, 1),
        "usedGB":  round(used_kb  / 1024 / 1024, 1),
        "pct":     round(used_kb  / total_kb * 100, 1),
    }


# ── CPU ────────────────────────────────────────────────────────────────────────

def parse_cpu_stat(raw: str) -> Optional[tuple[int, int]]:
    """Return (total_jiffies, idle_jiffies) from first line of /proc/stat."""
    line = (raw.splitlines() or [""])[0]
    parts = line.split()[1:]   # skip 'cpu'
    try:
        vals  = [int(p) for p in parts]
        total = sum(vals)
        idle  = vals[3] + (vals[4] if len(vals) > 4 else 0)  # idle + iowait
        return total, idle
    except (ValueError, IndexError):
        return None


def calc_cpu_pct(prev: Optional[tuple], curr: Optional[tuple]) -> float:
    if not prev or not curr:
        return 0.0
    dtotal = curr[0] - prev[0]
    didle  = curr[1] - prev[1]
    return round((1 - didle / max(dtotal, 1)) * 100, 1)


# ── Disk ───────────────────────────────────────────────────────────────────────

def parse_disk(raw: str) -> list[dict]:
    disks = []
    for line in raw.splitlines()[1:]:
        parts = line.split()
        if len(parts) < 6:
            continue
        dev, size_kb, used_kb, _, _, mount = parts[:6]
        if not dev.startswith("/dev/"):
            continue
        try:
            disks.append({
                "mount":   mount,
                "totalGB": round(int(size_kb) / 1024 / 1024, 1),
                "usedGB":  round(int(used_kb)  / 1024 / 1024, 1),
            })
        except ValueError:
            continue
    return disks


# ── Network ────────────────────────────────────────────────────────────────────

def parse_net_bytes(raw: str, iface: str) -> Optional[dict]:
    for line in raw.splitlines():
        line = line.strip()
        if not line.startswith(iface + ":"):
            continue
        parts = line.split()
        try:
            return {"rx": int(parts[1]), "tx": int(parts[9])}
        except (IndexError, ValueError):
            pass
    return None


# ── Server info ────────────────────────────────────────────────────────────────

def parse_server_info(ip: str, hostname: str, uptime_raw: str,
                       kernel: str, loadavg_raw: str) -> dict:
    parts = loadavg_raw.split()
    loads = [float(parts[i]) for i in range(3)] if len(parts) >= 3 else [0.0, 0.0, 0.0]
    return {
        "hostname": hostname or ip,
        "ip":       ip,
        "os":       "Linux",
        "kernel":   kernel,
        "uptime":   uptime_raw.removeprefix("up ").strip(),
        "loadAvg":  loads,
    }


# ── File listing ───────────────────────────────────────────────────────────────

_EXT_TYPE = {
    "py": "py", "ipynb": "ipynb",
    "yaml": "yaml", "yml": "yaml",
    "txt": "txt", "log": "log", "md": "md", "sh": "sh",
    "json": "json", "csv": "csv",
    "pt": "ckpt", "pth": "ckpt", "ckpt": "ckpt",
}


def parse_ls(raw: str) -> list[dict]:
    items = []
    for line in raw.splitlines():
        parts = line.split(None, 8)
        if len(parts) < 9 or line.startswith("total"):
            continue
        perms, _, _, _, size_str, month, day, hm, name = parts
        if name in (".", ".."):
            continue
        ftype = "dir" if perms.startswith("d") else _EXT_TYPE.get(
            name.rsplit(".", 1)[-1].lower() if "." in name else "", "txt"
        )
        try:
            size_label = _fmt_size(int(size_str))
        except ValueError:
            size_label = "—"
        items.append({
            "name":  name,
            "type":  ftype,
            "size":  size_label,
            "mod":   f"{month} {day} {hm}",
            "perms": perms,
        })
    return items


def _fmt_size(n: int) -> str:
    for unit, div in [("GB", 1 << 30), ("MB", 1 << 20), ("KB", 1 << 10)]:
        if n >= div:
            return f"{n / div:.1f} {unit}"
    return f"{n} B"
