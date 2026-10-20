from fastapi import APIRouter

from router.web.index import router as web_router
from router.sonolus.index import router as sonolus_router



router = APIRouter()

router.include_router(web_router, prefix="/api")
router.include_router(sonolus_router)