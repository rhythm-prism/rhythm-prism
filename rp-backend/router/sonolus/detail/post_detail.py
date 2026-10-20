from router.sonolus.index import sonolus

from sonolus_models import (
    ServerItemDetails
)

from db.models import (
    PostItem as PostItemDB
)
from db.session import create_session_context
from utils.sonolus.post import to_post_item, get_post_stmt_base



@sonolus.post.detail(ServerItemDetails)
async def post_detail(ctx, name: str):
    
    async with create_session_context() as session:
        
        stmt = get_post_stmt_base()\
                .where(PostItemDB.id == name)
        
        post = (await session.execute(stmt)).scalar()
        post_item = to_post_item(post)
    
    return ServerItemDetails(
        item = post_item,
        description = post_item.description,
        actions = [],
        hasCommunity = False,
        leaderboards = [],
        sections = []
    )