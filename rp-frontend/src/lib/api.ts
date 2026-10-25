import type {
  ChartDetailInfo,
  ChartEditData,
  ChartEditFiles,
  ChartPostData,
  ChartPostFiles,
  ChartSearchParams,
  ChartSearchResponse,
} from "../types/chart";
import type { UserDetailInfo, UserEditData } from "../types/user";
import type { AnnounceEditData, AnnounceInfo, AnnouncePostData } from "../types/announcement";
import type { CharterAuthListResponse, CharterAuthRequestInfo } from "../types/charterAuth";
import type { ServerInfo } from "../types/serverInfo";
import { authFetch } from "./http";

/** Extracts a backend error `detail` message, falling back to the status. */
async function errorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.detail) return body.detail;
  } catch {
    // non-JSON error body — fall through to the status code
  }
  return String(res.status);
}

// Vite proxies `/api` to the FastAPI backend in dev (see vite.config.ts).
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/** Download through the API so it can check the current session's permissions. */
export function getChartDownloadUrl(chartId: string): string {
  return `${API_BASE}/api/chart/download?chart_id=${encodeURIComponent(chartId)}`;
}

/**
 * Calls `GET /api/chart/search` (rp-backend/router/web/chart/get_chart.py).
 * List-valued filters are repeated query params, matching FastAPI's `Query(list)`.
 */
export async function searchCharts(
  params: ChartSearchParams,
  signal?: AbortSignal,
): Promise<ChartSearchResponse> {
  const q = new URLSearchParams();
  q.set("sort_type", params.sortType);
  q.set("order", params.order);
  if (params.keywords) q.set("keywords", params.keywords);
  q.set("min_rating", String(params.minRating));
  q.set("max_rating", String(params.maxRating));
  q.set("r18", String(params.r18));
  q.set("collabo", String(params.collabo));
  params.difficultyIds.forEach((id) => q.append("difficulty_ids", String(id)));
  params.genreIds.forEach((id) => q.append("genre_ids", String(id)));
  params.userIds?.forEach((id) => q.append("user_ids", id));
  if (params.cursor) q.set("cursor", params.cursor);
  q.set("limit", String(params.limit ?? 20));

  const res = await fetch(`${API_BASE}/api/chart/search?${q.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Chart search failed: ${res.status}`);
  }
  return (await res.json()) as ChartSearchResponse;
}

/**
 * Calls `GET /api/chart/my` (rp-backend/router/web/chart/get_chart.py).
 * Returns the authenticated user's own + collaborated charts (including drafts,
 * scheduled and private), newest-updated first. Requires a session cookie.
 */
export async function fetchMyCharts(
  cursor?: string,
  signal?: AbortSignal,
): Promise<ChartSearchResponse> {
  const q = new URLSearchParams();
  if (cursor) q.set("cursor", cursor);
  q.set("limit", "40");

  const res = await authFetch(`/api/chart/my?${q.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (res.status === 401) throw new Error("ログインが必要です");
  if (!res.ok) {
    throw new Error(`投稿譜面の取得に失敗しました (${res.status})`);
  }
  return (await res.json()) as ChartSearchResponse;
}

/**
 * Calls `GET /api/auth/charter/requests?target_user_id=...` (CharterAuthListResponse).
 * Returns the user's charter applications, newest first. Callable for oneself
 * (or by an authorized charter or above).
 */
export async function fetchCharterAuthRequests(
  userId: string,
  signal?: AbortSignal,
): Promise<CharterAuthRequestInfo[]> {
  const res = await authFetch(`/api/auth/charter/requests?target_user_id=${encodeURIComponent(userId)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  const body = (await res.json()) as CharterAuthListResponse;
  return body.charterAuthRequests;
}

/**
 * Calls `GET /api/auth/charter/requests/pending` (CharterAuthListResponse). Every open
 * (not yet closed) application across all users, oldest first. AUTHORIZED_CHARTER+ only.
 */
export async function fetchPendingCharterAuthRequests(
  signal?: AbortSignal,
): Promise<CharterAuthRequestInfo[]> {
  const res = await authFetch("/api/auth/charter/requests/pending", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  const body = (await res.json()) as CharterAuthListResponse;
  return body.charterAuthRequests;
}

/**
 * Calls `GET /api/auth/charter/requests/completed` (CharterAuthListResponse).
 * Returns every completed application, newest first. MODERATOR+ only.
 */
export async function fetchCompletedCharterAuthRequests(
  signal?: AbortSignal,
): Promise<CharterAuthRequestInfo[]> {
  const res = await authFetch("/api/auth/charter/requests/completed", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  const body = (await res.json()) as CharterAuthListResponse;
  return body.charterAuthRequests;
}

/**
 * Applies to become a charter via `POST /api/auth/charter/request` (multipart, JSON `data`
 * part). `chart_id` is snake_case on the wire (CharterAuthRequest has no alias). NORMAL
 * users only. Returns the new application's id (for navigating straight to its status page).
 */
export async function postCharterAuthRequest(chartId: string, signal?: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("data", JSON.stringify({ chart_id: chartId }));

  const res = await authFetch("/api/auth/charter/request", {
    method: "POST",
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  return (await res.json()) as string;
}

/**
 * Calls `GET /api/auth/charter/request?request_id=...` (CharterAuthStateResponse). Reachable
 * by the application's own author or an AUTHORIZED_CHARTER+ reviewer — the id alone is
 * enough, so this is what a shared review link resolves.
 */
export async function fetchCharterAuthRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<CharterAuthRequestInfo> {
  const res = await authFetch(`/api/auth/charter/request?request_id=${encodeURIComponent(requestId)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  return (await res.json()) as CharterAuthRequestInfo;
}

/**
 * Reviews an application via `POST /api/auth/charter/approval?request_id=...`
 * (multipart, JSON `data` part). `status`: 0 = reject, 1 = approve
 * (UserCharterAuthApprovalState). AUTHORIZED_CHARTER+ only; one decision per reviewer.
 */
export async function postCharterAuthApproval(
  requestId: string,
  status: number,
  reason?: string,
  signal?: AbortSignal,
): Promise<void> {
  const form = new FormData();
  form.append("data", JSON.stringify({ status, reason: reason || null }));

  const res = await authFetch(`/api/auth/charter/approval?request_id=${encodeURIComponent(requestId)}`, {
    method: "POST",
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
}

/**
 * Edits a user via `PUT /api/user?target_user_id=...` (multipart). `data` carries
 * the changed fields; `iconFile` optionally replaces the avatar (processed
 * server-side in the background). Requires the session cookie.
 */
export async function editUser(
  userId: string,
  data: UserEditData,
  iconFile?: File | null,
  signal?: AbortSignal,
): Promise<void> {
  const form = new FormData();
  form.append("data", JSON.stringify(data));
  if (iconFile) form.append("icon_file", iconFile);

  const res = await authFetch(`/api/user?target_user_id=${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
}

/** Calls `GET /api/user?user_id=...` (UserDataDetailInfoResponse). Public, no auth required. */
export async function fetchUserProfile(
  userId: string,
  signal?: AbortSignal,
): Promise<UserDetailInfo> {
  const res = await authFetch(`/api/user?user_id=${encodeURIComponent(userId)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) throw new Error("ユーザーが見つかりません");
  if (!res.ok) throw new Error(`ユーザー情報の取得に失敗しました (${res.status})`);
  return (await res.json()) as UserDetailInfo;
}

/**
 * Calls `GET /api/users` (list[UserDataDetailInfoResponse], rp-backend/router/web/user/get_user.py).
 * `permission`/`warningCount` only come back populated when the caller is a moderator+;
 * filtering by a banned permission level also requires moderator+.
 */
export async function searchUsers(
  params: { name?: string; permission?: number },
  signal?: AbortSignal,
): Promise<UserDetailInfo[]> {
  const q = new URLSearchParams();
  if (params.name) q.set("name", params.name);
  if (params.permission !== undefined) q.set("permission", String(params.permission));

  const res = await authFetch(`/api/users?${q.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`ユーザー検索に失敗しました (${res.status})`);
  return (await res.json()) as UserDetailInfo[];
}

/** Calls `GET /api/chart?chart_id=...` (ChartDetailInfoResponse). Public. */
export async function fetchChartDetail(
  chartId: string,
  signal?: AbortSignal,
): Promise<ChartDetailInfo> {
  const res = await authFetch(`/api/chart?chart_id=${encodeURIComponent(chartId)}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) throw new Error("譜面が見つかりません");
  if (!res.ok) throw new Error(`譜面の取得に失敗しました (${res.status})`);
  return (await res.json()) as ChartDetailInfo;
}

/**
 * Edits a chart via `PUT /api/chart?chart_id=...` (multipart). `data` carries
 * the changed fields; `files` optionally replaces chart/bgm/jacket. Requires the
 * author (or moderator/collaborator) session.
 */
export async function editChart(
  chartId: string,
  data: ChartEditData,
  files?: ChartEditFiles,
  signal?: AbortSignal,
): Promise<void> {
  const form = new FormData();
  form.append("data", JSON.stringify(data));
  if (files?.chart) form.append("chart_file", files.chart);
  if (files?.bgm) form.append("bgm_file", files.bgm);
  if (files?.jacket) form.append("jacket_file", files.jacket);

  const res = await authFetch(`/api/chart?chart_id=${encodeURIComponent(chartId)}`, {
    method: "PUT",
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
}

/**
 * Deletes a chart via `DELETE /api/chart?chart_id=...` (rp-backend/router/web/chart/delete_chart.py).
 * Soft-delete only (`is_deleted`); restoring it requires an admin. Author or admin only.
 */
export async function deleteChart(chartId: string, signal?: AbortSignal): Promise<void> {
  const res = await authFetch(`/api/chart?chart_id=${encodeURIComponent(chartId)}`, {
    method: "DELETE",
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
}

/**
 * Submits a chart via `POST /api/chart` (rp-backend/router/web/chart/post_chart.py).
 * Sent as multipart/form-data: a JSON `data` part plus the three files.
 * Requires an authenticated session; returns the new chart id on success.
 */
export async function postChart(
  data: ChartPostData,
  files: ChartPostFiles,
  signal?: AbortSignal,
): Promise<string> {
  const form = new FormData();
  form.append("data", JSON.stringify(data));
  form.append("chart_file", files.chart);
  form.append("bgm_file", files.bgm);
  form.append("jacket_file", files.jacket);

  const res = await authFetch("/api/chart", {
    method: "POST",
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  return (await res.json()) as string;
}

/**
 * Submits an announcement via `POST /api/announce` (rp-backend/router/web/announce.py).
 * Sent as multipart/form-data: a JSON `data` part plus the thumbnail and banner images
 * (both required by the backend). Requires a moderator+ session; returns the new post id.
 */
export async function postAnnouncement(
  data: AnnouncePostData,
  thumbnailFile: File,
  bannerFile: File,
  signal?: AbortSignal,
): Promise<string> {
  const form = new FormData();
  form.append("data", JSON.stringify(data));
  form.append("thumbnail_file", thumbnailFile);
  form.append("banner_file", bannerFile);

  const res = await authFetch("/api/announce", {
    method: "POST",
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  return (await res.json()) as string;
}

/**
 * Fetches all announcements via `GET /api/announce` (AnnounceInfoListResponse).
 * Requires a moderator+ session.
 */
export async function fetchAnnouncements(signal?: AbortSignal): Promise<AnnounceInfo[]> {
  const res = await authFetch("/api/announce", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  const body = (await res.json()) as { announcements: AnnounceInfo[] };
  return body.announcements;
}

/**
 * Edits an announcement via `PUT /api/announce?post_id=...` (multipart). `data` carries
 * the changed fields; `thumbnailFile`/`bannerFile` optionally replace those images.
 * Requires a moderator+ session.
 */
export async function editAnnouncement(
  postId: string,
  data: AnnounceEditData,
  thumbnailFile?: File | null,
  bannerFile?: File | null,
  signal?: AbortSignal,
): Promise<void> {
  const form = new FormData();
  form.append("data", JSON.stringify(data));
  if (thumbnailFile) form.append("thumbnail_file", thumbnailFile);
  if (bannerFile) form.append("banner_file", bannerFile);

  const res = await authFetch(`/api/announce?post_id=${encodeURIComponent(postId)}`, {
    method: "PUT",
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
}

/**
 * Deletes an announcement via `DELETE /api/announce?post_id=...`. Requires a moderator+ session.
 */
export async function deleteAnnouncement(postId: string, signal?: AbortSignal): Promise<void> {
  const res = await authFetch(`/api/announce?post_id=${encodeURIComponent(postId)}`, {
    method: "DELETE",
    signal,
  });
  if (!res.ok) throw new Error(await errorDetail(res));
}

/**
 * Fetches server statistics via `GET /api/server/info` (ServerInfoResponse).
 * Requires a moderator+ session.
 */
export async function fetchServerInfo(signal?: AbortSignal): Promise<ServerInfo> {
  const res = await authFetch("/api/server/info", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await errorDetail(res));
  return (await res.json()) as ServerInfo;
}
