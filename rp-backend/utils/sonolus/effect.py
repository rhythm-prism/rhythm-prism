import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sonolus_models import (
    EffectItem,
    SonolusResourceLocator,
    Tag
)

from db.models import (
    EffectItem as EffectItemDB
)
from utils.sonolus.user import to_user_item


def get_effect_stmt_base():
    stmt = sql\
            .select(EffectItemDB)\
            .options(
                selectinload(EffectItemDB.tags)
            )
    return stmt

def to_effect_item(effect: EffectItemDB) -> EffectItem:
    name = effect.id
    
    version = effect.version if effect.version is not None else ""
    
    title = effect.title if effect.title is not None else ""
    
    subtitle = effect.subtitle if effect.subtitle is not None else ""
    
    author = effect.author if effect.author is not None else ""
    
    description = effect.description if effect.description is not None else ""
    
    author_user = effect.author_user
    if author_user is not None:
        author_user = to_user_item(author_user)
        
    tags = [ 
        Tag(
            title = tag.title,
            icon = tag.icon
        )
        for tag in effect.tags
    ]

    thumbnail = SonolusResourceLocator(
        hash = effect.thumbnail_hash,
        url = effect.thumbnail_url
    )
    
    data = SonolusResourceLocator(
        hash = effect.data_hash,
        url = effect.data_url
    )
    
    audio = SonolusResourceLocator(
        hash = effect.audio_hash,
        url = effect.audio_url 
    )
    
    return EffectItem(
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
        audio = audio
    )