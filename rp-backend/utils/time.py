# 日本時間のtimestampとdatetimeを返します

import datetime


def get_datetime() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))

def get_timestamp() -> int:
    return int(get_datetime().timestamp())
    
def convert_timestamp_to_datetime(timestamp: int) -> datetime.datetime:
    return datetime.datetime.fromtimestamp(timestamp, datetime.timezone(datetime.timedelta(hours=9)))