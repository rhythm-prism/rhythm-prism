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
    ServerServerItemOption,
    SonolusIcon
)

from const.sonolus.searches import RPSonolusServerFormSearchOptions



class RPSonolusServerFormOptions:
    INPUT_COMMENT_AREA = ServerTextAreaOption(
        query = "content",
        name = "コメント",
        required = True,
        def_ = "",
        placeholder = "コメントを入力してください...",
        limit = 500,
        shortcuts = ["素敵な譜面をありがとうございます！", "とてもいい譜面でした！", "楽しかったです！"]
    )


class RPSonolusServerForm:
    SEARCH_LEVEL = ServerForm(
        type = "advanced",
        title = "詳細検索",
        require_confirmation = False,
        options = [
            RPSonolusServerFormSearchOptions.SEARCH_FROM_TITLE,
            RPSonolusServerFormSearchOptions.SEARCH_FROM_COMPOSER,
            RPSonolusServerFormSearchOptions.SEARCH_FROM_VOCAL,
            RPSonolusServerFormSearchOptions.SEARCH_FROM_RATING,
            RPSonolusServerFormSearchOptions.get_search_from_genre(),
            RPSonolusServerFormSearchOptions.ENABLE_R18,
            RPSonolusServerFormSearchOptions.SEARCH_FROM_DISPLAY_NAME,
            RPSonolusServerFormSearchOptions.SEARCH_FROM_HANDLE,
            
        ]
    )
    
    POST_COMMENT = ServerForm(
        type = "advanced",
        title = "コメントする！",
        requireConfirmation = False,
        options = [
            RPSonolusServerFormOptions.INPUT_COMMENT_AREA
        ]
    )
    
    LIKE = ServerForm(
        type = "like",
        title = "いいね",
        icon = SonolusIcon.HeartHollow,
        requireConfirmation = False,
        options = [
        ]
    )
    
    UNLIKE = ServerForm(
        type = "unlike",
        title = "いいね取消",
        icon = SonolusIcon.Heart,
        requireConfirmation = False,
        options = [
        ]
    )