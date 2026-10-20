from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

from db.session import SessionMakerSync
from db.models import Chart
from const.chart import ChartPublishStatus
from utils.time import get_timestamp



scheduler = BackgroundScheduler(timezone="Asia/Tokyo")

def set_chart_public(chart_id: str):
    session = SessionMakerSync()

    chart = session.get(Chart, chart_id)

    # 何らかの理由により、予約投稿状態ではなくなった場合は処理しない。
    if chart.publish_status != ChartPublishStatus.SCHEDULED:
        return

    # 公開状態にする
    chart.publish_status = ChartPublishStatus.PUBLIC.value

    # first_published_atが空(=初めて公開にする)場合は、現在時刻をセットする
    if chart.first_published_at is None:
        chart.first_published_at = get_timestamp()

    session.commit()
    session.close()

def add_post_chart_schedule(chart_id: str, post_time: datetime):
    scheduler.add_job(
        set_chart_public,
        "date",
        run_date = post_time,
        id = chart_id,
        args = [chart_id]
    )
    
def delete_post_chart_schedule(chart_id: str):
    scheduler.remove_job(job_id = chart_id)