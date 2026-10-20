import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sonolus_models import (
    PostItem,
    SonolusResourceLocator,
    Tag
)

from db.models import (
    PostItem as PostItemDB,
    User as UserDB
)
from utils.sonolus.user import to_user_item



def get_post_stmt_base():
    stmt = sql\
            .select(PostItemDB)\
            .options(
                joinedload(PostItemDB.author_user)
                .selectinload(UserDB.tags),
                
                selectinload(PostItemDB.tags)
            )
    return stmt

def to_post_item(post: PostItemDB) -> PostItem:
    name = post.id
    
    version = post.version
    
    title = post.title if post.title is not None else ""
    
    author = post.author if post.author is not None else ""
    
    description = post.description if post.description is not None else ""
    
    author_user = post.author_user
    if author_user is not None:
        author_user = to_user_item(author_user)
        
    tags = [
        Tag(
            title = tag.title,
            icon = tag.icon
        )
        for tag in post.tags
    ]
    
    time = post.created_at * 1000
    
    thumbnail = SonolusResourceLocator(
        hash = post.thumbnail_hash,
        url = post.thumbnail_url
    )
    
    return PostItem(
        name = name,
        version = 1,
        title = title,
        author = author,
        description = description,
        authorUser = author_user,
        tags = tags,
        time = time,
        thumbnail = thumbnail
    )