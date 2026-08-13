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
  browser?: string;
  os?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
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
  browser,
  os,
  minDurationMs,
  maxDurationMs,
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
      ...(browser ? { browser } : {}),
      ...(os ? { os } : {}),
      ...(minDurationMs != null ? { minDurationMs: String(minDurationMs) } : {}),
      ...(maxDurationMs != null ? { maxDurationMs: String(maxDurationMs) } : {}),
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
