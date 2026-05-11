import secrets
from typing import Optional

import paramiko
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from config import SERVER_HOST, SERVER_PORT
from ssh import SSHSession

router = APIRouter()

# token → SSHSession
_sessions: dict[str, SSHSession] = {}


# ── Dependency ─────────────────────────────────────────────────────────────────

def get_session(authorization: Optional[str] = Header(None)) -> SSHSession:
    token = (authorization or "").removeprefix("Bearer ").strip()
    if token not in _sessions:
        raise HTTPException(401, "Not authenticated")
    return _sessions[token]


def get_any_session() -> Optional[SSHSession]:
    return next(iter(_sessions.values()), None)


# ── SSH connect (password + optional keyboard-interactive 2FA) ─────────────────

def _make_interactive_handler(password: str, code: str):
    """Respond to SSH keyboard-interactive prompts for 2FA servers."""
    def handler(title, instructions, prompt_list):
        responses = []
        for prompt, _echo in prompt_list:
            pl = prompt.strip().lower()
            if any(w in pl for w in ("code", "token", "otp", "verification", "authenticator")):
                responses.append(code)
            else:
                responses.append(password)
        return responses
    return handler


def _connect(host: str, port: int, user: str, password: str, code: str) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # 1. Standard password auth
    try:
        client.connect(
            host, port=port, username=user, password=password,
            timeout=12, allow_agent=False, look_for_keys=False,
        )
        return client
    except paramiko.AuthenticationException:
        pass
    except Exception as e:
        raise HTTPException(502, f"Connection error: {e}")

    # 2. Keyboard-interactive (for 2FA servers)
    if not code:
        raise HTTPException(401, "Authentication failed — try adding a verification code")

    try:
        transport = paramiko.Transport((host, port))
        transport.connect()
        transport.auth_interactive(user, _make_interactive_handler(password, code))
        if not transport.is_authenticated():
            transport.close()
            raise HTTPException(401, "2FA authentication failed")
        client._transport = transport
        return client
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(401, f"Authentication failed: {e}")


# ── Routes ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    user:     str
    password: str
    host:     str = SERVER_HOST
    port:     int = SERVER_PORT
    code:     str = ""          # optional 2FA / verification code


@router.post("/api/login")
def login(body: LoginRequest):
    host = body.host.strip() or SERVER_HOST
    client = _connect(host, body.port, body.user, body.password, body.code)

    token = secrets.token_urlsafe(32)
    _sessions[token] = SSHSession(client, body.user, host)
    return {"token": token, "user": body.user, "host": host}


@router.post("/api/logout")
def logout(authorization: Optional[str] = Header(None)):
    token = (authorization or "").removeprefix("Bearer ").strip()
    sess = _sessions.pop(token, None)
    if sess:
        sess.close()
    return {"ok": True}
