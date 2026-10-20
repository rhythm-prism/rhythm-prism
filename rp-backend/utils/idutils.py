import secrets
import jwt
import datetime
import uuid
from ulid import ULID
from fastapi import HTTPException, status

from const.env import (
    JWT_SECRET_KEY
)
from utils.time import get_datetime



ALGORITHM   = "HS256"
CUSTOM_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

def _generate_id(length: int) -> str:
    return "".join(secrets.choice(CUSTOM_ALPHABET) for _ in range(length))

def generate_post_id(length: int = 9) -> str:
    return _generate_id(length)

def generate_chart_id(length: int = 10) -> str:
    return _generate_id(length)

def generate_background_id(length: int = 11) -> str:
    return _generate_id(length)

def generate_comment_id(length: int = 15) -> str:
    return _generate_id(length)

def generate_sonolus_session_id(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "type": "sonolus",
        "exp": get_datetime() + datetime.timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=ALGORITHM)

def decode_sonolus_session_id(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        if payload["type"] != "sonolus":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Access Denied")
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Access Denied")

def generate_user_id() -> str:
    return str(ULID.from_datetime(get_datetime()))

def generate_auth_id() -> str:
    return str(uuid.uuid4())