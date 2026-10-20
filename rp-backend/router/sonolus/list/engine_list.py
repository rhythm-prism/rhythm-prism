from router.sonolus.index import sonolus

import sqlalchemy as sql
from sonolus_models import (
    ServerItemList,
    EngineItem
)

from db.session import create_session_context
from db.models import (
    EngineItem as EngineItemDB,
)
from utils.sonolus.engine import to_engine_item, get_engine_stmt_base



@sonolus.engine.list(ServerItemList)
async def get_engine_list(ctx, req: list):
    
    # ページからオフセットを計算
    page = int(req.get("page", 0))
    offset = 20 * page
    
    # 返すEngineItemを入れるリスト
    items: list[EngineItem] = []
    
    count_stmt = sql\
                    .select(sql.func.count())\
                    .select_from(EngineItemDB)
    
    base_stmt = get_engine_stmt_base()
    
    # キーワードから検索
    keywords = req.get("keywords")
    if keywords is not None:
        count_stmt = count_stmt.where(
            EngineItemDB.name.icontains(keywords)
        )
        base_stmt = base_stmt.where(
            EngineItemDB.name.icontains(keywords)
        )
        
    async with create_session_context() as session:
        
        total_engine_count = (await session.execute(count_stmt)).scalar()
        total_page_count = (total_engine_count + 20 - 1) // 20

        stmt = base_stmt\
                .offset(offset)\
                .limit(20)
        
        engines = (await session.execute(stmt)).scalars().all()
        
        for engine in engines:
            items.append(
                to_engine_item(engine)
            )
        
    ######## searches ########
    searches = []
    
    return ServerItemList(
        pageCount = total_page_count,
        items = items,
        searches = searches
    )