import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    LevelItem,
    UseItemDefault,
    UseItemCustom,
    SonolusResourceLocator,
    Tag,
    SonolusIcon
)

from db.models import (
    User as UserDB,
    Chart as ChartDB,
    ChartTag as ChartTagDB,
    SkinItem as SkinItemDB,
    BackgroundItem as BackgroundItemDB,
    BackgroundItemTag as BackgroundItemTagDB,
    EffectItem as EffectItemDB,
    ParticleItem as ParticleItemDB,
    EngineItem as EngineItemDB
)
from const.chart import MusicGenre, ChartConversionStatus, ChartDifficulty
from utils.sonolus.engine import to_engine_item
from utils.sonolus.user import to_user_item
from utils.sonolus.background import to_background_item



def get_level_stmt_base():
    stmt = sql.select(ChartDB)\
              .where(
                  ChartDB.is_deleted.is_(False), 
                  ChartDB.conversion_status == ChartConversionStatus.COMPLETE
              )\
              .options(
                joinedload(ChartDB.author_user)
                .selectinload(UserDB.tags),
                
                selectinload(ChartDB.tags)
                .selectinload(ChartTagDB.tag_master),
                
                joinedload(ChartDB.skin_item)
                .joinedload(SkinItemDB.author_user),
                joinedload(ChartDB.skin_item)
                .selectinload(SkinItemDB.tags),
                
                joinedload(ChartDB.background_item)
                .joinedload(BackgroundItemDB.author_user),
                joinedload(ChartDB.background_item)
                .selectinload(BackgroundItemDB.tags),
                
                joinedload(ChartDB.effect_item)
                .joinedload(EffectItemDB.author_user),
                joinedload(ChartDB.effect_item)
                .selectinload(EffectItemDB.tags),
                
                joinedload(ChartDB.particle_item)
                .joinedload(ParticleItemDB.author_user),
                joinedload(ChartDB.particle_item)
                .selectinload(ParticleItemDB.tags),
                
                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.author_user),
                joinedload(ChartDB.engine_item)
                .selectinload(EngineItemDB.tags),
                
                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.background_item)
                .joinedload(BackgroundItemDB.author_user),
                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.background_item)
                .selectinload(BackgroundItemDB.tags),

                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.skin_item)
                .joinedload(SkinItemDB.author_user),
                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.skin_item)
                .selectinload(SkinItemDB.tags),

                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.effect_item)
                .joinedload(EffectItemDB.author_user),
                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.effect_item)
                .selectinload(EffectItemDB.tags),

                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.particle_item)
                .joinedload(ParticleItemDB.author_user),
                joinedload(ChartDB.engine_item)
                .joinedload(EngineItemDB.particle_item)
                .selectinload(ParticleItemDB.tags),
            )
    return stmt

def to_level_item(chart: ChartDB) -> LevelItem:
    name = chart.id
    
    version = chart.version
    
    rating = chart.rating 
    
    title = chart.title if chart.title is not None else ""
    
    artists = []
    if chart.composer != "":
        artists.append(chart.composer)
    if chart.vocal != "":
        artists.append(chart.vocal)
    artists = " / ".join(artists)
    
    author = chart.author if chart.author is not None else ""
    
    description = chart.description if chart.description is not None else ""

    author_user = chart.author_user
    if author_user is not None:
        author += "#" + str(author_user.sonolus_handle)
        author_user = to_user_item(author_user)
        
    # tags  
    tags = []
    tags.extend([
        Tag(
            title = str(chart.likes_count),
            icon = SonolusIcon.HeartHollow
        ),
        Tag(
            title = ChartDifficulty(chart.difficulty).display_name
        ),        
        Tag(
            title = MusicGenre(chart.genre).display_name
        )
    ])  
    tags.extend([
        Tag(
            title = tag.tag_master.title,
            icon = tag.tag_master.icon
        )
        for tag in chart.tags
    ])
        
    # engine
    engine = to_engine_item(chart.engine_item)
        
    # skin
    use_skin = UseItemDefault(useDefault=True)
    
    use_background = UseItemDefault(useDefault=True)
    background = chart.background_item
    if background is not None:
        background = to_background_item(background)
        use_background = UseItemCustom(
            useDefault = False,
            item = background
        )
    
    use_effect = UseItemDefault(useDefault=True)
    
    use_particle = UseItemDefault(useDefault=True)
    
    conver = SonolusResourceLocator(
        hash = chart.jacket_hash,
        url = chart.jacket_url
    )
    
    bgm = SonolusResourceLocator(
        hash = chart.bgm_hash,
        url = chart.bgm_url
    )
    
    preview = SonolusResourceLocator(
        hash = chart.preview_hash,
        url = chart.preview_url
    )
    
    data = SonolusResourceLocator(
        hash = chart.leveldata_hash,
        url = chart.leveldata_url
    )
    
    return LevelItem(
        name = name,
        version = version,
        rating = rating,
        title = title,
        artists = artists,
        author = author,
        description = description,
        authorUser = author_user,
        tags = tags,
        engine = engine,
        useSkin = use_skin,
        useBackground = use_background,
        useEffect = use_effect,
        useParticle = use_particle,
        cover = conver,
        bgm = bgm,
        preview = preview,
        data = data
    )