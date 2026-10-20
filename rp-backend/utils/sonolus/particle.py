import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sonolus_models import (
    ParticleItem,
    SonolusResourceLocator,
    Tag
)

from db.models import (
    ParticleItem as ParticleItemDB
)
from utils.sonolus.user import to_user_item


def get_particle_stmt_base():
    stmt = sql\
            .select(ParticleItemDB)\
            .options(
                selectinload(ParticleItemDB.tags)
            )
    return stmt

def to_particle_item(particle: ParticleItemDB) -> ParticleItem:
    name = particle.id
    
    version = particle.version
    
    title = particle.title if particle.title is not None else ""
    
    subtitle = particle.subtitle if particle.subtitle is not None else ""
    
    author = particle.author if particle.author is not None else ""
    
    description = particle.description if particle.description is not None else ""
    
    author_user = particle.author_user
    if author_user is not None:
        author_user = to_user_item(author_user)
        
    tags = [ 
        Tag(
            title = tag.title,
            icon = tag.icon
        )
        for tag in particle.tags
    ]
        
    thumbnail = SonolusResourceLocator(
        hash = particle.thumbnail_hash,
        url = particle.thumbnail_url
    )
    
    data = SonolusResourceLocator(
        hash = particle.data_hash,
        url = particle.data_url
    )
    
    texture = SonolusResourceLocator(
        hash = particle.texture_hash,
        url = particle.texture_url
    )
    
    return ParticleItem(
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