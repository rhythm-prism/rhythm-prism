from router.sonolus.index import sonolus

import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemCommunityInfo
)

from db.session import create_session_context
from db.models import (
    CommunityComment as CommunityCommentDB
)
from const.sonolus.serverform import RPSonolusServerForm
from utils.sonolus.community import to_community_comment



@sonolus.level.community.info(ServerItemCommunityInfo)
async def level_community_info(ctx, chart_id: str):
    
    actions = []
    if ctx.user_session is not None:
        actions.append(
            RPSonolusServerForm.POST_COMMENT
        )

    async with create_session_context() as session:
        stmt = sql\
                .select(CommunityCommentDB)\
                .where(CommunityCommentDB.chart_id == chart_id)\
                .options(
                    joinedload(CommunityCommentDB.author_user)
                )\
                .order_by(sql.desc(CommunityCommentDB.created_at))\
                .limit(5)
        comments = (await session.execute(stmt)).scalars().all()
    
    top_comments = [
        to_community_comment(comment)
        for comment in comments
    ]
    
    return ServerItemCommunityInfo(
        actions = actions,
        topComments = top_comments
    )