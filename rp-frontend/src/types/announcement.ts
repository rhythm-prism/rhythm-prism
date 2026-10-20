// Types for the announcement feature (rp-backend/router/web/announce.py).

import type { SonolusResourceLocator, UserSimpleInfo } from "./chart";

/** JSON body of the `data` form field for `POST /api/announce` (AnnouncePostRequest). */
export interface AnnouncePostData {
  title: string;
  subtitle: string;
  displayName: string;
  description: string;
}

/** JSON body of the `data` form field for `PUT /api/announce` (AnnounceEditRequest). All optional. */
export interface AnnounceEditData {
  title?: string;
  subtitle?: string;
  displayName?: string;
  description?: string;
}

/** One item of `GET /api/announce` (AnnounceInfoResponse). */
export interface AnnounceInfo {
  id: string;
  title: string;
  subtitle: string;
  displayName: string;
  authorUser: UserSimpleInfo;
  description: string;
  thumbnail: SonolusResourceLocator;
  /** 16:9 (1280x720, letterboxed) image used by the home page slider. */
  banner: SonolusResourceLocator;
  createdAt: number;
}
