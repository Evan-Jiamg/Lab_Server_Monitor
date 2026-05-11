from fastapi import APIRouter, Depends, Query

from auth import get_session
from history import get_range
from ssh import SSHSession

router = APIRouter()


@router.get("/api/history")
def history_route(
    range: str = Query("1h", pattern="^(1h|6h|24h|7d)$"),
    sess: SSHSession = Depends(get_session),
):
    return get_range(sess.server_key, range)
