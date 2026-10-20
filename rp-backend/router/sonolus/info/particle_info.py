from router.sonolus.index import sonolus

import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemInfo,
    ParticleSection,
    PostSection
)

from db.session import create_session_context
from utils.sonolus.announce import get_announce_stmt_base
from utils.sonolus.particle import to_particle_item, get_particle_stmt_base
from utils.sonolus.post import to_post_item



@sonolus.particle.info(ServerItemInfo)
async def get_particle_info(ctx):
    
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

        # パーティクルリスト
        particle_section = ParticleSection(
            title = "パーティクル"
        )
        
        stmt = get_particle_stmt_base()
                
        particles = (await session.execute(stmt)).scalars().all()
        
        for particle in particles:
            particle_item = to_particle_item(particle)
            particle_section.items.append(particle_item)

        if len(particles) != 0:
            sections.append(particle_section)

        #quickSearchValues
        
        #banner
    
    response = ServerItemInfo(
        
        creates = creates,
        
        searches = searches,
        
        sections = sections,
        
    )
    
    return response