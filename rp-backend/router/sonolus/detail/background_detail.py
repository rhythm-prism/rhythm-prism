from router.sonolus.index import sonolus

from sonolus_models import (
    ServerItemDetails
)

from db.session import create_session_context
from db.models import (
    BackgroundItem as BackgroundItemDB
)
from utils.sonolus.background import to_background_item, get_background_stmt_base



@sonolus.background.detail(ServerItemDetails)
async def background_detail(ctx, name: str):
    
    async with create_session_context() as session:
        
        stmt = get_background_stmt_base()\
                .where(BackgroundItemDB.id == name)

        background = (await session.execute(stmt)).scalar()     
        background_item = to_background_item(background)
    
    return ServerItemDetails(
        item = background_item,
        actions = [],
        hasCommunity = False,
        leaderboards = [],
        sections = []
    )