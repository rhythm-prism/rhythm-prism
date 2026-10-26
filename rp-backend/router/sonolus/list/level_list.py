from router.sonolus.index import sonolus

import sqlalchemy as sql
from sonolus_models import (
    ServerItemList,
    LevelItem
)

from const.chart import ChartPublishStatus, R18Status
from const.sonolus.serverform import RPSonolusServerForm
from db.session import create_session_context
from db.models import (
    User as UserDB,
    Chart as ChartDB
)
from utils.sonolus.level import to_level_item, get_level_stmt_base



@sonolus.level.list(ServerItemList)
async def get_level_list(ctx, req: dict):
    
    # ページからオフセットを計算
    page = int(req.get("page", 0))
    offset = 20 * page
    
    # 返すLevelItemを入れるリスト
    items: list[LevelItem] = []
    
    count_stmt = sql\
                    .select(sql.func.count())\
                    .select_from(ChartDB)\
                    .where(ChartDB.is_deleted.is_(False))

    #
    base_stmt = get_level_stmt_base()\
                    .where(ChartDB.publish_status == ChartPublishStatus.PUBLIC)
    
    # キーワードから検索
    keywords = req.get("keywords")
    if keywords is not None:
        count_stmt = count_stmt.where(
            sql.or_(
                ChartDB.id.icontains(keywords),
                ChartDB.title.icontains(keywords),
                ChartDB.composer.icontains(keywords),
                ChartDB.vocal.icontains(keywords),
                ChartDB.author.icontains(keywords),
                ChartDB.author_user.has(UserDB.name.icontains(keywords))
            )
        )
        base_stmt = base_stmt.where(
            sql.or_(
                ChartDB.id.icontains(keywords),
                ChartDB.title.icontains(keywords),
                ChartDB.composer.icontains(keywords),
                ChartDB.vocal.icontains(keywords),
                ChartDB.author.icontains(keywords),
                ChartDB.author_user.has(UserDB.name.icontains(keywords))
            )
        )
    
    # タイトルから検索
    title = req.get("title")
    if title is not None:
        count_stmt = count_stmt.where(ChartDB.title.icontains(title))
        base_stmt = base_stmt.where(ChartDB.title.icontains(title))
        
    # 作曲者から検索
    composer = req.get("composer")
    if composer is not None:
        count_stmt = count_stmt.where(ChartDB.composer.icontains(composer))
        base_stmt = base_stmt.where(ChartDB.composer.icontains(composer))
        
    # 歌唱者から検索
    vocal = req.get("vocal")
    if vocal is not None:
        count_stmt = count_stmt.where(ChartDB.vocal.icontains(vocal))
        base_stmt = base_stmt.where(ChartDB.vocal.icontains(vocal))
        
    # 表示名から検索
    author_name = req.get("author_name")
    if author_name is not None:
        count_stmt = count_stmt.where(ChartDB.author.icontains(author_name))
        base_stmt = base_stmt.where(ChartDB.author.icontains(author_name))
        
    # ハンドルから検索
    handle = req.get("author_handle")
    if handle is not None:
        count_stmt = count_stmt.where(
            ChartDB.author_user.has(UserDB.sonolus_handle == handle)
        )
        base_stmt = base_stmt.where(
            ChartDB.author_user.has(UserDB.sonolus_handle == handle)
        )
        
    # 難易度から検索
    rating = req.get("rating")
    if rating is not None:
        rating = int(rating)
        count_stmt = count_stmt.where(ChartDB.rating == rating)
        base_stmt = base_stmt.where(ChartDB.rating == rating)
    
    # R18タグがある譜面を検索に含めるか
    enable_r18 = req.get("r18", False)
    if not enable_r18:
        # 含めないとき
        count_stmt = count_stmt.where(ChartDB.r18 == R18Status.SAFE)
        base_stmt = base_stmt.where(ChartDB.r18 == R18Status.SAFE)
    
    # ジャンルから検索
    genres = req.get("genre")
    if genres is not None:
        genres = genres.split(",")
        count_stmt = count_stmt.where(ChartDB.genre.in_(genres))
        base_stmt = base_stmt.where(ChartDB.genre.in_(genres))
    
    async with create_session_context() as session:
        
        total_chart_count = (await session.execute(count_stmt)).scalar()
        total_page_count = (total_chart_count + 20 - 1) // 20

        stmt = base_stmt.order_by(sql.desc(ChartDB.first_published_at))\
                        .offset(offset)\
                        .limit(20)
        
        charts = (await session.execute(stmt)).scalars().all()
        
        for chart in charts:
            items.append(
                to_level_item(chart)
            )
        
    ######## searches ########
    searches = []
    
    searches.append(
        RPSonolusServerForm.SEARCH_LEVEL
    )
        
    return ServerItemList(
        pageCount = total_page_count,
        items = items,
        searches = searches
    )