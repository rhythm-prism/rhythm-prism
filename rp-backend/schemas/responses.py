from pydantic import BaseModel, Field
from typing import Optional, List
from sonolus_models import SonolusResourceLocator
from const.chart import (
    ChartPublishStatus,
    MusicGenre,
    ChartDifficulty
)



class ChartTagResponse(BaseModel):
    """
    タグ情報
    """
    
    id:              int
    title:           str
    icon:            Optional[str] = None
    created_at:      int = Field(..., alias="createdAt")
    updated_at:      int = Field(..., alias="updatedAt")
    created_user_id: Optional[str] = Field(None, alias="createdUserId")

###########################################################################

class ChartEventSimpleInfoResponse(BaseModel):
    """
    イベントの基本情報
    """
    
    id:         str
    title:      str
    author:     str
    thumbnail:  SonolusResourceLocator
    start_at:   int
    end_at:     int


class ChartEventDetailInfoResponse(ChartEventSimpleInfoResponse):
    """
    イベントの詳細情報
    """
    
    description: str
    
###########################################################################

class UserDataSimpleInfoResponse(BaseModel):
    """
    ユーザーの基本情報
    """
    
    id:         str 
    name:       str
    icon_url:   Optional[str] = Field(None, alias="iconUrl")
    

class UserDataDetailInfoResponse(UserDataSimpleInfoResponse):
    """
    ユーザーの詳細情報
    """

    profile:        str
    discord_id:     int = Field(..., alias="discordId")
    discord_name:   str = Field(..., alias="discordName")
    sonolus_id:     Optional[str] = Field(None, alias="sonolusId")
    sonolus_handle: Optional[int] = Field(None, alias="sonolusHandle")
    sonolus_name:   Optional[str] = Field(None, alias="sonolusName")
    warning_count:  Optional[int] = Field(None, alias="warningCount")
    permission:     Optional[int] = None

###########################################################################

class ChartSimpleInfoResponse(BaseModel):
    """
    譜面の基本情報
    """
    
    id:                 str
    rating:             int
    title:              str
    composer:           Optional[str] = None
    vocal:              Optional[str] = None
    author:             str
    genre:              MusicGenre
    difficulty:         ChartDifficulty
    collabo:            bool
    r18:                bool
    likes:              int
    first_published_at: Optional[int] = Field(None, alias="firstPublishedAt")
    jacket:             Optional[SonolusResourceLocator] = None
    publish_status:     ChartPublishStatus = Field(..., alias="publishStatus")
    events:             List[ChartEventSimpleInfoResponse]
    tags:               List[ChartTagResponse]


class ChartDetailInfoResponse(ChartSimpleInfoResponse):
    """
    譜面の詳細情報
    """

    author_user:        UserDataSimpleInfoResponse = Field(..., alias="authorUser")
    description:        Optional[str] = None
    updated_at:         int = Field(..., alias="updatedAt")
    original_chart:     Optional[SonolusResourceLocator] = Field(None, alias="originalChart")
    level_data:         Optional[SonolusResourceLocator] = Field(None, alias="levelData")
    bgm:                Optional[SonolusResourceLocator] = None
    preview:            Optional[SonolusResourceLocator] = None
    conversion_status:  int = Field(..., alias="conversionStatus")
    events:             List[ChartEventDetailInfoResponse]
    collaborator_users: List[UserDataSimpleInfoResponse] = Field(default_factory=list, alias="collaboratorUsers")
    

class ChartSimpleInfoListResponse(BaseModel):
    """
    GET /api/chart/search
    """
    
    charts: List[ChartSimpleInfoResponse]
    next:   bool                            # 次の譜面があるか
    cursor: Optional[str] = None            # 次にクライアントからリクエストを送るときに指定するカーソル（Base64）
    
###########################################################################

class AnnounceInfoResponse(BaseModel):
    """
    お知らせ情報
    """

    id: str
    title: str
    subtitle: str
    display_name: str = Field(..., alias="displayName")
    author_user: UserDataSimpleInfoResponse = Field(..., alias="authorUser")
    description: str
    thumbnail: SonolusResourceLocator
    banner: SonolusResourceLocator
    created_at: int = Field(..., alias="createdAt")
    
    
class AnnounceInfoListResponse(BaseModel):
    """
    GET /api/announce
    """
    
    announcements: List[AnnounceInfoResponse]
    
###########################################################################

class CharterAuthApprovalResponse(BaseModel):
    """
    承認情報
    """

    id: str
    reviewer: UserDataSimpleInfoResponse
    status: int
    reason: Optional[str]
    created_at: int = Field(..., alias="createdAt")


class CharterAuthStateResponse(BaseModel):
    """
    申請情報
    """

    id: str
    request_user: UserDataSimpleInfoResponse = Field(..., alias="requestUser")
    chart: ChartSimpleInfoResponse
    is_closed: bool = Field(..., alias="isClosed")
    created_at: int = Field(..., alias="createdAt")
    approvals: List[CharterAuthApprovalResponse]


class CharterAuthListResponse(BaseModel):
    """
    GET /api/auth/charter/request
    GET /api/auth/charter/requests
    GET /api/auth/charter/requests/pending
    """

    charter_auth_requests: List[CharterAuthStateResponse] = Field(..., alias="charterAuthRequests")

###########################################################################

class ServerInfoChartResponse(BaseModel):
    """
    サーバー譜面情報
    """
    
    public_count: int = Field(..., alias="publicCount")
    private_count: int = Field(..., alias="privateCount")
    delete_count: int = Field(..., alias="deleteCount")
    

class ServerInfoResponse(BaseModel):
    """
    GET /api/server/info
    """
    
    chart: ServerInfoChartResponse