from router.sonolus.index import sonolus

import sqlalchemy as sql
from sonolus_models import (
    ServerItemList,
    UserItem
)

from const.user import UserPermission
from db.session import create_session_context
from db.models import (
    User as UserDB,
)
from utils.sonolus.user import to_user_item, get_user_stmt_base



@sonolus.user.list(ServerItemList)
async def get_user_list(ctx, req: list):
    
    # ページからオフセットを計算
    page = int(req.get("page", 0))
    offset = 20 * page
    
    # 返すLevelItemを入れるリスト
    items: list[UserItem] = []
    
    count_stmt = sql\
                    .select(sql.func.count())\
                    .select_from(UserDB)\
                    .where(UserDB.permission >= UserPermission.NORMAL)\
                    .where(UserDB.sonolus_id.is_not(None))
    
    base_stmt = get_user_stmt_base()
    
    # キーワードから検索
    keywords = req.get("keywords")
    if keywords is not None:
        count_stmt = count_stmt.where(
            UserDB.name.icontains(keywords)
        )
        base_stmt = base_stmt.where(
            UserDB.name.icontains(keywords)
        )
        
    async with create_session_context() as session:
        
        total_user_count = (await session.execute(count_stmt)).scalar()
        total_page_count = (total_user_count + 20 - 1) // 20

        stmt = base_stmt\
                .order_by(sql.desc(UserDB.permission))\
                .offset(offset)\
                .limit(20)
        
        users = (await session.execute(stmt)).scalars().all()
        
        for user in users:
            items.append(
                to_user_item(user)
            )
        
    ######## searches ########
    searches = []
    
    return ServerItemList(
        pageCount = total_page_count,
        items = items,
        searches = searches
    )