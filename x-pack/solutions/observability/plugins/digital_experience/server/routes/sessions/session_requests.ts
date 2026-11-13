/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  HTTP_REQUEST_METHOD,
  HTTP_RESPONSE_STATUS_CODE,
  KIND,
  OTEL_EVENT_NAME,
  STATUS_CODE,
  URL_FULL,
} from '@kbn/apm-types';
import {
  EVENT_NAVIGATION_TIMING,
  EVENT_RESOURCE_TIMING,
  NAVIGATION_TIMING_DOM_CONTENT_LOADED_EVENT_END,
  NAVIGATION_TIMING_LOAD_EVENT_END,
  RENDER_BLOCKING_STATUS_BLOCKING,
  RESOURCE_TIMING_CONNECT_END,
  RESOURCE_TIMING_CONNECT_START,
  RESOURCE_TIMING_DECODED_BODY_SIZE,
  RESOURCE_TIMING_DOMAIN_LOOKUP_END,
  RESOURCE_TIMING_DOMAIN_LOOKUP_START,
  RESOURCE_TIMING_ENCODED_BODY_SIZE,
  RESOURCE_TIMING_FETCH_START,
  RESOURCE_TIMING_INITIATOR_TYPE,
  RESOURCE_TIMING_NEXT_HOP_PROTOCOL,
  RESOURCE_TIMING_RENDER_BLOCKING_STATUS,
  RESOURCE_TIMING_REQUEST_START,
  RESOURCE_TIMING_RESPONSE_END,
  RESOURCE_TIMING_RESPONSE_START,
  RESOURCE_TIMING_SECURE_CONNECTION_START,
  RESOURCE_TIMING_TRANSFER_SIZE,
  SPAN_STATUS_ERROR,
  attributeField,
} from '../../../common/otel_data';
import type {
  SessionPageLoad,
  SessionPageVisit,
  SessionRequest,
  SessionRequestPhases,
} from '../../../common/sessions';
import { httpRequestDocuments } from '../../lib/otel/queries';
import {
  attributeNumber,
  attributeString,
  fieldNumber,
  fieldString,
  timestampMsOf,
  type OtelEventFields,
} from './event_fields';

/** Max raw requests loaded for a session: resource and navigation timings, and fetch/XHR spans. */
export const SESSION_REQUESTS_SIZE = 2000;

/**
 * Timing records whose time origins are further apart than this come from different page loads.
 * Each record is emitted within about a second of the end of its request, so the records of one
 * page load estimate its origin within that.
 */
export const DOCUMENT_GAP_MS = 2_000;

/** A page view is reported shortly after its page load starts, at most this long before. */
const VISIT_SLACK_MS = 1_000;

const SCOPE_NAME = 'scope.name';

const REQUEST_ATTRIBUTES = [
  URL_FULL,
  HTTP_REQUEST_METHOD,
  HTTP_RESPONSE_STATUS_CODE,
  RESOURCE_TIMING_INITIATOR_TYPE,
  RESOURCE_TIMING_FETCH_START,
  RESOURCE_TIMING_DOMAIN_LOOKUP_START,
  RESOURCE_TIMING_DOMAIN_LOOKUP_END,
  RESOURCE_TIMING_CONNECT_START,
  RESOURCE_TIMING_CONNECT_END,
  RESOURCE_TIMING_SECURE_CONNECTION_START,
  RESOURCE_TIMING_REQUEST_START,
  RESOURCE_TIMING_RESPONSE_START,
  RESOURCE_TIMING_RESPONSE_END,
  RESOURCE_TIMING_TRANSFER_SIZE,
  RESOURCE_TIMING_ENCODED_BODY_SIZE,
  RESOURCE_TIMING_DECODED_BODY_SIZE,
  RESOURCE_TIMING_NEXT_HOP_PROTOCOL,
  RESOURCE_TIMING_RENDER_BLOCKING_STATUS,
  NAVIGATION_TIMING_DOM_CONTENT_LOADED_EVENT_END,
  NAVIGATION_TIMING_LOAD_EVENT_END,
] as const;

/** Only the fields the requests use. */
export const REQUEST_FIELDS = [
  '@timestamp',
  OTEL_EVENT_NAME,
  KIND,
  STATUS_CODE,
  SCOPE_NAME,
  'duration',
  'trace_id',
  'span_id',
  ...REQUEST_ATTRIBUTES.map(attributeField),
];

/** Resource and navigation timing events, and the fetch/XHR spans of the browser. */
export const requestsQuery = (): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      { terms: { [OTEL_EVENT_NAME]: [EVENT_RESOURCE_TIMING, EVENT_NAVIGATION_TIMING] } },
      { bool: { filter: httpRequestDocuments() } },
    ],
    minimum_should_match: 1,
  },
});

interface Timings {
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
}

/** A resource or navigation timing event, with timings relative to its page's time origin. */
interface TimingRecord {
  isNavigation: boolean;
  timestampMs: number;
  url: string;
  initiatorType: string;
  timings: Timings;
  transferSize: number | null;
  encodedBodySize: number | null;
  decodedBodySize: number | null;
  renderBlocking: boolean;
  protocol: string | null;
  domContentLoadedMs: number | null;
  loadMs: number | null;
  traceId: string | null;
  spanId: string | null;
}

/** A fetch/XHR span, which has absolute times. */
interface ClientSpan {
  startMs: number;
  durationMs: number;
  url: string;
  initiatorType: string;
  method: string | null;
  statusCode: number | null;
  failed: boolean;
  traceId: string | null;
  spanId: string | null;
}

const timing = (event: OtelEventFields, name: string): number =>
  Math.max(0, attributeNumber(event, name) ?? 0);

const positiveOrNull = (value: number | null): number | null =>
  value !== null && value > 0 ? value : null;

const toTimingRecord = (event: OtelEventFields): TimingRecord | null => {
  const name = fieldString(event, OTEL_EVENT_NAME);
  const timestampMs = timestampMsOf(event);
  const url = attributeString(event, URL_FULL);
  if (
    (name !== EVENT_RESOURCE_TIMING && name !== EVENT_NAVIGATION_TIMING) ||
    timestampMs === null ||
    !url
  ) {
    return null;
  }
  const isNavigation = name === EVENT_NAVIGATION_TIMING;
  return {
    isNavigation,
    timestampMs,
    url,
    initiatorType: isNavigation
      ? 'navigation'
      : attributeString(event, RESOURCE_TIMING_INITIATOR_TYPE) ?? 'other',
    timings: {
      fetchStart: timing(event, RESOURCE_TIMING_FETCH_START),
      domainLookupStart: timing(event, RESOURCE_TIMING_DOMAIN_LOOKUP_START),
      domainLookupEnd: timing(event, RESOURCE_TIMING_DOMAIN_LOOKUP_END),
      connectStart: timing(event, RESOURCE_TIMING_CONNECT_START),
      connectEnd: timing(event, RESOURCE_TIMING_CONNECT_END),
      secureConnectionStart: timing(event, RESOURCE_TIMING_SECURE_CONNECTION_START),
      requestStart: timing(event, RESOURCE_TIMING_REQUEST_START),
      responseStart: timing(event, RESOURCE_TIMING_RESPONSE_START),
      responseEnd: timing(event, RESOURCE_TIMING_RESPONSE_END),
    },
    transferSize: attributeNumber(event, RESOURCE_TIMING_TRANSFER_SIZE),
    encodedBodySize: attributeNumber(event, RESOURCE_TIMING_ENCODED_BODY_SIZE),
    decodedBodySize: attributeNumber(event, RESOURCE_TIMING_DECODED_BODY_SIZE),
    renderBlocking:
      attributeString(event, RESOURCE_TIMING_RENDER_BLOCKING_STATUS) ===
      RENDER_BLOCKING_STATUS_BLOCKING,
    protocol: attributeString(event, RESOURCE_TIMING_NEXT_HOP_PROTOCOL),
    domContentLoadedMs: isNavigation
      ? positiveOrNull(attributeNumber(event, NAVIGATION_TIMING_DOM_CONTENT_LOADED_EVENT_END))
      : null,
    loadMs: isNavigation
      ? positiveOrNull(attributeNumber(event, NAVIGATION_TIMING_LOAD_EVENT_END))
      : null,
    traceId: fieldString(event, 'trace_id'),
    spanId: fieldString(event, 'span_id'),
  };
};

/** `fetch` or `xmlhttprequest`, as Resource Timing names them, from the instrumentation scope. */
const initiatorTypeOfScope = (scope: string | null): string =>
  scope && (/xml-?http-?request/i.test(scope) || scope.endsWith('/xhr'))
    ? 'xmlhttprequest'
    : 'fetch';

const toClientSpan = (event: OtelEventFields): ClientSpan | null => {
  const startMs = timestampMsOf(event);
  const url = attributeString(event, URL_FULL);
  const duration = fieldNumber(event, 'duration');
  if (fieldString(event, OTEL_EVENT_NAME) !== null || startMs === null || !url) {
    return null;
  }
  const statusCode = attributeNumber(event, HTTP_RESPONSE_STATUS_CODE);
  return {
    startMs,
    // OTel span durations are stored in nanoseconds.
    durationMs: duration !== null ? Math.max(0, duration / 1e6) : 0,
    url,
    initiatorType: initiatorTypeOfScope(fieldString(event, SCOPE_NAME)),
    method: attributeString(event, HTTP_REQUEST_METHOD),
    statusCode,
    failed:
      fieldString(event, STATUS_CODE) === SPAN_STATUS_ERROR ||
      (statusCode !== null && statusCode >= 400),
    traceId: fieldString(event, 'trace_id'),
    spanId: fieldString(event, 'span_id'),
  };
};

/** The end of the record, relative to the time origin, that its event was emitted after. */
const reportedAfterMs = ({ isNavigation, loadMs, timings }: TimingRecord): number =>
  isNavigation && loadMs !== null ? loadMs : timings.responseEnd;

/**
 * A time origin no earlier than the record's page's: the events don't carry the origin, and are
 * emitted some time after the end of what they time. A fetch/XHR span starts with its request, so
 * a record linked to one bounds it closer.
 */
const originBoundOf = (record: TimingRecord, span: ClientSpan | undefined): number => {
  const bound = record.timestampMs - reportedAfterMs(record);
  return span ? Math.min(bound, span.startMs - record.timings.fetchStart) : bound;
};

interface PageDocument {
  originMs: number;
  records: TimingRecord[];
}

/**
 * Groups timing records into the page loads they come from, each with its time origin: the
 * tightest of its records' bounds. Records of one page load have bounds close together, however
 * long it lives, while the next page load starts later; and a page load has one navigation timing.
 */
const groupIntoDocuments = (
  records: TimingRecord[],
  spansById: Map<string, ClientSpan>
): PageDocument[] => {
  const bounded = records
    .map((record) => ({
      record,
      bound: originBoundOf(record, record.spanId ? spansById.get(record.spanId) : undefined),
    }))
    .sort((a, b) => a.bound - b.bound);

  const documents: Array<PageDocument & { lastBound: number; hasNavigation: boolean }> = [];
  for (const { record, bound } of bounded) {
    const current = documents.at(-1);
    if (
      !current ||
      bound - current.lastBound > DOCUMENT_GAP_MS ||
      (record.isNavigation && current.hasNavigation)
    ) {
      documents.push({
        originMs: bound,
        records: [record],
        lastBound: bound,
        hasNavigation: record.isNavigation,
      });
      continue;
    }
    current.records.push(record);
    current.lastBound = bound;
    current.hasNavigation ||= record.isNavigation;
  }
  return documents.map(({ originMs, records: documentRecords }) => ({
    originMs,
    records: documentRecords,
  }));
};

const phasesOf = ({
  fetchStart,
  domainLookupStart,
  domainLookupEnd,
  connectStart,
  connectEnd,
  secureConnectionStart,
  requestStart,
  responseStart,
  responseEnd,
}: Timings): SessionRequestPhases => {
  const span = (start: number, end: number) => (start > 0 && end > start ? end - start : 0);
  const firstPhaseStart = [domainLookupStart, connectStart, requestStart].find((t) => t > 0) ?? 0;
  return {
    queued: span(fetchStart, firstPhaseStart),
    dns: span(domainLookupStart, domainLookupEnd),
    connect: span(connectStart, connectEnd),
    tls: span(secureConnectionStart, connectEnd),
    waiting: span(requestStart, responseStart),
    download: span(responseStart, responseEnd),
  };
};

/**
 * The browser withholds the phases of a cross-origin resource whose server doesn't send
 * `Timing-Allow-Origin`: they are all 0, but its start and end are still known.
 */
const isRestricted = ({ requestStart, responseStart, responseEnd }: Timings): boolean =>
  requestStart === 0 && responseStart === 0 && responseEnd > 0;

/** The index of the visit that started last at or before `timeMs`, else the first of `indices`. */
const latestVisitAt = (visitStarts: number[], indices: number[], timeMs: number): number =>
  indices.findLast((index) => visitStarts[index] <= timeMs) ?? indices[0] ?? 0;

const allIndices = (length: number): number[] => Array.from({ length }, (_, index) => index);

export interface SessionRequests {
  requests: SessionRequest[];
  /** The page loads, by the index of the visit they started. */
  loads: Map<number, SessionPageLoad>;
}

/**
 * Turns the raw timing events and fetch/XHR spans of a session into its requests, placed in time
 * and attributed to page visits: a request belongs to the last visit of its page load that started
 * before it.
 */
export const buildRequests = (
  events: OtelEventFields[],
  pageVisits: Array<Pick<SessionPageVisit, 'startTime'>>
): SessionRequests => {
  const records = events.flatMap((event) => toTimingRecord(event) ?? []);
  const spans = events.flatMap((event) => toClientSpan(event) ?? []);
  const spansById = new Map(spans.flatMap((span) => (span.spanId ? [[span.spanId, span]] : [])));
  const linkedSpanIds = new Set<string>();

  const visitStarts = pageVisits.map(({ startTime }) => Date.parse(startTime));
  const everyVisit = allIndices(pageVisits.length);
  const documents = groupIntoDocuments(records, spansById);
  const documentOrigins = documents.map(({ originMs }) => originMs);

  const requests: SessionRequest[] = [];
  const loads = new Map<number, SessionPageLoad>();

  documents.forEach(({ originMs, records: documentRecords }, documentIndex) => {
    const nextOriginMs = documentOrigins[documentIndex + 1] ?? Infinity;
    // A page load's visits start once it does, and before the next one.
    const documentVisits = everyVisit.filter(
      (index) =>
        visitStarts[index] >= originMs - VISIT_SLACK_MS &&
        visitStarts[index] < nextOriginMs - VISIT_SLACK_MS
    );
    // A reload of the same page starts no visit: its requests belong to the visit it reloaded.
    const candidates =
      documentVisits.length > 0
        ? documentVisits
        : [latestVisitAt(visitStarts, everyVisit, originMs + VISIT_SLACK_MS)];

    for (const record of documentRecords) {
      const span = record.spanId ? spansById.get(record.spanId) : undefined;
      if (span?.spanId) {
        linkedSpanIds.add(span.spanId);
      }
      const { timings } = record;
      const startMs = originMs + timings.fetchStart;
      const restricted = !record.isNavigation && isRestricted(timings);
      const visitIndex = record.isNavigation
        ? candidates[0]
        : latestVisitAt(visitStarts, candidates, startMs);

      requests.push({
        url: record.url,
        initiatorType: record.initiatorType,
        method: span?.method ?? null,
        statusCode: span?.statusCode ?? null,
        failed: span?.failed ?? false,
        startTime: new Date(startMs).toISOString(),
        durationMs: Math.max(0, timings.responseEnd - timings.fetchStart),
        phases: restricted ? null : phasesOf(timings),
        timingWithheld: restricted,
        cached:
          !restricted &&
          record.transferSize === 0 &&
          ((record.decodedBodySize ?? 0) > 0 || (record.encodedBodySize ?? 0) > 0),
        transferSize: restricted ? null : record.transferSize,
        decodedBodySize: restricted ? null : record.decodedBodySize,
        renderBlocking: record.renderBlocking,
        protocol: record.protocol,
        traceId: record.traceId ?? span?.traceId ?? null,
        spanId: record.spanId ?? null,
        visitIndex,
      });

      if (record.isNavigation && documentVisits.length > 0 && !loads.has(visitIndex)) {
        loads.set(visitIndex, {
          navigationStart: new Date(originMs).toISOString(),
          responseStartMs: positiveOrNull(timings.responseStart),
          domContentLoadedMs: record.domContentLoadedMs,
          loadMs: record.loadMs,
        });
      }
    }
  });

  // Requests without a timing event, such as those that failed before a response.
  for (const span of spans) {
    if (span.spanId && linkedSpanIds.has(span.spanId)) {
      continue;
    }
    requests.push({
      url: span.url,
      initiatorType: span.initiatorType,
      method: span.method,
      statusCode: span.statusCode,
      failed: span.failed,
      startTime: new Date(span.startMs).toISOString(),
      durationMs: span.durationMs,
      phases: null,
      timingWithheld: false,
      cached: false,
      transferSize: null,
      decodedBodySize: null,
      renderBlocking: false,
      protocol: null,
      traceId: span.traceId,
      spanId: span.spanId,
      visitIndex: latestVisitAt(visitStarts, everyVisit, span.startMs),
    });
  }

  requests.sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  return { requests, loads };
};
