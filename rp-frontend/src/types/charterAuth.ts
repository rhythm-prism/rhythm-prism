// Types mirroring rp-backend/schemas/responses.py (CharterAuth*Response).
import type { ChartSimpleInfo } from "./chart";

export interface CharterAuthUser {
  id: string;
  name: string;
  iconUrl?: string | null;
}

/** One reviewer's decision (CharterAuthApprovalResponse). `status`: 0 = reject, 1 = approve. */
export interface CharterAuthApproval {
  id: string;
  reviewer: CharterAuthUser;
  status: number;
  reason: string | null;
  /** Unix seconds. */
  createdAt: number;
}

/** One application (CharterAuthStateResponse). */
export interface CharterAuthRequestInfo {
  id: string;
  requestUser: CharterAuthUser;
  chart: ChartSimpleInfo;
  /** True once the result is decided (enough approvals or rejections). */
  isClosed: boolean;
  /** Unix seconds. */
  createdAt: number;
  approvals: CharterAuthApproval[];
}

/** Response of `GET /api/auth/charter` (CharterAuthListResponse). */
export interface CharterAuthListResponse {
  charterAuthRequests: CharterAuthRequestInfo[];
}
