import sqlalchemy as sql
from sqlalchemy.orm import joinedload, selectinload
from sonolus_models import (
    ServerItemInfo,
    ServerForm,
    PostSection,
    LevelSection,
    SonolusText,
    ServerTextOption,
    ServerToggleOption,
    ServerSliderOption,
    ServerTextAreaOption,
    SonolusIcon,
    ServerMultiOption,
    SelectValue
)

from const.chart import MusicGenre
from db.session import create_session_context



class RPSonolusServerFormSearchOptions:
    SEARCH_FROM_TITLE = ServerTextOption(
        query = "title",
        name = "曲名",
        description = "タイトルから検索します。",
        required = False,
        def_ = "",
        placeholder = "曲名",
        limit = 50,
        shortcuts = []
    )
    
    SEARCH_FROM_COMPOSER = ServerTextOption(
        query = "composer",
        name = "作曲者",
        description = "作曲者から検索します。",
        required = False,
        def_ = "",
        placeholder = "作曲者",
        limit = 50,
        shortcuts = []
    )

    SEARCH_FROM_VOCAL = ServerTextOption(
        query = "vocal",
        name = "歌唱者",
        description = "歌唱者から検索します。",
        required = False,
        def_ = "",
        placeholder = "歌唱者",
        limit = 50,
        shortcuts = []
    )
    
    SEARCH_FROM_DISPLAY_NAME = ServerTextOption(
        query = "author_name",
        name = "表示名",
        description = "譜面ごとに設定された表示名から検索します。",
        required = False,
        def_ = "",
        placeholder = "表示名",
        limit = 50,
        shortcuts = []
    )
    
    SEARCH_FROM_HANDLE = ServerTextOption(
        query = "author_handle",
        name = "ハンドル",
        description = "ハンドル（#○○○○）から検索します。",
        required = False,
        def_ = "",
        placeholder = "ハンドル",
        limit = 10,
        shortcuts = []
    )
    
    SEARCH_FROM_RATING = ServerSliderOption(
        query = "rating",
        name = "難易度",
        description = "難易度から検索します。",
        required = False,
        def_ = -1.0,
        min = -1.0,
        max = 50.0,
        step = 1.0
    )

    ENABLE_R18 = ServerToggleOption(
        query = "r18",
        name = "R18",
        description = "R18楽曲を表示するか",
        required = False,
        def_ = False
    )
    
    def get_search_from_genre() -> ServerMultiOption:
            
        genre = [
            (
                SelectValue(
                    name = str(genre.value),
                    title = genre.display_name
                ),
                False
            )
            for genre in MusicGenre.get_all()
        ]

        value, default = zip(*genre)
                      
        return ServerMultiOption(
            query = "genre",
            name = "ジャンル",
            description = "ジャンルから検索します。",
            required = False,
            def_ = default,
            values = value
        )