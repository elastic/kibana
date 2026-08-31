/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  LiveReplaySessionsResponse,
  RumSessionDetail,
  SessionListResponse,
  SessionReplayEventsResponse,
  SessionSortDirection,
  SessionSortField,
} from '../../../common/session_replay';
import {
  collectReplayEventPages,
  FULL_REPLAY_EVENT_PAGE_SIZE,
  type CollectedReplayEvents,
  type ReplayEventsPage,
} from '../../../common/session_replay_live';
import type { FunnelStepDef, SessionFunnelResponse } from '../../../common/session_funnel';
import type { SessionPatternsResponse } from '../../../common/session_patterns';
import {
  SESSION_REPLAY_SETTINGS_API,
  type SessionReplaySettings,
} from '../../../common/session_replay_settings';
import { inspectableGet, inspectablePost } from './ux_inspect';

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
  hasBounced?: boolean;
  browser?: string;
  os?: string;
  location?: string;
  pageUrl?: string;
  errorGroup?: string;
  sessionIds?: string;
  frustration?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  user?: string;
  click?: string;
  account?: string;
  includeBots?: string;
  botUa?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  includeRaw?: boolean;
  analyticsMode?: string;
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
  hasBounced,
  browser,
  os,
  location,
  pageUrl,
  errorGroup,
  sessionIds,
  frustration,
  minDurationMs,
  maxDurationMs,
  user,
  click,
  account,
  includeBots,
  botUa,
  kuery,
  breakpoint,
  connection,
  device,
  includeRaw,
  analyticsMode,
}: FetchSessionsParams): Promise<SessionListResponse> => {
  return inspectableGet<SessionListResponse>(http, '/internal/ux/session_replay/sessions', {
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
      ...(hasBounced ? { hasBounced: 'true' } : {}),
      ...(browser ? { browser } : {}),
      ...(os ? { os } : {}),
      ...(location ? { location } : {}),
      ...(pageUrl ? { pageUrl } : {}),
      ...(errorGroup ? { errorGroup } : {}),
      ...(sessionIds ? { sessionIds } : {}),
      ...(frustration ? { frustration } : {}),
      ...(minDurationMs != null ? { minDurationMs: String(minDurationMs) } : {}),
      ...(maxDurationMs != null ? { maxDurationMs: String(maxDurationMs) } : {}),
      ...(user ? { user } : {}),
      ...(click ? { click } : {}),
      ...(account ? { account } : {}),
      ...(includeBots ? { includeBots } : {}),
      ...(botUa ? { botUa } : {}),
      ...(kuery ? { kuery } : {}),
      ...(breakpoint ? { breakpoint } : {}),
      ...(connection ? { connection } : {}),
      ...(device ? { device } : {}),
      ...(includeRaw ? { includeRaw: 'true' } : {}),
      ...(analyticsMode ? { analyticsMode } : {}),
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
  return inspectableGet<RumSessionDetail>(
    http,
    `/internal/ux/session_replay/sessions/${encodeURIComponent(sessionId)}`
  );
};

export const fetchSessionReplayEvents = async ({
  http,
  sessionId,
  afterEvent,
  size,
}: {
  http: HttpStart;
  sessionId: string;
  afterEvent?: number;
  size?: number;
}): Promise<SessionReplayEventsResponse> => {
  return inspectableGet<SessionReplayEventsResponse>(
    http,
    `/internal/ux/session_replay/sessions/${encodeURIComponent(sessionId)}/events`,
    {
      query: {
        ...(afterEvent != null ? { afterEvent: String(afterEvent) } : {}),
        ...(size != null ? { size: String(size) } : {}),
      },
    }
  );
};

const toReplayEventsPage = (response: SessionReplayEventsResponse): ReplayEventsPage => ({
  events: response.events,
  hitCount: response.hitCount ?? response.events.length,
  pageFull: Boolean(response.truncated),
  lastCompleteEvent: response.lastCompleteEvent,
});

export const fetchAllSessionReplayEvents = async ({
  http,
  sessionId,
}: {
  http: HttpStart;
  sessionId: string;
}): Promise<CollectedReplayEvents> =>
  collectReplayEventPages(async (afterEvent) =>
    toReplayEventsPage(
      await fetchSessionReplayEvents({
        http,
        sessionId,
        afterEvent,
        size: FULL_REPLAY_EVENT_PAGE_SIZE,
      })
    )
  );

export const fetchLiveReplaySessions = async ({
  http,
  serviceName,
  lookbackSeconds,
  size,
}: {
  http: HttpStart;
  serviceName?: string;
  lookbackSeconds?: number;
  size?: number;
}): Promise<LiveReplaySessionsResponse> => {
  return inspectableGet<LiveReplaySessionsResponse>(http, '/internal/ux/session_replay/live', {
    query: {
      ...(serviceName ? { serviceName } : {}),
      ...(lookbackSeconds != null ? { lookbackSeconds: String(lookbackSeconds) } : {}),
      ...(size != null ? { size: String(size) } : {}),
    },
  });
};

export const fetchSessionFunnel = async ({
  http,
  rangeFrom,
  rangeTo,
  serviceName,
  steps,
  kuery,
  includeRaw,
  analyticsMode,
}: {
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  steps: FunnelStepDef[];
  kuery?: string;
  includeRaw?: boolean;
  analyticsMode?: string;
}): Promise<SessionFunnelResponse> => {
  return inspectablePost<SessionFunnelResponse>(http, '/internal/ux/session_replay/funnel', {
    body: JSON.stringify({
      rangeFrom,
      rangeTo,
      serviceName: serviceName || undefined,
      steps,
      ...(kuery ? { kuery } : {}),
      ...(includeRaw ? { includeRaw: true } : {}),
      ...(analyticsMode ? { analyticsMode } : {}),
    }),
  });
};

export const fetchSessionPatterns = async ({
  http,
  rangeFrom,
  rangeTo,
  serviceName,
  kuery,
  includeRaw,
  analyticsMode,
}: {
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  kuery?: string;
  includeRaw?: boolean;
  analyticsMode?: string;
}): Promise<SessionPatternsResponse> => {
  return inspectableGet<SessionPatternsResponse>(http, '/internal/ux/session_replay/patterns', {
    query: {
      rangeFrom,
      rangeTo,
      ...(serviceName ? { serviceName } : {}),
      ...(kuery ? { kuery } : {}),
      ...(includeRaw ? { includeRaw: 'true' } : {}),
      ...(analyticsMode ? { analyticsMode } : {}),
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
