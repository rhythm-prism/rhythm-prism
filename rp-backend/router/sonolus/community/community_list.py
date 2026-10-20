from router.sonolus.index import sonolus

import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemCommunityCommentList
)

from db.session import create_session_context
from db.models import (
    CommunityComment as CommunityCommentDB
)
from utils.sonolus.community import to_community_comment



@sonolus.level.community.comments(ServerItemCommunityCommentList)
async def level_community_comments(ctx, chart_id: str, req: dict):
    
    # ページからオフセットを計算
    page = int(req.get("page", 0))
    offset = 10 * page
    
    async with create_session_context() as session:
        
        stmt = sql\
                .select(sql.func.count())\
                .select_from(CommunityCommentDB)\
                .where(CommunityCommentDB.chart_id == chart_id)
        
        total_comment_count = (await session.execute(stmt)).scalar()
        total_page_count = (total_comment_count + 10 - 1) // 10
        
        stmt = sql\
                .select(CommunityCommentDB)\
                .where(CommunityCommentDB.chart_id == chart_id)\
                .options(joinedload(CommunityCommentDB.author_user))\
                .order_by(sql.desc(CommunityCommentDB.created_at))\
                .offset(offset)\
                .limit(10)
                
        comments = (await session.execute(stmt)).scalars().all()
    
    comments = [
        to_community_comment(comment)
        for comment in comments
    ]
    
    return ServerItemCommunityCommentList(
        pageCount = total_page_count,
        comments = comments
    )