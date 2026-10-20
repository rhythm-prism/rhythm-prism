from fastapi import APIRouter

from router.web.chart import delete_chart, edit_chart, post_chart, get_chart, tag, download_chart
from router.web.user import discord, edit_user, sonolus, auth, get_user, auth_charter
from router.web.server_info import (
    chart as server_info_chart
)
from . import announce, ogp


router = APIRouter()

router.include_router(post_chart.router)
router.include_router(delete_chart.router)
router.include_router(edit_chart.router)
router.include_router(get_chart.router)
router.include_router(tag.router)
router.include_router(download_chart.router)

router.include_router(discord.router)
router.include_router(sonolus.router)
router.include_router(edit_user.router)
router.include_router(auth.router)
router.include_router(get_user.router)
router.include_router(auth_charter.router)

router.include_router(announce.router)
router.include_router(ogp.router)

router.include_router(server_info_chart.router)