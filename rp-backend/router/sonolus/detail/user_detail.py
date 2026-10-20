from router.sonolus.index import sonolus

from sonolus_models import (
    ServerItemDetails
)

from db.session import create_session_context
from db.models import (
    User as UserDB
)
from utils.sonolus.user import to_user_item, get_user_stmt_base



@sonolus.user.detail(ServerItemDetails)
async def user_detail(ctx, name: str):
    
    async with create_session_context() as session:
        
        stmt = get_user_stmt_base()\
                .where(UserDB.id == name)

        user = (await session.execute(stmt)).scalar()     
        user_item = to_user_item(user)
    
    return ServerItemDetails(
        item = user_item,
        actions = [],
        hasCommunity = False,
        leaderboards = [],
        sections = []
    )