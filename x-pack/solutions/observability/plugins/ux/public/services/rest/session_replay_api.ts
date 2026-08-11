/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  SessionReplayEventsResponse,
  SessionReplaySessionSummary,
} from '../../../common/session_replay';

export const fetchSessionReplaySessions = async ({
  http,
  rangeFrom,
  rangeTo,
  size = 25,
}: {
  http: HttpStart;
  rangeFrom: string;
  rangeTo: string;
  size?: number;
}): Promise<SessionReplaySessionSummary[]> => {
  const response = await http.get<{ sessions: SessionReplaySessionSummary[] }>(
    '/internal/ux/session_replay/sessions',
    {
      query: { rangeFrom, rangeTo, size: String(size) },
    }
  );
  return response.sessions;
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
