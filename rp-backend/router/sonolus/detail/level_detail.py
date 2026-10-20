import sqlalchemy as sql
from router.sonolus.index import sonolus

from sonolus_models import (
    ServerItemDetails,
    ServerSubmitItemActionResponse
)

from db.session import create_session_context
from db.models import (
    Chart as ChartDB,
    ChartLike as ChartLikeDB
)
from utils.sonolus.level import to_level_item, get_level_stmt_base
from utils.idutils import decode_sonolus_session_id
from utils.exceptions import RPException
from const.sonolus.serverform import RPSonolusServerForm



@sonolus.level.detail(ServerItemDetails)
async def level_detail(ctx, name: str):
    
    actions = []
    
    async with create_session_context() as session:
        
        stmt = get_level_stmt_base()\
                  .where(ChartDB.id == name)
                  
        chart = (await session.execute(stmt)).scalar()
        level_item = to_level_item(chart)
        
        if ctx.user_session is not None:
            user_id = decode_sonolus_session_id(ctx.user_session)
            
            stmt = sql.select(
                sql.exists()
                    .select_from(ChartLikeDB)
                    .where(ChartLikeDB.chart_id == name)
                    .where(ChartLikeDB.user_id == user_id)
            )
            
            is_liked = (await session.execute(stmt)).scalar()
            
            if is_liked:
                actions.append(RPSonolusServerForm.UNLIKE)
            else:
                actions.append(RPSonolusServerForm.LIKE)
        
    return ServerItemDetails(
        item = level_item,
        description = level_item.description,
        actions = actions,
        hasCommunity = True,
        leaderboards = [],
        sections = []
    )

@sonolus.level.actions(ServerSubmitItemActionResponse)
async def level_actions(ctx, name: str, action_request: dict):

    if ctx.user_session is None:
        raise RPException.RequiredSonolusLogin()
    
    action_type: str = action_request.get("values")
    if action_type is None:
        raise RPException.InvalidRequest()
    
    user_id = decode_sonolus_session_id(ctx.user_session)
        
    async with create_session_context() as session:
        
        chart = await session.get(ChartDB, name)
        if chart is None:
            raise RPException.ChartNotFound()
        
        match action_type.split("=")[1]:
            
            case "like":
                
                like = ChartLikeDB(
                    chart_id = name,
                    user_id = user_id,
                )
                session.add(like)
                
                chart.likes_count += 1
            
            case "unlike":
                
                stmt = sql.delete(ChartLikeDB)\
                          .where(ChartLikeDB.chart_id == name)\
                          .where(ChartLikeDB.user_id == user_id)
                          
                result = await session.execute(stmt)
                
                if result.rowcount > 0:
                    chart.likes_count -= 1

        await session.commit()
    
    return ServerSubmitItemActionResponse(
        key = "",
        hashes = [],
        shouldUpdateItem = True
    )