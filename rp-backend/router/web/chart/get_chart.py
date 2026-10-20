import json
import hashlib
import base64
import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from typing import Optional, List, Literal
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks, Query
from sonolus_models import (
    SonolusResourceLocator
)

from const.env import (
    S3_HOST
)
from utils.dependencies import get_current_user_id
from utils.exceptions import RPException
from const.chart import MusicGenre, R18Status, CollaboStatus, ChartPublishStatus, ChartDifficulty, ChartFilePublishStatus
from schemas.responses import (
    ChartDetailInfoResponse,
    ChartSimpleInfoResponse, 
    ChartSimpleInfoListResponse,
    ChartEventSimpleInfoResponse,
    ChartTagResponse,
    UserDataSimpleInfoResponse
)
from schemas.storage import UploadData
from db.session import create_session
from db.models import (
    User as UserDB, 
    Chart as ChartDB, 
    Event as EventDB,
    ChartCollaborator as ChartCollaboratorDB, 
    ChartTag as ChartTagDB
)



router = APIRouter()

def decode_cursor(cursor: str) -> tuple[int, str]:
    # a → 譜面公開時刻 or いいね数
    # b → 譜面ID
    a, b = base64.b64decode(cursor).decode().split(",")
    return int(a), b

def encode_cursor(a: int, b: str) -> str:
    cursor = base64.b64encode(f"{str(a)},{b}".encode())
    return cursor.decode()

@router.get("/chart", response_model=ChartDetailInfoResponse)
async def get_chart(
    chart_id: str,
    session: AsyncSession = Depends(create_session)
):
    """
    譜面の詳細情報を返すエンドポイント。
    クエリパラメータで譜面IDを指定する。
    GET /api/chart
    
    【クエリパラメータ】
    ・chart_id → 譜面ID
    """
    
    # 譜面を取得      
    stmt = sql\
            .select(ChartDB)\
            .where(
                ChartDB.is_deleted.is_(False),
                ChartDB.id == chart_id
            )\
            .options(
                selectinload(ChartDB.tags)
                .selectinload(ChartTagDB.tag_master),
                
                selectinload(ChartDB.events),
                
                selectinload(ChartDB.author_user),
                
                selectinload(ChartDB.collaborators)
                .selectinload(ChartCollaboratorDB.user)
            )
    
    chart = (await session.execute(stmt)).scalar()
    
    # もし譜面が取得できなかった場合はNotFound
    if chart is None:
        raise RPException.ChartNotFound()
    
    return ChartDetailInfoResponse(
        id = chart.id,
        rating = chart.rating,
        title = chart.title,
        composer = chart.composer,
        vocal = chart.vocal,
        author = chart.author,
        genre = chart.genre,
        difficulty = chart.difficulty,
        collabo = chart.collabo,
        r18 = chart.r18,
        likes = chart.likes_count,
        firstPublishedAt = chart.first_published_at,
        jacket = SonolusResourceLocator(
            hash = chart.jacket_hash,
            url = chart.jacket_url
        ),
        events = [],
        tags = [],
        authorUser = UserDataSimpleInfoResponse(
            id = chart.author_user.id,
            name = chart.author_user.name,
            iconUrl = chart.author_user.icon_url
        ),
        collaboratorUsers = [
            UserDataSimpleInfoResponse(
                id = c.user_id,
                name = c.user.name,
                iconUrl = c.user.icon_url
            )
            for c in chart.collaborators
        ],
        description = chart.description,
        updatedAt = chart.updated_at,
        originalChart = SonolusResourceLocator(
            hash = chart.original_chart_hash,
            url = chart.original_chart_url
        ) if chart.original_chart_publish_status == ChartFilePublishStatus.PUBLIC else None,
        levelData = SonolusResourceLocator(
            hash = chart.leveldata_hash,
            url = chart.leveldata_url
        ) if chart.leveldata_hash is not None else None,
        bgm = SonolusResourceLocator(
            hash = chart.bgm_hash,
            url = chart.bgm_url
        ) if chart.bgm_hash is not None else None,
        preview = SonolusResourceLocator(
            hash = chart.preview_hash,
            url = chart.preview_url
        ) if chart.preview_hash is not None else None,
        conversionStatus = chart.conversion_status,
        publishStatus = chart.publish_status
    )
    
    
    

@router.get("/chart/search", response_model=ChartSimpleInfoListResponse)
async def search_chart(
    sort_type: Literal["new", "likes"] = "new",
    order: Literal["asc", "desc"] = "desc",
    keywords: str | None = None,
    min_rating: int = 0,
    max_rating: int = 50,
    r18: bool = False,
    collabo: bool = False,
    difficulty_ids: list[ChartDifficulty] = Query(default_factory=list),
    genre_ids: list[MusicGenre] = Query(default_factory=list),
    tag_ids: list[int] = Query(default_factory=list),
    event_ids: list[int] = Query(default_factory=list),
    user_ids: list[str] = Query(default_factory=list),
    cursor: str | None = None,
    limit: int = 20,
    session: AsyncSession = Depends(create_session)
):
    """
    譜面を検索するエンドポイント。
    条件を指定してそれに一致する譜面を複数返す。
    返す譜面の上限は20譜面とする。
    GET /api/chart/search
    
    【クエリパラメータ】
    ・sort_type →       順番のタイプ。new(投稿順) or likes(いいね順)を指定できる。
    ・keywords →        id、タイトル、作曲者、ボーカル、作者名、ユーザー名、イベント名、を対象に検索する
    ・min_rating →      最低難易度レベル
    ・max_rating →      最高難易度レベル
    ・r18 →             r18譜面を表示するか（Trueの場合表示される）
    ・collabo →         対象を合作譜面にするか（Trueの場合対象になる）
    ・difficulty_id →   難易度
    ・genre_id →        ジャンルID
    ・tag_id →          タグID
    ・event_id →        イベントのID
    ・user_id →         ユーザーID
    ・cursor →          前回リクエストしたときに返却されたカーソル
    ・limit →           返す譜面数（20が上限）
    
    【返却データ】
    ・charts →  ChartSimpleInfoResponseのリスト
    ・next →    次の譜面があるか（Trueの場合→有り）
    ・cursor →  次のリクエスト時にどの譜面から返せばいいか判別するためのカーソル
    """
    
    # 譜面数が20以上の場合は20にする
    limit = max(1, min(limit, 20))
    
    # レベルを範囲内にする
    min_rating = min(min_rating, 50)
    max_rating = max(max_rating, 0)
    
    # 
    stmt = sql\
            .select(ChartDB)\
            .where(
                ChartDB.is_deleted.is_(False),
                ChartDB.publish_status == ChartPublishStatus.PUBLIC,
                ChartDB.rating >= min_rating,
                ChartDB.rating <= max_rating
            )\
            .options(
                selectinload(ChartDB.tags)
                .selectinload(ChartTagDB.tag_master),
                
                selectinload(ChartDB.events)
            )\
            .limit(limit)
    
    # 順番 ##############################################################################
    
    match sort_type:
        # 投稿順
        case "new":
            if order == "desc":
                stmt = stmt.order_by(ChartDB.first_published_at.desc(), ChartDB.id.asc())
            else:
                stmt = stmt.order_by(ChartDB.first_published_at.asc(), ChartDB.id.asc())
            
            # カーソルが指定されていた場合は条件に入れる
            if cursor is not None:
                cur_time, cur_id = decode_cursor(cursor)
                
                if order == "desc":
                    stmt = stmt\
                            .where(
                                sql.or_(
                                    ChartDB.first_published_at < cur_time,
                                    sql.and_(
                                        ChartDB.first_published_at == cur_time,
                                        ChartDB.id < cur_id
                                    )
                                )
                            )
                else:
                    stmt = stmt\
                            .where(
                                sql.or_(
                                    ChartDB.first_published_at > cur_time,
                                    sql.and_(
                                        ChartDB.first_published_at == cur_time,
                                        ChartDB.id > cur_id
                                    )
                                )
                            )
        
        # いいね数順
        case "likes":
            if order == "desc":
                stmt = stmt.order_by(ChartDB.likes_count.desc(), ChartDB.id.desc())
            else:
                stmt = stmt.order_by(ChartDB.likes_count.asc(), ChartDB.id.asc())
            
            # カーソルが指定されていた場合は条件に入れる
            if cursor is not None:
                cur_likes, cur_id = decode_cursor(cursor)
                
                if order == "desc":
                    stmt = stmt\
                            .where(
                                sql.or_(
                                    ChartDB.likes_count < cur_likes,
                                    sql.and_(
                                        ChartDB.likes_count == cur_likes,
                                        ChartDB.id < cur_id
                                    )
                                )
                            )
                else:
                    stmt = stmt\
                            .where(
                                sql.or_(
                                    ChartDB.likes_count > cur_likes,
                                    sql.and_(
                                        ChartDB.likes_count == cur_likes,
                                        ChartDB.id > cur_id
                                    )
                                )
                            )

    #####################################################################################
    
    # キーワード ########################################################################

    if keywords is not None:
        stmt = stmt\
                .where(
                    sql.or_(
                        ChartDB.id.icontains(keywords),
                        ChartDB.title.icontains(keywords),
                        ChartDB.composer.icontains(keywords),
                        ChartDB.vocal.icontains(keywords),
                        ChartDB.author.icontains(keywords),
                        ChartDB.author_user.has(UserDB.name.icontains(keywords)),
                        ChartDB.events.any(EventDB.title.icontains(keywords))
                    )
                )

    #####################################################################################
    
    # R18 ###############################################################################

    if r18 == False:
        stmt = stmt\
                .where(ChartDB.r18 == R18Status.SAFE)

    #####################################################################################
    
    # コラボ ############################################################################

    if collabo == True:
        stmt = stmt\
                .where(ChartDB.collabo == CollaboStatus.ENABLE)

    #####################################################################################
    
    # 難易度 ############################################################################

    if len(difficulty_ids) != 0:
            stmt = stmt\
                    .where(
                        sql.or_(*[ChartDB.difficulty == did for did in difficulty_ids])
                    )

    #####################################################################################
    
    # ジャンル ###########################################################################

    if len(genre_ids) != 0:
        stmt = stmt\
                .where(
                    sql.or_(*[ChartDB.genre == gid for gid in genre_ids])
                )

    #####################################################################################
    
    # タグ ##############################################################################

    if len(tag_ids) != 0:
        stmt = stmt\
                .where(
                    sql.or_(*[ChartDB.tags.tag_id == tid for tid in tag_ids])
                )

    #####################################################################################
    
    # イベント ###########################################################################

    if len(event_ids) != 0:
        stmt = stmt\
                .where(
                    sql.or_(*[ChartDB.events.id == eid for eid in event_ids])
                )

    #####################################################################################
    
    # ユーザー ###########################################################################

    if len(user_ids) != 0:
        stmt = stmt\
                .where(
                    sql.or_(*[ChartDB.author_user_id == uid for uid in user_ids])
                )

    #####################################################################################
    
    charts = (await session.execute(stmt)).scalars().all()
    
    next_cursor = ""
    if len(charts) == limit and len(charts) != 0:
        last_chart = charts[-1]
        
        match sort_type:
            case "new":
                next_cursor = encode_cursor(last_chart.first_published_at, last_chart.id)
            case "likes":
                next_cursor = encode_cursor(last_chart.likes_count, last_chart.id)
            case _:
                next_cursor = ""
            
    return_chart_list = []
    for c in charts:
        return_chart_list.append(
            ChartSimpleInfoResponse(
                id = c.id,
                rating = c.rating,
                title = c.title,
                composer = c.composer,
                vocal = c.vocal,
                author = c.author,
                genre = c.genre,
                difficulty = c.difficulty,
                collabo = c.collabo,
                r18 = c.r18,
                likes = c.likes_count,
                firstPublishedAt = c.first_published_at,
                jacket = SonolusResourceLocator(
                    hash = c.jacket_hash,
                    url = c.jacket_url
                ),
                publishStatus = c.publish_status,
                events = [
                    ChartEventSimpleInfoResponse(
                        id = e.id,
                        title = e.title,
                        author = e.author,
                        thumbnail = SonolusResourceLocator(
                            hash = e.thumbnail_hash,
                            url = e.thumbnail_url
                        ),
                        startAt = e.start_at,
                        endAt = e.end_at
                    )
                    for e in c.events
                ],
                tags = [
                    ChartTagResponse(
                        id = t.tag_id,
                        title = t.tag_master.title,
                        icon = t.tag_master.icon,
                        createdAt = t.created_at,
                        updatedAt = t.tag_master.updated_at,
                        createdUserId = t.tag_master.created_user_id
                    )
                    for t in c.tags
                ]
            )
        )

    response = ChartSimpleInfoListResponse(
        charts = return_chart_list,
        next = False if len(charts) != limit else True,
        cursor = next_cursor
    )

    return response



@router.get("/chart/my", response_model=ChartSimpleInfoListResponse)
async def my_chart(
    cursor: str | None = None,
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    自分で投稿した譜面もしくは合作に参加している譜面を返すエンドポイント。
    返す譜面の上限は40譜面とする。
    GET /api/chart/my
    
    【クエリパラメータ】
    ・cursor →          前回リクエストしたときに返却されたカーソル
    ・limit →           返す譜面数（40が上限）
    
    【返却データ】
    ・charts →  ChartSimpleInfoResponseのリスト
    ・next →    次の譜面があるか（Trueの場合→有り）
    ・cursor →  次のリクエスト時にどの譜面から返せばいいか判別するためのカーソル
    """
    
    # ユーザーを取得      
    user = await session.get(UserDB, user_id)
    
    # ユーザーを取得できなかったとき
    if user is None:
        raise RPException.UserNotFound()
    
    # 譜面数が40以上の場合は40にする
    limit = max(1, min(limit, 40))
    
    # 
    stmt = sql\
            .select(ChartDB)\
            .where(
                ChartDB.is_deleted.is_(False),
                sql.or_(
                    ChartDB.author_user_id == user_id,
                    ChartDB.collaborators.any(ChartCollaboratorDB.user_id == user_id)
                )
            )\
            .options(
                selectinload(ChartDB.tags)
                .selectinload(ChartTagDB.tag_master),
                
                selectinload(ChartDB.events)
            )\
            .limit(limit)\
            .order_by(ChartDB.updated_at.desc())

    #####################################################################################
    
    # カーソルが指定されていた場合は条件に入れる
    if cursor is not None:
        cur_time, cur_id = decode_cursor(cursor)

        stmt = stmt\
                .where(
                    sql.or_(
                        ChartDB.updated_at < cur_time,
                        sql.and_(
                            ChartDB.updated_at == cur_time,
                            ChartDB.id < cur_id
                        )
                    )
                )

    #####################################################################################
    
    charts = (await session.execute(stmt)).scalars().all()
    
    next_cursor = ""
    if len(charts) == limit and len(charts) != 0:
        last_chart = charts[-1]
        next_cursor = encode_cursor(last_chart.updated_at, last_chart.id)
            
    return_chart_list = []
    for c in charts:
        return_chart_list.append(
            ChartSimpleInfoResponse(
                id = c.id,
                rating = c.rating,
                title = c.title,
                composer = c.composer,
                vocal = c.vocal,
                author = c.author,
                genre = c.genre,
                difficulty = c.difficulty,
                collabo = c.collabo,
                r18 = c.r18,
                likes = c.likes_count,
                jacket = SonolusResourceLocator(
                    hash = c.jacket_hash,
                    url = c.jacket_url
                ),
                publishStatus = c.publish_status,
                events = [
                    ChartEventSimpleInfoResponse(
                        id = e.id,
                        title = e.title,
                        author = e.author,
                        thumbnail = SonolusResourceLocator(
                            hash = e.thumbnail_hash,
                            url = e.thumbnail_url
                        ),
                        startAt = e.start_at,
                        endAt = e.end_at
                    )
                    for e in c.events
                ],
                tags = [
                    ChartTagResponse(
                        id = t.tag_id,
                        title = t.tag_master.title,
                        icon = t.tag_master.icon,
                        createdAt = t.created_at,
                        updatedAt = t.tag_master.updated_at,
                        createdUserId = t.tag_master.created_user_id
                    )
                    for t in c.tags
                ]
            )
        )
    
    response = ChartSimpleInfoListResponse(
        charts = return_chart_list,
        next = False if len(charts) != limit else True,
        cursor = next_cursor
    )
    
    return response