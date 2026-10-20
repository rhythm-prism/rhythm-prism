import os
from dotenv import load_dotenv



load_dotenv()

# サービス名
SERVICE_NAME =   os.environ["SERVICE_NAME"]
SERVICE_PREFIX = os.environ["SERVICE_PREFIX"]

# source
SOURCE_URL = os.environ["SOURCE_URL"]

# url
HOST_URL = os.environ["HOST_URL"].rstrip("/")
LEVEL_CONVERTER_URL = os.environ["LEVEL_CONVERTER_URL"].rstrip("/")
REDIS_URL = os.environ["REDIS_URL"].rstrip("/")

# db
POSTGRES_USER =     os.environ["POSTGRES_USER"]
POSTGRES_PASSWORD = os.environ["POSTGRES_PASSWORD"]
POSTGRES_DB =       os.environ["POSTGRES_DB"]

# Discord Oauth2
DISCORD_API_URL =       os.environ["DISCORD_API_URL"]
DISCORD_OAUTH2_URL =    os.environ["DISCORD_OAUTH2_URL"]
DISCORD_CLIENT_ID =     os.environ["DISCORD_CLIENT_ID"]
DISCORD_CLIENT_SECRET = os.environ["DISCORD_CLIENT_SECRET"]

# Discord Bot
DISOCRD_BOT_TOKEN = os.environ["DISOCRD_BOT_TOKEN"]

# S3関連
S3_HOST =               os.environ["S3_HOST"].rstrip("/")
ITEM_RESOURCE_PREFIX =  os.environ["ITEM_RESOURCE_PREFIX"].lstrip("/").rstrip("/")
BUCKET_NAME =           os.environ["BUCKET_NAME"]
AWS_ENDPOINT_URL =      os.environ["AWS_ENDPOINT_URL"]
#API_TOKEN =             os.environ["API_TOKEN"]
AWS_ACCESS_KEY_ID =     os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]

# JWTトークン
JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]

# 権限の有無判別に使用
DISCORD_GUILD_ID =              os.environ["DISCORD_GUILD_ID"]
DISCORD_ADMINISTRATOR_ROLE_ID = os.environ["DISCORD_ADMINISTRATOR_ROLE_ID"]
DISCORD_MODERATOR_ROLE_ID =     os.environ["DISCORD_MODERATOR_ROLE_ID"]
DISCORD_CHARTER_ROLE_ID =       os.environ["DISCORD_CHARTER_ROLE_ID"]

# 新着譜面のwebhook
DISCORD_WEBHOOK_URL = os.environ["DISCORD_WEBHOOK_URL"]

# 通知webhook
DISCORD_NOTICE_URL = os.environ["DISCORD_NOTICE_URL"]

USE_UVICORN = os.environ["USE_UVICORN"]