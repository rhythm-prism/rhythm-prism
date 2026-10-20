import sqlalchemy as sql
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends
from typing import Optional

from const.user import UserPermission
from db.session import create_session
from utils.dependencies import get_current_user_id_optional
from utils.exceptions import RPException
from schemas.responses import UserDataDetailInfoResponse
from db.models import (
    User as UserDB
)



router = APIRouter()

@router.get("/user", response_model=UserDataDetailInfoResponse)
async def get_user(
    user_id: str,
    operator_user_id: str = Depends(get_current_user_id_optional),
    session: AsyncSession = Depends(create_session)
):
    """
    指定されたユーザーIDからユーザー情報を返却する。
    GET /api/user
    """
    
    user = await session.get(UserDB, user_id)
    
    # ユーザーが見つからなかったとき
    if user is None:
        raise RPException.UserNotFound()
    
    is_moderator = False
    
    # access_tokenが設定されているとき
    if operator_user_id is not None:
        # リクエストを送ったユーザーを取得
        operator_user = await session.get(UserDB, operator_user_id)
        
        # ユーザーが見つからなかったとき
        if operator_user is None:
            raise RPException.UserNotFound()
        
        # モデレーター以上の時はモデレーターフラぐをTrueにする
        if operator_user.permission >= UserPermission.MODERATOR:
            is_moderator = True

    is_me = user_id == operator_user_id
    
    return UserDataDetailInfoResponse(
        id = user.id,
        name = user.name,
        profile = user.profile if user.profile is not None else "",
        iconUrl = user.icon_url if user.icon_url is not None else "",
        discordId = user.discord_id,
        discordName = user.discord_name,
        sonolusId = user.sonolus_id if user.sonolus_id is not None else "",
        sonolusHandle = user.sonolus_handle if user.sonolus_handle is not None else 0,
        sonolusName = user.sonolus_name if user.sonolus_name is not None else "",
        # モデのときだけセット
        warning_count = user.warning_count if is_moderator else None,
        # モデもしくは自分の時だけセット
        permission = user.permission if is_moderator or is_me else None,
    )
    

@router.get("/users", response_model=list[UserDataDetailInfoResponse])
async def get_users(
    name: Optional[str] = None,
    permission: Optional[UserPermission] = None,
    operator_user_id: str = Depends(get_current_user_id_optional),
    session: AsyncSession = Depends(create_session)
):
    """
    条件からそれに当てはまるユーザーを返却する。
    GET /api/users
    """
    
    stmt = sql.select(UserDB)\
              .limit(20)
    
    # 操作ユーザーを取得
    operator_user = await session.get(UserDB, operator_user_id) if operator_user_id is not None else None
    
    is_moderator = False
    
    if (
        operator_user is not None and
        operator_user.permission >= UserPermission.MODERATOR
    ):
        is_moderator = True
    
    # 名前で検索
    if name is not None:
        lower_name = name.lower()
        stmt = stmt.where(sql.func.lower(UserDB.name).contains(lower_name))
    
    # モデレーター以上の権限が無い人は、BANされたユーザーの検索を行えないようにする。
    if permission is not None:
        
        # 権限が通常以下（=BANされている）を指定しているとき
        if permission < UserPermission.NORMAL:
            
            # 操作ユーザーがモデレーター以上ではないとき
            if not is_moderator:
                raise RPException.NoPermission()
        
        stmt = stmt.where(UserDB.permission == permission)
    
    users = (await session.execute(stmt)).scalars().all()
    
    user_list = []
    for user in users:
        user_list.append(
            UserDataDetailInfoResponse(
                id = user.id,
                name = user.name,
                profile = user.profile if user.profile is not None else "",
                iconUrl = user.icon_url if user.icon_url is not None else "",
                discordId = user.discord_id,
                discordName = user.discord_name,
                sonolusId = user.sonolus_id if user.sonolus_id is not None else "",
                sonolusHandle = user.sonolus_handle if user.sonolus_handle is not None else 0,
                sonolusName = user.sonolus_name if user.sonolus_name is not None else "",
                # モデのときだけセット
                warning_count = user.warning_count if is_moderator else None,
                permission = user.permission if is_moderator else None,
            )
        )
        
    return user_list