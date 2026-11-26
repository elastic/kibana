/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT, TELEMETRY_SDK_LANGUAGE } from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import {
  BROWSER_SDK_LANGUAGE,
  EVENT_DEAD_CLICK,
  EVENT_ERROR_CLICK,
  EVENT_RAGE_CLICK,
  FRUSTRATION_EVENTS,
  OTEL_LOGS_INDEX,
  PAGE_VIEW_EVENTS,
} from '../../../../common/otel_data';
import {
  DEVICE_DESKTOP_LABEL,
  DEVICE_MOBILE_LABEL,
  SOURCE_APP_VERSION_FIELDS,
  SOURCE_CSS_SELECTOR_FIELD,
  SOURCE_EVENT_NAME_FIELD,
  SOURCE_EXCEPTION_MESSAGE_FIELD,
  NULLIFY_UNMAPPED_FIELDS,
  SOURCE_EXCEPTION_TYPE_FIELD,
  SOURCE_MOBILE_FIELDS,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  SOURCE_URL_FIELD,
} from '../../../../common/otel_source_fields';
import { esqlEnvironmentCondition, TIME_BUCKETS } from '../../../../common/esql_values';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../../common/session_attribute_fields';
import { SESSIONS_INDEX_PATTERN } from '../../../../common/sessions';

/**
 * Where the per-session panels read sessions: the session summaries once the task has built them,
 * which is one document per session instead of every event, else the events.
 */
export type FrustrationSessionSource = 'summaries' | 'events';

/** The application and environment the dashboard shows; the time range comes from the dashboard. */
export interface FrustrationQueryParams {
  serviceName: string;
  environment: string;
  sessionSource: FrustrationSessionSource;
}

export type FrustrationEvent = (typeof FRUSTRATION_EVENTS)[number];

export type SignalType = 'rage' | 'dead' | 'error';

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  rage: i18n.translate('xpack.digitalExperience.frustrationDashboard.series.rage', {
    defaultMessage: 'Rage',
  }),
  dead: i18n.translate('xpack.digitalExperience.frustrationDashboard.series.dead', {
    defaultMessage: 'Dead',
  }),
  error: i18n.translate('xpack.digitalExperience.frustrationDashboard.series.error', {
    defaultMessage: 'Error',
  }),
};

const TOP_VERSIONS = 10;
const TOP_BROWSERS = 5;
const TOP_DEVICES = 5;
const ERROR_CLICK_ROWS = 20;
const TOP_ACTIONS = 20;
/** Sessions with at least this many signals share the last bucket of the distribution. */
export const MAX_SIGNALS_BUCKET = 10;

// The exact count up to this many sessions, as the summaries count them, instead of ~3,000.
const SESSION_COUNT_PRECISION = 40000;
const COUNT_SESSIONS = `COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}, ${SESSION_COUNT_PRECISION})`;
const eventsList = (events: readonly string[]): string => events.map(escapeStringValue).join(', ');
const eventList = eventsList(FRUSTRATION_EVENTS);
const pageViewList = eventsList(PAGE_VIEW_EVENTS);

// One column per type, so a chart stacks them and each value of a dimension is one row.
const TYPE_COLUMNS: ReadonlyArray<readonly [SignalType, FrustrationEvent]> = [
  ['rage', EVENT_RAGE_CLICK],
  ['dead', EVENT_DEAD_CLICK],
  ['error', EVENT_ERROR_CLICK],
];
const COUNTS_BY_TYPE = TYPE_COLUMNS.map(
  ([column, event]) =>
    `${column} = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} == ${escapeStringValue(event)}`
).join(', ');
const SIGNALS_BY_TYPE = `${COUNTS_BY_TYPE}, signals = COUNT(*)`;

/**
 * Nothing for all environments. No environment is APM's "Not defined" value in `notDefinedField`
 * or every environment field unset, as the server's `environmentFilter` reads it.
 */
const environmentClause = (
  environment: string,
  fields: readonly string[] = SESSION_ATTRIBUTE_FIELDS.environment,
  notDefinedField: string = SERVICE_ENVIRONMENT
): string => {
  const condition = esqlEnvironmentCondition(environment, fields, notDefinedField);
  return condition ? `\n  AND ${condition}` : '';
};

// The fields of the session summaries the per-session panels read.
const SUMMARY_ENVIRONMENT = 'environment';
const SUMMARY_FRUSTRATION_COUNT = 'frustration_count';
const SUMMARY_COUNTS: Record<SignalType, string> = {
  rage: 'rage_click_count',
  dead: 'dead_click_count',
  error: 'error_click_count',
};
const SUMMARY_TYPE_OF: Record<FrustrationEvent, SignalType> = {
  [EVENT_RAGE_CLICK]: 'rage',
  [EVENT_DEAD_CLICK]: 'dead',
  [EVENT_ERROR_CLICK]: 'error',
};

/** The signals of the given types a summary counts, as an expression. */
const summarySignals = (events: readonly FrustrationEvent[]): string =>
  events.length === FRUSTRATION_EVENTS.length
    ? SUMMARY_FRUSTRATION_COUNT
    : events.map((event) => SUMMARY_COUNTS[SUMMARY_TYPE_OF[event]]).join(' + ');

/**
 * The summaries of the application's sessions that overlap the dashboard's time range, as the
 * Sessions list reads them. Summaries have no `@timestamp`, so the range is on their own times.
 * Lens takes the column compared with the first `?_tstart`/`?_tend` as the time field and filters
 * it on the range too, which would drop the sessions that started before it: `TO_DATETIME` keeps
 * the first comparison off a bare column, so there is no time field.
 */
const sessionSummaries = ({ serviceName, environment }: FrustrationQueryParams): string =>
  `FROM ${SESSIONS_INDEX_PATTERN}
| WHERE service.name == ${escapeStringValue(serviceName)}
  AND TO_DATETIME(start_time) <= ?_tend AND end_time >= ?_tstart${environmentClause(
    environment,
    [SUMMARY_ENVIRONMENT],
    SUMMARY_ENVIRONMENT
  )}`;

/**
 * The browser SDK events of the service and environment in the dashboard's time range, as the
 * server's usage reads them. The range comes first so that Lens takes `@timestamp` as the time
 * field: the Lens API has no other way to set it for ES|QL, and without one the range isn't applied.
 */
const applicationEvents = ({ serviceName, environment }: FrustrationQueryParams): string =>
  `${NULLIFY_UNMAPPED_FIELDS}
FROM ${OTEL_LOGS_INDEX}
| WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend
  AND ${TELEMETRY_SDK_LANGUAGE} == ${escapeStringValue(BROWSER_SDK_LANGUAGE)}
  AND ${SOURCE_SERVICE_NAME_FIELD} == ${escapeStringValue(serviceName)}${environmentClause(
    environment
  )}`;

/** The frustration events of the service and environment, which every panel but one counts. */
export const frustrationBase = (params: FrustrationQueryParams): string =>
  `${applicationEvents(params)}
  AND ${SOURCE_EVENT_NAME_FIELD} IN (${eventList})`;

const firstOf = (fields: readonly string[]): string => `COALESCE(${fields.join(', ')})`;

const NON_EMPTY_SESSION = `${SOURCE_SESSION_ID_FIELD} IS NOT NULL AND ${SOURCE_SESSION_ID_FIELD} != ""`;

/**
 * The page views and signals of the application's sessions, a session being a non-empty id, as in
 * the session summaries. Every session has a page view, so counting sessions needs no other event.
 */
const sessionEvents = (params: FrustrationQueryParams): string =>
  `${applicationEvents(params)}
  AND ${SOURCE_EVENT_NAME_FIELD} IN (${eventsList([...PAGE_VIEW_EVENTS, ...FRUSTRATION_EVENTS])})
  AND ${NON_EMPTY_SESSION}`;

/** The share of the application's sessions with a signal of the given types, with both counts. */
export const frustratedSessionsQuery = (
  params: FrustrationQueryParams,
  events: readonly FrustrationEvent[] = FRUSTRATION_EVENTS
): string => {
  const stats =
    params.sessionSource === 'summaries'
      ? `${sessionSummaries(params)}
| STATS frustrated = COUNT(*) WHERE ${summarySignals(events)} > 0,
        sessions = COUNT(*)`
      : `${sessionEvents(params)}
| STATS frustrated = ${COUNT_SESSIONS} WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${eventsList(events)}),
        sessions = ${COUNT_SESSIONS}`;
  return `${stats}
| EVAL share = CASE(sessions > 0, TO_DOUBLE(frustrated) / sessions, 0.0)`;
};

/**
 * The signals of the given types per session of the application, with both counts, over the
 * sessions `frustratedSessionsQuery` counts.
 */
export const signalsPerSessionQuery = (
  params: FrustrationQueryParams,
  events: readonly FrustrationEvent[] = FRUSTRATION_EVENTS
): string => {
  const stats =
    params.sessionSource === 'summaries'
      ? `${sessionSummaries(params)}
| STATS signals = COALESCE(SUM(${summarySignals(events)}), 0),
        sessions = COUNT(*)`
      : `${sessionEvents(params)}
| STATS signals = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${eventsList(events)}),
        sessions = ${COUNT_SESSIONS}`;
  return `${stats}
| EVAL per_session = CASE(sessions > 0, TO_DOUBLE(signals) / sessions, 0.0)`;
};

/** The signals of one type per page view of the application, with both counts; none without views. */
export const signalsPerPageViewQuery = (
  params: FrustrationQueryParams,
  event: FrustrationEvent
): string => {
  const stats =
    params.sessionSource === 'summaries'
      ? `${sessionSummaries(params)}
| STATS signals = COALESCE(SUM(${summarySignals([event])}), 0),
        views = COALESCE(SUM(page_view_count), 0)`
      : `${applicationEvents(params)}
  AND ${SOURCE_EVENT_NAME_FIELD} IN (${eventsList([event, ...PAGE_VIEW_EVENTS])})
| STATS signals = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} == ${escapeStringValue(event)},
        views = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${pageViewList})`;
  return `${stats}
| EVAL per_view = CASE(views > 0, TO_DOUBLE(signals) / views)`;
};

/**
 * The frustrated sessions by their number of signals, in order, the sessions with
 * `MAX_SIGNALS_BUCKET` or more in one bucket. The bucket is a label, so the chart keeps the order.
 */
export const sessionsBySignalsQuery = (params: FrustrationQueryParams): string => {
  const perSession =
    params.sessionSource === 'summaries'
      ? `${sessionSummaries(params)}
  AND ${SUMMARY_FRUSTRATION_COUNT} > 0
| EVAL signals = ${SUMMARY_FRUSTRATION_COUNT}`
      : `${frustrationBase(params)}
  AND ${NON_EMPTY_SESSION}
| STATS signals = COUNT(*) BY session = ${SOURCE_SESSION_ID_FIELD}`;
  return `${perSession}
| STATS sessions = COUNT(*) BY signals = LEAST(signals, ${MAX_SIGNALS_BUCKET})
| EVAL bucket = CASE(signals >= ${MAX_SIGNALS_BUCKET}, "${MAX_SIGNALS_BUCKET}+", TO_STRING(signals))
| SORT signals
| KEEP bucket, sessions`;
};

/**
 * The page of an event as `toPagePath` labels it for the Overview's frustrated pages and the
 * session summaries: the hash route when present, else the URL path, without query or fragment.
 */
const PAGE_EVAL = `page_url = TRIM(${SOURCE_URL_FIELD}), page_hash = LOCATE(page_url, "#"),
       page_path = CASE(page_hash > 0 AND SUBSTRING(page_url, page_hash + 1, 1) == "/",
         REPLACE(SUBSTRING(page_url, page_hash + 1), "[?].*", ""),
         REPLACE(REPLACE(page_url, "[?#].*", ""), "^.*?://[^/]*", "")),
       page = CASE(page_url IS NULL OR page_url IN ("", "null"), null, page_path == "", "/", page_path)`;

const TYPE_LABEL = `CASE(${TYPE_COLUMNS.map(
  ([type, event]) =>
    `${SOURCE_EVENT_NAME_FIELD} == ${escapeStringValue(event)}, ${escapeStringValue(
      SIGNAL_TYPE_LABELS[type]
    )}`
).join(', ')})`;

/**
 * The elements with the most signals of the given types, by type and page, with their sessions and
 * their signals per view of the page, which can pass 1 as a view can have several.
 */
export const topActionsQuery = (
  params: FrustrationQueryParams,
  events: readonly FrustrationEvent[] = FRUSTRATION_EVENTS
): string =>
  `${applicationEvents(params)}
  AND ${SOURCE_EVENT_NAME_FIELD} IN (${eventsList([...events, ...PAGE_VIEW_EVENTS])})
| EVAL ${PAGE_EVAL}
| INLINE STATS views = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${pageViewList}) BY page
| WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${eventsList(events)})
| STATS signals = COUNT(*),
        sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}) WHERE ${NON_EMPTY_SESSION},
        views = MAX(views)
    BY type = ${TYPE_LABEL}, element = ${SOURCE_CSS_SELECTOR_FIELD}, page
| EVAL per_view = CASE(views > 0, TO_DOUBLE(signals) / views)
| SORT signals DESC, page, element, type
| LIMIT ${TOP_ACTIONS}`;

/** The signals of each type per bucket of the dashboard's time range. */
export const signalsOverTimeQuery = (params: FrustrationQueryParams): string =>
  `${frustrationBase(params)}
| STATS ${SIGNALS_BY_TYPE} BY time = BUCKET(@timestamp, ${TIME_BUCKETS}, ?_tstart, ?_tend)
| SORT time`;

const PER_SESSION_BY_TYPE = TYPE_COLUMNS.map(
  ([column]) => `${column} = TO_DOUBLE(${column}) / sessions`
).join(', ');

/**
 * The signals of each type per session of the `top` values of an expression with the most
 * sessions, a row each, the most frustrating first. Per session, so that a version or browser
 * with less traffic but more signals per session stands out, and a busy value without signals
 * stays as a baseline.
 */
const SUMMARY_COUNTS_BY_TYPE = TYPE_COLUMNS.map(
  ([column]) => `${column} = SUM(${SUMMARY_COUNTS[column]})`
).join(', ');

/** The value of a breakdown, as the events and the session summaries have it. */
interface Dimension {
  column: string;
  eventsExpression: string;
  summaryField: string;
  top: number;
  eventsPreEvals?: readonly string[];
}

const signalsByDimensionQuery = (
  params: FrustrationQueryParams,
  { column, eventsExpression, summaryField, top, eventsPreEvals = [] }: Dimension
): string => {
  const stats =
    params.sessionSource === 'summaries'
      ? `${sessionSummaries(params)}
  AND ${summaryField} IS NOT NULL
| STATS ${SUMMARY_COUNTS_BY_TYPE},
        signals = SUM(${SUMMARY_FRUSTRATION_COUNT}),
        sessions = COUNT(*)
    BY ${column} = ${summaryField}`
      : `${sessionEvents(params)}
| EVAL ${[...eventsPreEvals, `${column} = ${eventsExpression}`].join(', ')}
| WHERE ${column} IS NOT NULL
| STATS ${COUNTS_BY_TYPE},
        signals = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${eventList}),
        sessions = ${COUNT_SESSIONS}
    BY ${column}`;
  return `${stats}
| SORT sessions DESC, ${column}
| LIMIT ${top}
| EVAL ${PER_SESSION_BY_TYPE}, per_session = TO_DOUBLE(signals) / sessions
| SORT per_session DESC, ${column}`;
};

/** The signals of each type of the most affected application versions. */
export const signalsByVersionQuery = (params: FrustrationQueryParams): string =>
  signalsByDimensionQuery(params, {
    column: 'version',
    eventsExpression: firstOf(SOURCE_APP_VERSION_FIELDS),
    summaryField: 'service.version',
    top: TOP_VERSIONS,
  });

/** The signals of each type of the most affected browsers. */
export const signalsByBrowserQuery = (params: FrustrationQueryParams): string =>
  signalsByDimensionQuery(params, {
    column: 'browser',
    eventsExpression: firstOf(SESSION_ATTRIBUTE_FIELDS.browser),
    summaryField: 'user_agent.browser',
    top: TOP_BROWSERS,
  });

/**
 * The signals of each type of the most affected devices: the device model or type, else "Mobile"
 * or "Desktop" from `browser.mobile`, as the Overview's device filter and the summaries read it.
 */
export const signalsByDeviceQuery = (params: FrustrationQueryParams): string =>
  signalsByDimensionQuery(params, {
    column: 'device',
    eventsExpression: `COALESCE(${[
      ...SESSION_ATTRIBUTE_FIELDS.device,
      `CASE(mobile == "true", ${escapeStringValue(
        DEVICE_MOBILE_LABEL
      )}, mobile == "false", ${escapeStringValue(DEVICE_DESKTOP_LABEL)})`,
    ].join(', ')})`,
    summaryField: 'user_agent.device',
    top: TOP_DEVICES,
    eventsPreEvals: [
      `mobile = COALESCE(${SOURCE_MOBILE_FIELDS.map((field) => `TO_STRING(${field})`).join(', ')})`,
    ],
  });

const NO_EXCEPTION_LABEL = i18n.translate(
  'xpack.digitalExperience.frustrationDashboard.exceptions.noException',
  { defaultMessage: 'No exception' }
);

/**
 * The most frequent error click exceptions, with their signals and sessions. Error clicks without
 * an exception, e.g. on a slow request, share a labeled row.
 */
export const errorClicksQuery = (params: FrustrationQueryParams): string =>
  `${applicationEvents(params)}
  AND ${SOURCE_EVENT_NAME_FIELD} == ${escapeStringValue(EVENT_ERROR_CLICK)}
| STATS signals = COUNT(*),
        sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}) WHERE ${NON_EMPTY_SESSION}
    BY type = COALESCE(${SOURCE_EXCEPTION_TYPE_FIELD}, ${escapeStringValue(
    NO_EXCEPTION_LABEL
  )}), message = ${SOURCE_EXCEPTION_MESSAGE_FIELD}
| SORT signals DESC
| LIMIT ${ERROR_CLICK_ROWS}`;
