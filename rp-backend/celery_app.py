import asyncio
from celery import Celery
from celery.signals import worker_init

from const.env import (
    REDIS_URL
)
from assets.sonolus_item_resource import load_item_resource



celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["utils.convert_tasks"],
)


celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Tokyo",
    enable_utc=True,
    task_track_started=True,
)


@worker_init.connect
def on_worker_init(**kwargs):
    asyncio.run(load_item_resource())