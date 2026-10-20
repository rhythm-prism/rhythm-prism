import json
import sqlalchemy as sql
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, status, Cookie, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sonolus_models import ServerAuthenticateExternalRequest

from const.env import (
    HOST_URL
)
from const.redis import (
    SONOLUS_LOGIN_SESSION_KEY,
    SONOLUS_LOGIN_SESSION_TTL
)
from const.user import UserPermission
from utils.auth import verify_sonolus_signature
from utils.time import get_datetime, get_timestamp
from utils.idutils import generate_sonolus_session_id, decode_sonolus_session_id, generate_auth_id
from utils.dependencies import get_current_user_id
from utils.redis import redis_client
from db.session import create_session
from db.models import (
    User as UserDB, 
    UserAuth as UserAuthDB
)



router = APIRouter()

@router.get("/sonolus/link")
async def link_sonolus(
    user_id: str = Depends(get_current_user_id)
):
    """
    RPにSonolusのアカウントを紐づけるために、Sonolus認証のページにリダイレクトさせるエンドポイント。
    GET /api/sonolus/link
    """
    
    # url
    url = "/".join([
        "https://open.sonolus.com/external-login",
        HOST_URL.replace("https://", "").replace("http://", ""),
        "api/sonolus/link/callback"
    ])
    
    token = generate_sonolus_session_id(user_id)
    
    # クエリパラメータ
    url += f"?token={token}"
    
    return RedirectResponse(url)


@router.post("/sonolus/link/callback")
async def link_sonolus_callback(
    request: Request,
    token: str,
    body: ServerAuthenticateExternalRequest,
    session: AsyncSession = Depends(create_session)
):
    """
    Sonolus認証を行った際にSonolusアプリからリクエストを送られるエンドポイント。（リンク用）
    POST /api/sonolus/link/callback
    """
    
    # Sonolus-Signatureを取得する
    sonolus_signature = request.headers.get("Sonolus-Signature")
    if not sonolus_signature:
        return JSONResponse(
            content = {"message": "署名がありません。"},
            status_code = status.HTTP_400_BAD_REQUEST
        )
    
    # Sonolus-Signatureを検証する
    result = verify_sonolus_signature(sonolus_signature, await request.body())
    if not result:
        return JSONResponse(
            content = {"message": "不正な署名です。"},
            status_code = status.HTTP_403_FORBIDDEN
        )
    
    # timeとurlが正しいものであるかも検証する
    if abs(get_timestamp() * 1000 - body.time) > 300000:
        return JSONResponse(
            content = {"message": "認証リクエストの有効期限が切れています。"},
            status_code = status.HTTP_403_FORBIDDEN
        )
    
    if body.url != "/".join([HOST_URL, "api/sonolus/link/callback"]):
        return JSONResponse(
            content = {"message": "認証リクエスト送信先が違います。"},
            status_code = status.HTTP_403_FORBIDDEN
        )
    
    # tokenからユーザーIDを取得
    user_id = decode_sonolus_session_id(token)
    
    # DBからユーザーを取得
    user = await session.get(UserDB, user_id)
    
    # ユーザーが存在しなかったら404
    # ありえないはずだけど一応書いておく
    if user is None:
        return JSONResponse(
            content = {"message": "RPアカウントが存在しません。"},
            status_code = status.HTTP_404_NOT_FOUND
        )
    
    # Sonolus情報をセット
    user.sonolus_id = body.user_profile.id
    user.sonolus_name = body.user_profile.name
    user.sonolus_handle = int(body.user_profile.handle)
    
    # 変更を反映する
    await session.commit()
    
    return JSONResponse(
        content = {"message": "Sonolusアカウントの紐づけに成功しました！"}
    )


@router.post("/sonolus/login")
async def sonolus_login(
    #session: AsyncSession = Depends(create_session)
):
    """
    RPにログインするために、認証セッションを作成し、セッションのIDとログインするためのURLを返す
    POST /api/sonolus/login
    """

    auth_id = generate_auth_id()

    auth_data = {
        "user_id": None,
    }

    # redisに登録
    await redis_client.set(
        SONOLUS_LOGIN_SESSION_KEY.format(auth_id),
        json.dumps(auth_data),
        ex=SONOLUS_LOGIN_SESSION_TTL
    )

    url = "/".join([
        "https://open.sonolus.com/external-login",
        HOST_URL.replace("https://", "").replace("http://", ""),
        "api/sonolus/login/callback"
    ])
    
    url += f"?auth_id={auth_id}"
    
    return JSONResponse(
        content = {
            "auth_id": auth_id,
            "auth_url": url
        }
    )


@router.post("/sonolus/login/callback")
async def sonolus_login_callback(
    request: Request,
    auth_id: str,
    body: ServerAuthenticateExternalRequest,
    session: AsyncSession = Depends(create_session)
):
    """
    Sonolus認証を行った際にSonolusアプリからリクエストを送られるエンドポイント。（ログイン用）
    POST /api/sonolus/login/callback
    """

    # Sonolus-Signatureを取得する
    sonolus_signature = request.headers.get("Sonolus-Signature")
    if not sonolus_signature:
        return JSONResponse(
            content = {"message": "署名がありません。"},
            status_code = status.HTTP_400_BAD_REQUEST
        )
    
    # Sonolus-Signatureを検証する
    result = verify_sonolus_signature(sonolus_signature, await request.body())
    if not result:
        return JSONResponse(
            content = {"message": "不正な署名です。"},
            status_code = status.HTTP_403_FORBIDDEN
        )
        
    # timeとurlが正しいものであるかも検証する
    if abs(get_timestamp() * 1000 - body.time) > 300000:
        return JSONResponse(
            content = {"message": "認証リクエストの有効期限が切れています。"},
            status_code = status.HTTP_403_FORBIDDEN
        )
    
    if body.url != "/".join([HOST_URL, f"api/sonolus/login/callback?auth_id={auth_id}"]):
        return JSONResponse(
            content = {"message": "認証リクエスト送信先が違います。"},
            status_code = status.HTTP_403_FORBIDDEN
        )
    
    stmt = sql.select(UserDB)\
              .where(UserDB.sonolus_id == body.user_profile.id)
    
    user = (await session.execute(stmt)).scalar()
    
    # ユーザーが取得できないとき
    if user is None:
        return JSONResponse(
            content = {"message": "RPアカウントが存在しません。"},
            status_code = status.HTTP_404_NOT_FOUND
        )
        
    # BANされているとき
    elif user.permission < UserPermission.NORMAL:
        return JSONResponse(
            content = {"message": "BANされているため、ログインできません。"},
            status_code = status.HTTP_403_FORBIDDEN
        )
        
    # Sonolus連携していない場合は連携させる
    elif user.sonolus_id is None:
        return JSONResponse(
            content = {"message": "RPアカウントにSonolusアカウントを連携する必要があります。"},
            status_code = status.HTTP_403_FORBIDDEN
        )

    key = SONOLUS_LOGIN_SESSION_KEY.format(auth_id)
    auth_data = await redis_client.get(key)

    if not auth_data:
        return JSONResponse(
            content = {"message": "認証セッションが存在しません。"},
            status_code = status.HTTP_404_NOT_FOUND
        )

    auth_data = json.loads(auth_data)

    # ユーザーIDをセットする
    auth_data["user_id"] = user.id
    
    await redis_client.set(
        key,
        json.dumps(auth_data),
        keepttl=True
    )
    
    await session.commit()
    
    return JSONResponse(
        content = {"message": "認証に成功しました！"}
    )