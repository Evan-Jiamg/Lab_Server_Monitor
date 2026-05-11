import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from auth import _sessions

router = APIRouter()


@router.websocket("/ws/terminal")
async def terminal(ws: WebSocket, token: str):
    await ws.accept()

    sess = _sessions.get(token)
    if not sess:
        await ws.send_text("\r\n\x1b[31mNot authenticated\x1b[0m\r\n")
        await ws.close()
        return

    try:
        chan = sess.open_pty_channel()
    except Exception as e:
        await ws.send_text(f"\r\n\x1b[31mCould not open PTY: {e}\x1b[0m\r\n")
        await ws.close()
        return

    async def ssh_to_ws():
        while True:
            await asyncio.sleep(0.02)
            try:
                if chan.recv_ready():
                    await ws.send_bytes(chan.recv(4096))
            except Exception:
                break

    async def ws_to_ssh():
        try:
            async for data in ws.iter_bytes():
                chan.send(data)
        except WebSocketDisconnect:
            pass

    tasks = [asyncio.create_task(ssh_to_ws()), asyncio.create_task(ws_to_ssh())]
    await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for t in tasks:
        t.cancel()
    try:
        chan.close()
    except Exception:
        pass
