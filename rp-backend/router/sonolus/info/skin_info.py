from router.sonolus.index import sonolus

import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemInfo,
    SkinSection,
    PostSection
)

from db.session import create_session_context
from utils.sonolus.announce import get_announce_stmt_base
from utils.sonolus.skin import to_skin_item, get_skin_stmt_base
from utils.sonolus.post import to_post_item



@sonolus.skin.info(ServerItemInfo)
async def get_skin_info(ctx):
    
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

        # スキンリスト
        skin_section = SkinSection(
            title = "スキン"
        )
        
        stmt = get_skin_stmt_base()
                
        skins = (await session.execute(stmt)).scalars().all()
        
        for skin in skins:
            skin_item = to_skin_item(skin)
            skin_section.items.append(skin_item)

        if len(skins) != 0:
            sections.append(skin_section)

        #quickSearchValues
        
        #banner
    
    response = ServerItemInfo(
        
        creates = creates,
        
        searches = searches,
        
        sections = sections,
        
    )
    
    return response