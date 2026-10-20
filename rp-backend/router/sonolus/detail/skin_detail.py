from router.sonolus.index import sonolus

from sonolus_models import (
    ServerItemDetails
)

from db.session import create_session_context
from db.models import (
    SkinItem as SkinItemDB
)
from utils.sonolus.skin import to_skin_item, get_skin_stmt_base



@sonolus.skin.detail(ServerItemDetails)
async def skin_detail(ctx, name: str):
    
    async with create_session_context() as session:
        
        stmt = get_skin_stmt_base()\
                .where(SkinItemDB.id == name)

        skin = (await session.execute(stmt)).scalar()     
        skin_item = to_skin_item(skin)
    
    return ServerItemDetails(
        item = skin_item,
        actions = [],
        hasCommunity = False,
        leaderboards = [],
        sections = []
    )