import json
import hashlib
import sqlalchemy as sql
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, UploadFile, File, Form, Depends

from const.env import (
    S3_HOST,
    SERVICE_PREFIX
)
from utils.dependencies import get_current_user_id
from utils.scheduler import add_post_chart_schedule
from utils.exceptions import RPException
from utils.idutils import generate_chart_id
from utils.convert_tasks import upload_jacket, upload_bgm, upload_chart
from const.user import UserPermission, UserChartPostLimit
from const.chart import ChartPublishStatus, ChartFileSize, CollaboStatus
from schemas.requests import ChartPostRequest
from db.session import create_session
from db.models import (
    User as UserDB, 
    Chart as ChartDB, 
    ChartLike as ChartLikeDB
)



router = APIRouter()

@router.post("/chart/like")
async def post_chart_like(
    chart_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    譜面にいいねをするエンドポイント（Web画面用）
    POST /api/chart/like
    """
    
    # ユーザーを取得
    user = await session.get(UserDB, user_id)
    
    if user is None:
        raise RPException.UserNotFound()
    elif user.permission < UserPermission.NORMAL:
        raise RPException.NoPermission()
    
    # 既にいいねされてるか判定
    stmt = sql.select(
        sql.exists()
           .select_from(ChartLikeDB)
           .where(ChartLikeDB.user_id == user_id)
           .where(ChartLikeDB.chart_id == chart_id)
    )
    
    is_liked = (await session.execute(stmt)).scalar()
    
    if is_liked:
        return
    
    # 譜面を取得
    chart = await session.get(ChartDB, chart_id)
    
    if chart is None:
        raise RPException.ChartNotFound()
    elif chart.is_deleted:
        raise RPException.NoPermission()
    
    # いいねを追加
    chart.likes_count += 1
    like = ChartLikeDB(
        chart_id = chart_id,
        user_id = user_id
    )
    
    session.add(like)
    
    await session.commit()


@router.delete("/chart/like")
async def delete_chart_like(
    chart_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    譜面のいいねを削除するエンドポイント（Web画面用）
    POST /api/chart/like
    """
    
    # ユーザーを取得
    user = await session.get(UserDB, user_id)
    
    if user is None:
        raise RPException.UserNotFound()
    elif user.permission < UserPermission.NORMAL:
        raise RPException.NoPermission()
    
    # 既にいいねされてるか判定
    stmt = sql.select(ChartLikeDB)\
              .where(ChartLikeDB.user_id == user_id)\
              .where(ChartLikeDB.chart_id == chart_id)
    
    like = (await session.execute(stmt)).scalar()
    
    if not like:
        return
    
    # 譜面を取得
    chart = await session.get(ChartDB, chart_id)
    
    if chart is None:
        raise RPException.ChartNotFound()
    elif chart.is_deleted:
        raise RPException.NoPermission()
    
    # いいねを削除
    chart.likes_count -= 1
    await session.delete(like)
    
    await session.commit()