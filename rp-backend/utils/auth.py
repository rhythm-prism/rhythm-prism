import os
import jwt
import base64
import datetime
from fastapi import HTTPException, status, Response
from fastapi.responses import JSONResponse
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils

from const.env import (
    JWT_SECRET_KEY
)
from utils.time import get_datetime



ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 1
REFRESH_TOKEN_EXPIRE_DAYS = 30

ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24 * ACCESS_TOKEN_EXPIRE_DAYS
REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * REFRESH_TOKEN_EXPIRE_DAYS 

def create_token(user_id: str, expire_days: int = 30):
    """
    JWTトークンを発行します。
    """
    payload = {
        "user_id": user_id,
        "exp": get_datetime() + datetime.timedelta(expire_days)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> str:
    """
    トークンからユーザーIDを返します。
    トークンの有効期限が切れていた場合は401を吐きます。
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Access Denied")
    
def set_access_token(response: Response, user_id: str):
    access_token = create_token(user_id, expire_days=ACCESS_TOKEN_EXPIRE_DAYS)
    response.set_cookie(
        key = "access_token",
        value = access_token,
        httponly = True,
        #secure = True,
        samesite = "lax",
        max_age = ACCESS_TOKEN_MAX_AGE,
        path = "/"
    )

def set_refresh_token(response: Response, user_id: str):
    refresh_token = create_token(user_id, expire_days=REFRESH_TOKEN_EXPIRE_DAYS)
    response.set_cookie(
        key = "refresh_token",
        value = refresh_token,
        httponly = True,
        #secure = True,
        samesite = "lax",
        max_age = REFRESH_TOKEN_MAX_AGE,
        path = "/api/auth/refresh"
    )

def delete_access_token(response: Response):
    response.delete_cookie(key="access_token", path="/")

def delete_refresh_token(response: Response):
    response.delete_cookie(key="refresh_token", path="/api/auth/refresh")

def _decode_b64(value: str) -> bytes:
    return base64.b64decode(
        value + "=" * (-len(value) % 4),
        altchars=b"-_",
        validate=True
    )

SONOLUS_JWK = {
    "key_ops": ["verify"],
    "ext": True,
    "kty": "EC",
    "x": "d2B14ZAn-zDsqY42rHofst8rw3XB90-a5lT80NFdXo0",
    "y": "Hxzi9DHrlJ4CVSJVRnydxFWBZAgkFxZXbyxPSa8SJQw",
    "crv": "P-256"
}

X_BYTES = _decode_b64(SONOLUS_JWK["x"])
Y_BYTES = _decode_b64(SONOLUS_JWK["y"])

PUBLIC_KEY = ec.EllipticCurvePublicNumbers(
    x=int.from_bytes(X_BYTES, "big"),
    y=int.from_bytes(Y_BYTES, "big"),
    curve=ec.SECP256R1()
).public_key()

def verify_sonolus_signature(signature: str, body: bytes) -> bool:
    """
    Sonolus-Signatureを検証する
    """
    
    signature = _decode_b64(signature)
    
    if len(signature) != 64:
        return False
    
    r = int.from_bytes(signature[:32], "big")
    s = int.from_bytes(signature[32:], "big")

    try:
        PUBLIC_KEY.verify(
            utils.encode_dss_signature(r, s), 
            body, 
            ec.ECDSA(hashes.SHA256())
        )
        return True
    except InvalidSignature:
        return False