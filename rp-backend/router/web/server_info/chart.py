import json
import hashlib
import base64
import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from typing import Optional, List, Literal
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks, Query
from sonolus_models import (
    SonolusResourceLocator
)

from const.env import (
    S3_HOST
)
from utils.dependencies import get_current_user_id
from utils.exceptions import RPException
from const.user import UserPermission
from const.chart import ChartPublishStatus
from schemas.responses import (
    ServerInfoResponse,
    ServerInfoChartResponse
)
from db.session import create_session
from db.models import (
    User as UserDB, 
    Chart as ChartDB
)



router = APIRouter()

@router.get("/server/info", response_model=ServerInfoResponse)
async def get_server_info(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    GET /api/server/info
    譜面数などのサーバーの情報を返すエンドポイント。
    """
    
    # ユーザーを取得
    user = await session.get(UserDB, user_id)
    
    if user is None:
        raise RPException.UserNotFound()
    elif user.permission < UserPermission.MODERATOR:
        raise RPException.NoPermission()
    
    # 公開譜面数を取得
    stmt = sql\
            .select(sql.func.count())\
            .select_from(ChartDB)\
            .where(ChartDB.is_deleted.is_(False))\
            .where(ChartDB.publish_status == ChartPublishStatus.PUBLIC)
            
    public_chart_count = (await session.execute(stmt)).scalar()
    
    stmt = sql\
            .select(sql.func.count())\
            .select_from(ChartDB)\
            .where(ChartDB.is_deleted.is_(False))\
            .where(ChartDB.publish_status < ChartPublishStatus.PUBLIC)
            
    private_chart_count = (await session.execute(stmt)).scalar()
    
    stmt = sql\
            .select(sql.func.count())\
            .select_from(ChartDB)\
            .where(ChartDB.is_deleted.is_(True))
            
    delete_chart_count = (await session.execute(stmt)).scalar()
    
    return ServerInfoResponse(
        chart=ServerInfoChartResponse(
            publicCount=public_chart_count,
            privateCount=private_chart_count,
            deleteCount=delete_chart_count
        )
    )