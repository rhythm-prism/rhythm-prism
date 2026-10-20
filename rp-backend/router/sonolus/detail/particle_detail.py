from router.sonolus.index import sonolus

from sonolus_models import (
    ServerItemDetails
)

from db.session import create_session_context
from db.models import (
    ParticleItem as ParticleItemDB
)
from utils.sonolus.particle import to_particle_item, get_particle_stmt_base



@sonolus.particle.detail(ServerItemDetails)
async def particle_detail(ctx, name: str):
    
    async with create_session_context() as session:
        
        stmt = get_particle_stmt_base()\
                .where(ParticleItemDB.id == name)

        particle = (await session.execute(stmt)).scalar()     
        particle_item = to_particle_item(particle)
    
    return ServerItemDetails(
        item = particle_item,
        actions = [],
        hasCommunity = False,
        leaderboards = [],
        sections = []
    )