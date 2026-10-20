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
    ChartCollaborator as ChartCollaboratorDB, 
    ChartTag as ChartTagDB, 
    ChartTagMaster as ChartTagMasterDB
)



router = APIRouter()

@router.post("/chart")
async def post_chart(
    data: str = Form(...),
    chart_file: UploadFile = File(...),
    bgm_file: UploadFile = File(...),
    jacket_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)   
):
    """
    譜面を投稿するエンドポイント
    POST /api/chart
    """

    body = ChartPostRequest(**json.loads(data))
    
    # ユーザーを取得      
    user = await session.get(UserDB, user_id)
    
    # ユーザーを取得できなかったとき
    if user is None:
        raise RPException.UserNotFound()
    # 通常以下の権限のとき
    elif user.permission < UserPermission.NORMAL:
        raise RPException.NoPermission()
    
    if user.permission == UserPermission.NORMAL:        
        # ユーザーに投稿権限がなかったら、投稿している譜面数を取得して
        # 1譜面以上ある場合401(アクセス権なし)
        stmt = sql\
                .select(sql.func.count())\
                .select_from(ChartDB)\
                .where(ChartDB.author_user_id == user_id)\
                .where(ChartDB.is_deleted.is_(False))
    
        chart_count = (await session.execute(stmt)).scalar()
        
        if chart_count > 0:
            raise RPException.NoPermission()
        
        # コラボ、タグの設定は不可とする。
        if (
            len(body.collaborators) != 0 or
            len(body.tags) != 0
        ):
            raise RPException.NoPermission()
    
    # 譜面数をチェックする
    if user.permission > UserPermission.NORMAL:
        # 公開ではない譜面数を取得
        stmt = sql\
                .select(sql.func.count())\
                .select_from(ChartDB)\
                .where(ChartDB.author_user_id == user_id)\
                .where(ChartDB.is_deleted.is_(False))\
                .where(ChartDB.publish_status < ChartPublishStatus.PUBLIC)
        
        private_chart_count = (await session.execute(stmt)).scalar()
        
        if private_chart_count >= UserChartPostLimit.PRIVATE:
            raise RPException.ChartPostLimitError()
        
        # 全ての譜面数を取得
        stmt = sql\
                .select(sql.func.count())\
                .select_from(ChartDB)\
                .where(ChartDB.author_user_id == user_id)\
                .where(ChartDB.is_deleted.is_(False))
        
        public_chart_count = (await session.execute(stmt)).scalar()
        
        if public_chart_count >= UserChartPostLimit.ALL:
            raise RPException.ChartPostLimitError()
    
    # 各ファイルを読み込む
    original_chart =  await chart_file.read()
    original_bgm =    await bgm_file.read()
    original_jacket = await jacket_file.read()
    
    # ファイルサイズが多きすぎますのときには413(ファイル容量の上限超)
    if (
        len(original_chart) > ChartFileSize.CHART or
        len(original_bgm) > ChartFileSize.BGM or
        len(original_jacket) > ChartFileSize.JACKET
    ):
        raise RPException.FileSizeTooLarge()
    
    # 譜面IDを生成
    chart_id = "-".join([SERVICE_PREFIX, generate_chart_id()])
    
    # タグ
    if len(body.tags) != 0:
        for tag in body.tags:
            # タグが存在するか
            stmt = sql.select(
                sql.exists()\
                    .select_from(ChartTagMasterDB)\
                    .where(ChartTagMasterDB.id == tag)
            )
            
            exist_tag = (await session.execute(stmt)).scalar()
            
            # タグが存在したら、登録する
            if exist_tag:
                chart_tag = ChartTagDB(
                    chart_id = chart_id,
                    tag_id = tag
                )
                session.add(chart_tag)
                
    # 合作かどうかを判定、DBに保存
    collabo = CollaboStatus.DISABLE.value
    if len(body.collaborators) != 0:
        collabo = CollaboStatus.ENABLE.value
        
        for collaborator in body.collaborators:
            # ユーザーが存在するか
            stmt = sql.select(
                sql.exists()\
                    .select_from(UserDB)\
                    .where(UserDB.id == collaborator)
            )
            
            exist_user = (await session.execute(stmt)).scalar()
            
            # ユーザーが存在したら、合作者に登録する
            if exist_user:
                chart_collaborator = ChartCollaboratorDB(
                    chart_id = chart_id,
                    user_id = collaborator
                )
                session.add(chart_collaborator)
    
    # 最初から公開状態にならないようにする
    if body.publish_status == ChartPublishStatus.PUBLIC:
        body.publish_status = ChartPublishStatus.PRIVATE.value
    
    # DBにレコードを登録
    chart = ChartDB(
        id = chart_id,
        rating = body.rating,
        title = body.title,
        composer = body.composer,
        vocal = body.vocal,
        author = body.display_name,
        author_user_id = user.id,
        skin_item_id = "rp-skin-default",
        effect_item_id = "rp-effect-default",
        particle_item_id = "rp-particle-default",
        engine_item_id = "rp-engine-default",
        genre = body.genre,
        difficulty = body.difficulty,
        description = body.description,
        collabo = collabo,
        r18 = body.r18,
        publish_status = body.publish_status,
        original_chart_publish_status = body.chart_file_publish_status
    )
    
    session.add(chart)
    await session.commit()
    
    upload_jacket.delay(chart_id, original_jacket)
    upload_bgm.delay(chart_id, original_bgm, body.start_time)
    upload_chart.delay(chart_id, original_chart)
    
    
    # 予約投稿のとき
    #if body.publish_status == ChartPublishStatus.SCHEDULED:
    #    add_post_chart_schedule(chart_id, convert_timestamp_to_datetime(body.scheduled_at))
        
    return chart_id