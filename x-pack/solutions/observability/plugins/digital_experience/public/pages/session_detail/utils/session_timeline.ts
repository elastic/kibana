/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SessionPageVisit,
  SessionSummary,
  SessionTimelineEvent,
  SessionTimelineEventKind,
} from '../../../../common/sessions';

/** Events the journey lists; spans and logs are left to traces and Discover. */
export const JOURNEY_EVENT_KINDS: readonly SessionTimelineEventKind[] = [
  'page_view',
  'click',
  'error',
  'web_vital',
];

export interface PageVisitEvents {
  visit: SessionPageVisit;
  events: SessionTimelineEvent[];
}

/**
 * Attributes each journey event to the page visit it happened in: the last one that started at or
 * before it. Events before the first visit belong to it, as the API starts a visit with its first
 * event that has a page.
 */
export const groupEventsByVisit = (
  pageVisits: SessionPageVisit[],
  timeline: SessionTimelineEvent[]
): PageVisitEvents[] => {
  const groups = pageVisits.map((visit) => ({
    visit,
    startMs: Date.parse(visit.startTime),
    events: [] as SessionTimelineEvent[],
  }));
  if (groups.length === 0) {
    return [];
  }
  for (const event of timeline) {
    if (!JOURNEY_EVENT_KINDS.includes(event.kind)) {
      continue;
    }
    const eventMs = Date.parse(event.timestamp);
    const group = groups.findLast(({ startMs }) => startMs <= eventMs) ?? groups[0];
    group.events.push(event);
  }
  return groups.map(({ visit, events }) => ({ visit, events }));
};

export interface WaterfallSegment {
  /** Index in the page visits. */
  index: number;
  page: string;
  /** Start and width, in percent of the session. */
  offsetPercent: number;
  widthPercent: number;
}

export interface WaterfallMarker {
  offsetPercent: number;
  event: SessionTimelineEvent;
}

export interface SessionWaterfallLayout {
  totalMs: number;
  segments: WaterfallSegment[];
  errorMarkers: WaterfallMarker[];
}

const percentOf = (ms: number, totalMs: number): number =>
  Math.min(100, Math.max(0, (ms / totalMs) * 100));

/**
 * Places each page visit on a bar spanning the whole session, proportionally to when it started and
 * how long it lasted, with a marker at each error. The bar spans the summary's duration, or longer
 * when the raw events, which can be newer than the summary, run past it.
 */
export const layoutWaterfall = (
  session: Pick<SessionSummary, 'startTime' | 'durationMs'>,
  pageVisits: SessionPageVisit[],
  timeline: SessionTimelineEvent[]
): SessionWaterfallLayout => {
  const startMs = Date.parse(session.startTime);
  const visitEnds = pageVisits.map(({ endTime }) => Date.parse(endTime) - startMs);
  const totalMs = Math.max(
    1,
    session.durationMs,
    ...visitEnds.filter(Number.isFinite),
    ...timeline.map(({ offsetMs }) => offsetMs)
  );

  return {
    totalMs,
    segments: pageVisits.map((visit, index) => {
      const offsetMs = Date.parse(visit.startTime) - startMs;
      const offsetPercent = percentOf(Number.isFinite(offsetMs) ? offsetMs : 0, totalMs);
      return {
        index,
        page: visit.page,
        offsetPercent,
        widthPercent: Math.min(100 - offsetPercent, percentOf(visit.durationMs, totalMs)),
      };
    }),
    errorMarkers: timeline
      .filter(({ kind }) => kind === 'error')
      .map((event) => ({ offsetPercent: percentOf(event.offsetMs, totalMs), event })),
  };
};

/** An offset into the session as minutes and seconds, e.g. `2:05`. */
export const formatOffset = (offsetMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(offsetMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
};
