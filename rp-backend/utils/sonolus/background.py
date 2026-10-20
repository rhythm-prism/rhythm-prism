import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sonolus_models import (
    BackgroundItem,
    SonolusResourceLocator,
    Tag
)

from db.models import (
    BackgroundItem as BackgroundItemDB
)
from utils.sonolus.user import to_user_item


def get_background_stmt_base():
    stmt = sql\
            .select(BackgroundItemDB)\
            .options(
                selectinload(BackgroundItemDB.tags)
            )
    return stmt

def to_background_item(background: BackgroundItemDB) -> BackgroundItem:
    name = background.id
    
    version = background.version
    
    title = background.title if background.title is not None else ""
    
    subtitle = background.subtitle if background.subtitle is not None else ""
    
    author = background.author if background.author is not None else ""
    
    description = background.description if background.description is not None else ""
    
    author_user = background.author_user
    if author_user is not None:
        author_user = to_user_item(author_user)
        
    tags = [
        Tag(
            title = tag.title,
            icon = tag.icon
        )
        for tag in background.tags
    ]
    
    thumbnail = SonolusResourceLocator(
       hash = background.thumbnail_hash,
       url = background.thumbnail_url
    )
    
    data = SonolusResourceLocator(
        hash = background.data_hash,
        url = background.data_url
    )
    
    image = SonolusResourceLocator(
        hash = background.image_hash,
        url = background.image_url
    )
    
    configuration = SonolusResourceLocator(
        hash = background.configuration_hash,
        url = background.configuration_url
    )
    
    return BackgroundItem(
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
        image = image,
        configuration = configuration
    )