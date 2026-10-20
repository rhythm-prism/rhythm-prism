import sqlalchemy as sql
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends

from utils.dependencies import get_current_user_id
from utils.exceptions import RPException
from const.user import UserPermission
from schemas.requests import ChartTagCreateRequest
from schemas.responses import ChartTagResponse
from db.session import create_session
from db.models import (
    User as UserDB, 
    ChartTag as ChartTagDB, 
    ChartTagMaster as ChartTagMasterDB
)



router = APIRouter()

@router.post("/chart/tag")
async def post_chart_tag(
    body: ChartTagCreateRequest,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)   
):
    """
    譜面タグをDBに追加する
    POST /api/chart/tag
    """
    
    # ユーザーを取得
    user = await session.get(UserDB, user_id)
    
    # ユーザーを取得できなかったとき
    if user is None:
        raise RPException.UserNotFound()
    # 権限がないとき
    elif user.permission < UserPermission.MODERATOR:
        raise RPException.NoPermission()
    
    # 既に同じtitleのタグがないか調べる(DB追加時にユニークで弾かれるはずだが一応)
    stmt = sql.select(
        sql.exists()\
           .select_from(ChartTagMasterDB)
           .where(ChartTagMasterDB.title == body.title)
    )
    is_exist_tag = (await session.execute(stmt)).scalar()
    # 同じやつあるときはエラー
    if is_exist_tag:
        raise RPException.TagDuplicated()
    
    # タグを作成
    tag_master = ChartTagMasterDB(
        title = body.title,
        icon = body.icon if body.icon is not None else None,
        created_user_id = user_id
    )
    
    session.add(tag_master)
    await session.commit()


@router.delete("/chart/tag")
async def delete_chart_tag(
    tag_id: int,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)   
):
    """
    譜面タグをDBに追加する
    DELETE /api/chart/tag
    """
    
    # ユーザーを取得
    user = await session.get(UserDB, user_id)
    chart_tag = await session.get(ChartTagMasterDB, tag_id)
    
    # ユーザーを取得できなかったとき
    if user is None:
        raise RPException.UserNotFound()
    elif chart_tag is None:
        raise RPException.TagNotFound()
    # 権限がないとき
    elif user.permission < UserPermission.MODERATOR:
        raise RPException.NoPermission()
    
    # 削除するタグをつけている譜面があるときは、そこからも消す
    stmt = sql.delete(ChartTagDB).where(ChartTagDB.tag_id == tag_id)
    await session.execute(stmt)
    
    # タグを消す
    await session.delete(chart_tag)
    
    await session.commit()


@router.get("/chart/tag", response_model=list[ChartTagResponse])
async def get_alltag(
    session: AsyncSession = Depends(create_session)
):
    """
    全ての譜面タグを返す
    GET /api/chart/tag
    """
    
    tag_list = []
    
    stmt = sql.select(ChartTagMasterDB)
    tags = (await session.execute(stmt)).scalars().all()
    
    for tag in tags:
        tag_list.append(
            ChartTagResponse(
                id = tag.id,
                title = tag.title,
                icon = tag.icon,
                createdAt = tag.created_at,
                updatedAt = tag.updated_at
            )
        )

    return tag_list