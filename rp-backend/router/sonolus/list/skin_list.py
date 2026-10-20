from router.sonolus.index import sonolus

import sqlalchemy as sql
from sonolus_models import (
    ServerItemList,
    SkinItem
)

from db.session import create_session_context
from db.models import (
    SkinItem as SkinItemDB,
)
from utils.sonolus.skin import to_skin_item, get_skin_stmt_base



@sonolus.skin.list(ServerItemList)
async def get_skin_list(ctx, req: list):
    
    # ページからオフセットを計算
    page = int(req.get("page", 0))
    offset = 20 * page
    
    # 返すSkinItemを入れるリスト
    items: list[SkinItem] = []
    
    count_stmt = sql\
                    .select(sql.func.count())\
                    .select_from(SkinItemDB)
    
    base_stmt = get_skin_stmt_base()
    
    # キーワードから検索
    keywords = req.get("keywords")
    if keywords is not None:
        count_stmt = count_stmt.where(
            SkinItemDB.name.icontains(keywords)
        )
        base_stmt = base_stmt.where(
            SkinItemDB.name.icontains(keywords)
        )
        
    async with create_session_context() as session:
        
        total_skin_count = (await session.execute(count_stmt)).scalar()
        total_page_count = (total_skin_count + 20 - 1) // 20
        
        stmt = base_stmt\
                .offset(offset)\
                .limit(20)
        
        skins = (await session.execute(stmt)).scalars().all()
        
        for skin in skins:
            items.append(
                to_skin_item(skin)
            )
        
    ######## searches ########
    searches = []
    
    return ServerItemList(
        pageCount = total_page_count,
        items = items,
        searches = searches
    )