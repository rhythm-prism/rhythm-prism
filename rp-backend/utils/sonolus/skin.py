import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sonolus_models import (
    SkinItem,
    SonolusResourceLocator,
    Tag
)

from db.models import (
    SkinItem as SkinItemDB
)
from utils.sonolus.user import to_user_item


def get_skin_stmt_base():
    stmt = sql\
            .select(SkinItemDB)\
            .options(
                selectinload(SkinItemDB.tags)
            )
    return stmt

def to_skin_item(skin: SkinItemDB) -> SkinItem:
    name = skin.id
    
    version = skin.version
    
    title = skin.title if skin.title is not None else ""
    
    subtitle = skin.subtitle if skin.subtitle is not None else ""
    
    author = skin.author if skin.author is not None else ""
    
    description = skin.description if skin.description is not None else ""
    
    author_user = skin.author_user
    if author_user is not None:
        author_user = to_user_item(author_user)
        
    tags = [ 
        Tag(
            title = tag.title,
            icon = tag.icon
        )
        for tag in skin.tags
    ]

    thumbnail = SonolusResourceLocator(
        hash = skin.thumbnail_hash,
        url = skin.thumbnail_url
    )
    
    data = SonolusResourceLocator(
        hash = skin.data_hash,
        url = skin.data_url
    )
    
    texture = SonolusResourceLocator(
        hash = skin.texture_hash,
        url = skin.texture_url
    )
    
    return SkinItem(
        name = name,
        version = version,
        title = title,
        subtitle = subtitle,
        author = author,
        description = description,
        authorUser = author_user,
        tags = tags,
        thumbnail = thumbnail,
        data = data,
        texture = texture 
    )