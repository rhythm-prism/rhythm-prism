import io
import asyncio
import hashlib
from compression import zstd
from utils import converter

from const.env import (
    S3_HOST,
    SERVICE_PREFIX
)
from celery_app import celery_app
from schemas.storage import UploadData
from utils.s3utils import upload_s3, delete_s3
from utils.idutils import generate_background_id
from db.models import (
    BackgroundItem as BackgroundItemDB,
    Chart as ChartDB,
    PostItem as PostItemDB
)
from db.session import SessionMakerSync
from assets import sonolus_item_resource
from const.version import SonolusItemVersion
from const.chart import ChartConversionStatus



@celery_app.task(bind=True)
def upload_jacket(self, chart_id: str, jacket: bytes):
    
    session = None
    delete_list = []
    
    try:
        # 変換
        converted_jacket, background = converter.convert_jacket(jacket)
        
        # hashを計算する
        converted_jacket_hash = hashlib.sha1(converted_jacket.getvalue()).hexdigest()
        background_hash =       hashlib.sha1(background.getvalue()).hexdigest()
        
        # key
        converted_jacket_key = "/".join([chart_id, converted_jacket_hash])
        background_key =       "/".join([chart_id, background_hash])
        
        # 各ファイルのURL
        converted_jacket_url = "/".join([S3_HOST, converted_jacket_key])
        background_url =       "/".join([S3_HOST, background_key])
        
        # ファイルをアップロード
        asyncio.run(
            upload_s3([
                UploadData(converted_jacket_key, converted_jacket.getvalue()),
                UploadData(background_key, background.getvalue())
            ])
        )
        
        session = SessionMakerSync()
        
        chart = session.get(ChartDB, chart_id)
        
        # 既にジャケットと背景が存在し、更新を行う場合は更新前のデータを削除対象にする
        if chart.jacket_hash is not None:
            delete_list.append(
                "/".join([chart_id, chart.jacket_hash])
            )
        
        if chart.background_item_id is not None:
            old_background_item = session.get(BackgroundItemDB, chart.background_item_id)
            if old_background_item is not None:
                delete_list.append(
                    "/".join([chart_id, old_background_item.image_hash])
                )
                session.delete(old_background_item)
                session.flush()
            
        # 背景
        background_item_id = "-".join([SERVICE_PREFIX, generate_background_id()])
        background_item = BackgroundItemDB(
            id = background_item_id,
            version = SonolusItemVersion.BACKGROUND_ITEM,
            title = chart.title,
            subtitle = chart.composer,
            author = "RhythmPrism",
            thumbnail_url = converted_jacket_url,
            thumbnail_hash = converted_jacket_hash,
            data_url = sonolus_item_resource.BACKGROUND_DATA_URL,
            data_hash = sonolus_item_resource.BACKGROUND_DATA_HASH,
            image_url = background_url,
            image_hash = background_hash,
            configuration_url = sonolus_item_resource.BACKGROUND_CONFIG_URL,
            configuration_hash = sonolus_item_resource.BACKGROUND_CONFIG_HASH
        )
        session.add(background_item)
        
        # Chartレコードを更新
        chart.background_item_id = background_item_id
        chart.jacket_hash = converted_jacket_hash
        chart.jacket_url = converted_jacket_url
        chart.conversion_status |= ChartConversionStatus.JACKET_COMPLETE

        session.commit()
        session.close()
        session = None
        
        if len(delete_list) != 0:
            asyncio.run(delete_s3(delete_list))
        
    except Exception as ex:
        if session is not None:
            session.rollback()
            
    finally:
        if session is not None:
            session.close()
            

@celery_app.task(bind=True)
def upload_bgm(self, chart_id: str, bgm: bytes, start_time: float = 15.0):
    
    session = None
    delete_list = []
    
    try:
        # 変換
        converted_bgm, preview = converter.convert_bgm(bgm, start_time)

        # hashを計算する
        converted_bgm_hash = hashlib.sha1(converted_bgm.getvalue()).hexdigest()
        preview_hash =       hashlib.sha1(preview.getvalue()).hexdigest()
        
        # key
        converted_bgm_key = "/".join([chart_id, converted_bgm_hash])
        preview_key =       "/".join([chart_id, preview_hash])
        
        # 各ファイルのURL
        converted_bgm_url = "/".join([S3_HOST, converted_bgm_key])
        preview_url =       "/".join([S3_HOST, preview_key])
        
        # ファイルをアップロード
        asyncio.run(
            upload_s3([
                UploadData(converted_bgm_key, converted_bgm.getvalue()),
                UploadData(preview_key, preview.getvalue())
            ])
        )

        session = SessionMakerSync()
        
        chart = session.get(ChartDB, chart_id)
        
        # 既にbgm, previewが存在し、更新を行う場合は更新前のデータを削除対象にする
        if chart.bgm_hash is not None:
            delete_list.append(
                "/".join([chart_id, chart.bgm_hash])
            )
        
        if chart.preview_hash is not None:
            delete_list.append(
                "/".join([chart_id, chart.preview_hash])
            )

        # Chartレコードを更新
        chart.bgm_url = converted_bgm_url
        chart.bgm_hash = converted_bgm_hash
        chart.preview_url = preview_url
        chart.preview_hash = preview_hash
        chart.conversion_status |= ChartConversionStatus.BGM_COMPLETE
        
        session.commit()
        session.close()
        session = None
        
        if len(delete_list) != 0:
            asyncio.run(delete_s3(delete_list))
        
    except Exception as ex:
        if session is not None:
            session.rollback()
        
    finally:
        if session is not None:
            session.close()
            

@celery_app.task(bind=True)
def upload_chart(self, chart_id: str, original_chart: bytes):
    
    session = None
    delete_list = []
    
    try:
        # 変換
        chart_format, level_data = asyncio.run(converter.convert_chart(original_chart))

        # 保存用の原本をzstdで圧縮する（変換には未圧縮の原本を使用）
        compressed_original_chart = zstd.compress(original_chart, level=3)

        # hashを計算する
        original_chart_hash = hashlib.sha1(compressed_original_chart).hexdigest()
        level_data_hash =     hashlib.sha1(level_data.getvalue()).hexdigest()
        
        # key
        original_chart_key = "/".join([chart_id, original_chart_hash])
        level_data_key =     "/".join([chart_id, level_data_hash])
        
        # 各ファイルのURL
        original_chart_url = "/".join([S3_HOST, original_chart_key])
        level_data_url =     "/".join([S3_HOST, level_data_key])
        
        # ファイルをアップロード
        asyncio.run(
            upload_s3([
                UploadData(original_chart_key, compressed_original_chart),
                UploadData(level_data_key, level_data.getvalue())
            ])
        )

        session = SessionMakerSync()
        
        chart = session.get(ChartDB, chart_id)
        
        # 既にchartが存在し、更新を行う場合は更新前のデータを削除対象にする
        if chart.leveldata_hash is not None:
            delete_list.append(
                "/".join([chart_id, chart.leveldata_hash])
            )
            
        if chart.original_chart_hash is not None:
            delete_list.append(
                "/".join([chart_id, chart.original_chart_hash])
            )

        # Chartレコードを更新
        chart.original_chart_url = original_chart_url
        chart.original_chart_hash = original_chart_hash
        chart.leveldata_url = level_data_url
        chart.leveldata_hash = level_data_hash
        chart.chart_format = chart_format
        chart.version = SonolusItemVersion.LEVEL_ITEM,
        chart.conversion_status |= ChartConversionStatus.CHART_COMPLETE
        
        session.commit()
        session.close()
        session = None
        
        if len(delete_list) != 0:
            asyncio.run(delete_s3(delete_list))
        
    except Exception as ex:
        if session is not None:
            session.rollback()
            
    finally:
        if session is not None:
            session.close()


@celery_app.task(bind=True)
def upload_post_thumbnail(self, post_id: str, thumbnail: bytes):
    
    session = None
    delete_list = []
    
    try:
        # 500x500の形に直す
        converted_thumbnail = io.BytesIO()
        converter.prepare_jacket(thumbnail).save(converted_thumbnail, format="PNG", optimize=True)
        
        converted_thumbnail_hash = hashlib.sha1(converted_thumbnail.getvalue()).hexdigest()
        converted_thumbnail_key = "/".join([post_id, converted_thumbnail_hash])
        converted_thumbnail_url = "/".join([S3_HOST, converted_thumbnail_key])
        
        asyncio.run(
            upload_s3([
                UploadData(converted_thumbnail_key, converted_thumbnail.getvalue())
            ])
        )
        
        session = SessionMakerSync()
        
        post = session.get(PostItemDB, post_id)
        
        if post.thumbnail_hash is not None:
            delete_list.append(
                "/".join([post_id, post.thumbnail_hash])
            )
        
        post.thumbnail_url = converted_thumbnail_url
        post.thumbnail_hash = converted_thumbnail_hash
        
        session.commit()
        session.close()
        session = None
        
        if len(delete_list) != 0:
            asyncio.run(delete_s3(delete_list))
        
    except Exception as ex:
        if session is not None:
            session.rollback()
            
    finally:
        if session is not None:
            session.close()


@celery_app.task(bind=True)
def upload_post_banner(self, post_id: str, banner: bytes):
    
    session = None
    delete_list = []
    
    try:
        # 1280x720(16:9)の形に直す
        converted_banner = io.BytesIO()
        converter.prepare_banner(banner).save(converted_banner, format="PNG", optimize=True)
        
        converted_banner_hash = hashlib.sha1(converted_banner.getvalue()).hexdigest()
        converted_banner_key = "/".join([post_id, converted_banner_hash])
        converted_banner_url = "/".join([S3_HOST, converted_banner_key])
        
        asyncio.run(
            upload_s3([
                UploadData(converted_banner_key, converted_banner.getvalue())
            ])
        )
        
        session = SessionMakerSync()
        
        post = session.get(PostItemDB, post_id)
        
        if post.banner_hash is not None:
            delete_list.append(
                "/".join([post_id, post.banner_hash])
            )
        
        post.banner_url = converted_banner_url
        post.banner_hash = converted_banner_hash
        
        session.commit()
        session.close()
        session = None
        
        if len(delete_list) != 0:
            asyncio.run(delete_s3(delete_list))
        
    except Exception as ex:
        if session is not None:
            session.rollback()
            
    finally:
        if session is not None:
            session.close()