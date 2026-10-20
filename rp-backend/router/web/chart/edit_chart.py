import json
import hashlib
import sqlalchemy as sql
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks

from const.env import (
    S3_HOST
)
from utils.dependencies import get_current_user_id
from utils.time import get_timestamp, convert_timestamp_to_datetime
from utils.s3utils import upload_s3, delete_s3
from utils.scheduler import add_post_chart_schedule, delete_post_chart_schedule
from utils.exceptions import RPException
from utils.webhook import send_new_chart_notice
from utils.convert_tasks import upload_jacket, upload_bgm, upload_chart
from const.user import UserPermission, UserChartPostLimit
from const.chart import ChartPublishStatus, ChartFileSize, CollaboStatus, ChartConversionStatus
from schemas.requests import ChartEditRequest
from schemas.storage import UploadData
from db.session import create_session
from db.models import (
    User as UserDB, 
    Chart as ChartDB, 
    BackgroundItem as BackgroundItemDB, 
    ChartCollaborator as ChartCollaboratorDB, 
    ChartTag as ChartTagDB, 
    ChartTagMaster as ChartTagMasterDB
)



router = APIRouter()

@router.put("/chart")
async def edit_chart(
    background_tasks: BackgroundTasks,
    chart_id: str,
    data: Optional[str] = Form(None),
    chart_file: Optional[UploadFile] = File(None),
    bgm_file: Optional[UploadFile] = File(None),
    jacket_file: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)   
):
    """
    譜面を編集するエンドポイント。
    このエンドポイントはモデレーター以上の権限を持つユーザーからも使用できるようにして、
    違反投稿がされた際に対処できるようにする。
    PUT /api/chart
    """

    body = ChartEditRequest(**json.loads(data)) if data is not None else None
    
    # ユーザーと譜面を取得
    user = await session.get(UserDB, user_id)
    chart = await session.get(ChartDB, chart_id)
    
    # ユーザーを取得できなかったとき
    if user is None:
        raise RPException.UserNotFound()
    
    # 譜面情報を取得できなかったとき
    if chart is None:
        raise RPException.ChartNotFound()
    
    # 通常以下の権限のとき
    if user.permission < UserPermission.NORMAL:
        raise RPException.NoPermission()
    
    # 譜面作者ではない時に譜面を編集しようとした場合
    if user.permission == UserPermission.NORMAL:
        # 譜面の公開、コラボ、タグの編集は不可とする。
        if (
            (body.publish_status is not None and body.publish_status >= ChartPublishStatus.PUBLIC) or
            len(body.collaborators or []) != 0 or
            len(body.tags or []) != 0
        ):
            raise RPException.NoPermission()
    
    # 合作のときは、登録されているユーザーも編集できるようにする必要がある。
    # なので、譜面投稿者本人 or モデレーター以上 or 合作に登録されている以外は
    # 権限なしとして弾く
    is_owner = chart.author_user_id == user_id
    is_moderator = user.permission >= UserPermission.MODERATOR
    collabo_stmt = sql.select(
        sql.exists()\
        .select_from(ChartCollaboratorDB)\
        .where(ChartCollaboratorDB.chart_id == chart_id)\
        .where(ChartCollaboratorDB.user_id == user_id)
    )
    is_collaborator = (
        chart.collabo == CollaboStatus.ENABLE and
        (await session.execute(collabo_stmt)).scalar()
    )
    
    if not (
        is_owner or
        is_moderator or
        is_collaborator
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
        
        if (
            not is_moderator and
            private_chart_count >= UserChartPostLimit.PRIVATE and
            body.publish_status < ChartPublishStatus.PUBLIC and
            chart.publish_status == ChartPublishStatus.PUBLIC
        ):
            raise RPException.ChartPostLimitError(detail="非公開譜面数が上限に達しています。")
    
    if body is not None:
        # タイトル
        if body.title is not None:
            chart.title = body.title
            
        # コンポーザー
        if body.composer is not None:
            chart.composer = body.composer
            
        # ボーカル
        if body.vocal is not None:
            chart.vocal = body.vocal
            
        # ジャンル
        if body.genre is not None:
            chart.genre = body.genre
        
        # 難易度
        if body.difficulty is not None:
            chart.difficulty = body.difficulty
            
        # 難易度（レベル）
        if body.rating is not None:
            chart.rating = body.rating
            
        # 表示名
        if body.display_name is not None:
            chart.author = body.display_name
            
        # 説明
        if body.description is not None:
            chart.description = body.description
            
        # R18
        if body.r18 is not None:
            chart.r18 = body.r18
            
        # 合作
        if body.collaborators is not None:
            # 既存の合作情報を削除する
            stmt = sql.delete(ChartCollaboratorDB)\
                      .where(ChartCollaboratorDB.chart_id == chart_id)
            
            await session.execute(stmt)
            
            # 合作者を登録
            if len(body.collaborators) != 0:
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
                        
                chart.collabo = CollaboStatus.ENABLE.value
                
            # 合作じゃなくするとき
            else:
                chart.collabo = CollaboStatus.DISABLE.value
        
        # タグ
        if body.tags is not None:
            # 既存のタグ情報を削除する
            stmt = sql.delete(ChartTagDB)\
                      .where(ChartTagDB.chart_id == chart_id)
            
            await session.execute(stmt)
            
            # タグを登録
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
                    
        # 譜面公開
        if body.chart_file_publish_status is not None:
            chart.original_chart_publish_status = body.chart_file_publish_status
        
        # 新着譜面通知をするかどうか
        should_notify = False

        # 公開設定
        if body.publish_status is not None:
            match chart.publish_status:
                # 現在公開状態のとき
                case ChartPublishStatus.PUBLIC:
                    # 公開と非公開に変更する場合は何もしない
                    # 予約投稿に変更するときも、初回公開時刻を変更しないので、何もしなくてよい
                    pass
                
                # 現在非公開のとき
                case ChartPublishStatus.PRIVATE:
                    # 公開に変更するとき、初回公開時刻が空なら
                    # 現在の時刻をセットし、新着通知を出す
                    if (
                        body.publish_status == ChartPublishStatus.PUBLIC and
                        chart.first_published_at is None
                    ):
                        chart.first_published_at = get_timestamp()
                        should_notify = True
                    # 非公開にするときは何もしない
                    # 予約投稿に変更するときも、初回公開時刻を変更しないので、何もしなくてよい
                    
                # 現在予約投稿のとき
                case ChartPublishStatus.SCHEDULED:
                    # 既存のスケジュールを削除する
                    delete_post_chart_schedule(chart_id)
                    
                    # 公開に変更するとき、初回公開時刻が空なら
                    # 現在の時刻をセットし、新着通知を出す
                    if (
                        body.publish_status == ChartPublishStatus.PUBLIC and
                        chart.first_published_at is None
                    ):
                        chart.first_published_at = get_timestamp()
                        should_notify = True
                    # 非公開にするときは何もしない
                    # 予約投稿に変更するときも、初回公開時刻を変更しないので、何もしなくてよい
            
            chart.publish_status = body.publish_status
            if body.publish_status == ChartPublishStatus.SCHEDULED:
                add_post_chart_schedule(chart_id, convert_timestamp_to_datetime(body.scheduled_at))
                
    should_upload_chart = False
    should_upload_bgm = False
    should_upload_jacket = False
    
    # 譜面が送られてきたとき
    if chart_file is not None:
        # ファイルを読み込む
        original_chart = await chart_file.read()
        
        # ファイルサイズがオーバーしてないか
        if len(original_chart) > ChartFileSize.CHART:
            raise RPException.FileSizeTooLarge()
        
        # 同じファイルかどうか
        if chart.original_chart_hash != hashlib.sha1(original_chart).hexdigest():
            should_upload_chart = True
            
            # 処理ステータスをリセット
            # （0とのANDを取ることで該当フラグを0にできる）
            chart.conversion_status &= ~ChartConversionStatus.CHART_COMPLETE

    # BGMが送られてきたとき
    if bgm_file is not None:
        # ファイルを読み込む
        original_bgm = await bgm_file.read()
        
        # ファイルサイズがオーバーしてないか
        if len(original_bgm) > ChartFileSize.BGM:
            raise RPException.FileSizeTooLarge()
        
        # 同じファイルかどうか
        if chart.bgm_hash != hashlib.sha1(original_bgm).hexdigest():
            should_upload_bgm = True
            
            # 処理ステータスをリセット
            # （0とのANDを取ることで該当フラグを0にできる）
            chart.conversion_status &= ~ChartConversionStatus.BGM_COMPLETE
    
    if jacket_file is not None:
        # ファイルを読み込む
        original_jacket = await jacket_file.read()
        
        # ファイルサイズがオーバーしてないか
        if len(original_jacket) > ChartFileSize.JACKET:
            raise RPException.FileSizeTooLarge()
        
        # 同じファイルかどうか
        if chart.jacket_hash != hashlib.sha1(original_jacket).hexdigest():
            should_upload_jacket = True
            
            # 処理ステータスをリセット
            # （0とのANDを取ることで該当フラグを0にできる）
            chart.conversion_status &= ~ChartConversionStatus.JACKET_COMPLETE
    
    await session.commit()
    
    if should_upload_chart:
        upload_chart.delay(chart_id, original_chart)
    
    if should_upload_bgm:
        upload_bgm.delay(chart_id, original_bgm, body.start_time)
    
    if should_upload_jacket:
        upload_jacket.delay(chart_id, original_jacket)
    
    # 最後まで処理が正常に終わったら新着通知をする
    if should_notify:
        background_tasks.add_task(
            send_new_chart_notice,
            chart_id,
            user_id
        )