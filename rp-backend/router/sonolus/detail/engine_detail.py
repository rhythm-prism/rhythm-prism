from router.sonolus.index import sonolus

from sonolus_models import (
    ServerItemDetails
)

from db.session import create_session_context
from db.models import (
    EngineItem as EngineItemDB
)
from utils.sonolus.engine import to_engine_item, get_engine_stmt_base



@sonolus.engine.detail(ServerItemDetails)
async def engine_detail(ctx, name: str):
    
    async with create_session_context() as session:
        
        stmt = get_engine_stmt_base()\
                .where(EngineItemDB.id == name)

        engine = (await session.execute(stmt)).scalar()     
        engine_item = to_engine_item(engine)
    
    return ServerItemDetails(
        item = engine_item,
        actions = [],
        hasCommunity = False,
        leaderboards = [],
        sections = []
    )