from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends

from utils.dependencies import get_current_user_id
from utils.s3utils import delete_s3
from utils.exceptions import RPException
from const.user import UserPermission
from db.session import create_session
from db.models import (
    User as UserDB, 
    Chart as ChartDB, 
    BackgroundItem as BackgroundItemDB
)



router = APIRouter()

@router.delete("/chart")
async def delete_chart(
    chart_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)   
):
    """
    譜面を削除するエンドポイント
    このエンドポイントは管理者以上の権限を持つユーザーからも使用できるようにして、
    違反投稿がされた際に対処できるようにする。
    DELETE /api/chart
    """
    
    # ユーザーと譜面、背景を取得
    user = await session.get(UserDB, user_id)
    chart = await session.get(ChartDB, chart_id)
    background = await session.get(BackgroundItemDB, chart.background_item_id)
    
    # ユーザーを取得できなかったき
    if user is None:
        raise RPException.UserNotFound()
    # 譜面情報を取得できなかったとき
    elif chart is None:
        raise RPException.ChartNotFound()
    # 背景を取得できなかったとき
    elif background is None:
        raise RPException.BackgroundNotFound()
    # 編集権限がないとき
    elif user.permission < UserPermission.CHARTER:
        raise RPException.NoPermission()
    
    # 譜面投稿者本人 or 管理者以外は権限なしとして弾く
    is_owner = chart.author_user_id == user_id
    is_admin = user.permission == UserPermission.ADMINISTRATOR
    
    if not (
        is_owner or
        is_admin
    ):
        raise RPException.NoPermission()
    
    # 合作メンバーを削除
    #session.query(ChartCollaborator)\
    #       .filter(ChartCollaborator.chart_id == chart_id)\
    #       .delete()

    # タグを削除
    #session.query(ChartTag)\
    #       .filter(ChartTag.chart_id == chart_id)\
    #       .delete()
    
    # いいねを削除
    #session.query(ChartLike)\
    #       .filter(ChartLike.chart_id == chart_id)\
    #       .delete()
    
    # 譜面と背景レコードを削除
    #session.delete(chart)
    #session.delete(background)
    
    # S3上のデータを削除する
    #await delete_s3([
    #    "/".join([chart_id, chart.original_chart_hash]),
    #    "/".join([chart_id, chart.leveldata_hash]),
    #    "/".join([chart_id, chart.bgm_hash]),
    #    "/".join([chart_id, chart.preview_hash]),
    #    "/".join([chart_id, chart.jacket_hash]),
    #    "/".join([chart_id, background.image_hash])
    #])

    # 間違って削除してもいいように、論理削除にする
    chart.is_deleted = True
    
    await session.commit()