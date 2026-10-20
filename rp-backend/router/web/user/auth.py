import json
import sqlalchemy as sql
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Response, Depends, Cookie, status
from fastapi.responses import JSONResponse

from const.user import UserPermission
from const.redis import (
    SONOLUS_LOGIN_SESSION_KEY,
    SONOLUS_LOGIN_SESSION_TTL
)
from db.session import create_session
from schemas.responses import UserDataDetailInfoResponse
from utils.auth import decode_token, set_access_token, set_refresh_token, delete_access_token, delete_refresh_token
from utils.exceptions import RPException
from utils.dependencies import get_current_user_id
from utils.redis import redis_client
from db.models import (
    User as UserDB,
    UserAuth as UserAuthDB
)



router = APIRouter()

@router.post("/auth/refresh")
async def refresh_access_token(
    refresh_token: str = Cookie(),
    session: AsyncSession = Depends(create_session)
):
    """
    access_tokenの有効期限が切れた場合に、
    refresh_tokenとともにこのエンドポイントを叩くと
    access_tokenをセットして返すエンドポイント。
    POST /api/auth/refresh
    """
    
    response = Response()
    
    # リフレッシュトークンからユーザーIDを取得
    # リフレッシュトークンも期限切れの場合は、401を返す
    user_id = decode_token(refresh_token)
    
    # ユーザーを取得
    user = await session.get(UserDB, user_id)
    
    # ユーザーが存在しないとき
    if user is None:
        raise RPException.InvalidToken()
    # BANされているとき
    elif user.permission < UserPermission.NORMAL:
        raise RPException.UserBanned()
    
    # アクセストークンをセットする
    set_access_token(response, user_id)
    set_refresh_token(response, user_id)
    
    return response


@router.get("/auth/status")
async def auth_status(
    auth_id: str,
    #session: AsyncSession = Depends(create_session)
):
    """
    idから認証セッションを探し、ユーザーIDがセットされているかを確認してcookieをセットする。
    /api/sonolus/login/callbackでセットされる
    GET /api/auth/status
    """

    key = SONOLUS_LOGIN_SESSION_KEY.format(auth_id)
    auth_data = await redis_client.get(key)

    if not auth_data:
        raise RPException.AuthRecordNotFound()

    auth_data = json.loads(auth_data)
    user_id = auth_data["user_id"]
    
    if not user_id:
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={"status": "pending"}
        )
        
    await redis_client.delete(key)
    
    response = JSONResponse(
        content = {"status": "completed"}
    )
    
    set_access_token(response, user_id)
    set_refresh_token(response, user_id)
    
    return response


@router.get("/login", response_model=UserDataDetailInfoResponse)
async def login(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    ページを読み込み時に、ユーザー情報を取得するためのエンドポイント
    GET /api/login
    """
    
    user = await session.get(UserDB, user_id)
    
    # ユーザーが存在しないとき
    if user is None:
        raise RPException.InvalidToken()
    # BANされているとき
    elif user.permission < UserPermission.NORMAL:
        raise RPException.UserBanned()
    
    return UserDataDetailInfoResponse(
        id = user.id,
        name = user.name,
        iconUrl = user.icon_url if user.icon_url is not None else "",
        profile = user.profile if user.profile is not None else "", 
        discordId = user.discord_id,
        discordName = user.discord_name,
        sonolusId = user.sonolus_id,
        sonolusHandle = user.sonolus_handle,
        sonolusName = user.sonolus_name,
        warningCount = user.warning_count,
        permission = user.permission
    )
    

@router.post("/logout")
async def logout():
    """
    access_tokenとrefresh_tokenを削除してログアウト状態にするエンドポイント。
    HttpOnlyのCookieはjsからは削除できないため、このエンドポイントを叩く
    POST /api/logout
    """
    
    response = Response()
    
    # トークンを全て削除する
    delete_access_token(response)
    delete_refresh_token(response)
    
    return response