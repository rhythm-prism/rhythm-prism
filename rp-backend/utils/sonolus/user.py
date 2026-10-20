import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sonolus_models import (
    UserItem,
    Tag
)

from const.user import UserPermission
from db.models import (
    User as UserDB
)



def get_user_stmt_base():
    stmt = sql\
            .select(UserDB)\
            .where(UserDB.permission >= UserPermission.NORMAL)\
            .where(UserDB.sonolus_id.is_not(None))\
            .options(
                selectinload(UserDB.tags)
            )
    return stmt

def to_user_item(user: UserDB) -> UserItem:
    name = user.id
    
    title = user.name if user.name is not None else ""
    
    handle = str(user.sonolus_handle)
    
    tags = [ 
        Tag(
            title = tag.title,
            icon = tag.icon
        )
        for tag in user.tags
    ]
    
    return UserItem(
        name = name,
        title = title,
        handle = handle,
        tags = tags
    )