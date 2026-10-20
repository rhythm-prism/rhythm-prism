import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sonolus_models import (
    EngineItem,
    SonolusResourceLocator,
    Tag
)

from db.models import (
    EngineItem as EngineItemDB,
    BackgroundItem as BackgroundItemDB,
    SkinItem as SkinItemDB,
    EffectItem as EffectItemDB,
    ParticleItem as ParticleItemDB
)
from utils.sonolus.user import to_user_item
from utils.sonolus.skin import to_skin_item
from utils.sonolus.background import to_background_item
from utils.sonolus.effect import to_effect_item
from utils.sonolus.particle import to_particle_item



def get_engine_stmt_base():
    stmt = sql\
            .select(EngineItemDB)\
            .options(
                selectinload(EngineItemDB.tags),
                
                joinedload(EngineItemDB.background_item)
                .selectinload(BackgroundItemDB.tags),
                
                joinedload(EngineItemDB.skin_item)
                .selectinload(SkinItemDB.tags),
                
                joinedload(EngineItemDB.effect_item)
                .selectinload(EffectItemDB.tags),
                
                joinedload(EngineItemDB.particle_item)
                .selectinload(ParticleItemDB.tags)
            )
    return stmt

def to_engine_item(engine: EngineItemDB) -> EngineItem:
    name = engine.id
    
    version = engine.version
    
    title = engine.title if engine.title is not None else ""
    
    subtitle = engine.subtitle if engine.subtitle is not None else ""
    
    author = engine.author if engine.author is not None else ""
    
    description = engine.description if engine.description is not None else ""
    
    # authorUser
    author_user = engine.author_user
    if author_user is not None:
        author_user = to_user_item(author_user)
        
    # tags
    tags = [
        Tag(
            title = tag.title,
            icon = tag.icon
        )
        for tag in engine.tags
    ]

    # skin
    skin = to_skin_item(engine.skin_item)
    
    # background
    background = to_background_item(engine.background_item)
        
    # effect
    effect = to_effect_item(engine.effect_item)
        
    # particle
    particle = to_particle_item(engine.particle_item)
        
    thumbnail = SonolusResourceLocator(
        hash = engine.thumbnail_hash,
        url = engine.thumbnail_url
    )
    
    play_data = SonolusResourceLocator(
        hash = engine.playdata_hash,
        url = engine.playdata_url
    )
    
    watch_data = SonolusResourceLocator(
        hash = engine.watchdata_hash,
        url = engine.watchdata_url
    )
    
    preview_data = SonolusResourceLocator(
        hash = engine.previewdata_hash,
        url = engine.previewdata_url
    )
    
    tutorial_data = SonolusResourceLocator(
        hash = engine.tutorialdata_hash,
        url = engine.tutorialdata_url
    )
    
    rom = SonolusResourceLocator(
        hash = engine.rom_hash,
        url = engine.rom_url
    )
    
    configuration = SonolusResourceLocator(
        hash = engine.configuration_hash,
        url = engine.configuration_url
    )
    
    return EngineItem(
        name = name,
        version = version,
        title = title,
        subtitle = subtitle,
        author = author,
        description = description,
        authorUser = author_user,
        tags = tags,
        skin = skin,
        background = background,
        effect = effect,
        particle = particle,
        thumbnail = thumbnail,
        playData = play_data,
        watchData = watch_data,
        previewData = preview_data,
        tutorialData = tutorial_data,
        rom = rom,
        configuration = configuration
    )