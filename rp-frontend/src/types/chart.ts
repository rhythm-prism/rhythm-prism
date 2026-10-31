// Types mirroring rp-backend/schemas/responses.py.
// The API serialises with camelCase aliases, so these match the JSON wire format.

// Backend serialises this with `exclude_none: True` (rp-backend sonolus_models.SonolusResourceLocator),
// so hash/url are dropped from the JSON entirely whenever the asset hasn't finished
// uploading yet (e.g. mid Celery conversion) — always guard with `?.` before use.
export interface SonolusResourceLocator {
  hash?: string;
  url?: string;
}

export interface ChartTag {
  id: number;
  title: string;
  icon?: string | null;
  createdAt: number;
  updatedAt: number;
  createdUserId?: string | null;
}

export interface ChartEventSimpleInfo {
  id: string;
  title: string;
  author: string;
  thumbnail: SonolusResourceLocator;
  startAt: number;
  endAt: number;
}

/** One result row from `GET /api/chart/search` (ChartSimpleInfoResponse). */
export interface ChartSimpleInfo {
  id: string;
  rating: number;
  title: string;
  composer?: string | null;
  vocal?: string | null;
  author: string;
  genre: number;
  difficulty: number;
  collabo: boolean;
  r18: boolean;
  likes: number;
  // null for unpublished charts (no first-publish time yet).
  firstPublishedAt: number | null;
  jacket?: SonolusResourceLocator | null;
  /** ChartPublishStatus: 0 = private, 1 = public, 2 = scheduled. */
  publishStatus: number;
  events: ChartEventSimpleInfo[];
  tags: ChartTag[];
}

export interface UserSimpleInfo {
  id: string;
  name: string;
  iconUrl: string;
}

/** Response of `GET /api/chart` (ChartDetailInfoResponse). */
export interface ChartDetailInfo extends ChartSimpleInfo {
  authorUser: UserSimpleInfo;
  description?: string | null;
  updatedAt: number;
  // Present iff original_chart_publish_status is PUBLIC — doubles as that flag
  // since the backend doesn't return it separately.
  originalChart?: SonolusResourceLocator | null;
  levelData?: SonolusResourceLocator | null;
  bgm?: SonolusResourceLocator | null;
  preview?: SonolusResourceLocator | null;
  /**
   * Bitmask of ChartConversionStatus (rp-backend/const/chart.py). The chart/bgm/jacket
   * files are converted asynchronously by a Celery worker after POST /api/chart
   * returns, so this is 0 right after submission and reaches CONVERSION_COMPLETE
   * once the jacket/bgm/levelData URLs above are all populated.
   */
  conversionStatus: number;
  /**
   * Current collaborators (ChartCollaborator rows), pending a backend addition
   * to ChartDetailInfoResponse — falls back to `[]` in the UI until then.
   */
  collaboratorUsers?: UserSimpleInfo[];
}

/**
 * Body fields for `PUT /api/chart` (ChartEditRequest). All optional except
 * `difficulty`, which the backend requires (send `null` to leave it unchanged).
 * Omit `tags` entirely — the backend's validator chokes on null. When provided,
 * `tags` replaces the full tag set; send `[]` to clear it. `collaborators` is
 * supported: send the full desired user-id list (replaces the existing set), or
 * `[]` to clear it.
 */
export interface ChartEditData {
  title?: string;
  composer?: string;
  vocal?: string;
  genre?: number;
  difficulty: number | null;
  rating?: number;
  displayName?: string;
  description?: string;
  r18?: number;
  collaborators?: string[];
  tags?: number[];
  // Omit to leave unchanged. Scheduled publishing (with scheduledAt) is not
  // exposed yet but can be added here later.
  publishStatus?: number;
  // ChartFilePublishStatus: 0 = private, 1 = public. Controls whether the raw
  // chart file (originalChart) is exposed via GET /api/chart.
  chartFilePublishStatus?: number;
  // Preview start position (seconds). Only sent when a new BGM is uploaded,
  // since the preview is regenerated from the BGM.
  startTime?: number;
}

/** Optional file replacements for `PUT /api/chart`. */
export interface ChartEditFiles {
  chart?: File;
  bgm?: File;
  jacket?: File;
}

/** Response body of `GET /api/chart/search` (ChartSimpleInfoListResponse). */
export interface ChartSearchResponse {
  charts: ChartSimpleInfo[];
  next: boolean;
  cursor?: string | null;
}

/** JSON body of the `data` form field for `POST /api/chart` (ChartPostRequest). */
export interface ChartPostData {
  title: string;
  composer: string;
  vocal: string;
  genre: number;
  difficulty: number;
  rating: number;
  displayName: string;
  description: string;
  publishStatus: number;
  scheduledAt?: number | null;
  r18: number;
  collaborators: string[];
  tags: number[];
  chartFilePublishStatus: number;
  /** Preview start position in seconds (ChartPostRequest.startTime). */
  startTime: number;
}

/** The three files required by `POST /api/chart`. */
export interface ChartPostFiles {
  chart: File;
  bgm: File;
  jacket: File;
}

export type SortType = "new" | "likes";
export type SortOrder = "asc" | "desc";

/** Query params accepted by `GET /api/chart/search`. */
export interface ChartSearchParams {
  sortType: SortType;
  order: SortOrder;
  keywords?: string;
  minRating: number;
  maxRating: number;
  r18: boolean;
  collabo: boolean;
  difficultyIds: number[];
  genreIds: number[];
  /** Filter by author (used by the "my charts" view). */
  userIds?: string[];
  cursor?: string;
  limit?: number;
}
