from fastapi import HTTPException, status



class RPException:
    """
    RhythmPrismで使用するExceptionをまとめたもの。
    各ExceptionはFastAPIのHTTPExceptionを継承している。
    メンテナンスの手間軽減やエンドポイントごとの差異をなくす。
    """
    
    class TagDuplicated(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_400_BAD_REQUEST,
            detail: str = "この名前のタグは既に作成されています。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )
            
    class InvalidRequest(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_400_BAD_REQUEST,
            detail: str = "無効なリクエストです。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )
            
    class NoPostTypeAnnounce(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_400_BAD_REQUEST,
            detail: str = "この投稿はアナウンスではありません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class CharterAuthRequestNotClosed(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_400_BAD_REQUEST,
            detail: str = "申請結果が確定していない申請があるため、新規の申請を行うことができません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )
    
    class InvalidToken(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail: str = "トークンが間違っています。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )
            
    class RequiredSonolusLogin(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail: str = "この操作にはログインが必要です。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class UserBanned(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_403_FORBIDDEN,
            detail: str = "BANされているため、アクセスが禁止されています。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class NoPermission(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_403_FORBIDDEN,
            detail: str = "この操作を行う権限がありません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class ChartPostLimitError(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_403_FORBIDDEN,
            detail: str = "投稿譜面数が上限に達しています。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )
    
    class UserNotFound(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_404_NOT_FOUND,
            detail: str = "ユーザーが見つかりません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class ChartNotFound(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_404_NOT_FOUND,
            detail: str = "譜面が見つかりません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class TagNotFound(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_404_NOT_FOUND,
            detail: str = "タグが見つかりません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class BackgroundNotFound(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_404_NOT_FOUND,
            detail: str = "背景が見つかりません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class AuthRecordNotFound(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_404_NOT_FOUND,
            detail: str = "認証用データがありません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )
            
    class PostNotFound(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_404_NOT_FOUND,
            detail: str = "投稿がありません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class CharterAuthRequestNotFound(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_404_NOT_FOUND,
            detail: str = "作者承認申請が見つかりませんでした。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )
            
    class CharterAuthApprovalNotFound(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_404_NOT_FOUND,
            detail: str = "承認レコードが見つかりませんでした。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class FileSizeTooLarge(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_413_CONTENT_TOO_LARGE,
            detail: str = "ファイルサイズが大きすぎます！", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )
    
    class ValidationError(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail: str = "リクエスト内容が許容されていません。（バリデーションエラー）", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class ChartConversionNotComplete(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail: str = "譜面の変換が終了していません。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )

    class ChartFileDownloadError(HTTPException):
        def __init__(
            self,
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail: str = "譜面ファイルのダウンロードに失敗しました。", 
            headers =     None
        ):
            super().__init__(
                status_code = status_code,
                detail =      detail,
                headers =     headers
            )