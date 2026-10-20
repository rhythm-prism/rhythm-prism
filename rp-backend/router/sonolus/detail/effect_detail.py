from router.sonolus.index import sonolus

from sonolus_models import (
    ServerItemDetails
)

from db.session import create_session_context
from db.models import (
    EffectItem as EffectItemDB
)
from utils.sonolus.effect import to_effect_item, get_effect_stmt_base



@sonolus.effect.detail(ServerItemDetails)
async def effect_detail(ctx, name: str):
    
    async with create_session_context() as session:
        
        stmt = get_effect_stmt_base()\
                .where(EffectItemDB.id == name)

        effect = (await session.execute(stmt)).scalar()     
        effect_item = to_effect_item(effect)
    
    return ServerItemDetails(
        item = effect_item,
        actions = [],
        hasCommunity = False,
        leaderboards = [],
        sections = []
    )