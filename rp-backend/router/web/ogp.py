import html
import sqlalchemy as sql
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, Response

from const.env import HOST_URL, SERVICE_NAME
from const.chart import MusicGenre
from db.session import create_session
from db.models import Chart as ChartDB, ChartTag as ChartTagDB



router = APIRouter()

TOP_IMAGE_URL = f"{HOST_URL}/api/ogp/icon"

def render_ogp_page(
    title: str,
    description: str,
    image_url: str,
    page_url: str,
    site_name: str,
    theme_color: str | None = None
) -> str:
    title = html.escape(title)
    description = html.escape(description)
    image_url = html.escape(image_url)
    page_url = html.escape(page_url)
    site_name = html.escape(site_name)

    theme_color_tag = f'<meta name="theme-color" content="{html.escape(theme_color)}">' if theme_color else ""

    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="{site_name}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{image_url}">
<meta property="og:url" content="{page_url}">
<meta name="twitter:card" content="summary_large_image">
{theme_color_tag}
</head>
<body></body>
</html>
"""

@router.get("/ogp", response_class=HTMLResponse)
async def ogp_top():
    """
    トップ画面用のOGP埋め込みを返すエンドポイント。
    Discord等のリンク展開ボット向けにnginxから振り分けられる。
    GET /api/ogp
    """

    return render_ogp_page(
        title = "RhythmPrism",
        description = "Sonolus向け譜面共有プラットフォーム",
        image_url = TOP_IMAGE_URL,
        page_url = HOST_URL,
        site_name = SERVICE_NAME
    )

@router.get("/ogp/chart/{chart_id}", response_class=HTMLResponse)
async def ogp_chart(
    chart_id: str,
    session: AsyncSession = Depends(create_session)
):
    """
    譜面詳細画面用のOGP埋め込みを返すエンドポイント。
    Discord等のリンク展開ボット向けにnginxから振り分けられる。
    GET /api/ogp/chart/{chart_id}
    """

    stmt = sql\
            .select(ChartDB)\
            .where(
                ChartDB.is_deleted.is_(False),
                ChartDB.id == chart_id
            )\
            .options(
                selectinload(ChartDB.tags)
                .selectinload(ChartTagDB.tag_master),

                selectinload(ChartDB.author_user)
            )

    chart = (await session.execute(stmt)).scalar()

    if chart is None:
        return render_ogp_page(
            title = "RhythmPrism",
            description = "指定された譜面が見つかりませんでした",
            image_url = TOP_IMAGE_URL,
            page_url = f"{HOST_URL}/chart/{chart_id}",
            site_name = SERVICE_NAME
        )

    genre = MusicGenre(chart.genre)
    tag_text = "、".join(t.tag_master.title for t in chart.tags) if len(chart.tags) != 0 else "なし"

    return render_ogp_page(
        title = " / ".join([i for i in [chart.title, chart.composer, chart.vocal] if i != ""]),
        description = f"Lv.{chart.rating}\n\n{chart.description}\n\nジャンル: {genre.display_name}\nタグ: {tag_text}",
        image_url = chart.jacket_url,
        page_url = f"{HOST_URL}/chart/{chart.id}",
        site_name = f"{chart.author}#{chart.author_user.sonolus_handle}",
        theme_color = f"#{genre.color:06X}"
    )
