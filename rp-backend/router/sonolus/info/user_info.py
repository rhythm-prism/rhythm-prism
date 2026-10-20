from router.sonolus.index import sonolus

import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemInfo,
    UserSection,
    PostSection
)

from const.user import UserPermission
from db.session import create_session_context
from db.models import (
    User as UserDB
)
from utils.sonolus.announce import get_announce_stmt_base
from utils.sonolus.user import to_user_item, get_user_stmt_base
from utils.sonolus.post import to_post_item



@sonolus.user.info(ServerItemInfo)
async def get_user_info(ctx):
    
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

        # ユーザーリスト
        administrator_section = UserSection(
            title = "管理者"
        )
        
        moderator_section = UserSection(
            title = "モデレーター"
        )
        
        charter_section = UserSection(
            title = "作者"
        )
        
        stmt = get_user_stmt_base()\
                .order_by(sql.desc(UserDB.permission))\
                .limit(20)
                
        users = (await session.execute(stmt)).scalars().all()
        
        for user in users:
            user_item = to_user_item(user)
            match user.permission:
                case UserPermission.ADMINISTRATOR:
                    administrator_section.items.append(user_item)
                case UserPermission.MODERATOR:
                    moderator_section.items.append(user_item)
                case UserPermission.CHARTER:
                    charter_section.items.append(user_item)
                case _:
                    pass
        
        if len(users) != 0:
            sections.extend([
                administrator_section,
                moderator_section,
                charter_section
            ])
        
        #quickSearchValues
        
        #banner
    
    response = ServerItemInfo(
        
        creates = creates,
        
        searches = searches,
        
        sections = sections,
        
    )
    
    return response