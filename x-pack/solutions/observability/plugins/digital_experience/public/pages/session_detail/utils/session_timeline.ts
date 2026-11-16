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
import { UNKNOWN_PAGE } from '../../../labels';

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
 * The visit of a journey event, given the one open when it happened: that one, unless the event is
 * a web vital that names another page, which goes to the last visit before of that page, as the
 * API counts it. EDOT Browser settles LCP and INP when the page is left, so they arrive after the
 * next page view, with the URL they were measured on.
 */
const ownVisitIndex = (
  visits: SessionPageVisit[],
  openIndex: number,
  event: SessionTimelineEvent
): number => {
  if (event.kind !== 'web_vital' || !event.page || visits[openIndex].page === event.page) {
    return openIndex;
  }
  const earlier = visits.slice(0, openIndex).findLastIndex(({ page }) => page === event.page);
  return earlier >= 0 ? earlier : openIndex;
};

/**
 * Attributes each journey event to the page visit it happened in: the last one that started at or
 * before it, or for a late web vital the page it measured. Events before the first visit belong to
 * it, as the API starts a visit with its first event that has a page.
 */
export const groupEventsByVisit = (
  pageVisits: SessionPageVisit[],
  timeline: SessionTimelineEvent[]
): PageVisitEvents[] => {
  if (pageVisits.length === 0) {
    return [];
  }
  const startsMs = pageVisits.map(({ startTime }) => Date.parse(startTime));
  const events = pageVisits.map((): SessionTimelineEvent[] => []);
  for (const event of timeline) {
    if (!JOURNEY_EVENT_KINDS.includes(event.kind)) {
      continue;
    }
    const eventMs = Date.parse(event.timestamp);
    const openIndex = Math.max(
      0,
      startsMs.findLastIndex((startMs) => startMs <= eventMs)
    );
    events[ownVisitIndex(pageVisits, openIndex, event)].push(event);
  }
  return pageVisits.map((visit, index) => ({ visit, events: events[index] }));
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
        page: visit.page ?? UNKNOWN_PAGE,
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
