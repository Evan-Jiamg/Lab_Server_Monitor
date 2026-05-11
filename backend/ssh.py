import paramiko
from fastapi import HTTPException


class SSHSession:
    def __init__(self, client: paramiko.SSHClient, username: str, host: str):
        self.client     = client
        self.username   = username
        self.host       = host
        self.server_key = f"{username}@{host}"

    def run(self, cmd: str, timeout: int = 15) -> str:
        try:
            _, stdout, _ = self.client.exec_command(cmd, timeout=timeout)
            return stdout.read().decode(errors="replace").strip()
        except Exception:
            self.client.close()
            raise HTTPException(503, "SSH channel lost — please re-login")

    def open_pty_channel(self, width: int = 220, height: int = 50):
        transport = self.client.get_transport()
        chan = transport.open_session()
        chan.get_pty(term="xterm-256color", width=width, height=height)
        chan.invoke_shell()
        chan.setblocking(False)
        return chan

    def close(self):
        try:
            self.client.close()
        except Exception:
            pass
