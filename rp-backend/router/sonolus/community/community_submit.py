from router.sonolus.index import sonolus

import sqlalchemy as sql
from urllib.parse import parse_qs
from sonolus_models import (
    ServerSubmitItemCommunityActionResponse
)

from db.session import create_session_context
from db.models import (
    User as UserDB,
    CommunityComment as CommunityCommentDB
)
from utils.exceptions import RPException
from utils.idutils import generate_comment_id, decode_sonolus_session_id



@sonolus.level.community.actions(ServerSubmitItemCommunityActionResponse)
async def level_community_actions(ctx, chart_id: str, req):
    
    if ctx.user_session is None:
        raise RPException.RequiredSonolusLogin()
    
    content = parse_qs(req["values"])["content"][0]
    if len(content) > 500:
        raise RPException.ValidationError()
    
    author_user_id = decode_sonolus_session_id(ctx.user_session)
    
    async with create_session_context() as session:
        
        author_user = await session.get(UserDB, author_user_id)
        
        comment = CommunityCommentDB(
            id = generate_comment_id(),
            chart_id = chart_id,
            author = author_user.name,
            author_user_id = author_user.id,
            content = content
        )
        
        session.add(comment)
        
        await session.commit()
    
    response = ServerSubmitItemCommunityActionResponse(
        key = "aaaa",
        hashes=[],
        shouldUpdateCommunity = True,
        shouldUpdateComments = True
    )
        
    return response
