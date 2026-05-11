from fastapi import APIRouter, Depends

from auth import get_session
from history import fetch_all
from ssh import SSHSession

router = APIRouter()


@router.get("/api/status")
def status(sess: SSHSession = Depends(get_session)):
    return fetch_all(sess)
