/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SESSION_REPLAY_INDEX = 'logs-rum.replay-*';

export const SESSION_ID_FIELDS = [
  'attributes.session.id',
  'attributes.rum.sessionId',
  'attributes.rum.session.id',
] as const;

export interface SessionReplaySessionSummary {
  sessionId: string;
  startTime: string | null;
  endTime: string | null;
  eventCount: number;
}

export interface SessionReplayEventsResponse {
  sessionId: string;
  events: unknown[];
  total: number;
}
