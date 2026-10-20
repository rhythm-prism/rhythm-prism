from fastapi import APIRouter
from sonolus_fastapi import Sonolus

from const.env import (
    SOURCE_URL
)



router = APIRouter()

sonolus = Sonolus(
    router = router,
    address=SOURCE_URL
)