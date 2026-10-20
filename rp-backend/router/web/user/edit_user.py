import json
import hashlib
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, Response

from const.env import (
    S3_HOST
)
from utils.dependencies import get_current_user_id
from utils.exceptions import RPException
from utils.converter import convert_icon
from utils.s3utils import upload_s3, delete_s3
from const.user import UserPermission, UserFileSize
from schemas.requests import UserEditRequest
from schemas.storage import UploadData
from db.session import create_session, create_session_context
from db.models import (
    User as UserDB
)



router = APIRouter()

async def _upload_icon(user_id: str, icon_data: bytes):
    
    # セッションを作成
    async with create_session_context() as session:
        # ユーザーを取得
        user = await session.get(UserDB, user_id)
        
        # アイコンを変換する
        converted_icon = convert_icon(icon_data)
        
        icon_hash = hashlib.sha1(converted_icon).hexdigest()
        icon_key = "/".join([user_id, icon_hash])
        icon_url = "/".join([S3_HOST, icon_key])
        
        # S3にアップロード
        await upload_s3([
            UploadData(icon_key, converted_icon)
        ])
        
        if user.icon_hash is not None:
            # 既存アイコンをS3から削除
            await delete_s3([
                "/".join([user_id, user.icon_hash])
            ])
            
        user.icon_url = icon_url
        user.icon_hash = icon_hash
        
        await session.commit()
    

@router.put("/user")
async def edit_user(
    bg_tasks: BackgroundTasks,
    target_user_id: str,
    data: Optional[str] = Form(None),
    operator_user_id: str = Depends(get_current_user_id),
    icon_file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(create_session),
):
    """
    ユーザーを編集する。
    PUT /api/user
    """
    
    body = UserEditRequest(**json.loads(data)) if data is not None else None
        
    # 編集するユーザーを取得
    target_user = await session.get(UserDB, target_user_id)
    
    # 操作ユーザーを取得
    operator_user = await session.get(UserDB, operator_user_id)
    
    # ユーザーを取得できなかったとき
    if (
        target_user is None or
        operator_user is None
    ):
        raise RPException.UserNotFound()
    
    # 操作ユーザーと対象ユーザーが別な場合
    if target_user_id != operator_user_id:
        # 操作ユーザーがモデ以上の権限を持っていないとき、もしくは
        # 対象ユーザーが操作ユーザーと同じもしくは高い権限を持っていた場合、権限なしで弾く
        if (
            operator_user.permission < UserPermission.MODERATOR or
            target_user.permission >= operator_user.permission
        ):
            raise RPException.NoPermission()
    
    if body is not None:
        if body.name is not None:
            target_user.name = body.name
        
        if body.profile is not None:
            target_user.profile = body.profile
            
        if body.permission is not None:
            # 自分自身の権限を操作できないようにする。
            # （permissionが設定されていた場合、対象ユーザーと操作ユーザーが同じときは弾く）
            # 操作ユーザーよりも高い権限にはできないようにする
            if (
                target_user_id == operator_user_id or
                body.permission > operator_user.permission
            ):
                raise RPException.NoPermission()
            
            # 権限を変更
            target_user.permission = body.permission
        
    # アイコンファイルが送られてきたときの処理
    if icon_file is not None:
        icon = await icon_file.read()
        
        # ファイルサイズが大きすぎる時は弾く
        if len(icon) > UserFileSize.ICON:
            raise RPException.FileSizeTooLarge()
        
        # 変換処理をバックグラウンドタスクに追加する
        bg_tasks.add_task(
            _upload_icon,
            user_id = target_user_id,
            icon_data = icon
        )
        
    await session.commit()
        
    return Response()