from router.sonolus.index import sonolus

import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemInfo,
    EffectSection,
    PostSection
)

from db.session import create_session_context
from utils.sonolus.announce import get_announce_stmt_base
from utils.sonolus.effect import to_effect_item, get_effect_stmt_base
from utils.sonolus.post import to_post_item



@sonolus.effect.info(ServerItemInfo)
async def get_effect_info(ctx):
    
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

        # SEリスト
        effect_section = EffectSection(
            title = "SE"
        )
        
        stmt = get_effect_stmt_base()
                
        effects = (await session.execute(stmt)).scalars().all()
        
        for effect in effects:
            effect_item = to_effect_item(effect)
            effect_section.items.append(effect_item)

        if len(effects) != 0:
            sections.append(effect_section)

        #quickSearchValues
        
        #banner
    
    response = ServerItemInfo(
        
        creates = creates,
        
        searches = searches,
        
        sections = sections,
        
    )
    
    return response