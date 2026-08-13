/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  RumSessionDetail,
  SessionListResponse,
  SessionReplayEventsResponse,
  SessionSortDirection,
  SessionSortField,
} from '../../../common/session_replay';
import type { FunnelStepDef, SessionFunnelResponse } from '../../../common/session_funnel';
import type { SessionPatternsResponse } from '../../../common/session_patterns';
import {
  SESSION_REPLAY_SETTINGS_API,
  type SessionReplaySettings,
} from '../../../common/session_replay_settings';

export interface FetchSessionsParams {
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  query?: string;
  sortField?: SessionSortField;
  sortDirection?: SessionSortDirection;
  page?: number;
  perPage?: number;
  hasReplay?: boolean;
  hasErrors?: boolean;
  hasRage?: boolean;
  hasDead?: boolean;
  browser?: string;
  os?: string;
  pageUrl?: string;
  errorGroup?: string;
  sessionIds?: string;
  frustration?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  user?: string;
  includeBots?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
}

export const fetchSessionReplaySessions = async ({
  http,
  rangeFrom,
  rangeTo,
  serviceName,
  query,
  sortField,
  sortDirection,
  page,
  perPage,
  hasReplay,
  hasErrors,
  hasRage,
  hasDead,
  browser,
  os,
  pageUrl,
  errorGroup,
  sessionIds,
  frustration,
  minDurationMs,
  maxDurationMs,
  user,
  includeBots,
  kuery,
  breakpoint,
  connection,
  device,
}: FetchSessionsParams): Promise<SessionListResponse> => {
  return http.get<SessionListResponse>('/internal/ux/session_replay/sessions', {
    query: {
      rangeFrom,
      rangeTo,
      ...(serviceName ? { serviceName } : {}),
      ...(query ? { query } : {}),
      ...(sortField ? { sortField } : {}),
      ...(sortDirection ? { sortDirection } : {}),
      ...(page != null ? { page: String(page) } : {}),
      ...(perPage != null ? { perPage: String(perPage) } : {}),
      ...(hasReplay ? { hasReplay: 'true' } : {}),
      ...(hasErrors ? { hasErrors: 'true' } : {}),
      ...(hasRage ? { hasRage: 'true' } : {}),
      ...(hasDead ? { hasDead: 'true' } : {}),
      ...(browser ? { browser } : {}),
      ...(os ? { os } : {}),
      ...(pageUrl ? { pageUrl } : {}),
      ...(errorGroup ? { errorGroup } : {}),
      ...(sessionIds ? { sessionIds } : {}),
      ...(frustration ? { frustration } : {}),
      ...(minDurationMs != null ? { minDurationMs: String(minDurationMs) } : {}),
      ...(maxDurationMs != null ? { maxDurationMs: String(maxDurationMs) } : {}),
      ...(user ? { user } : {}),
      ...(includeBots ? { includeBots } : {}),
      ...(kuery ? { kuery } : {}),
      ...(breakpoint ? { breakpoint } : {}),
      ...(connection ? { connection } : {}),
      ...(device ? { device } : {}),
    },
  });
};

export const fetchSessionDetail = async ({
  http,
  sessionId,
}: {
  http: HttpStart;
  sessionId: string;
}): Promise<RumSessionDetail> => {
  return http.get<RumSessionDetail>(
    `/internal/ux/session_replay/sessions/${encodeURIComponent(sessionId)}`
  );
};

export const fetchSessionReplayEvents = async ({
  http,
  sessionId,
}: {
  http: HttpStart;
  sessionId: string;
}): Promise<SessionReplayEventsResponse> => {
  return http.get<SessionReplayEventsResponse>(
    `/internal/ux/session_replay/sessions/${encodeURIComponent(sessionId)}/events`
  );
};

export const fetchSessionFunnel = async ({
  http,
  rangeFrom,
  rangeTo,
  serviceName,
  steps,
  kuery,
}: {
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  steps: FunnelStepDef[];
  kuery?: string;
}): Promise<SessionFunnelResponse> => {
  return http.post<SessionFunnelResponse>('/internal/ux/session_replay/funnel', {
    body: JSON.stringify({
      rangeFrom,
      rangeTo,
      serviceName: serviceName || undefined,
      steps,
      ...(kuery ? { kuery } : {}),
    }),
  });
};

export const fetchSessionPatterns = async ({
  http,
  rangeFrom,
  rangeTo,
  serviceName,
  kuery,
}: {
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  kuery?: string;
}): Promise<SessionPatternsResponse> => {
  return http.get<SessionPatternsResponse>('/internal/ux/session_replay/patterns', {
    query: {
      rangeFrom,
      rangeTo,
      ...(serviceName ? { serviceName } : {}),
      ...(kuery ? { kuery } : {}),
    },
  });
};

export const fetchSessionReplaySettings = async ({
  http,
}: {
  http: HttpStart;
}): Promise<SessionReplaySettings> => {
  return http.get<SessionReplaySettings>(SESSION_REPLAY_SETTINGS_API);
};

export const updateSessionReplaySettings = async ({
  http,
  settings,
}: {
  http: HttpStart;
  settings: SessionReplaySettings;
}): Promise<SessionReplaySettings> => {
  return http.put<SessionReplaySettings>(SESSION_REPLAY_SETTINGS_API, {
    body: JSON.stringify(settings),
  });
};
