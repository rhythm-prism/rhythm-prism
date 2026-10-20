import asyncio
import aioboto3
from fastapi import HTTPException, status

from const.env import (
    BUCKET_NAME,
    AWS_ENDPOINT_URL,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY
)
from schemas.storage import UploadData



async def _upload(s3, key: str, data: bytes):
    try:
        await s3.put_object(Bucket=BUCKET_NAME, Key=key, Body=data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

async def upload_s3(upload_data: list[UploadData]):
    """
    s3にファイルをアップロードする。
    """
    if len(upload_data) == 0:
        return
    
    session = aioboto3.Session()
    
    async with session.client(
        "s3",
        endpoint_url = AWS_ENDPOINT_URL,
        aws_access_key_id = AWS_ACCESS_KEY_ID,
        aws_secret_access_key = AWS_SECRET_ACCESS_KEY
    ) as s3:
        await asyncio.gather(
            *[ _upload(s3, i.key, i.data) for i in upload_data ]
        )

async def _delete(s3, key: str):
    try:
        await s3.delete_object(Bucket=BUCKET_NAME, Key=key)
    except Exception as e:
        pass

async def delete_s3(keys: list[str]):
    """
    s3上のファイルを削除する。
    """
    if len(keys) == 0:
        return
    
    session = aioboto3.Session()
    
    async with session.client(
        "s3",
        endpoint_url = AWS_ENDPOINT_URL,
        aws_access_key_id = AWS_ACCESS_KEY_ID,
        aws_secret_access_key = AWS_SECRET_ACCESS_KEY
    ) as s3:
        await asyncio.gather(
            *[ _delete(s3, i) for i in keys ]
        )