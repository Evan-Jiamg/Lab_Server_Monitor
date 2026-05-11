from fastapi import APIRouter, Depends, Query

from auth import get_session
from parsers import parse_ls
from ssh import SSHSession

router = APIRouter()


@router.get("/api/files")
def list_files(
    path: str = Query("~", description="Remote path to list"),
    sess: SSHSession = Depends(get_session),
):
    raw = sess.run(
        f"ls -la --time-style='+%b %d %H:%M' {path} 2>&1 | head -500"
    )
    return {"path": path, "items": parse_ls(raw)}
