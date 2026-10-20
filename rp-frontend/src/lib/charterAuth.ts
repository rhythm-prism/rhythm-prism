import type { CharterAuthRequestInfo } from "../types/charterAuth";
import { CHARTER_AUTH_APPROVAL, CHARTER_AUTH_REQUIRED } from "./constants";

/** waiting: no review yet · in_review: partially reviewed · approved / rejected: closed. */
export type CharterAuthStatus = "waiting" | "in_review" | "approved" | "rejected";

export interface CharterAuthSummary {
  status: CharterAuthStatus;
  approved: number;
  rejected: number;
}

/**
 * Derives the overall state the same way the backend decides it: an application
 * is decided once `isClosed`; rejections take precedence over approvals.
 */
export function summarizeCharterAuth(
  request: Pick<CharterAuthRequestInfo, "approvals" | "isClosed">,
): CharterAuthSummary {
  const { approvals, isClosed } = request;
  const approved = approvals.filter((a) => a.status === CHARTER_AUTH_APPROVAL.APPROVE).length;
  const rejected = approvals.filter((a) => a.status === CHARTER_AUTH_APPROVAL.REJECT).length;

  let status: CharterAuthStatus;
  if (!isClosed) status = approvals.length === 0 ? "waiting" : "in_review";
  else if (rejected < CHARTER_AUTH_REQUIRED.REJECT && approved >= CHARTER_AUTH_REQUIRED.APPROVE) {
    status = "approved";
  } else status = "rejected";

  return { status, approved, rejected };
}

/** Unix seconds → "2024/06/19 14:05". */
export function formatDateTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
