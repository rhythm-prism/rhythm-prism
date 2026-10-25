import json
import hashlib
import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import TypeAdapter
from typing import Optional
from fastapi import APIRouter, Depends, Form, UploadFile, File
from sonolus_models import (
    SonolusResourceLocator
)

from utils.redis import redis_client
from const.env import (
    S3_HOST,
    SERVICE_PREFIX
)
from const.user import UserPermission
from const.post import PostFileSize
from const.redis import (
    ANNOUNCE_CACHE_KEY,
    ANNOUNCE_CACHE_TTL
)
from db.models import (
    User as UserDB,
    PostItem as PostItemDB
)
from db.session import create_session
from schemas.requests import AnnouncePostRequest, AnnounceEditRequest
from schemas.responses import AnnounceInfoResponse, AnnounceInfoListResponse, UserDataSimpleInfoResponse
from utils.convert_tasks import upload_post_thumbnail, upload_post_banner
from utils.dependencies import get_current_user_id
from utils.exceptions import RPException
from utils.idutils import generate_post_id
from utils.s3utils import delete_s3

AnnounceListAdapter = TypeAdapter(list[AnnounceInfoResponse])



router = APIRouter()

@router.get("/announce", response_model=AnnounceInfoListResponse)
async def get_announce(
    session: AsyncSession = Depends(create_session)
):
    """
    お知らせを取得する。
    GET /api/announce
    """
    
    announce_cache = await redis_client.get(ANNOUNCE_CACHE_KEY)
    announce_list = []
    
    if announce_cache is not None:
        announce_list.extend(
            AnnounceListAdapter.validate_json(announce_cache, by_alias=True, by_name=True)
        )
    else:
        stmt = sql.select(PostItemDB)\
                .where(PostItemDB.is_pinned == True)\
                .order_by(PostItemDB.updated_at.desc())\
                .options(
                    joinedload(PostItemDB.author_user)
                )
        
        announce = (await session.execute(stmt)).scalars().all()

        announce_list.extend([
            AnnounceInfoResponse(
                id=a.id,
                title=a.title,
                subtitle=a.subtitle,
                displayName=a.author,
                authorUser=UserDataSimpleInfoResponse(
                    id=a.author_user.id,
                    name=a.author_user.name,
                    iconUrl=a.author_user.icon_url    
                ),
                description=a.description,
                thumbnail=SonolusResourceLocator(
                    hash=a.thumbnail_hash,
                    url=a.thumbnail_url
                ),
                banner=SonolusResourceLocator(
                    hash=a.banner_hash,
                    url=a.banner_url
                ),
                createdAt=a.created_at
            )
            for a in announce
        ])
        
        await redis_client.set(
            ANNOUNCE_CACHE_KEY,
            AnnounceListAdapter.dump_json(announce_list),
            ex=ANNOUNCE_CACHE_TTL
        )

    return AnnounceInfoListResponse(
        announcements=announce_list
    )
    

@router.post("/announce")
async def post_announce(
    data: str = Form(...),
    thumbnail_file: UploadFile = File(...),
    banner_file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    お知らせを投稿する。
    POST /api/announce
    """
    
    body = AnnouncePostRequest(**json.loads(data))
    
    original_thumbnail = await thumbnail_file.read()
    original_banner = await banner_file.read()
    
    if (
        len(original_thumbnail) > PostFileSize.THUMBNAIL or
        len(original_banner) > PostFileSize.BANNER
    ):
        raise RPException.FileSizeTooLarge()
    
    user = await session.get(UserDB, user_id)
    if user is None:
        raise RPException.UserNotFound()
    elif user.permission < UserPermission.MODERATOR:
        raise RPException.NoPermission()
    
    post_id = "-".join([SERVICE_PREFIX, generate_post_id()])
    
    post_item = PostItemDB(
        id = post_id,
        title = body.title,
        subtitle = body.subtitle,
        author = body.display_name,
        author_user_id = user.id,
        description = body.description,
        is_pinned = True
    )
    
    session.add(post_item)
    await session.commit()
    
    upload_post_thumbnail.delay(post_id, original_thumbnail)
    upload_post_banner.delay(post_id, original_banner)
    
    return post_id


@router.put("/announce")
async def put_announce(
    post_id: str,
    data: Optional[str] = Form(None),
    thumbnail_file: Optional[UploadFile] = File(None),
    banner_file: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    お知らせを編集する。
    PUT /api/announce
    """
    
    body = AnnounceEditRequest(**json.loads(data)) if data is not None else None
    
    user = await session.get(UserDB, user_id)
    if user is None:
        raise RPException.UserNotFound()
    elif user.permission < UserPermission.MODERATOR:
        raise RPException.NoPermission()
    
    post = await session.get(PostItemDB, post_id)
    if post is None:
        raise RPException.PostNotFound()
    elif not post.is_pinned:
        raise RPException.NoPostTypeAnnounce()
    
    should_upload_thumbnail = False
    should_upload_banner = False
    
    if thumbnail_file is not None:
        original_thumbnail = await thumbnail_file.read()
        
        if len(original_thumbnail) > PostFileSize.THUMBNAIL:
            raise RPException.FileSizeTooLarge()

        should_upload_thumbnail = True
        
    if banner_file is not None:
        original_banner = await banner_file.read()
        
        if len(original_banner) > PostFileSize.BANNER:
            raise RPException.FileSizeTooLarge()

        should_upload_banner = True
    
    if body is not None:
        if body.title is not None:
            post.title = body.title

        if body.subtitle is not None:
            post.subtitle = body.subtitle

        if body.display_name is not None:
            post.author = body.display_name
        
        if body.description is not None:
            post.description = body.description
    
    await session.commit()
    
    if should_upload_thumbnail:
        upload_post_thumbnail.delay(post_id, original_thumbnail)
    
    if should_upload_banner:
        upload_post_banner.delay(post_id, original_banner)


@router.delete("/announce")
async def delete_announce(
    post_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    お知らせを削除する
    DELETE /api/announce
    """
    
    user = await session.get(UserDB, user_id)
    if user is None:
        raise RPException.UserNotFound()
    elif user.permission < UserPermission.MODERATOR:
        raise RPException.NoPermission()
    
    post = await session.get(PostItemDB, post_id)
    if post is None:
        raise RPException.PostNotFound()
    elif not post.is_pinned:
        raise RPException.NoPostTypeAnnounce()
    
    # サムネ、バナーを削除
    delete_file_list = []
    
    if post.thumbnail_hash is not None:
        delete_file_list.append("/".join([post_id, post.thumbnail_hash]))
    
    if post.banner_hash is not None:
        delete_file_list.append("/".join([post_id, post.banner_hash]))
        
    # レコードを削除
    await session.delete(post)
    
    await session.commit()        
    
    await delete_s3(delete_file_list)