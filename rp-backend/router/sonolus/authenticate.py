from router.sonolus.index import sonolus

import sqlalchemy as sql
from sonolus_models import (
    ServerAuthenticateResponse
)

from const.user import UserPermission
from db.session import create_session_context
from db.models import (
    User as UserDB
)
from utils.exceptions import RPException
from utils.idutils import generate_sonolus_session_id
from utils.time import get_timestamp



@sonolus.server.authenticate(ServerAuthenticateResponse)
async def authenticate(ctx):
    
    async with create_session_context() as session:
        
        stmt = sql.select(UserDB)\
                  .where(UserDB.sonolus_id == ctx.request.user_profile.id)
        
        user = (await session.execute(stmt)).scalar()
        
        # ユーザーが見つからなかった場合
        if user is None:
            raise RPException.UserNotFound()
        # ユーザーがBANされているとき
        elif user.permission < UserPermission.NORMAL:
            raise RPException.UserBanned()
    
        # セッションに使うIDを作成、保存
        session_id = generate_sonolus_session_id(user.id)
        
        # 有効期限を計算
        expiration = (get_timestamp() * 1000) + (60 * 60 * 1000)
    
    return ServerAuthenticateResponse(
        session=session_id,
        expiration=expiration
    )