/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_OUTCOME,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  OTEL_EVENT_NAME,
  URL_FULL,
} from '@kbn/apm-types';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { dateRangeQuery, termQuery } from '@kbn/es-query';
import { CORE_WEB_VITALS, type CoreWebVital } from '../../../common/core_web_vitals';
import {
  BROWSER_CSS_SELECTOR,
  CLICK_EVENTS,
  EVENT_EXCEPTION,
  EVENT_WEB_VITAL,
  EXCEPTION_STACKTRACE,
  OTEL_SPAN_NAME,
  PAGE_VIEW_EVENTS,
  WEB_VITAL_NAME,
  WEB_VITAL_VALUE,
  attributeField,
  resourceAttributeField,
} from '../../../common/otel_data';
import {
  SESSIONS_INDEX_PATTERN,
  SESSIONS_MAX_SESSION_HOURS,
  SESSIONS_SOURCE_INDICES,
  emptyWebVitals,
  toPagePath,
  type SessionDetailResponse,
  type SessionPageVisit,
  type SessionSummary,
  type SessionTimelineEvent,
  type SessionTimelineEventKind,
} from '../../../common/sessions';
import { SOURCE_SERVICE_NAME_FIELD, SOURCE_SESSION_ID_FIELD } from '../../lib/otel/source_fields';
import { totalHitsOf } from '../../lib/helpers/values';
import {
  attributeNumber,
  attributeString,
  fieldString,
  timestampMsOf,
  type OtelEventFields,
} from './event_fields';
import { toSessionSummary, type StoredSessionDocument } from './list_sessions';
import {
  REQUEST_FIELDS,
  SESSION_REQUESTS_SIZE,
  buildRequests,
  requestsQuery,
} from './session_requests';

export type { OtelEventFields } from './event_fields';

/** Max raw page views, clicks, errors and web vitals loaded for the session timeline. */
export const SESSION_TIMELINE_SIZE = 1000;
/** Widens the raw event window so events just before the summary start are not cut off. */
const TIMELINE_SLACK_MS = 60_000;
const MAX_SESSION_MS = SESSIONS_MAX_SESSION_HOURS * 60 * 60 * 1000;

const HTTP_URL = 'http.url';
const ERROR_TYPE = 'error.type';
const TARGET_XPATH = 'target_xpath';

/** The attributes the timeline shows, from the event or its resource. */
const TIMELINE_ATTRIBUTES = [
  URL_FULL,
  HTTP_URL,
  WEB_VITAL_NAME,
  WEB_VITAL_VALUE,
  EVENT_OUTCOME,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  ERROR_TYPE,
  EXCEPTION_STACKTRACE,
  BROWSER_CSS_SELECTOR,
  TARGET_XPATH,
] as const;

/**
 * Only the fields the timeline uses, flattened by the `fields` option whatever their stored shape:
 * OTel attributes can be stored under dotted keys or as nested objects.
 */
const TIMELINE_FIELDS = [
  '@timestamp',
  OTEL_SPAN_NAME,
  OTEL_EVENT_NAME,
  'duration',
  'trace_id',
  'span_id',
  ...TIMELINE_ATTRIBUTES.flatMap((name) => [attributeField(name), resourceAttributeField(name)]),
];

const durationOf = (event: OtelEventFields): number | null => {
  const duration = event.duration?.[0];
  return typeof duration === 'number' ? duration : null;
};

const eventNameOf = (event: OtelEventFields): string =>
  fieldString(event, OTEL_EVENT_NAME) ?? fieldString(event, OTEL_SPAN_NAME) ?? '';

const isOneOf = (name: string, names: readonly string[]): boolean => names.includes(name);

const pageOf = (event: OtelEventFields): string | null =>
  toPagePath(attributeString(event, URL_FULL) ?? attributeString(event, HTTP_URL));

const webVitalOf = (event: OtelEventFields): { name: CoreWebVital; value: number } | null => {
  if (eventNameOf(event) !== EVENT_WEB_VITAL) {
    return null;
  }
  const name = attributeString(event, WEB_VITAL_NAME)?.toLowerCase();
  const value = attributeNumber(event, WEB_VITAL_VALUE);
  const vital = CORE_WEB_VITALS.find((candidate) => candidate === name);
  return vital && value != null ? { name: vital, value } : null;
};

/** The kind of a raw event, from the same event names the session summaries count. */
const classify = (event: OtelEventFields): SessionTimelineEventKind => {
  const name = eventNameOf(event);
  if (name === EVENT_WEB_VITAL) {
    return 'web_vital';
  }
  if (name === EVENT_EXCEPTION || attributeString(event, EVENT_OUTCOME) === 'failure') {
    return 'error';
  }
  if (isOneOf(name, CLICK_EVENTS)) {
    return 'click';
  }
  if (isOneOf(name, PAGE_VIEW_EVENTS)) {
    return 'page_view';
  }
  return durationOf(event) !== null ? 'span' : 'log';
};

const detailOf = (kind: SessionTimelineEventKind, event: OtelEventFields): string | null => {
  switch (kind) {
    case 'error':
      return attributeString(event, EXCEPTION_MESSAGE) ?? attributeString(event, ERROR_TYPE);
    case 'click':
      return attributeString(event, BROWSER_CSS_SELECTOR) ?? attributeString(event, TARGET_XPATH);
    case 'web_vital':
      return attributeString(event, WEB_VITAL_VALUE);
    default:
      return attributeString(event, URL_FULL) ?? attributeString(event, HTTP_URL);
  }
};

const displayNameOf = (kind: SessionTimelineEventKind, event: OtelEventFields): string => {
  if (kind === 'web_vital') {
    return attributeString(event, WEB_VITAL_NAME)?.toUpperCase() ?? 'Web vital';
  }
  if (kind === 'error') {
    return attributeString(event, EXCEPTION_TYPE) ?? 'Error';
  }
  return eventNameOf(event) || kind;
};

const toTimelineEvent = (
  event: OtelEventFields,
  sessionStartMs: number
): SessionTimelineEvent | null => {
  const timestamp = fieldString(event, '@timestamp');
  const ms = timestamp ? Date.parse(timestamp) : NaN;
  if (!timestamp || !Number.isFinite(ms)) {
    return null;
  }
  const kind = classify(event);
  const duration = durationOf(event);
  return {
    kind,
    name: displayNameOf(kind, event),
    timestamp,
    offsetMs: Math.max(0, ms - sessionStartMs),
    // OTel span durations are stored in nanoseconds.
    durationMs: duration !== null ? duration / 1e6 : null,
    page: pageOf(event),
    detail: detailOf(kind, event),
    stacktrace: kind === 'error' ? attributeString(event, EXCEPTION_STACKTRACE) : null,
    traceId: fieldString(event, 'trace_id'),
    spanId: fieldString(event, 'span_id'),
  };
};

export const buildTimeline = (
  events: OtelEventFields[],
  sessionStartMs: number
): SessionTimelineEvent[] =>
  events.flatMap((event) => toTimelineEvent(event, sessionStartMs) ?? []);

/** Splits the session into consecutive page visits, attributing events to the page they ran on. */
export const buildPageVisits = (
  events: OtelEventFields[],
  sessionStartMs: number,
  sessionEnd: string
): SessionPageVisit[] => {
  const visits: SessionPageVisit[] = [];
  let current: SessionPageVisit | undefined;

  let lastEventTime: string | undefined;

  const close = (endTime: string) => {
    if (current) {
      current.endTime = endTime;
      current.durationMs = Math.max(0, Date.parse(endTime) - Date.parse(current.startTime)) || 0;
      visits.push(current);
    }
  };

  for (const event of events) {
    const timelineEvent = toTimelineEvent(event, sessionStartMs);
    if (!timelineEvent) {
      continue;
    }
    lastEventTime = timelineEvent.timestamp;
    const { page, kind } = timelineEvent;
    if (page && page !== current?.page && (kind === 'page_view' || !current)) {
      close(timelineEvent.timestamp);
      current = {
        page,
        url: kind === 'page_view' ? timelineEvent.detail : null,
        startTime: timelineEvent.timestamp,
        endTime: timelineEvent.timestamp,
        durationMs: 0,
        clickCount: 0,
        errorCount: 0,
        webVitals: emptyWebVitals(),
        load: null,
      };
    }
    if (!current) {
      continue;
    }
    if (kind === 'click') {
      current.clickCount += 1;
    }
    if (kind === 'error') {
      current.errorCount += 1;
    }
    const vital = webVitalOf(event);
    if (vital) {
      // EDOT Browser reports a final value per page; keep the latest one.
      current.webVitals[vital.name] = vital.value;
    }
  }
  // Raw events can be newer than the summary, which is as fresh as the task's last run.
  const sessionEndMs = Date.parse(sessionEnd);
  const endsAfterSummary =
    lastEventTime !== undefined &&
    (!Number.isFinite(sessionEndMs) || Date.parse(lastEventTime) > sessionEndMs);
  close(endsAfterSummary && lastEventTime ? lastEventTime : sessionEnd);
  return visits;
};

/** The summary's start time, or the first event's when the summary has none. */
const sessionStartOf = (startMs: number, events: OtelEventFields[]): number => {
  if (Number.isFinite(startMs)) {
    return startMs;
  }
  return (events[0] && timestampMsOf(events[0])) ?? 0;
};

/** The event names the journey shows, from the logs or, as span names, the traces. */
const JOURNEY_EVENT_NAMES = [
  ...PAGE_VIEW_EVENTS,
  ...CLICK_EVENTS,
  EVENT_EXCEPTION,
  EVENT_WEB_VITAL,
];

/**
 * Only the events the journey shows: requests have a query of their own, so that a page that loads
 * many resources can't push the clicks and errors after it out of the timeline.
 */
const journeyQuery = (): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { [OTEL_EVENT_NAME]: JOURNEY_EVENT_NAMES } },
      { terms: { [OTEL_SPAN_NAME]: JOURNEY_EVENT_NAMES } },
    ],
    minimum_should_match: 1,
  },
});

/**
 * The raw events of the session: from just before its summarized start up to the longest a session
 * lasts, which also takes in the events newer than the summary.
 */
const timelineTimeRange = (startMs: number) =>
  Number.isFinite(startMs)
    ? dateRangeQuery(startMs - TIMELINE_SLACK_MS, startMs + MAX_SESSION_MS)
    : [];

/** Loads a session summary and its raw events as the given (current) user. */
export const getSession = async (
  client: ElasticsearchClient,
  { serviceName, sessionId }: { serviceName: string; sessionId: string }
): Promise<SessionDetailResponse | null> => {
  const summaryResponse = await client.search<StoredSessionDocument>({
    index: SESSIONS_INDEX_PATTERN,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 1,
    sort: [{ end_time: 'desc' }],
    query: {
      bool: {
        filter: [...termQuery('service.name', serviceName), ...termQuery('session.id', sessionId)],
      },
    },
  });
  const doc = summaryResponse.hits.hits[0]?._source;
  if (!doc) {
    return null;
  }
  const session: SessionSummary = toSessionSummary(doc);
  const startMs = Date.parse(session.startTime);

  const sessionFilter = [
    ...termQuery(SOURCE_SESSION_ID_FIELD, sessionId),
    ...termQuery(SOURCE_SERVICE_NAME_FIELD, serviceName),
    ...timelineTimeRange(startMs),
  ];
  const searchEvents = (size: number, fields: string[], query: estypes.QueryDslQueryContainer) =>
    client.search({
      index: [...SESSIONS_SOURCE_INDICES],
      ignore_unavailable: true,
      allow_no_indices: true,
      size,
      track_total_hits: size + 1,
      sort: [{ '@timestamp': 'asc' }],
      _source: false,
      fields,
      query: { bool: { filter: [...sessionFilter, query] } },
    });
  const [eventsResponse, requestsResponse] = await Promise.all([
    searchEvents(SESSION_TIMELINE_SIZE, TIMELINE_FIELDS, journeyQuery()),
    searchEvents(SESSION_REQUESTS_SIZE, REQUEST_FIELDS, requestsQuery()),
  ]);

  const fieldsOf = (response: estypes.SearchResponse): OtelEventFields[] =>
    response.hits.hits.flatMap(({ fields }) => (fields ? [fields] : []));
  const events = fieldsOf(eventsResponse);
  const requestEvents = fieldsOf(requestsResponse);
  const sessionStartMs = sessionStartOf(startMs, events);
  const pageVisits = buildPageVisits(events, sessionStartMs, session.endTime);
  const { requests, loads } = buildRequests(requestEvents, pageVisits);

  return {
    session,
    timeline: buildTimeline(events, sessionStartMs),
    timelineTruncated: totalHitsOf(eventsResponse.hits.total) > events.length,
    pageVisits: pageVisits.map((visit, index) => ({ ...visit, load: loads.get(index) ?? null })),
    requests,
    requestsTruncated: totalHitsOf(requestsResponse.hits.total) > requestEvents.length,
  };
};
