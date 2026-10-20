import httpx
import sqlalchemy as sql
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import Response, RedirectResponse

from const.env import (
    DISCORD_API_URL,
    DISCORD_OAUTH2_URL,
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_GUILD_ID,
    DISCORD_ADMINISTRATOR_ROLE_ID,
    DISCORD_MODERATOR_ROLE_ID,
    HOST_URL
)
from const.user import UserPermission
from db.session import create_session
from utils.idutils import generate_user_id
from utils.auth import set_access_token, set_refresh_token
from utils.exceptions import RPException
from db.models import (
    User as UserDB
)



REDIRECT_URI = HOST_URL + "/api/discord/callback"

router = APIRouter()

@router.get("/discord/login")
async def discord_login():
    """
    RPにログインするために、DiscordのOAuth2にリダイレクトさせるエンドポイント。
    GET /api/discord/login
    """
    return RedirectResponse(DISCORD_OAUTH2_URL)


@router.get("/discord/callback")
async def discord_callback(
    code: str,
    session: AsyncSession = Depends(create_session)
):
    """
    DiscordのOAuth2で認証を行った後にリダイレクト先になるエンドポイント。
    GET /api/discord/callback
    """
    
    response = RedirectResponse("/")
    
    async with httpx.AsyncClient() as client:
        
        # コールバックで得たcodeからトークンを取得
        token_response = await client.post(
            url = f"{DISCORD_API_URL}/oauth2/token",
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI
            },
            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            auth = (
                DISCORD_CLIENT_ID,
                DISCORD_CLIENT_SECRET
            )
        )
        token_data = token_response.json()

        # トークンを使用してユーザーデータを取得
        user_response = await client.get(
            url = f"{DISCORD_API_URL}/users/@me/guilds/{DISCORD_GUILD_ID}/member",
            headers = {
                "Authorization": f"{token_data['token_type']} {token_data['access_token']}"
            }
        )
        user_data = user_response.json()

    discord_user_id = user_data["user"]["id"]
    discord_name = user_data["user"]["global_name"]
    discord_roles = user_data["roles"]
    
    # ユーザーを取得
    stmt = sql.select(UserDB)\
              .where(UserDB.discord_id == discord_user_id)
              
    user = (await session.execute(stmt)).scalar()
           
    # ユーザーが存在しない時は、新規ユーザーを作成する。
    if user is None:
        new_user_id = generate_user_id()
        
        # 所持しているロールに合わせて権限を設定
        if DISCORD_ADMINISTRATOR_ROLE_ID in discord_roles:
            new_user_permission = UserPermission.ADMINISTRATOR.value
        elif DISCORD_MODERATOR_ROLE_ID in discord_roles:
            new_user_permission = UserPermission.MODERATOR.value
        else:
            new_user_permission = UserPermission.NORMAL.value

        user = UserDB(
            id = new_user_id,
            name = discord_name,
            permission = new_user_permission,
            discord_id = discord_user_id,
            discord_name = discord_name
        )
        
        session.add(user)
        await session.commit()

    # BANされているとき
    elif user.permission < UserPermission.NORMAL:
        raise RPException.UserBanned()
    
    # レスポンスにアクセストークンとリフレッシュトークンをセット
    set_access_token(response, user.id)
    set_refresh_token(response, user.id)
    
    return response