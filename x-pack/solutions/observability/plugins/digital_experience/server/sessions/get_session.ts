/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_SOURCE_INDICES,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  WEB_VITAL_NAMES,
  emptyWebVitals,
  toPagePath,
  type SessionDetailResponse,
  type SessionPageVisit,
  type SessionSummary,
  type SessionTimelineEvent,
  type SessionTimelineEventKind,
  type WebVitalName,
} from '../../common/sessions';
import { toSessionSummary, type SessionDocument } from './list_sessions';

/** Max raw events loaded for the session timeline. */
export const SESSION_TIMELINE_SIZE = 1000;
/** Widens the raw event window so events around the summary bounds are not cut off. */
const TIMELINE_SLACK_MS = 60_000;

const TIMELINE_SOURCE = [
  '@timestamp',
  'name',
  'event_name',
  'duration',
  'trace_id',
  'span_id',
  'attributes',
  'resource.attributes',
];

export interface OtelSource {
  '@timestamp'?: string;
  name?: string;
  event_name?: string;
  duration?: number;
  trace_id?: string;
  span_id?: string;
  attributes?: Record<string, unknown>;
  resource?: { attributes?: Record<string, unknown> };
}

const getNested = (value: unknown, path: string[]): unknown =>
  path.reduce<unknown>(
    (current, key) =>
      current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined,
    value
  );

/** Reads an attribute stored either under a dotted key or as nested objects. */
const attribute = (bag: Record<string, unknown> | undefined, key: string): unknown =>
  bag?.[key] ?? getNested(bag, key.split('.'));

const attributeString = (source: OtelSource, key: string): string | null => {
  const value = attribute(source.attributes, key) ?? attribute(source.resource?.attributes, key);
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : null;
};

const attributeNumber = (source: OtelSource, key: string): number | null => {
  const value = Number(attributeString(source, key));
  return attributeString(source, key) != null && Number.isFinite(value) ? value : null;
};

const eventNameOf = (source: OtelSource): string => source.event_name ?? source.name ?? '';

const pageOf = (source: OtelSource): string | null =>
  toPagePath(attributeString(source, 'url.full') ?? attributeString(source, 'http.url'));

const webVitalOf = (source: OtelSource): { name: WebVitalName; value: number } | null => {
  if (eventNameOf(source) !== 'browser.web_vital') {
    return null;
  }
  const name = attributeString(source, 'browser.web_vital.name')?.toLowerCase();
  const value = attributeNumber(source, 'browser.web_vital.value');
  const vital = WEB_VITAL_NAMES.find((candidate) => candidate === name);
  return vital && value != null ? { name: vital, value } : null;
};

const classify = (source: OtelSource): SessionTimelineEventKind => {
  const name = eventNameOf(source);
  if (name === 'browser.web_vital') {
    return 'web_vital';
  }
  if (name === 'exception' || attributeString(source, 'event.outcome') === 'failure') {
    return 'error';
  }
  if (name === 'click' || name === 'browser.user_action.click') {
    return 'click';
  }
  if (name === 'documentLoad' || name === 'browser.navigation') {
    return 'page_view';
  }
  return typeof source.duration === 'number' ? 'span' : 'log';
};

const detailOf = (kind: SessionTimelineEventKind, source: OtelSource): string | null => {
  switch (kind) {
    case 'error':
      return attributeString(source, 'exception.message') ?? attributeString(source, 'error.type');
    case 'click':
      return (
        attributeString(source, 'browser.css_selector') ?? attributeString(source, 'target_xpath')
      );
    case 'web_vital':
      return attributeString(source, 'browser.web_vital.value');
    default:
      return attributeString(source, 'url.full') ?? attributeString(source, 'http.url');
  }
};

const displayNameOf = (kind: SessionTimelineEventKind, source: OtelSource): string => {
  if (kind === 'web_vital') {
    return attributeString(source, 'browser.web_vital.name')?.toUpperCase() ?? 'Web vital';
  }
  if (kind === 'error') {
    return attributeString(source, 'exception.type') ?? 'Error';
  }
  return eventNameOf(source) || kind;
};

const toTimelineEvent = (
  source: OtelSource,
  sessionStartMs: number
): SessionTimelineEvent | null => {
  const timestamp = source['@timestamp'];
  const ms = timestamp ? Date.parse(timestamp) : NaN;
  if (!timestamp || !Number.isFinite(ms)) {
    return null;
  }
  const kind = classify(source);
  return {
    kind,
    name: displayNameOf(kind, source),
    timestamp,
    offsetMs: Math.max(0, ms - sessionStartMs),
    // OTel span durations are stored in nanoseconds.
    durationMs: typeof source.duration === 'number' ? source.duration / 1e6 : null,
    page: pageOf(source),
    detail: detailOf(kind, source),
    traceId: source.trace_id ?? null,
    spanId: source.span_id ?? null,
  };
};

export const buildTimeline = (
  sources: OtelSource[],
  sessionStartMs: number
): SessionTimelineEvent[] =>
  sources.flatMap((source) => toTimelineEvent(source, sessionStartMs) ?? []);

/** Splits the session into consecutive page visits, attributing events to the page they ran on. */
export const buildPageVisits = (
  sources: OtelSource[],
  sessionStartMs: number,
  sessionEnd: string
): SessionPageVisit[] => {
  const visits: SessionPageVisit[] = [];
  let current: SessionPageVisit | undefined;

  const close = (endTime: string) => {
    if (current) {
      current.endTime = endTime;
      current.durationMs = Math.max(0, Date.parse(endTime) - Date.parse(current.startTime));
      visits.push(current);
    }
  };

  for (const source of sources) {
    const event = toTimelineEvent(source, sessionStartMs);
    if (!event) {
      continue;
    }
    const { page } = event;
    if (page && page !== current?.page && (event.kind === 'page_view' || !current)) {
      close(event.timestamp);
      current = {
        page,
        url: event.kind === 'page_view' ? event.detail : null,
        startTime: event.timestamp,
        endTime: event.timestamp,
        durationMs: 0,
        clickCount: 0,
        errorCount: 0,
        webVitals: emptyWebVitals(),
      };
    }
    if (!current) {
      continue;
    }
    if (event.kind === 'click') {
      current.clickCount += 1;
    }
    if (event.kind === 'error') {
      current.errorCount += 1;
    }
    const vital = webVitalOf(source);
    if (vital) {
      // EDOT Browser reports a final value per page; keep the latest one.
      current.webVitals[vital.name] = vital.value;
    }
  }
  close(sessionEnd);
  return visits;
};

/** Loads a session summary and its raw events as the given (current) user. */
export const getSession = async (
  client: ElasticsearchClient,
  { serviceName, sessionId }: { serviceName: string; sessionId: string }
): Promise<SessionDetailResponse | null> => {
  const summaryResponse = await client.search<SessionDocument>({
    index: SESSIONS_INDEX_PATTERN,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 1,
    sort: [{ end_time: 'desc' }],
    query: {
      bool: {
        filter: [{ term: { 'service.name': serviceName } }, { term: { 'session.id': sessionId } }],
      },
    },
  });
  const doc = summaryResponse.hits.hits[0]?._source;
  if (!doc) {
    return null;
  }
  const session: SessionSummary = toSessionSummary(doc);
  const startMs = Date.parse(session.startTime);
  const endMs = Date.parse(session.endTime);

  const eventsResponse = await client.search<OtelSource>({
    index: [...SESSIONS_SOURCE_INDICES],
    ignore_unavailable: true,
    allow_no_indices: true,
    size: SESSION_TIMELINE_SIZE,
    track_total_hits: SESSION_TIMELINE_SIZE + 1,
    sort: [{ '@timestamp': 'asc' }],
    _source: TIMELINE_SOURCE,
    query: {
      bool: {
        filter: [
          { term: { [SOURCE_SESSION_ID_FIELD]: sessionId } },
          { term: { [SOURCE_SERVICE_NAME_FIELD]: serviceName } },
          {
            range: {
              '@timestamp': {
                gte: new Date(startMs - TIMELINE_SLACK_MS).toISOString(),
                lte: new Date(endMs + TIMELINE_SLACK_MS).toISOString(),
              },
            },
          },
        ],
      },
    },
  });

  const sources = eventsResponse.hits.hits.flatMap((hit) => (hit._source ? [hit._source] : []));
  const total =
    typeof eventsResponse.hits.total === 'number'
      ? eventsResponse.hits.total
      : eventsResponse.hits.total?.value ?? sources.length;

  return {
    session,
    timeline: buildTimeline(sources, startMs),
    timelineTruncated: total > sources.length,
    pageVisits: buildPageVisits(sources, startMs, session.endTime),
  };
};
