from router.sonolus.index import sonolus

import sqlalchemy as sql
from sonolus_models import (
    ServerItemList,
    ParticleItem
)

from db.session import create_session_context
from db.models import (
    ParticleItem as ParticleItemDB,
)
from utils.sonolus.particle import to_particle_item, get_particle_stmt_base



@sonolus.particle.list(ServerItemList)
async def get_particle_list(ctx, req: list):
    
    # ページからオフセットを計算
    page = int(req.get("page", 0))
    offset = 20 * page
    
    # 返すSkinItemを入れるリスト
    items: list[ParticleItem] = []
    
    count_stmt = sql\
                    .select(sql.func.count())\
                    .select_from(ParticleItemDB)
    
    base_stmt = get_particle_stmt_base()
    
    # キーワードから検索
    keywords = req.get("keywords")
    if keywords is not None:
        count_stmt = count_stmt.where(
            ParticleItemDB.name.icontains(keywords)
        )
        base_stmt = base_stmt.where(
            ParticleItemDB.name.icontains(keywords)
        )
        
    async with create_session_context() as session:
        
        total_particle_count = (await session.execute(count_stmt)).scalar()
        total_page_count = (total_particle_count + 20 - 1) // 20
        
        stmt = base_stmt\
                .offset(offset)\
                .limit(20)
        
        particles = (await session.execute(stmt)).scalars().all()
        
        for particle in particles:
            items.append(
                to_particle_item(particle)
            )
        
    ######## searches ########
    searches = []
    
    return ServerItemList(
        pageCount = total_page_count,
        items = items,
        searches = searches
    )