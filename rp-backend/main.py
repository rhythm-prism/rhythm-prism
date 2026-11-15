import os
import logging
import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import Response, JSONResponse
from contextlib import asynccontextmanager

from assets.sonolus_item_resource import setup_item_resource
from const.env import USE_UVICORN
from utils.time import JST, get_datetime

from router.index import router as index_router



ICON_DATA = bytes()

log_dir = Path(__file__).resolve().parent / "logs"
log_dir.mkdir(exist_ok=True)
logger = logging.getLogger("backend.errors")
logger.setLevel(logging.ERROR)
logger.propagate = False

if not logger.handlers:
    handler = RotatingFileHandler(
        log_dir / f"error-{os.getpid()}.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    handler.setLevel(logging.ERROR)
    formatter = logging.Formatter(
        "%(asctime)s JST %(levelname)s pid=%(process)d %(message)s"
    )
    formatter.converter = lambda timestamp: datetime.datetime.fromtimestamp(timestamp, tz=JST).timetuple()
    handler.setFormatter(formatter)
    logger.addHandler(handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    #await init_db_model()

    if USE_UVICORN == "1":
        await setup_item_resource()
    
    global ICON_DATA
    with open("icon.ico", "rb") as f:
        ICON_DATA = f.read()
        
    yield



app = FastAPI(
    lifespan=lifespan,
    docs_url=None
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "%s %s",
        request.method,
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__)
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "サーバーで処理中にエラーが発生しました。"},
    )

app.include_router(index_router)

@app.get("/")
def root():
    return ""

@app.get("/favicon.ico")
async def icon():
    return Response(content = ICON_DATA)