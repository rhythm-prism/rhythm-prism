import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sonolus_models import (
    PostItem,
    Tag
)

from utils.sonolus.post import get_post_stmt_base
from db.models import (
    PostItem as PostItemDB,
    User as UserDB
)



def get_announce_stmt_base():
    stmt = get_post_stmt_base()\
            .where(PostItemDB.is_pinned.is_(True))\
            .where(PostItemDB.thumbnail_hash != None)\
            .order_by(PostItemDB.updated_at.desc())
    return stmt