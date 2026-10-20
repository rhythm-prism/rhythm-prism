// Mirrors rp-backend/const/chart.py (MusicGenre, ChartDifficulty).

export interface GenreMeta {
  id: number;
  name: string;
  color: string;
}

// MusicGenre — id, display_name and color all taken from the backend enum.
export const GENRES: GenreMeta[] = [
  { id: 1, name: "ボーカロイド", color: "#a9afb8" },
  { id: 2, name: "音楽ゲーム", color: "#b89fd1" },
  { id: 3, name: "ポップス", color: "#7fbedc" },
  { id: 4, name: "アニメ", color: "#d9c25e" },
  { id: 5, name: "バラエティ", color: "#7fc276" },
  { id: 6, name: "ミーム", color: "#d97a96" },
  { id: 999, name: "その他", color: "#c9b49c" },
];

export const GENRE_BY_ID: Record<number, GenreMeta> = Object.fromEntries(
  GENRES.map((g) => [g.id, g]),
);

export interface DifficultyMeta {
  id: number;
  name: string;
  /** Accent colour follows the usual rhythm-game difficulty palette. */
  color: string;
}

// ChartDifficulty — names from the backend; colours are a UI convention.
export const DIFFICULTIES: DifficultyMeta[] = [
  { id: 1, name: "EASY", color: "#4ade80" },
  { id: 2, name: "NORMAL", color: "#38bdf8" },
  { id: 3, name: "HARD", color: "#facc15" },
  { id: 4, name: "EXPERT", color: "#f87171" },
  { id: 5, name: "MASTER", color: "#a855f7" },
  { id: 6, name: "APPEND", color: "#f472b6" },
];

export const DIFFICULTY_BY_ID: Record<number, DifficultyMeta> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d]),
);

export const RATING_MIN = 0;
export const RATING_MAX = 50;

// ChartPublishStatus (rp-backend/const/chart.py).
// Mirrors rp-backend const/chart.py ChartPublishStatus. PUBLIC is 100 (not 1) so that
// `< PUBLIC` comparisons on the backend correctly treat SCHEDULED as "not yet public".
export const PUBLISH_STATUS = {
  PRIVATE: 0,
  SCHEDULED: 1,
  PUBLIC: 100,
} as const;

export interface PublishOption {
  id: number;
  label: string;
  hint: string;
}

export const PUBLISH_OPTIONS: PublishOption[] = [
  { id: PUBLISH_STATUS.PRIVATE, label: "下書き", hint: "自分だけが見られる非公開状態で保存します" },
  { id: PUBLISH_STATUS.PUBLIC, label: "公開", hint: "審査後に一般公開されます" },
  { id: PUBLISH_STATUS.SCHEDULED, label: "予約投稿", hint: "指定した日時に自動で公開します" },
];

// ChartFilePublishStatus.
export const CHART_FILE_PRIVATE = 0;
export const CHART_FILE_PUBLIC = 1;

// R18Status.
export const R18_SAFE = 0;
export const R18_ON = 1;

// ChartConversionStatus (rp-backend/const/chart.py) — bitmask set by the Celery
// worker as each of the chart/bgm/jacket conversions finishes.
export const CHART_CONVERSION_STATUS = {
  CHART: 1 << 0,
  BGM: 1 << 1,
  JACKET: 1 << 2,
} as const;
export const CHART_CONVERSION_COMPLETE =
  CHART_CONVERSION_STATUS.CHART | CHART_CONVERSION_STATUS.BGM | CHART_CONVERSION_STATUS.JACKET;

// ChartFileSize (rp-backend/const/chart.py) — upper bounds in bytes.
export const FILE_SIZE_LIMIT = {
  chart: 60 * 1024 * 1024, // 60MB
  bgm: 30 * 1024 * 1024, // 30MB
  jacket: 5 * 1024 * 1024, // 5MB
} as const;

export const MAX_TAGS = 4;
export const MAX_COLLABORATORS = 20;

// User profile limits (rp-backend: UserFileSize.ICON, UserEditRequest).
export const ICON_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
export const MAX_NAME = 50;
export const MAX_PROFILE = 200;

// UserPermission (rp-backend/const/user.py).
export const PERMISSION = {
  BANNED: -99,
  NORMAL: 0,
  CHARTER: 10,
  AUTHORIZED_CHARTER: 11,
  MODERATOR: 80,
  ADMINISTRATOR: 99,
} as const;

// UserCharterAuthApprovalState (rp-backend/const/user.py).
export const CHARTER_AUTH_APPROVAL = {
  REJECT: 0,
  APPROVE: 1,
} as const;

// UserCharterAuthRequiredApprovalCount (rp-backend/const/user.py) — the application
// closes as approved / rejected once this many reviewers approve / reject it.
export const CHARTER_AUTH_REQUIRED = {
  APPROVE: 2,
  REJECT: 2,
} as const;

export interface PermissionMeta {
  id: number;
  label: string;
}

export const PERMISSION_OPTIONS: PermissionMeta[] = [
  { id: PERMISSION.BANNED, label: "BAN" },
  { id: PERMISSION.NORMAL, label: "通常" },
  { id: PERMISSION.CHARTER, label: "譜面制作者" },
  { id: PERMISSION.AUTHORIZED_CHARTER, label: "認定譜面制作者" },
  { id: PERMISSION.MODERATOR, label: "モデレーター" },
  { id: PERMISSION.ADMINISTRATOR, label: "管理者" },
];
