from router.sonolus.index import sonolus

import asyncio
import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemInfo,
    PostSection,
    LevelSection
)

from utils.redis import redis_client
from const.chart import ChartPublishStatus
from const.sonolus.serverform import RPSonolusServerForm
from const.redis import (
    SONOLUS_ANNOUNCE_CACHE_KEY,
    SONOLUS_ANNOUNCE_CACHE_TTL,
    SONOLUS_NEW_LEVEL_TOP_CACHE_KEY,
    SONOLUS_NEW_LEVEL_TOP_CACHE_TTL
)
from db.session import create_session_context
from db.models import (
    User as UserDB,
    Chart as ChartDB
)
from utils.sonolus.announce import get_announce_stmt_base
from utils.sonolus.level import to_level_item, get_level_stmt_base
from utils.sonolus.post import to_post_item
from utils.idutils import decode_sonolus_session_id



@sonolus.level.info(ServerItemInfo)
async def get_level_info(ctx):
    
    async with create_session_context() as session:
        
        ######## creates ########
        creates = []
        
        ######## searches ########
        searches = []
        
        searches.append(
            RPSonolusServerForm.SEARCH_LEVEL
        )
        
        ######## section ########
        sections = []

        announce_cache, new_level_cache = await asyncio.gather(
            redis_client.get(SONOLUS_ANNOUNCE_CACHE_KEY),
            redis_client.get(SONOLUS_NEW_LEVEL_TOP_CACHE_KEY),
        )

        # お知らせ
        if announce_cache is not None:
            announce_section = PostSection.model_validate_json(announce_cache)
        else:
            announce_section = PostSection(
                title = "お知らせ",
            )
            
            stmt = get_announce_stmt_base()
            posts = (await session.execute(stmt)).scalars().all()

            announce_section.items.extend([
                to_post_item(post)
                for post in posts
            ])
            
            await redis_client.set(
                SONOLUS_ANNOUNCE_CACHE_KEY,
                announce_section.model_dump_json(),
                ex=SONOLUS_ANNOUNCE_CACHE_TTL
            )
                
        if len(announce_section.items) != 0:
            sections.append(announce_section)
            
        # 自分の譜面
        # ログインしているときに表示
        if ctx.user_session is not None:
            # 自分の非公開譜面セクション
            private_level_section = LevelSection(
                title = "非公開"
            )
            
            # ユーザーを取得
            user_id = decode_sonolus_session_id(ctx.user_session)
            user = await session.get(UserDB, user_id)
            
            # 自分の非公開譜面を取得
            stmt = get_level_stmt_base()\
                        .where(ChartDB.author_user_id == user.id)\
                        .where(ChartDB.publish_status == ChartPublishStatus.PRIVATE)\
                        .order_by(sql.desc(ChartDB.created_at))\
                        .limit(10)
            prvate_levels = (await session.execute(stmt)).scalars().all()
            
            # セクションに追加
            private_level_section.items.extend([
                to_level_item(private_level)
                for private_level in prvate_levels
            ])
            
            if len(private_level_section.items) != 0:
                sections.append(private_level_section)
                
        # 新着譜面
        if new_level_cache is not None:
            new_level_section = LevelSection.model_validate_json(new_level_cache)
        else:
            new_level_section = LevelSection(
                title = "新着譜面"
            )
            
            stmt = get_level_stmt_base()\
                    .where(ChartDB.publish_status == ChartPublishStatus.PUBLIC)\
                    .order_by(sql.desc(ChartDB.first_published_at))\
                    .limit(20)\
                    
            charts = (await session.execute(stmt)).scalars().all()

            new_level_section.items.extend([
                to_level_item(chart)
                for chart in charts
            ])
            
            await redis_client.set(
                SONOLUS_NEW_LEVEL_TOP_CACHE_KEY,
                new_level_section.model_dump_json(),
                ex=SONOLUS_NEW_LEVEL_TOP_CACHE_TTL
            )
        
        if len(new_level_section.items) != 0:
            sections.append(new_level_section)

        #quickSearchValues
        
        #banner
    
    response = ServerItemInfo(
        
        creates = creates,
        
        searches = searches,
        
        sections = sections,
        
    )
    
    return response