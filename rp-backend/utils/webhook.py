import json
import httpx
import sqlalchemy as sql

from const.env import (
    DISCORD_WEBHOOK_URL,
    DISCORD_NOTICE_URL,
    HOST_URL,
    SERVICE_NAME
)
from const.chart import MusicGenre
from db.models import Chart, User, ChartTagMaster, ChartTag
from db.session import create_session_context
from utils.time import get_datetime



async def send_new_chart_notice(
    chart_id: str,
    user_id: str
):
    if DISCORD_WEBHOOK_URL == "":
        return
    
    # DBに接続
    async with create_session_context() as session:
    
        # 譜面とユーザーを取得
        chart = await session.get(Chart, chart_id)
        user = await session.get(User, user_id)
        
    # タグを取得
        stmt = sql.select(ChartTag, ChartTagMaster)\
                .join(ChartTagMaster, ChartTag.tag_id == ChartTagMaster.id)\
                .where(ChartTag.chart_id == chart_id)
        tags = (await session.execute(stmt)).all()
    
    # ジャンル
    genre = MusicGenre(chart.genre)
    
    headers = {
        "Content-Type": "application/json"
    }
    
    message = {
        "embeds": [
            {
                "title": " / ".join([i for i in [chart.title, chart.composer, chart.vocal] if i != ""]),
                "url": "/".join([HOST_URL, "chart", chart.id]),
                "color": genre.color,
                "author": {
                    "name": f"{chart.author}#{user.sonolus_handle}"
                },
                "description": f"**Lv.{chart.rating}**\n\n{chart.description}",
                "thumbnail": {
                    "url": chart.jacket_url
                },
                "fields": [
                    {
                        "name":   "ジャンル",
                        "value":  f"`{genre.display_name}`",
                        "inline": True},
                    {
                        "name":   "タグ",
                        "value":  f"`{"` `".join([ tag_master.title for tag, tag_master in tags ])}`" if len(tags) != 0 else "なし",
                        "inline": True
                    },
                ],
                "footer":{
                    "text": SERVICE_NAME
                },
                "timestamp": get_datetime().isoformat()
            }
        ]
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            DISCORD_WEBHOOK_URL,
            data = json.dumps(message),
            headers = headers
        )


async def send_charter_auth_request_notice(
    request_id: str,
    chart_id: str,
    user_id: str
):
    if DISCORD_NOTICE_URL == "":
        return

    # DBに接続
    async with create_session_context() as session:

        # 譜面とユーザーを取得
        chart = await session.get(Chart, chart_id)
        user = await session.get(User, user_id)

    headers = {
        "Content-Type": "application/json"
    }

    message = {
        "embeds": [
            {
                "title": "作者承認の申請",
                "url": "/".join([HOST_URL, "auth", "charter", "status", request_id]),
                "color": 0x7c3aed,
                "author": {
                    "name": user.name,
                    "icon_url": user.icon_url
                },
                "description": " / ".join([i for i in [chart.title, chart.composer] if i != ""]),
                "thumbnail": {
                    "url": chart.jacket_url
                },
                "footer": {
                    "text": SERVICE_NAME
                },
                "timestamp": get_datetime().isoformat()
            }
        ]
    }

    async with httpx.AsyncClient() as client:
        await client.post(
            DISCORD_NOTICE_URL,
            data = json.dumps(message),
            headers = headers
        )
