from enum import IntEnum



# ジャンル
class MusicGenre(IntEnum):
    VOCALOID    = 1
    RHYTHM_GAME = 2
    POPS        = 3
    ANIME       = 4
    VARIETY     = 5
    MEME        = 6
    OTHER       = 999
    
    @property
    def color(self):
        c = {
            MusicGenre.VOCALOID:    0xA9AFB8,
            MusicGenre.RHYTHM_GAME: 0xB89FD1,
            MusicGenre.POPS:        0x7FBEDC,
            MusicGenre.ANIME:       0xD9C25E,
            MusicGenre.VARIETY:     0x7FC276,
            MusicGenre.MEME:        0xD97A96,
            MusicGenre.OTHER:       0xC9B49C
        }
        return c[self]

    @property
    def display_name(self):
        n = {
            MusicGenre.VOCALOID:    "ボーカロイド",
            MusicGenre.RHYTHM_GAME: "音楽ゲーム",
            MusicGenre.POPS:        "ポップス",
            MusicGenre.ANIME:       "アニメ",
            MusicGenre.VARIETY:     "バラエティ",
            MusicGenre.MEME:        "ミーム",
            MusicGenre.OTHER:       "その他"
        }
        return n[self]
    
    @classmethod
    def get_all(cls) -> list[MusicGenre]:
        return [ genre for genre in cls ]

# 公開状態
class ChartPublishStatus(IntEnum):
    PRIVATE   = 0
    SCHEDULED = 1
    PUBLIC    = 100

# 譜面ファイルを公開するか
class ChartFilePublishStatus(IntEnum):
    PRIVATE = 0
    PUBLIC  = 1

# 合作
class CollaboStatus(IntEnum):
    DISABLE = 0
    ENABLE  = 1
    
# R18
class R18Status(IntEnum):
    SAFE = 0
    R18  = 1

# 難易度
class ChartDifficulty(IntEnum):
    EASY = 1
    NORMAL = 2
    HARD = 3
    EXPERT = 4
    MASTER = 5
    APPEND = 6
    
    @property
    def display_name(self):
        n = {
            ChartDifficulty.EASY:   "EASY",
            ChartDifficulty.NORMAL: "NORMAL",
            ChartDifficulty.HARD:   "HARD",
            ChartDifficulty.EXPERT: "EXPERT",
            ChartDifficulty.MASTER: "MASTER",
            ChartDifficulty.APPEND: "APPEND"
        }
        return n[self]

# 最大ファイルサイズ
class ChartFileSize(IntEnum):
    CHART  = 1024 * 1024 * 60    # 60MB
    BGM    = 1024 * 1024 * 30    # 30MB
    JACKET = 1024 * 1024 * 5     # 5MB
    
    @classmethod
    def total(cls) -> int:
        return cls.CHART + cls.BGM + cls.JACKET

# 変換状態
# ステータスに対してAND演算を行うことで、変換状況を取得できる
class ChartConversionStatus:
    CHART_COMPLETE    = 1 << 0                                              # 0b001 = 1
    BGM_COMPLETE      = 1 << 1                                              # 0b010 = 2
    JACKET_COMPLETE   = 1 << 2                                              # 0b100 = 4
    COMPLETE = CHART_COMPLETE | BGM_COMPLETE | JACKET_COMPLETE     # 0b111 = 7