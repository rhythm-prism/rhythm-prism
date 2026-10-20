from typing import Optional
from fastapi import Cookie, HTTPException, status

from utils.auth import decode_token



def get_current_user_id(
    access_token: Optional[str] = Cookie(None),
):
    if access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return decode_token(access_token)

def get_current_user_id_optional(access_token: Optional[str] = Cookie(None)):
    """
    セッショントークンが正しいものであるかチェックし、ユーザーIDを返します。
    access_tokenがない場合でもエラーを吐かずに実行され、ない場合はNoneが返ります。
    """
    if access_token is None:
        return None
    
    return decode_token(access_token)