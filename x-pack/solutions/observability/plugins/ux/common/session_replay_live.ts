/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LIVE_POLL_INTERVALS_MS = [2000, 5000, 10000, 30000] as const;
export type LivePollIntervalMs = (typeof LIVE_POLL_INTERVALS_MS)[number];
export const DEFAULT_LIVE_POLL_MS: LivePollIntervalMs = 5000;

export const LIVE_LOOKBACK_SECONDS = 120;
export const LIVE_LOOKBACK_SECONDS_MIN = 15;
export const LIVE_LOOKBACK_SECONDS_MAX = 300;
export const LIVE_SESSION_LIST_SIZE = 12;
export const LIVE_SESSION_LIST_SIZE_MAX = 25;

export const LIVE_EVENT_PAGE_SIZE = 500;
export const LIVE_EVENT_PAGE_SIZE_MAX = 2000;
export const FULL_REPLAY_EVENT_PAGE_SIZE = 10000;
/** First-page docs for a paused thumbnail (meta + full snapshot, possibly chunked). */
export const PREVIEW_REPLAY_EVENT_PAGE_SIZE = 2000;

export const RRWEB_EVENT_META = 4;
export const RRWEB_EVENT_FULL_SNAPSHOT = 2;

export const isPlayableRrwebEvent = (event: { type?: number }): boolean =>
  typeof event.type === 'number' && event.type >= 0 && event.type <= 7;

export const hasLiveReplaySeed = (events: Array<{ type?: number }>): boolean =>
  events.some((event) => event.type === RRWEB_EVENT_META) &&
  events.some((event) => event.type === RRWEB_EVENT_FULL_SNAPSHOT);

export const parseLivePollMs = (value: number): LivePollIntervalMs =>
  LIVE_POLL_INTERVALS_MS.includes(value as LivePollIntervalMs)
    ? (value as LivePollIntervalMs)
    : DEFAULT_LIVE_POLL_MS;

export const LIVE_SEEK_BACK_MS = 10_000;
export const LIVE_EDGE_EPSILON_MS = 80;

export const isAtLiveEdge = (currentMs: number, totalMs: number): boolean =>
  totalMs <= 0 || currentMs >= totalMs - LIVE_EDGE_EPSILON_MS;

export const clampReplayOffsetMs = (offsetMs: number, totalMs: number): number =>
  Math.min(Math.max(0, offsetMs), Math.max(0, totalMs));

export const livePlayFromMs = (firstEventTimestamp: number, nextEventTimestamp: number): number =>
  Math.max(0, nextEventTimestamp - firstEventTimestamp);

export const filterLiveSessions = <T extends { sessionId: string; serviceName?: string | null }>(
  sessions: T[],
  query: string
): T[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return sessions;
  }
  return sessions.filter((session) => {
    if (session.sessionId.toLowerCase().includes(needle)) {
      return true;
    }
    return (session.serviceName ?? '').toLowerCase().includes(needle);
  });
};

const FOLLOW_SESSION_ID_RE = /^[0-9a-f][0-9a-f-]{7,63}$/i;

export const parseFollowSessionId = (query: string): string | null => {
  const value = query.trim();
  if (!FOLLOW_SESSION_ID_RE.test(value)) {
    return null;
  }
  return value;
};

export const formatReplayClock = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0:00';
  }
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
