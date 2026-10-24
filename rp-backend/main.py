from fastapi import FastAPI
from fastapi.responses import Response
from contextlib import asynccontextmanager

from assets.sonolus_item_resource import setup_item_resource
from db.session import init_db_model
from const.env import USE_UVICORN

from router.index import router as index_router



ICON_DATA = bytes()

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

app.include_router(index_router)

@app.get("/")
def root():
    return ""

@app.get("/favicon.ico")
async def icon():
    return Response(content = ICON_DATA)