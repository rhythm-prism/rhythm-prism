/** Mirrors ServerInfoChartResponse (rp-backend/schemas/responses.py). */
export interface ServerInfoChart {
  publicCount: number;
  privateCount: number;
  deleteCount: number;
}

/** Mirrors ServerInfoResponse (`GET /api/server/info`). */
export interface ServerInfo {
  chart: ServerInfoChart;
}
