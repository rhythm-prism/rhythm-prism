from enum import IntEnum



# 権限
class UserPermission(IntEnum):
    BANNED             = -99
    NORMAL             = 0
    CHARTER            = 10
    AUTHORIZED_CHARTER = 11
    MODERATOR          = 80
    ADMINISTRATOR      = 99

# 最大ファイルサイズ
class UserFileSize(IntEnum):
    ICON = 1024 * 1024 * 10     # 10MB
    
# アイコンさいず
class UserIconDimensions(IntEnum):
    WIDTH = 300
    HEIGHT = 300

# 作者承認のステータス（却下 or 承認）
class UserCharterAuthApprovalState(IntEnum):
    REJECT = 0
    APPROVE = 1

#　作者承認の基準
class UserCharterAuthRequiredApprovalCount(IntEnum):
    REJECT = 2
    APPROVE = 2

# 支援者
class UserSupporterLevel(IntEnum):
    NORMAL = 0
    LV1 = 1
    LV2 = 2
    LV3 = 3

# 最大譜面投稿数
class UserChartPostLimit(IntEnum):
    PRIVATE = 5
    ALL = 100