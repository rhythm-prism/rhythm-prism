from redis.asyncio import Redis
from const.env import REDIS_URL



redis_client = Redis.from_url(REDIS_URL, decode_responses=True)