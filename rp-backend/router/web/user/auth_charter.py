import json
import httpx
import sqlalchemy as sql
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, status
from sonolus_models import (
    SonolusResourceLocator
)

from const.env import (
    DISCORD_API_URL,
    DISCORD_GUILD_ID,
    DISOCRD_BOT_TOKEN,
    DISCORD_CHARTER_ROLE_ID
)
from const.user import UserPermission, UserCharterAuthRequiredApprovalCount, UserCharterAuthApprovalState
from const.chart import ChartConversionStatus
from db.session import create_session
from schemas.responses import (
    UserDataSimpleInfoResponse, 
    ChartSimpleInfoResponse,
    CharterAuthApprovalResponse,
    CharterAuthStateResponse,
    CharterAuthListResponse
)
from schemas.requests import (
    CharterAuthRequest,
    CharterAuthApprovalRequest
)
from utils.exceptions import RPException
from utils.dependencies import get_current_user_id
from utils.idutils import generate_auth_id
from utils.webhook import send_charter_auth_request_notice
from db.models import (
    User as UserDB,
    Chart as ChartDB,
    CharterAuthRequest as CharterAuthRequestDB,
    CharterAuthApproval as CharterAuthApprovalDB
)



router = APIRouter()

def _to_charter_auth_state_response(req: CharterAuthRequestDB) -> CharterAuthStateResponse:
    return CharterAuthStateResponse(
        id=req.id,
        requestUser=UserDataSimpleInfoResponse(
            id=req.request_user.id,
            name=req.request_user.name,
            iconUrl=req.request_user.icon_url
        ),
        chart=ChartSimpleInfoResponse(
            id=req.chart.id,
            rating=req.chart.rating,
            title=req.chart.title,
            composer=req.chart.composer,
            vocal=req.chart.vocal,
            author=req.chart.author,
            genre=req.chart.genre,
            difficulty=req.chart.difficulty,
            collabo=req.chart.collabo,
            r18=req.chart.r18,
            likes=req.chart.likes_count,
            firstPublishedAt=req.chart.first_published_at,
            jacket=SonolusResourceLocator(
                hash=req.chart.jacket_hash,
                url=req.chart.jacket_url
            ),
            publishStatus=req.chart.publish_status,
            events=[],
            tags=[]
        ),
        isClosed=req.is_closed,
        createdAt=req.created_at,
        approvals=[
            CharterAuthApprovalResponse(
                reviewer=UserDataSimpleInfoResponse(
                    id=approval.reviewer.id,
                    name=approval.reviewer.name,
                    iconUrl=approval.reviewer.icon_url
                ),
                status=approval.status,
                reason=approval.reason,
                createdAt=approval.created_at
            )
            for approval in req.approvals
        ]
    )

@router.get("/auth/charter/requests/pending", response_model=CharterAuthListResponse)
async def get_auth_charter_request_pending(
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    現在審査が完了していない申請を返すエンドポイント。
    GET /api/auth/charter/requests/pending
    """

    user = await session.get(UserDB, user_id)

    # ユーザーが正常に取得できなかった場合
    if user is None:
        raise RPException.UserNotFound()
    # ユーザーがBANされていた場合
    elif user.permission < UserPermission.NORMAL:
        raise RPException.UserBanned()
    # 認証作者未満の場合
    elif user.permission < UserPermission.AUTHORIZED_CHARTER:
        raise RPException.NoPermission()

    stmt = sql.select(CharterAuthRequestDB)\
              .where(CharterAuthRequestDB.is_closed.is_(False))\
              .options(
                  selectinload(CharterAuthRequestDB.approvals)\
                  .joinedload(CharterAuthApprovalDB.reviewer),

                  joinedload(CharterAuthRequestDB.request_user),

                  joinedload(CharterAuthRequestDB.chart)
              )\
              .order_by(CharterAuthRequestDB.created_at.asc())

    auth_requests = (await session.execute(stmt)).scalars().all()

    return CharterAuthListResponse(
        charterAuthRequests=[
            _to_charter_auth_state_response(req)
            for req in auth_requests
        ]
    )

@router.get("/auth/charter/requests", response_model=CharterAuthListResponse)
async def get_auth_charter_request(
    target_user_id: str,
    operator_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    ユーザーの作者承認リクエスト情報を返すエンドポイント。
    GET /api/auth/charter/requests
    """

    operator_user = await session.get(UserDB, operator_user_id)
    target_user = await session.get(UserDB, target_user_id)

    # ユーザーが正常に取得できなかった場合
    if operator_user is None or target_user is None:
        raise RPException.UserNotFound()
    # 操作ユーザーがBANされていた場合
    elif operator_user.permission < UserPermission.NORMAL:
        raise RPException.UserBanned()

    # 権限がない場合は弾く（承認作者以上と本人のみ通す）
    is_auth_charter = operator_user.permission >= UserPermission.AUTHORIZED_CHARTER
    is_owner = target_user_id == operator_user_id

    if not (
        is_auth_charter or
        is_owner
    ):
        raise RPException.NoPermission()

    stmt = sql.select(CharterAuthRequestDB)\
              .where(CharterAuthRequestDB.request_user_id == target_user_id)\
              .options(
                  selectinload(CharterAuthRequestDB.approvals)\
                  .joinedload(CharterAuthApprovalDB.reviewer),

                  joinedload(CharterAuthRequestDB.request_user),

                  joinedload(CharterAuthRequestDB.chart)
              )\
              .order_by(CharterAuthRequestDB.created_at.desc())

    auth_requests = (await session.execute(stmt)).scalars().all()

    return CharterAuthListResponse(
        charterAuthRequests=[
            _to_charter_auth_state_response(req)
            for req in auth_requests
        ]
    )

@router.get("/auth/charter/request", response_model=CharterAuthStateResponse)
async def get_auth_charter_request_detail(
    request_id: str,
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    作者承認リクエストを1件取得するエンドポイント。
    GET /api/auth/charter/request
    """

    user = await session.get(UserDB, user_id)
    
    if user is None:
        raise RPException.UserNotFound()
    elif user.permission < UserPermission.NORMAL:
        raise RPException.UserBanned()

    stmt = sql.select(CharterAuthRequestDB)\
              .where(CharterAuthRequestDB.id == request_id)\
              .options(
                  selectinload(CharterAuthRequestDB.approvals)\
                  .joinedload(CharterAuthApprovalDB.reviewer),

                  joinedload(CharterAuthRequestDB.request_user),

                  joinedload(CharterAuthRequestDB.chart)
              )

    auth_request = (await session.execute(stmt)).scalar()

    if auth_request is None:
        raise RPException.CharterAuthRequestNotFound()

    # 権限がない場合は弾く（承認作者以上と申請者本人のみ通す）
    is_auth_charter = user.permission >= UserPermission.AUTHORIZED_CHARTER
    is_owner = auth_request.request_user_id == user_id

    if not (
        is_auth_charter or
        is_owner
    ):
        raise RPException.NoPermission()

    return _to_charter_auth_state_response(auth_request)

@router.post("/auth/charter/request")
async def post_auth_charter_request(
    background_tasks: BackgroundTasks,
    data: str = Form(...),
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    作者承認を申請するエンドポイント。
    POST /api/auth/charter/request
    """

    body = CharterAuthRequest(**json.loads(data))

    # ユーザーと、申請された譜面が存在するか確認
    user = await session.get(UserDB, user_id)
    chart = await session.get(ChartDB, body.chart_id)

    # ユーザーもしくは譜面を取得できなかった時
    if user is None:
        raise RPException.UserNotFound()
    elif chart is None:
        raise RPException.ChartNotFound()
    # 自分以外の譜面で申請したとき
    elif chart.author_user_id != user_id:
        raise RPException.NoPermission()
    # ユーザーの権限が通常ではない時（BANユーザーや承認作者は申請できないようにする）
    elif user.permission != UserPermission.NORMAL:
        raise RPException.NoPermission()
    # 譜面の変換が終了していないとき
    elif chart.conversion_status != ChartConversionStatus.COMPLETE:
        raise RPException.ChartConversionNotComplete()

    # まだ閉じられていない申請がある場合、新しいリクエストを作れないようにする
    stmt = sql.select(sql.func.count())\
              .select_from(CharterAuthRequestDB)\
              .where(CharterAuthRequestDB.request_user_id == user_id)\
              .where(CharterAuthRequestDB.is_closed.is_(False))

    request_count = (await session.execute(stmt)).scalar()

    if request_count != 0:
        raise RPException.CharterAuthRequestNotClosed()

    request_id = generate_auth_id()

    auth_request = CharterAuthRequestDB(
        id=request_id,
        request_user_id=user_id,
        chart_id=body.chart_id
    )

    session.add(auth_request)

    await session.commit()

    # 承認作者向けに、承認ページを開くためのURLを通知する
    background_tasks.add_task(
        send_charter_auth_request_notice,
        request_id,
        body.chart_id,
        user_id
    )

    return request_id

@router.post("/auth/charter/approval")
async def post_auth_charter_approval(
    request_id: str,
    data: str = Form(...),
    user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(create_session)
):
    """
    作者承認を承認/却下するエンドポイント
    POST /api/auth/charter/approval
    """

    body = CharterAuthApprovalRequest(**json.loads(data))

    # ユーザと、作者承認申請を取得
    user = await session.get(UserDB, user_id)              
    auth_request = await session.get(
        CharterAuthRequestDB, request_id, 
        options=[
            selectinload(CharterAuthRequestDB.approvals),

            joinedload(CharterAuthRequestDB.request_user)
        ]
    )

    # ユーザーもしくは作者承認申請を取得できなかった時
    if user is None:
        raise RPException.UserNotFound()
    elif auth_request is None:
        raise RPException.CharterAuthRequestNotFound()
    # 承認/却下する権限がなかったとき
    elif user.permission < UserPermission.AUTHORIZED_CHARTER:
        raise RPException.NoPermission()
    # すでに申請が閉じられているとき
    elif auth_request.is_closed:
        raise RPException.NoPermission()
    # すでに1度承認/却下している場合
    elif any(approval.reviewer_id == user_id for approval in auth_request.approvals):
        raise RPException.NoPermission()

    auth_approval_id = generate_auth_id()

    # 承認レコードを作成
    auth_approval = CharterAuthApprovalDB(
        id=auth_approval_id,
        request_id=request_id,
        reviewer_id=user_id,
        status=body.status,
        reason=body.reason
    )

    session.add(auth_approval)

    await session.flush()

    # 現在の承認状況を取得し、基準を満たしていた場合には該当ユーザーに作者権限をつける
    # 2人が承認したらOK
    # 2人が却下したらその時点でNGとする
    stmt = sql.select(CharterAuthApprovalDB)\
              .where(CharterAuthApprovalDB.request_id == request_id)\

    approvals = (await session.execute(stmt)).scalars().all()

    reject_count = 0
    approve_count = 0

    for approval in approvals:
        match approval.status:
            case UserCharterAuthApprovalState.APPROVE:
                approve_count += 1
            case UserCharterAuthApprovalState.REJECT:
                reject_count += 1
            case _:
                pass

    if reject_count >= UserCharterAuthRequiredApprovalCount.REJECT:
        auth_request.is_closed = True
    elif approve_count >= UserCharterAuthRequiredApprovalCount.APPROVE:
        auth_request.request_user.permission = UserPermission.CHARTER
        auth_request.is_closed = True

        # discordユーザーにロールをつける
        async with httpx.AsyncClient() as client:
            response = await client.put(
                "/".join([DISCORD_API_URL, "guilds", DISCORD_GUILD_ID, "members", auth_request.request_user.discord_id, "roles", DISCORD_CHARTER_ROLE_ID]),
                headers={
                    "Authorization": f"Bot {DISOCRD_BOT_TOKEN}"
                }
            )

            if response.status_code != 204:
                await session.rollback()
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="ロールの付与に失敗しました。")

    await session.commit()

    return