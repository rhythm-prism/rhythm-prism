// Mirrors rp-backend UserDataDetailInfoResponse (schemas/responses.py).
export interface UserDetailInfo {
  id: string;
  name: string;
  iconUrl: string;
  profile: string;
  discordId: number;
  discordName: string;
  sonolusId: string | null;
  sonolusHandle: number | null;
  sonolusName: string | null;
  warningCount?: number | null;
  permission?: number | null;
}

/**
 * Body fields for `PUT /api/user` (UserEditRequest). `permission` may only be
 * set when a moderator+ operator edits a different (lower-permission) user —
 * the backend rejects it outright when target_user_id === operator_user_id.
 */
export interface UserEditData {
  name?: string;
  profile?: string;
  permission?: number;
}
