import os
import sqlalchemy as sql
import hashlib
import aiofiles
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.dialects.postgresql import insert

from const.env import (
    SERVICE_NAME,
    S3_HOST,
    ITEM_RESOURCE_PREFIX
)
from db.models import (
    BackgroundItem,
    EngineItem,
    EffectItem,
    SkinItem,
    ParticleItem
)
from utils.s3utils import upload_s3
from schemas.storage import UploadData
from const.version import SonolusItemVersion



USER = os.environ["POSTGRES_USER"]
PASS = os.environ["POSTGRES_PASSWORD"]
DBNAME = os.environ["POSTGRES_DB"]

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BACKGROUND_CONFIG_HASH = ""
BACKGROUND_CONFIG_URL = ""
BACKGROUND_CONFIG_KEY = ""
BACKGROUND_CONFIG_CONTENT = b""
BACKGROUND_DATA_HASH = ""
BACKGROUND_DATA_URL = ""
BACKGROUND_DATA_KEY = ""
BACKGROUND_DATA_CONTENT = b""
BACKGROUND_TEXTURE_HASH = ""
BACKGROUND_TEXTURE_URL = ""
BACKGROUND_TEXTURE_KEY = ""
BACKGROUND_TEXTURE_CONTENT = b""
BACKGROUND_THUMBNAIL_HASH = ""
BACKGROUND_THUMBNAIL_URL = ""
BACKGROUND_THUMBNAIL_KEY = ""
BACKGROUND_THUMBNAIL_CONTENT = b""

ENGINE_CONFIG_HASH = ""
ENGINE_CONFIG_URL = ""
ENGINE_CONFIG_KEY = ""
ENGINE_CONFIG_CONTENT = b""
ENGINE_PLAYDATA_HASH = ""
ENGINE_PLAYDATA_URL = ""
ENGINE_PLAYDATA_KEY = ""
ENGINE_PLAYDATA_CONTENT = b""
ENGINE_PREVIEWDATA_HASH = ""
ENGINE_PREVIEWDATA_URL = ""
ENGINE_PREVIEWDATA_KEY = ""
ENGINE_PREVIEWDATA_CONTENT = b""
ENGINE_ROM_HASH = ""
ENGINE_ROM_URL = ""
ENGINE_ROM_KEY = ""
ENGINE_ROM_CONTENT = b""
ENGINE_TUTORIALDATA_HASH = ""
ENGINE_TUTORIALDATA_URL = ""
ENGINE_TUTORIALDATA_KEY = ""
ENGINE_TUTORIALDATA_CONTENT = b""
ENGINE_WATCHDATA_HASH = ""
ENGINE_WATCHDATA_URL = ""
ENGINE_WATCHDATA_KEY = ""
ENGINE_WATCHDATA_CONTENT = b""
ENGINE_THUMBNAIL_HASH = ""
ENGINE_THUMBNAIL_URL = ""
ENGINE_THUMBNAIL_KEY = ""
ENGINE_THUMBNAIL_CONTENT = b""

EFFECT_AUDIO_HASH = ""
EFFECT_AUDIO_URL = ""
EFFECT_AUDIO_KEY = ""
EFFECT_AUDIO_CONTENT = b""
EFFECT_DATA_HASH = ""
EFFECT_DATA_URL = ""
EFFECT_DATA_KEY = ""
EFFECT_DATA_CONTENT = b""
EFFECT_DATACLIP_HASH = ""
EFFECT_DATACLIP_URL = ""
EFFECT_DATACLIP_KEY = ""
EFFECT_DATACLIP_CONTENT = b""
EFFECT_THUMBNAIL_HASH = ""
EFFECT_THUMBNAIL_URL = ""
EFFECT_THUMBNAIL_KEY = ""
EFFECT_THUMBNAIL_CONTENT = b""

SKIN_DATA_HASH = ""
SKIN_DATA_URL = ""
SKIN_DATA_KEY = ""
SKIN_DATA_CONTENT = b""
SKIN_TEXTURE_HASH = ""
SKIN_TEXTURE_URL = ""
SKIN_TEXTURE_KEY = ""
SKIN_TEXTURE_CONTENT = b""
SKIN_THUMBNAIL_HASH = ""
SKIN_THUMBNAIL_URL = ""
SKIN_THUMBNAIL_KEY = ""
SKIN_THUMBNAIL_CONTENT = b""

PERTICLE_DATA_HASH = ""
PERTICLE_DATA_URL = ""
PERTICLE_DATA_KEY = ""
PERTICLE_DATA_CONTENT = b""
PERTICLE_TEXTURE_HASH = ""
PERTICLE_TEXTURE_URL = ""
PERTICLE_TEXTURE_KEY = ""
PERTICLE_TEXTURE_CONTENT = b""
PERTICLE_THUMBNAIL_HASH = ""
PERTICLE_THUMBNAIL_URL = ""
PERTICLE_THUMBNAIL_KEY = ""
PERTICLE_THUMBNAIL_CONTENT = b""

async def load_item_resource():
    # BackgroundConfiguration
    global BACKGROUND_CONFIG_HASH, BACKGROUND_CONFIG_URL, BACKGROUND_CONFIG_KEY, BACKGROUND_CONFIG_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "background", "BackgroundConfiguration"), "rb") as f:
        BACKGROUND_CONFIG_CONTENT = await f.read()
    BACKGROUND_CONFIG_HASH = hashlib.sha1(BACKGROUND_CONFIG_CONTENT).hexdigest()
    BACKGROUND_CONFIG_KEY = "/".join([ITEM_RESOURCE_PREFIX, BACKGROUND_CONFIG_HASH])
    BACKGROUND_CONFIG_URL = "/".join([S3_HOST, BACKGROUND_CONFIG_KEY])

    # BackgroundData
    global BACKGROUND_DATA_HASH, BACKGROUND_DATA_URL, BACKGROUND_DATA_KEY, BACKGROUND_DATA_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "background", "BackgroundData"), "rb") as f:
        BACKGROUND_DATA_CONTENT = await f.read()
    BACKGROUND_DATA_HASH = hashlib.sha1(BACKGROUND_DATA_CONTENT).hexdigest()
    BACKGROUND_DATA_KEY = "/".join([ITEM_RESOURCE_PREFIX, BACKGROUND_DATA_HASH])
    BACKGROUND_DATA_URL = "/".join([S3_HOST, BACKGROUND_DATA_KEY])

    # BackgroundTexture
    global BACKGROUND_TEXTURE_HASH, BACKGROUND_TEXTURE_URL, BACKGROUND_TEXTURE_KEY, BACKGROUND_TEXTURE_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "background", "BackgroundTexture"), "rb") as f:
        BACKGROUND_TEXTURE_CONTENT = await f.read()
    BACKGROUND_TEXTURE_HASH = hashlib.sha1(BACKGROUND_TEXTURE_CONTENT).hexdigest()
    BACKGROUND_TEXTURE_KEY = "/".join([ITEM_RESOURCE_PREFIX, BACKGROUND_TEXTURE_HASH])
    BACKGROUND_TEXTURE_URL = "/".join([S3_HOST, BACKGROUND_TEXTURE_KEY])

    # BackgroundThumbnail
    global BACKGROUND_THUMBNAIL_HASH, BACKGROUND_THUMBNAIL_URL, BACKGROUND_THUMBNAIL_KEY, BACKGROUND_THUMBNAIL_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "background", "BackgroundThumbnail"), "rb") as f:
        BACKGROUND_THUMBNAIL_CONTENT = await f.read()
    BACKGROUND_THUMBNAIL_HASH = hashlib.sha1(BACKGROUND_THUMBNAIL_CONTENT).hexdigest()
    BACKGROUND_THUMBNAIL_KEY = "/".join([ITEM_RESOURCE_PREFIX, BACKGROUND_THUMBNAIL_HASH])
    BACKGROUND_THUMBNAIL_URL = "/".join([S3_HOST, BACKGROUND_THUMBNAIL_KEY])

    # EngineConfiguration
    global ENGINE_CONFIG_HASH, ENGINE_CONFIG_URL, ENGINE_CONFIG_KEY, ENGINE_CONFIG_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "engine", "EngineConfiguration"), "rb") as f:
        ENGINE_CONFIG_CONTENT = await f.read()
    ENGINE_CONFIG_HASH = hashlib.sha1(ENGINE_CONFIG_CONTENT).hexdigest()
    ENGINE_CONFIG_KEY = "/".join([ITEM_RESOURCE_PREFIX, ENGINE_CONFIG_HASH])
    ENGINE_CONFIG_URL = "/".join([S3_HOST, ENGINE_CONFIG_KEY])

    # EnginePlayData
    global ENGINE_PLAYDATA_HASH, ENGINE_PLAYDATA_URL, ENGINE_PLAYDATA_KEY, ENGINE_PLAYDATA_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "engine", "EnginePlayData"), "rb") as f:
        ENGINE_PLAYDATA_CONTENT = await f.read()
    ENGINE_PLAYDATA_HASH = hashlib.sha1(ENGINE_PLAYDATA_CONTENT).hexdigest()
    ENGINE_PLAYDATA_KEY = "/".join([ITEM_RESOURCE_PREFIX, ENGINE_PLAYDATA_HASH])
    ENGINE_PLAYDATA_URL = "/".join([S3_HOST, ENGINE_PLAYDATA_KEY])

    # EnginePreviewData
    global ENGINE_PREVIEWDATA_HASH, ENGINE_PREVIEWDATA_URL, ENGINE_PREVIEWDATA_KEY, ENGINE_PREVIEWDATA_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "engine", "EnginePreviewData"), "rb") as f:
        ENGINE_PREVIEWDATA_CONTENT = await f.read()
    ENGINE_PREVIEWDATA_HASH = hashlib.sha1(ENGINE_PREVIEWDATA_CONTENT).hexdigest()
    ENGINE_PREVIEWDATA_KEY = "/".join([ITEM_RESOURCE_PREFIX, ENGINE_PREVIEWDATA_HASH])
    ENGINE_PREVIEWDATA_URL = "/".join([S3_HOST, ENGINE_PREVIEWDATA_KEY])

    # EngineROM
    global ENGINE_ROM_HASH, ENGINE_ROM_URL, ENGINE_ROM_KEY, ENGINE_ROM_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "engine", "EngineRom"), "rb") as f:
        ENGINE_ROM_CONTENT = await f.read()
    ENGINE_ROM_HASH = hashlib.sha1(ENGINE_ROM_CONTENT).hexdigest()
    ENGINE_ROM_KEY = "/".join([ITEM_RESOURCE_PREFIX, ENGINE_ROM_HASH])
    ENGINE_ROM_URL = "/".join([S3_HOST, ENGINE_ROM_KEY])

    # EngineTutorialData
    global ENGINE_TUTORIALDATA_HASH, ENGINE_TUTORIALDATA_URL, ENGINE_TUTORIALDATA_KEY, ENGINE_TUTORIALDATA_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "engine", "EngineTutorialData"), "rb") as f:
        ENGINE_TUTORIALDATA_CONTENT = await f.read()
    ENGINE_TUTORIALDATA_HASH = hashlib.sha1(ENGINE_TUTORIALDATA_CONTENT).hexdigest()
    ENGINE_TUTORIALDATA_KEY = "/".join([ITEM_RESOURCE_PREFIX, ENGINE_TUTORIALDATA_HASH])
    ENGINE_TUTORIALDATA_URL = "/".join([S3_HOST, ENGINE_TUTORIALDATA_KEY])

    # EngineWatchData
    global ENGINE_WATCHDATA_HASH, ENGINE_WATCHDATA_URL, ENGINE_WATCHDATA_KEY, ENGINE_WATCHDATA_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "engine", "EngineWatchData"), "rb") as f:
        ENGINE_WATCHDATA_CONTENT = await f.read()
    ENGINE_WATCHDATA_HASH = hashlib.sha1(ENGINE_WATCHDATA_CONTENT).hexdigest()
    ENGINE_WATCHDATA_KEY = "/".join([ITEM_RESOURCE_PREFIX, ENGINE_WATCHDATA_HASH])
    ENGINE_WATCHDATA_URL = "/".join([S3_HOST, ENGINE_WATCHDATA_KEY])

    # EngineThumbnail
    global ENGINE_THUMBNAIL_HASH, ENGINE_THUMBNAIL_URL, ENGINE_THUMBNAIL_KEY, ENGINE_THUMBNAIL_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "engine", "EngineThumbnail"), "rb") as f:
        ENGINE_THUMBNAIL_CONTENT = await f.read()
    ENGINE_THUMBNAIL_HASH = hashlib.sha1(ENGINE_THUMBNAIL_CONTENT).hexdigest()
    ENGINE_THUMBNAIL_KEY = "/".join([ITEM_RESOURCE_PREFIX, ENGINE_THUMBNAIL_HASH])
    ENGINE_THUMBNAIL_URL = "/".join([S3_HOST, ENGINE_THUMBNAIL_KEY])

    # EffectAudio
    global EFFECT_AUDIO_HASH, EFFECT_AUDIO_URL, EFFECT_AUDIO_KEY, EFFECT_AUDIO_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "effect", "EffectAudio"), "rb") as f:
        EFFECT_AUDIO_CONTENT = await f.read()
    EFFECT_AUDIO_HASH = hashlib.sha1(EFFECT_AUDIO_CONTENT).hexdigest()
    EFFECT_AUDIO_KEY = "/".join([ITEM_RESOURCE_PREFIX, EFFECT_AUDIO_HASH])
    EFFECT_AUDIO_URL = "/".join([S3_HOST, EFFECT_AUDIO_KEY])

    # EffectData
    global EFFECT_DATA_HASH, EFFECT_DATA_URL, EFFECT_DATA_KEY, EFFECT_DATA_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "effect", "EffectData"), "rb") as f:
        EFFECT_DATA_CONTENT = await f.read()
    EFFECT_DATA_HASH = hashlib.sha1(EFFECT_DATA_CONTENT).hexdigest()
    EFFECT_DATA_KEY = "/".join([ITEM_RESOURCE_PREFIX, EFFECT_DATA_HASH])
    EFFECT_DATA_URL = "/".join([S3_HOST, EFFECT_DATA_KEY])

    # EffectDataClip
    global EFFECT_DATACLIP_HASH, EFFECT_DATACLIP_URL, EFFECT_DATACLIP_KEY, EFFECT_DATACLIP_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "effect", "EffectDataClip"), "rb") as f:
        EFFECT_DATACLIP_CONTENT = await f.read()
    EFFECT_DATACLIP_HASH = hashlib.sha1(EFFECT_DATACLIP_CONTENT).hexdigest()
    EFFECT_DATACLIP_KEY = "/".join([ITEM_RESOURCE_PREFIX, EFFECT_DATACLIP_HASH])
    EFFECT_DATACLIP_URL = "/".join([S3_HOST, EFFECT_DATACLIP_KEY])

    # EffectThumbnail
    global EFFECT_THUMBNAIL_HASH, EFFECT_THUMBNAIL_URL, EFFECT_THUMBNAIL_KEY, EFFECT_THUMBNAIL_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "effect", "EffectThumbnail"), "rb") as f:
        EFFECT_THUMBNAIL_CONTENT = await f.read()
    EFFECT_THUMBNAIL_HASH = hashlib.sha1(EFFECT_THUMBNAIL_CONTENT).hexdigest()
    EFFECT_THUMBNAIL_KEY = "/".join([ITEM_RESOURCE_PREFIX, EFFECT_THUMBNAIL_HASH])
    EFFECT_THUMBNAIL_URL = "/".join([S3_HOST, EFFECT_THUMBNAIL_KEY])

    # SkinData
    global SKIN_DATA_HASH, SKIN_DATA_URL, SKIN_DATA_KEY, SKIN_DATA_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "skin", "SkinData"), "rb") as f:
        SKIN_DATA_CONTENT = await f.read()
    SKIN_DATA_HASH = hashlib.sha1(SKIN_DATA_CONTENT).hexdigest()
    SKIN_DATA_KEY = "/".join([ITEM_RESOURCE_PREFIX, SKIN_DATA_HASH])
    SKIN_DATA_URL = "/".join([S3_HOST, SKIN_DATA_KEY])

    # SkinTexture
    global SKIN_TEXTURE_HASH, SKIN_TEXTURE_URL, SKIN_TEXTURE_KEY, SKIN_TEXTURE_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "skin", "SkinTexture"), "rb") as f:
        SKIN_TEXTURE_CONTENT = await f.read()
    SKIN_TEXTURE_HASH = hashlib.sha1(SKIN_TEXTURE_CONTENT).hexdigest()
    SKIN_TEXTURE_KEY = "/".join([ITEM_RESOURCE_PREFIX, SKIN_TEXTURE_HASH])
    SKIN_TEXTURE_URL = "/".join([S3_HOST, SKIN_TEXTURE_KEY])

    # SkinThumbnail
    global SKIN_THUMBNAIL_HASH, SKIN_THUMBNAIL_URL, SKIN_THUMBNAIL_KEY, SKIN_THUMBNAIL_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "skin", "SkinThumbnail"), "rb") as f:
        SKIN_THUMBNAIL_CONTENT = await f.read()
    SKIN_THUMBNAIL_HASH = hashlib.sha1(SKIN_THUMBNAIL_CONTENT).hexdigest()
    SKIN_THUMBNAIL_KEY = "/".join([ITEM_RESOURCE_PREFIX, SKIN_THUMBNAIL_HASH])
    SKIN_THUMBNAIL_URL = "/".join([S3_HOST, SKIN_THUMBNAIL_KEY])

    # PerticleData
    global PERTICLE_DATA_HASH, PERTICLE_DATA_URL, PERTICLE_DATA_KEY, PERTICLE_DATA_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "particle", "ParticleData"), "rb") as f:
        PERTICLE_DATA_CONTENT = await f.read()
    PERTICLE_DATA_HASH = hashlib.sha1(PERTICLE_DATA_CONTENT).hexdigest()
    PERTICLE_DATA_KEY = "/".join([ITEM_RESOURCE_PREFIX, PERTICLE_DATA_HASH])
    PERTICLE_DATA_URL = "/".join([S3_HOST, PERTICLE_DATA_KEY])

    # PerticleTexture
    global PERTICLE_TEXTURE_HASH, PERTICLE_TEXTURE_URL, PERTICLE_TEXTURE_KEY, PERTICLE_TEXTURE_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "particle", "ParticleTexture"), "rb") as f:
        PERTICLE_TEXTURE_CONTENT = await f.read()
    PERTICLE_TEXTURE_HASH = hashlib.sha1(PERTICLE_TEXTURE_CONTENT).hexdigest()
    PERTICLE_TEXTURE_KEY = "/".join([ITEM_RESOURCE_PREFIX, PERTICLE_TEXTURE_HASH])
    PERTICLE_TEXTURE_URL = "/".join([S3_HOST, PERTICLE_TEXTURE_KEY])

    # PerticleThumbnail
    global PERTICLE_THUMBNAIL_HASH, PERTICLE_THUMBNAIL_URL, PERTICLE_THUMBNAIL_KEY, PERTICLE_THUMBNAIL_CONTENT
    async with aiofiles.open(os.path.join(BASE_DIR, "assets", "particle", "ParticleThumbnail"), "rb") as f:
        PERTICLE_THUMBNAIL_CONTENT = await f.read()
    PERTICLE_THUMBNAIL_HASH = hashlib.sha1(PERTICLE_THUMBNAIL_CONTENT).hexdigest()
    PERTICLE_THUMBNAIL_KEY = "/".join([ITEM_RESOURCE_PREFIX, PERTICLE_THUMBNAIL_HASH])
    PERTICLE_THUMBNAIL_URL = "/".join([S3_HOST, PERTICLE_THUMBNAIL_KEY])


async def setup_item_resource():
    await load_item_resource()

    await upload_s3([
        UploadData(BACKGROUND_CONFIG_KEY, BACKGROUND_CONFIG_CONTENT),
        UploadData(BACKGROUND_DATA_KEY, BACKGROUND_DATA_CONTENT),
        UploadData(BACKGROUND_TEXTURE_KEY, BACKGROUND_TEXTURE_CONTENT),
        UploadData(BACKGROUND_THUMBNAIL_KEY, BACKGROUND_THUMBNAIL_CONTENT),
        UploadData(ENGINE_CONFIG_KEY, ENGINE_CONFIG_CONTENT),
        UploadData(ENGINE_PLAYDATA_KEY, ENGINE_PLAYDATA_CONTENT),
        UploadData(ENGINE_PREVIEWDATA_KEY, ENGINE_PREVIEWDATA_CONTENT),
        UploadData(ENGINE_ROM_KEY, ENGINE_ROM_CONTENT),
        UploadData(ENGINE_TUTORIALDATA_KEY, ENGINE_TUTORIALDATA_CONTENT),
        UploadData(ENGINE_WATCHDATA_KEY, ENGINE_WATCHDATA_CONTENT),
        UploadData(ENGINE_THUMBNAIL_KEY, ENGINE_THUMBNAIL_CONTENT),
        UploadData(EFFECT_AUDIO_KEY, EFFECT_AUDIO_CONTENT),
        UploadData(EFFECT_DATA_KEY, EFFECT_DATA_CONTENT),
        UploadData(EFFECT_DATACLIP_KEY, EFFECT_DATACLIP_CONTENT),
        UploadData(EFFECT_THUMBNAIL_KEY, EFFECT_THUMBNAIL_CONTENT),
        UploadData(SKIN_DATA_KEY, SKIN_DATA_CONTENT),
        UploadData(SKIN_TEXTURE_KEY, SKIN_TEXTURE_CONTENT),
        UploadData(SKIN_THUMBNAIL_KEY, SKIN_THUMBNAIL_CONTENT),
        UploadData(PERTICLE_DATA_KEY, PERTICLE_DATA_CONTENT),
        UploadData(PERTICLE_TEXTURE_KEY, PERTICLE_TEXTURE_CONTENT),
        UploadData(PERTICLE_THUMBNAIL_KEY, PERTICLE_THUMBNAIL_CONTENT)
    ])

    # DBにデフォルトアイテムの情報を保存する
    engine = create_async_engine(
        f"postgresql+asyncpg://{USER}:{PASS}@postgres:5432/{DBNAME}",
    )
    SessionMaker = async_sessionmaker(engine, autocommit=False, autoflush=False)
    
    async with SessionMaker() as session:

        # Effect
        data = dict(
            version=SonolusItemVersion.EFFECT_ITEM,
            title=SERVICE_NAME,
            subtitle="",
            author="RhythmPrism",
            description="",
            thumbnail_url=EFFECT_THUMBNAIL_URL,
            thumbnail_hash=EFFECT_THUMBNAIL_HASH,
            audio_url=EFFECT_AUDIO_URL,
            audio_hash=EFFECT_AUDIO_HASH,
            data_url=EFFECT_DATA_URL,
            data_hash=EFFECT_DATA_HASH,
        )
        await session.execute(
            insert(EffectItem).values(id="rp-effect-default", **data)
            .on_conflict_do_update(index_elements=["id"], set_=data)
        )

        # Skin
        data = dict(
            version=SonolusItemVersion.SKIN_ITEM,
            title=SERVICE_NAME,
            subtitle="",
            author="RhythmPrism",
            description="",
            thumbnail_url=SKIN_THUMBNAIL_URL,
            thumbnail_hash=SKIN_THUMBNAIL_HASH,
            data_url=SKIN_DATA_URL,
            data_hash=SKIN_DATA_HASH,
            texture_url=SKIN_TEXTURE_URL,
            texture_hash=SKIN_TEXTURE_HASH
        )
        await session.execute(
            insert(SkinItem).values(id="rp-skin-default", **data)
            .on_conflict_do_update(index_elements=["id"], set_=data)
        )

        # Particle
        data = dict(
            version=SonolusItemVersion.PARTICLE_ITEM,
            title=SERVICE_NAME,
            subtitle="",
            author="RhythmPrism",
            description="",
            thumbnail_url=PERTICLE_THUMBNAIL_URL,
            thumbnail_hash=PERTICLE_THUMBNAIL_HASH,
            data_url=PERTICLE_DATA_URL,
            data_hash=PERTICLE_DATA_HASH,
            texture_url=PERTICLE_TEXTURE_URL,
            texture_hash=PERTICLE_TEXTURE_HASH
        )
        await session.execute(
            insert(ParticleItem).values(id="rp-particle-default", **data)
            .on_conflict_do_update(index_elements=["id"], set_=data)
        )

        # Background
        data = dict(
            version=SonolusItemVersion.BACKGROUND_ITEM,
            title=SERVICE_NAME,
            subtitle="",
            author="RhythmPrism",
            description="",
            thumbnail_url=BACKGROUND_THUMBNAIL_URL,
            thumbnail_hash=BACKGROUND_THUMBNAIL_HASH,
            data_url=BACKGROUND_DATA_URL,
            data_hash=BACKGROUND_DATA_HASH,
            image_url=BACKGROUND_TEXTURE_URL,
            image_hash=BACKGROUND_TEXTURE_HASH,
            configuration_url=BACKGROUND_CONFIG_URL,
            configuration_hash=BACKGROUND_CONFIG_HASH
        )
        await session.execute(
            insert(BackgroundItem).values(id="rp-bg-default", **data)
            .on_conflict_do_update(index_elements=["id"], set_=data)
        )

        # Engine
        data = dict(
            version=SonolusItemVersion.ENGINE_ITEM,
            title=SERVICE_NAME,
            subtitle="",
            author="RhythmPrism",
            description="",
            skin_item_id="rp-skin-default",
            background_item_id="rp-bg-default",
            effect_item_id="rp-effect-default",
            particle_item_id="rp-particle-default",
            thumbnail_url=ENGINE_THUMBNAIL_URL,
            thumbnail_hash=ENGINE_THUMBNAIL_HASH,
            configuration_url=ENGINE_CONFIG_URL,
            configuration_hash=ENGINE_CONFIG_HASH,
            playdata_url=ENGINE_PLAYDATA_URL,
            playdata_hash=ENGINE_PLAYDATA_HASH,
            previewdata_url=ENGINE_PREVIEWDATA_URL,
            previewdata_hash=ENGINE_PREVIEWDATA_HASH,
            rom_url=ENGINE_ROM_URL,
            rom_hash=ENGINE_ROM_HASH,
            tutorialdata_url=ENGINE_TUTORIALDATA_URL,
            tutorialdata_hash=ENGINE_TUTORIALDATA_HASH,
            watchdata_url=ENGINE_WATCHDATA_URL,
            watchdata_hash=ENGINE_WATCHDATA_HASH
        )
        await session.execute(
            insert(EngineItem).values(id="rp-engine-default", **data)
            .on_conflict_do_update(index_elements=["id"], set_=data)
        )

        await session.commit()
