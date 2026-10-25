from sqlalchemy import ForeignKey
from sqlalchemy.schema import Column
from sqlalchemy.types import Integer, BIGINT, String, Text, Boolean
from sqlalchemy.orm import Mapped, DeclarativeBase, relationship
from typing import Optional

from utils.time import get_timestamp


class Base(DeclarativeBase):
    pass


class TagBase(Base):
    __abstract__ = True
    title: Mapped[str] = Column(String, primary_key=True)
    icon:  Mapped[str] = Column(String)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = Column(String, primary_key=True, index=True)
    hoge: Mapped[str] = Column(String)
    name: Mapped[str] = Column(String)
    profile: Mapped[str] = Column(Text)
    original_icon_hash: Mapped[str] = Column(String)
    icon_url: Mapped[str] = Column(String)
    icon_hash: Mapped[str] = Column(String)
    warning_count: Mapped[int] = Column(Integer, default=0)
    permission: Mapped[int] = Column(Integer)
    supporter: Mapped[int] = Column(Integer, default=0)
    discord_id: Mapped[str] = Column(String)
    discord_name: Mapped[str] = Column(String)
    sonolus_id: Mapped[str] = Column(String)
    sonolus_handle: Mapped[int] = Column(Integer)
    sonolus_name: Mapped[str] = Column(String)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    tags: Mapped[list["UserTag"]] = relationship("UserTag", back_populates="user")
    events: Mapped[list["Event"]] = relationship("Event", back_populates="author_user")
    charts: Mapped[list["Chart"]] = relationship("Chart", back_populates="author_user")
    post_items: Mapped[list["PostItem"]] = relationship("PostItem", back_populates="author_user")
    community_comments: Mapped[list["CommunityComment"]] = relationship("CommunityComment", back_populates="author_user")
    chart_likes: Mapped[list["ChartLike"]] = relationship("ChartLike", back_populates="user")
    chart_collaborations: Mapped[list["ChartCollaborator"]] = relationship("ChartCollaborator", back_populates="user")
    skin_items: Mapped[list["SkinItem"]] = relationship("SkinItem", back_populates="author_user")
    background_items: Mapped[list["BackgroundItem"]] = relationship("BackgroundItem", back_populates="author_user")
    effect_items: Mapped[list["EffectItem"]] = relationship("EffectItem", back_populates="author_user")
    particle_items: Mapped[list["ParticleItem"]] = relationship("ParticleItem", back_populates="author_user")
    engine_items: Mapped[list["EngineItem"]] = relationship("EngineItem", back_populates="author_user")
    charter_auth_requests: Mapped[list["CharterAuthRequest"]] = relationship("CharterAuthRequest", back_populates="request_user")
    charter_auth_approvals: Mapped[list["CharterAuthApproval"]] = relationship("CharterAuthApproval", back_populates="reviewer")
    

class UserTag(TagBase):
    __tablename__ = "user_tag"
    user_id: Mapped[str] = Column(String, ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    user: Mapped["User"] = relationship("User", back_populates="tags")


class UserAuth(Base):
    __tablename__ = "user_auth"
    id: Mapped[str] = Column(String, primary_key=True)
    user_id: Mapped[str] = Column(String)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)


class CharterAuthRequest(Base):
    __tablename__ = "charter_auth_request"
    id: Mapped[str] = Column(String, primary_key=True)
    request_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    chart_id: Mapped[str] = Column(String, ForeignKey("chart.id"))
    is_closed: Mapped[bool] = Column(Boolean, default=False)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    approvals: Mapped[list["CharterAuthApproval"]] = relationship("CharterAuthApproval", back_populates="request")
    request_user: Mapped["User"] = relationship("User", back_populates="charter_auth_requests")
    chart: Mapped["Chart"] = relationship("Chart", back_populates="charter_auth_requests")


class CharterAuthApproval(Base):
    __tablename__ = "charter_auth_approval"
    id: Mapped[str] = Column(String, primary_key=True)
    request_id: Mapped[str] = Column(String, ForeignKey("charter_auth_request.id"))
    reviewer_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    status: Mapped[int] = Column(Integer)
    reason: Mapped[str] = Column(String, nullable=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    request: Mapped["CharterAuthRequest"] = relationship("CharterAuthRequest", back_populates="approvals")
    reviewer: Mapped["User"] = relationship("User", back_populates="charter_auth_approvals")


class Event(Base):
    __tablename__ = "event"
    id: Mapped[str] = Column(String, primary_key=True)
    chart_id: Mapped[str] = Column(String, ForeignKey("chart.id"), primary_key=True)
    title: Mapped[str] = Column(String)
    description: Mapped[str] = Column(Text)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    thumbnail_url: Mapped[str] = Column(String)
    thumbnail_hash: Mapped[str] = Column(String)
    start_at: Mapped[int] = Column(BIGINT)
    end_at: Mapped[int] = Column(BIGINT)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)
    
    author_user: Mapped["User"] = relationship("User", back_populates="events")
    charts: Mapped[list["Chart"]] = relationship("Chart", back_populates="events")


class Chart(Base):
    __tablename__ = "chart"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    rating: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    composer: Mapped[str] = Column(String)
    vocal: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    skin_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("skin_item.id"), nullable=True)
    background_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("background_item.id"), nullable=True)
    effect_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("effect_item.id"), nullable=True)
    particle_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("particle_item.id"), nullable=True)
    engine_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("engine_item.id"), nullable=True)
    genre: Mapped[int] = Column(Integer)
    difficulty: Mapped[int] = Column(Integer)
    description: Mapped[str] = Column(Text)
    collabo: Mapped[int] = Column(Integer)
    r18: Mapped[int] = Column(Integer)
    likes_count: Mapped[int] = Column(Integer, default=0, index=True)
    chart_format: Mapped[str] = Column(String)
    conversion_status: Mapped[int] = Column(Integer, default=0)
    publish_status: Mapped[int] = Column(Integer)
    first_published_at: Mapped[int] = Column(BIGINT, index=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)
    is_deleted: Mapped[bool] = Column(Boolean, default=False)
    
    original_chart_url: Mapped[str] = Column(String)
    original_chart_hash: Mapped[str] = Column(String)
    original_chart_publish_status: Mapped[int] = Column(Integer)
    leveldata_url: Mapped[str] = Column(String)
    leveldata_hash: Mapped[str] = Column(String)
    original_bgm_hash: Mapped[str] = Column(String)
    bgm_url: Mapped[str] = Column(String)
    bgm_hash: Mapped[str] = Column(String)
    preview_url: Mapped[str] = Column(String)
    preview_hash: Mapped[str] = Column(String)
    original_jacket_hash: Mapped[str] = Column(String)
    jacket_url: Mapped[str] = Column(String)
    jacket_hash: Mapped[str] = Column(String)

    events: Mapped[list["Event"]] = relationship("Event", back_populates="charts")
    author_user: Mapped["User"] = relationship("User", back_populates="charts")
    skin_item: Mapped[Optional["SkinItem"]] = relationship("SkinItem", back_populates="charts")
    background_item: Mapped[Optional["BackgroundItem"]] = relationship("BackgroundItem", back_populates="chart")
    effect_item: Mapped[Optional["EffectItem"]] = relationship("EffectItem", back_populates="charts")
    particle_item: Mapped[Optional["ParticleItem"]] = relationship("ParticleItem", back_populates="charts")
    engine_item: Mapped[Optional["EngineItem"]] = relationship("EngineItem", back_populates="charts")
    tags: Mapped[list["ChartTag"]] = relationship("ChartTag", back_populates="chart")
    collaborators: Mapped[list["ChartCollaborator"]] = relationship("ChartCollaborator", back_populates="chart")
    likes: Mapped[list["ChartLike"]] = relationship("ChartLike", back_populates="chart")
    community_comments: Mapped[list["CommunityComment"]] = relationship("CommunityComment", back_populates="chart")
    charter_auth_requests: Mapped[list["CharterAuthRequest"]] = relationship("CharterAuthRequest", back_populates="chart")


class ChartTagMaster(Base):
    __tablename__ = "chart_tag_master"
    id: Mapped[int] = Column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = Column(String, unique=True)
    icon: Mapped[str] = Column(String)
    created_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    chart_tags: Mapped[list["ChartTag"]] = relationship("ChartTag", back_populates="tag_master")


class ChartTag(Base):
    __tablename__ = "chart_tag"
    chart_id: Mapped[str] = Column(String, ForeignKey("chart.id"), primary_key=True)
    tag_id: Mapped[int] = Column(Integer, ForeignKey("chart_tag_master.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    chart: Mapped["Chart"] = relationship("Chart", back_populates="tags")
    tag_master: Mapped["ChartTagMaster"] = relationship("ChartTagMaster", back_populates="chart_tags")


class ChartCollaborator(Base):
    __tablename__ = "chart_collaborator"
    chart_id: Mapped[str] = Column(String, ForeignKey("chart.id"), primary_key=True)
    user_id: Mapped[str] = Column(String, ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    chart: Mapped["Chart"] = relationship("Chart", back_populates="collaborators")
    user: Mapped["User"] = relationship("User", back_populates="chart_collaborations")


class ChartLike(Base):
    __tablename__ = "chart_like"
    chart_id: Mapped[str] = Column(String, ForeignKey("chart.id"), primary_key=True)
    user_id: Mapped[str] = Column(String, ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    chart: Mapped["Chart"] = relationship("Chart", back_populates="likes")
    user: Mapped["User"] = relationship("User", back_populates="chart_likes")


class CommunityComment(Base):
    __tablename__ = "community_comment"
    id: Mapped[str] = Column(String, primary_key=True)
    chart_id: Mapped[str] = Column(String, ForeignKey("chart.id"))
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    content: Mapped[str] = Column(Text)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    chart: Mapped["Chart"] = relationship("Chart", back_populates="community_comments")
    author_user: Mapped["User"] = relationship("User", back_populates="community_comments")


class PostItem(Base):
    __tablename__ = "post_item"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    subtitle: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    description: Mapped[str] = Column(Text)
    thumbnail_url: Mapped[str] = Column(String)
    thumbnail_hash: Mapped[str] = Column(String)
    banner_url: Mapped[str] = Column(String)
    banner_hash: Mapped[str] = Column(String)
    is_pinned: Mapped[bool] = Column(Boolean, default=False)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    author_user: Mapped["User"] = relationship("User", back_populates="post_items")
    tags: Mapped[list["PostItemTag"]] = relationship("PostItemTag", back_populates="post_item")


class PostItemTag(TagBase):
    __tablename__ = "post_item_tag"
    post_item_id: Mapped[str] = Column(String, ForeignKey("post_item.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    post_item: Mapped["PostItem"] = relationship("PostItem", back_populates="tags")


class PlaylistItem(Base):
    __tablename__ = "playlist_item"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    subtitle: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    description: Mapped[str] = Column(Text)
    thumbnail_url: Mapped[str] = Column(String)
    thumbnail_hash: Mapped[str] = Column(String)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    tags: Mapped[list["PlaylistItemTag"]] = relationship("PlaylistItemTag", back_populates="playlist_item")
    levels: Mapped[list["PlaylistItemLevel"]] = relationship("PlaylistItemLevel", back_populates="playlist_item")


class PlaylistItemTag(TagBase):
    __tablename__ = "playlist_item_tag"
    playlist_item_id: Mapped[str] = Column(String, ForeignKey("playlist_item.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    playlist_item: Mapped["PlaylistItem"] = relationship("PlaylistItem", back_populates="tags")


class PlaylistItemLevel(Base):
    __tablename__ = "playlist_item_level"
    playlist_item_id: Mapped[str] = Column(String, ForeignKey("playlist_item.id"), primary_key=True)
    chart_id: Mapped[str] = Column(String, ForeignKey("chart.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    playlist_item: Mapped["PlaylistItem"] = relationship("PlaylistItem", back_populates="levels")
    chart: Mapped["Chart"] = relationship("Chart")


class ReplayItem(Base):
    __tablename__ = "replay_item"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    subtitle: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    description: Mapped[str] = Column(Text)
    chart_id: Mapped[str] = Column(String, ForeignKey("chart.id"))
    data_url: Mapped[str] = Column(String)
    data_hash: Mapped[str] = Column(String)
    configuration_url: Mapped[str] = Column(String)
    configuration_hash: Mapped[str] = Column(String)
    rank: Mapped[str] = Column(String)
    score: Mapped[int] = Column(Integer)
    accuracy_score: Mapped[int] = Column(Integer)
    perfect_count: Mapped[int] = Column(Integer)
    great_count: Mapped[int] = Column(Integer)
    good_count: Mapped[int] = Column(Integer)
    miss_count: Mapped[int] = Column(Integer)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    tags: Mapped[list["ReplayItemTag"]] = relationship("ReplayItemTag", back_populates="replay_item")
    chart: Mapped["Chart"] = relationship("Chart")


class ReplayItemTag(TagBase):
    __tablename__ = "replay_item_tag"
    replay_item_id: Mapped[str] = Column(String, ForeignKey("replay_item.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    replay_item: Mapped["ReplayItem"] = relationship("ReplayItem", back_populates="tags")


class SkinItem(Base):
    __tablename__ = "skin_item"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    subtitle: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    description: Mapped[str] = Column(Text)
    thumbnail_url: Mapped[str] = Column(String)
    thumbnail_hash: Mapped[str] = Column(String)
    data_url: Mapped[str] = Column(String)
    data_hash: Mapped[str] = Column(String)
    texture_url: Mapped[str] = Column(String)
    texture_hash: Mapped[str] = Column(String)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    author_user: Mapped[Optional["User"]] = relationship("User", back_populates="skin_items")
    tags: Mapped[list["SkinItemTag"]] = relationship("SkinItemTag", back_populates="skin_item")
    charts: Mapped[list["Chart"]] = relationship("Chart", back_populates="skin_item")


class SkinItemTag(TagBase):
    __tablename__ = "skin_item_tag"
    skin_item_id: Mapped[str] = Column(String, ForeignKey("skin_item.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    skin_item: Mapped["SkinItem"] = relationship("SkinItem", back_populates="tags")


class BackgroundItem(Base):
    __tablename__ = "background_item"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    subtitle: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    description: Mapped[str] = Column(Text)
    thumbnail_url: Mapped[str] = Column(String)
    thumbnail_hash: Mapped[str] = Column(String)
    data_url: Mapped[str] = Column(String)
    data_hash: Mapped[str] = Column(String)
    image_url: Mapped[str] = Column(String)
    image_hash: Mapped[str] = Column(String)
    configuration_url: Mapped[str] = Column(String)
    configuration_hash: Mapped[str] = Column(String)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    author_user: Mapped[Optional["User"]] = relationship("User", back_populates="background_items")
    tags: Mapped[list["BackgroundItemTag"]] = relationship("BackgroundItemTag", back_populates="background_item")
    chart: Mapped["Chart"] = relationship("Chart", back_populates="background_item")


class BackgroundItemTag(TagBase):
    __tablename__ = "background_item_tag"
    background_item_id: Mapped[str] = Column(String, ForeignKey("background_item.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    background_item: Mapped["BackgroundItem"] = relationship("BackgroundItem", back_populates="tags")


class EffectItem(Base):
    __tablename__ = "effect_item"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    subtitle: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    description: Mapped[str] = Column(Text)
    thumbnail_url: Mapped[str] = Column(String)
    thumbnail_hash: Mapped[str] = Column(String)
    data_url: Mapped[str] = Column(String)
    data_hash: Mapped[str] = Column(String)
    audio_url: Mapped[str] = Column(String)
    audio_hash: Mapped[str] = Column(String)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    author_user: Mapped[Optional["User"]] = relationship("User", back_populates="effect_items")
    tags: Mapped[list["EffectItemTag"]] = relationship("EffectItemTag", back_populates="effect_item")
    charts: Mapped[list["Chart"]] = relationship("Chart", back_populates="effect_item")


class EffectItemTag(TagBase):
    __tablename__ = "effect_item_tag"
    effect_item_id: Mapped[str] = Column(String, ForeignKey("effect_item.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    effect_item: Mapped["EffectItem"] = relationship("EffectItem", back_populates="tags")


class ParticleItem(Base):
    __tablename__ = "particle_item"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    subtitle: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    description: Mapped[str] = Column(Text)
    thumbnail_url: Mapped[str] = Column(String)
    thumbnail_hash: Mapped[str] = Column(String)
    data_url: Mapped[str] = Column(String)
    data_hash: Mapped[str] = Column(String)
    texture_url: Mapped[str] = Column(String)
    texture_hash: Mapped[str] = Column(String)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    author_user: Mapped[Optional["User"]] = relationship("User", back_populates="particle_items")
    tags: Mapped[list["ParticleItemTag"]] = relationship("ParticleItemTag", back_populates="particle_item")
    charts: Mapped[list["Chart"]] = relationship("Chart", back_populates="particle_item")


class ParticleItemTag(TagBase):
    __tablename__ = "particle_item_tag"
    particle_item_id: Mapped[str] = Column(String, ForeignKey("particle_item.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    particle_item: Mapped["ParticleItem"] = relationship("ParticleItem", back_populates="tags")


class EngineItem(Base):
    __tablename__ = "engine_item"
    id: Mapped[str] = Column(String, primary_key=True)
    version: Mapped[int] = Column(Integer)
    title: Mapped[str] = Column(String)
    subtitle: Mapped[str] = Column(String)
    author: Mapped[str] = Column(String)
    author_user_id: Mapped[str] = Column(String, ForeignKey("users.id"))
    description: Mapped[str] = Column(Text)
    skin_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("skin_item.id"), nullable=True)
    background_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("background_item.id"), nullable=True)
    effect_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("effect_item.id"), nullable=True)
    particle_item_id: Mapped[Optional[str]] = Column(String, ForeignKey("particle_item.id"), nullable=True)
    thumbnail_url: Mapped[str] = Column(String)
    thumbnail_hash: Mapped[str] = Column(String)
    playdata_url: Mapped[str] = Column(String)
    playdata_hash: Mapped[str] = Column(String)
    watchdata_url: Mapped[str] = Column(String)
    watchdata_hash: Mapped[str] = Column(String)
    previewdata_url: Mapped[str] = Column(String)
    previewdata_hash: Mapped[str] = Column(String)
    tutorialdata_url: Mapped[str] = Column(String)
    tutorialdata_hash: Mapped[str] = Column(String)
    rom_url: Mapped[str] = Column(String)
    rom_hash: Mapped[str] = Column(String)
    configuration_url: Mapped[str] = Column(String)
    configuration_hash: Mapped[str] = Column(String)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)
    updated_at: Mapped[int] = Column(BIGINT, default=get_timestamp, onupdate=get_timestamp)

    author_user: Mapped[Optional["User"]] = relationship("User", back_populates="engine_items")
    tags: Mapped[list["EngineItemTag"]] = relationship("EngineItemTag", back_populates="engine_item")
    charts: Mapped[list["Chart"]] = relationship("Chart", back_populates="engine_item")
    skin_item: Mapped[Optional["SkinItem"]] = relationship("SkinItem")
    background_item: Mapped[Optional["BackgroundItem"]] = relationship("BackgroundItem")
    effect_item: Mapped[Optional["EffectItem"]] = relationship("EffectItem")
    particle_item: Mapped[Optional["ParticleItem"]] = relationship("ParticleItem")


class EngineItemTag(TagBase):
    __tablename__ = "engine_item_tag"
    engine_item_id: Mapped[str] = Column(String, ForeignKey("engine_item.id"), primary_key=True)
    created_at: Mapped[int] = Column(BIGINT, default=get_timestamp)

    engine_item: Mapped["EngineItem"] = relationship("EngineItem", back_populates="tags")