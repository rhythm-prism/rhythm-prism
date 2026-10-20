from router.sonolus.index import sonolus

import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemInfo,
    EngineSection,
    PostSection
)

from db.session import create_session_context
from utils.sonolus.announce import get_announce_stmt_base
from utils.sonolus.engine import to_engine_item, get_engine_stmt_base
from utils.sonolus.post import to_post_item



@sonolus.engine.info(ServerItemInfo)
async def get_engine_info(ctx):
    
    async with create_session_context() as session:
        
        ######## creates ########
        creates = []
        
        ######## searches ########
        searches = []
        
        ######## section ########
        sections = []
        
        # お知らせ
        announce_section = PostSection(
            title = "お知らせ",
        )
        
        stmt = get_announce_stmt_base()
        posts = (await session.execute(stmt)).scalars().all()
        
        for post in posts:
            announce_section.items.append(
                to_post_item(post)
            )
            
        if len(posts) != 0:
            sections.append(announce_section)

        # エンジンリスト
        engine_section = EngineSection(
            title = "エンジン"
        )
        
        stmt = get_engine_stmt_base()
                
        engines = (await session.execute(stmt)).scalars().all()
        
        for engine in engines:
            engine_item = to_engine_item(engine)
            engine_section.items.append(engine_item)

        if len(engines) != 0:
            sections.append(engine_section)

        #quickSearchValues
        
        #banner
    
    response = ServerItemInfo(
        
        creates = creates,
        
        searches = searches,
        
        sections = sections,
        
    )
    
    return response