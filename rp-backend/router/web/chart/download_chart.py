import httpx
from compression import zstd
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, Response

from utils.dependencies import get_current_user_id
from utils.exceptions import RPException
from const.user import UserPermission
from const.chart import ChartFilePublishStatus
from db.session import create_session
from db.models import (
    User as UserDB, 
    Chart as ChartDB
)



router = APIRouter()

@router.get("/chart/download")
async def chart_download(
    chart_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    譜面をダウンロードする
    ただし、公開していない譜面はダウンロードできない。
    
    GET /api/chart/download
    """
    
    user = await session.get(UserDB, user_id)
    
    if not user:
        raise RPException.UserNotFound()
    elif user.permission < UserPermission.NORMAL:
        raise RPException.UserBanned()
    
    chart = await session.get(ChartDB, chart_id)
    
    if not chart:
        raise RPException.ChartNotFound()
    
    if (
        chart.original_chart_publish_status != ChartFilePublishStatus.PUBLIC and
        user.permission < UserPermission.MODERATOR and
        user.id != chart.author_user_id
    ):
        raise RPException.NoPermission()
    
    async with httpx.AsyncClient() as client:
        response = await client.get(chart.original_chart_url)
        
        if response.status_code != 200:
            raise RPException.ChartFileDownloadError()
        
        original_chart = response.content
    
    original_chart = zstd.decompress(original_chart)
    
    return Response(
        content=original_chart,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{chart_id}.{chart.chart_format}"'
        }
    )