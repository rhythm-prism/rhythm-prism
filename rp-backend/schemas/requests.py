from pydantic import BaseModel, field_validator, model_validator, Field
from typing import Optional, List
from sonolus_models import SonolusIcon

from const.chart import MusicGenre, ChartPublishStatus, ChartFilePublishStatus, R18Status, ChartDifficulty
from const.user import UserPermission, UserCharterAuthApprovalState
from utils.exceptions import RPException



class ChartPostRequest(BaseModel):
    """
    譜面投稿時のリクエスト。
    ・POST /api/chart
    ・
    """
    
    title:                     str
    composer:                  str
    vocal:                     str
    genre:                     MusicGenre
    difficulty:                ChartDifficulty
    rating:                    int
    display_name:              str = Field(..., alias="displayName")
    description:               str
    publish_status:            ChartPublishStatus = Field(..., alias="publishStatus")
    scheduled_at:              Optional[int] = Field(None, alias="scheduledAt")
    r18:                       R18Status
    collaborators:             List[str]
    tags:                      List[int]
    chart_file_publish_status: ChartFilePublishStatus = Field(..., alias="chartFilePublishStatus")
    start_time:                float = Field(..., alias="startTime", ge=0, allow_inf_nan=False)
    
    @field_validator("title", "composer", "vocal", "display_name")
    @classmethod
    def validate_under_50_chars(cls, value: str) -> str:
        if len(value) > 50:
            raise RPException.ValidationError(detail="タイトル、アーティスト、ボーカル、表示名は50文字以下である必要があります。")
        return value
    
    @field_validator("description")
    @classmethod
    def validate_under_200_chars(cls, value: str) -> str:
        if len(value) > 200:
            raise RPException.ValidationError(detail="説明は200文字以下である必要があります。")
        return value

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, value: int) -> int:
        if (
            value < 0 or
            value > 50
        ):
            raise RPException.ValidationError(detail="難易度は0～50の範囲の整数で指定する必要があります。")
        return value
    
    @field_validator("collaborators")
    @classmethod
    def validate_collaborators(cls, value: List):
        if len(value) > 20:
            raise RPException.ValidationError(detail="合作ユーザーは20人以内で指定する必要があります。")
        return value

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: List):
        if len(value) > 4:
            raise RPException.ValidationError(detail="タグは4個以内で指定する必要があります。")
        return value

    @model_validator(mode="after")
    def validate_scheduled_at(self):
        if (
            self.publish_status == ChartPublishStatus.SCHEDULED and
            self.scheduled_at is None
        ):
            raise RPException.ValidationError(detail="予約投稿をする場合は、投稿日時を指定する必要があります。")
        return self


class ChartEditRequest(BaseModel):
    """
    譜面編集時のリクエスト。
    ・PUT /api/chart
    ・
    """
    
    title:                     Optional[str] = None
    composer:                  Optional[str] = None
    vocal:                     Optional[str] = None
    genre:                     Optional[MusicGenre] = None
    difficulty:                Optional[ChartDifficulty] = None
    rating:                    Optional[int] = None
    display_name:              Optional[str] = Field(None, alias="displayName")
    description:               Optional[str] = None
    publish_status:            Optional[ChartPublishStatus] = Field(None, alias="publishStatus")
    scheduled_at:              Optional[int] = Field(None, alias="scheduledAt")
    r18:                       Optional[R18Status] = None
    collaborators:             Optional[List[str]] = None
    tags:                      Optional[List[int]] = None
    chart_file_publish_status: Optional[ChartFilePublishStatus] = Field(None, alias="chartFilePublishStatus")
    start_time:                Optional[float] = Field(None, alias="startTime", ge=0, allow_inf_nan=False)
    
    @field_validator("title", "composer", "vocal", "display_name")
    @classmethod
    def validate_under_50_chars(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            pass
        elif len(value) > 50:
            raise RPException.ValidationError(detail="タイトル、アーティスト、ボーカル、表示名は50文字以下である必要があります。")
        return value
    
    @field_validator("description")
    @classmethod
    def validate_under_200_chars(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            pass
        elif len(value) > 200:
            raise RPException.ValidationError(detail="説明は200文字以下である必要があります。")
        return value

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            pass
        elif (
            value < 0 or
            value > 50
        ):
            raise RPException.ValidationError(detail="難易度は0～50の範囲の整数で指定する必要があります。")
        return value

    @field_validator("collaborators")
    @classmethod
    def validate_collaborators(cls, value: Optional[List]) -> Optional[List]:
        if value is None:
            pass
        if len(value) > 20:
            raise RPException.ValidationError(detail="合作ユーザーは20人以内で指定する必要があります。")
        return value

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: Optional[List]) -> Optional[List]:
        if value is None:
            pass
        if len(value) > 4:
            raise RPException.ValidationError(detail="タグは4個以内で指定する必要があります。")
        return value

    @model_validator(mode="after")
    def validate_scheduled_at(self):
        if self.publish_status is None:
            pass
        elif (
            self.publish_status == ChartPublishStatus.SCHEDULED and
            self.scheduled_at is None
        ):
            raise RPException.ValidationError(detail="予約投稿をする場合は、投稿日時を指定する必要があります。")
        return self


class ChartTagCreateRequest(BaseModel):
    """
    タグ追加時のリクエスト
    ・POST /api/chart/tag
    ・
    """
    
    title: str
    icon:  Optional[SonolusIcon] = None
    

class UserEditRequest(BaseModel):
    """
    ユーザー編集時のリクエスト
    ・PUT /api/user
    """
    
    name: Optional[str] = None
    profile: Optional[str] = None
    permission: Optional[UserPermission] = None
    
    @field_validator("profile")
    @classmethod
    def validate_profile(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            pass
        elif len(value) > 200:
            raise ValueError("プロフィールは200文字以下である必要があります。")
        return value


class AnnouncePostRequest(BaseModel):
    """
    お知らせ投稿時のリクエスト
    ・POST /api/announce
    """
    
    title:        str
    subtitle:     str
    display_name: str = Field(..., alias="displayName")
    description:  str


class AnnounceEditRequest(BaseModel):
    """
    お知らせ編集時のリクエスト
    ・PUT /api/announce
    """
    
    title:        Optional[str] = None
    subtitle:     Optional[str] = None
    display_name: Optional[str] = Field(None, alias="displayName") 
    description:  Optional[str] = None


class CharterAuthRequest(BaseModel):
    """
    作者承認を申請するリクエスト
    ・POST /api/auth/charter
    """

    chart_id: str


class CharterAuthApprovalRequest(BaseModel):
    """
    作者承認/却下するリクエスト
    ・POST /api/auth/charter/approval
    """

    status: UserCharterAuthApprovalState
    reason: Optional[str] = None