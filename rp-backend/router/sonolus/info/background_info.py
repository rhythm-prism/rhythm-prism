from router.sonolus.index import sonolus

import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemInfo,
    BackgroundSection,
    PostSection
)

from db.session import create_session_context
from utils.sonolus.announce import get_announce_stmt_base
from utils.sonolus.background import to_background_item, get_background_stmt_base
from utils.sonolus.post import to_post_item
from utils.idutils import decode_sonolus_session_id
from const.chart import ChartPublishStatus
from db.models import (
    User as UserDB,
    Chart as ChartDB,
    BackgroundItem as BackgroundItemDB
)



@sonolus.background.info(ServerItemInfo)
async def get_background_info(ctx):
    
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
            
        # 自分の譜面の背景
        # ログインしているときに表示
        if ctx.user_session is not None:
            # 自分の非公開譜面背景セクション
            private_background_section = BackgroundSection(
                title = "非公開"
            )
            
            # ユーザーを取得
            user_id = decode_sonolus_session_id(ctx.user_session)
            user = await session.get(UserDB, user_id)
            
            # 自分の非公開譜面の背景を取得
            stmt = get_background_stmt_base()\
                        .options(joinedload(BackgroundItemDB.chart))\
                        .where(BackgroundItemDB.chart.has(ChartDB.author_user_id == user.id))\
                        .where(BackgroundItemDB.chart.has(ChartDB.publish_status == ChartPublishStatus.PRIVATE))\
                        .order_by(sql.desc(BackgroundItemDB.created_at))\
                        .limit(10)
            private_backgrounds = (await session.execute(stmt)).scalars().all()
            
            # セクションに追加
            private_background_section.items.extend([
                to_background_item(private_background)
                for private_background in private_backgrounds
            ])
            
            if len(private_backgrounds) != 0:
                sections.append(private_background_section)

        # 背景リスト
        background_section = BackgroundSection(
            title = "背景"
        )
        
        stmt = get_background_stmt_base()\
                        .options(joinedload(BackgroundItemDB.chart))\
                        .where(BackgroundItemDB.chart.has(ChartDB.publish_status == ChartPublishStatus.PUBLIC))\
                        .order_by(sql.desc(BackgroundItemDB.created_at))\
                        .limit(20)
                
        backgrounds = (await session.execute(stmt)).scalars().all()
        
        for background in backgrounds:
            background_item = to_background_item(background)
            background_section.items.append(background_item)

        if len(backgrounds) != 0:
            sections.append(background_section)

        #quickSearchValues
        
        #banner
    
    response = ServerItemInfo(
        
        creates = creates,
        
        searches = searches,
        
        sections = sections,
        
    )
    
    return response