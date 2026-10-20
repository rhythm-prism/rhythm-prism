from router.sonolus.index import sonolus

import sqlalchemy as sql
from sonolus_models import (
    ServerItemList,
    EffectItem
)

from db.session import create_session_context
from db.models import (
    EffectItem as EffectItemDB,
)
from utils.sonolus.effect import to_effect_item, get_effect_stmt_base



@sonolus.effect.list(ServerItemList)
async def get_effect_list(ctx, req: list):
    
    # ページからオフセットを計算
    page = int(req.get("page", 0))
    offset = 20 * page
    
    # 返すSkinItemを入れるリスト
    items: list[EffectItem] = []
    
    count_stmt = sql\
                    .select(sql.func.count())\
                    .select_from(EffectItemDB)
    
    base_stmt = get_effect_stmt_base()
    
    # キーワードから検索
    keywords = req.get("keywords")
    if keywords is not None:
        count_stmt = count_stmt.where(
            EffectItemDB.name.icontains(keywords)
        )
        base_stmt = base_stmt.where(
            EffectItemDB.name.icontains(keywords)
        )
        
    async with create_session_context() as session:
        
        total_effect_count = (await session.execute(count_stmt)).scalar()
        total_page_count = (total_effect_count + 20 - 1) // 20
        
        stmt = base_stmt\
                .offset(offset)\
                .limit(20)
        
        effects = (await session.execute(stmt)).scalars().all()
        
        for effect in effects:
            items.append(
                to_effect_item(effect)
            )
        
    ######## searches ########
    searches = []
    
    return ServerItemList(
        pageCount = total_page_count,
        items = items,
        searches = searches
    )