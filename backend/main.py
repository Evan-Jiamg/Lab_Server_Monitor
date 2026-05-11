import asyncio
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import auth
import history
from routes import files, history as history_route, status, terminal
from config import POLL_INTERVAL

app = FastAPI(title="Lab Server Monitor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(status.router)
app.include_router(history_route.router)
app.include_router(files.router)
app.include_router(terminal.router)

# Serve frontend from parent directory — no CORS issues
_frontend_dir = os.path.join(os.path.dirname(__file__), "..")
app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")


# Background poller — keeps history warm as long as a session is alive
@app.on_event("startup")
async def start_poller():
    async def _loop():
        while True:
            await asyncio.sleep(POLL_INTERVAL)
            sess = auth.get_any_session()
            if sess:
                try:
                    history.fetch_all(sess)
                except Exception:
                    pass
    asyncio.create_task(_loop())
