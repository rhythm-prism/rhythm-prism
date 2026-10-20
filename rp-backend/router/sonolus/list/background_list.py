from router.sonolus.index import sonolus

import sqlalchemy as sql
from sonolus_models import (
    ServerItemList,
    BackgroundItem
)

from db.session import create_session_context
from db.models import (
    BackgroundItem as BackgroundItemDB,
)
from utils.sonolus.background import to_background_item, get_background_stmt_base



@sonolus.background.list(ServerItemList)
async def get_background_list(ctx, req: list):
    
    # ページからオフセットを計算
    page = int(req.get("page", 0))
    offset = 20 * page
    
    # 返すSkinItemを入れるリスト
    items: list[BackgroundItem] = []
    
    count_stmt = sql\
                    .select(sql.func.count())\
                    .select_from(BackgroundItemDB)
    
    base_stmt = get_background_stmt_base()
    
    # キーワードから検索
    keywords = req.get("keywords")
    if keywords is not None:
        count_stmt = count_stmt.where(
            BackgroundItemDB.name.icontains(keywords)
        )
        base_stmt = base_stmt.where(
            BackgroundItemDB.name.icontains(keywords)
        )
        
        
    async with create_session_context() as session:
        
        total_background_count = (await session.execute(count_stmt)).scalar()
        total_page_count = (total_background_count + 20 - 1) // 20        
        
        stmt = base_stmt\
                .offset(offset)\
                .limit(20)
        
        backgrounds = (await session.execute(stmt)).scalars().all()
        
        for background in backgrounds:
            items.append(
                to_background_item(background)
            )
        
    ######## searches ########
    searches = []
    
    return ServerItemList(
        pageCount = total_page_count,
        items = items,
        searches = searches
    )