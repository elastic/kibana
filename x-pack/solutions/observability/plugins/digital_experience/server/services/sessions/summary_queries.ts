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
  TELEMETRY_SDK_LANGUAGE,
} from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import { snakeCase } from 'lodash';
import {
  CORE_WEB_VITALS,
  CORE_WEB_VITAL_THRESHOLDS,
  type CoreWebVital,
} from '../../../common/core_web_vitals';
import {
  BROWSER_SDK_LANGUAGE,
  CLICK_EVENTS,
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  EVENT_WEB_VITAL,
  OTEL_SPAN_NAME,
  PAGE_VIEW_EVENTS,
  SPAN_KIND_CLIENT,
  SPAN_STATUS_ERROR,
} from '../../../common/otel_data';
import { SESSIONS_JOURNEY_URL_CANDIDATES, SESSIONS_SOURCE_INDICES } from '../../../common/sessions';
import {
  SESSION_ATTRIBUTE_FIELDS,
  type SessionAttribute,
} from '../../../common/session_attribute_fields';
import {
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  SOURCE_URL_FIELD,
  SOURCE_WEB_VITAL_NAME_FIELD,
  SOURCE_WEB_VITAL_VALUE_FIELD,
} from '../../lib/otel/source_fields';
import { HASH_SPACE, hashPrefix, type HashRange } from './hash_ranges';

/** ES|QL returns at most this many rows, whatever the `LIMIT`. */
export const ESQL_MAX_ROWS = 10_000;

/** The window of new events whose sessions are rebuilt. */
export interface ChangedWindow {
  changedFrom: string;
  changedTo: string;
}

export interface SummaryQuery {
  query: string;
  params: estypes.EsqlNamedValue[];
}

// OTel attributes that some index doesn't map read as null instead of failing the query.
const NULLIFY_UNMAPPED_FIELDS = 'SET unmapped_fields = "NULLIFY";';
const SOURCES = SESSIONS_SOURCE_INDICES.join(', ');

const texts = (values: readonly string[]): string => values.map(escapeStringValue).join(', ');

/**
 * Attributes read from the same event. Each group takes its latest event that has any of its
 * fields, so user agent and geo still resolve when different events carry them.
 */
export const SESSION_ATTRIBUTE_GROUPS = {
  environment: ['environment'],
  user: ['user'],
  user_agent: ['browser', 'browserVersion', 'os', 'device'],
  geo: ['countryIso', 'region', 'city'],
} as const satisfies Record<string, readonly SessionAttribute[]>;

/** The browser SDK events with a session and an application, from `?from` up to `?to`. */
const browserSessionEvents = (from: string, to: string): string => `FROM ${SOURCES}
| WHERE @timestamp >= ?${from} AND @timestamp < ?${to}
  AND ${TELEMETRY_SDK_LANGUAGE} == ${escapeStringValue(BROWSER_SDK_LANGUAGE)}
  AND ${SOURCE_SESSION_ID_FIELD} IS NOT NULL AND ${SOURCE_SESSION_ID_FIELD} != ""
  AND ${SOURCE_SERVICE_NAME_FIELD} IS NOT NULL AND ${SOURCE_SERVICE_NAME_FIELD} != ""`;

const windowParams = ({ changedFrom, changedTo }: ChangedWindow): estypes.EsqlNamedValue[] => [
  { changed_from: changedFrom },
  { changed_to: changedTo },
];

/** How many sessions have an event in the window, to size the hash ranges. */
export const changedSessionsCountQuery = (window: ChangedWindow): SummaryQuery => ({
  query: `${NULLIFY_UNMAPPED_FIELDS}
${browserSessionEvents('changed_from', 'changed_to')}
| STATS sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD})`,
  params: windowParams(window),
});

const SESSION_ID = 'session_id';

/**
 * The ids of the sessions of `range` with an event in the window. The rebuild then filters on them
 * as literals, which Elasticsearch looks up in the index: a subquery would scan the whole lookback.
 */
export const changedSessionIdsQuery = (window: ChangedWindow, range: HashRange): SummaryQuery => {
  const conditions = [
    ...(range.from > 0 ? [`HASH("sha256", ${SESSION_ID}) >= ?hash_from`] : []),
    ...(range.to < HASH_SPACE ? [`HASH("sha256", ${SESSION_ID}) < ?hash_to`] : []),
  ];
  return {
    query: `${NULLIFY_UNMAPPED_FIELDS}
${browserSessionEvents('changed_from', 'changed_to')}
| STATS BY ${SESSION_ID} = ${SOURCE_SESSION_ID_FIELD}${
      conditions.length > 0 ? `\n| WHERE ${conditions.join(' AND ')}` : ''
    }
| LIMIT ${ESQL_MAX_ROWS}`,
    params: [
      ...windowParams(window),
      ...(range.from > 0 ? [{ hash_from: hashPrefix(range.from) }] : []),
      ...(range.to < HASH_SPACE ? [{ hash_to: hashPrefix(range.to) }] : []),
    ],
  };
};

/** Strings as the summaries keep them: trimmed, and empty or `null` as missing. */
const cleaned = (field: string): string =>
  `CASE(TRIM(TO_STRING(${field})) IN ("", "null"), null, TRIM(TO_STRING(${field})))`;

/** The column of an attribute in the summary query's rows, e.g. `attribute_browser_version`. */
export const attributeColumn = (attribute: SessionAttribute): string =>
  `attribute_${snakeCase(attribute)}`;
const seenColumn = (group: string): string => `seen_${group}`;

const ATTRIBUTE_EVALS = [
  ...Object.entries(SESSION_ATTRIBUTE_FIELDS).map(
    ([attribute, fields]) =>
      `${attributeColumn(attribute as SessionAttribute)} = COALESCE(${fields
        .map(cleaned)
        .join(', ')})`
  ),
  // A group's timestamp only on the events that carry any of its fields, which LAST() then picks
  // from: it skips rows without a timestamp, and keeps a null value of the latest one.
  ...Object.entries(SESSION_ATTRIBUTE_GROUPS).map(
    ([group, attributes]) =>
      `${seenColumn(group)} = CASE(${attributes
        .flatMap((attribute) => SESSION_ATTRIBUTE_FIELDS[attribute])
        .map((field) => `${field} IS NOT NULL`)
        .join(' OR ')}, @timestamp, null)`
  ),
];

/** The latest attributes of each group, then the group's latest time, for the next stage. */
const attributeStats = (): string[] =>
  Object.entries(SESSION_ATTRIBUTE_GROUPS).flatMap(([group, attributes]) => [
    ...attributes.map(
      (attribute: SessionAttribute) =>
        `${attributeColumn(attribute)} = LAST(${attributeColumn(attribute)}, ${seenColumn(group)})`
    ),
    `${seenColumn(group)} = MAX(${seenColumn(group)})`,
  ]);

/**
 * The thresholds as `float` fields store them: EDOT Browser's `browser.web_vital.value` is a float,
 * so a CLS of 0.1 reads back as 0.10000000149011612 and must still be good.
 */
const asFloat = (value: number): string => String(Math.fround(value));

const vitalStats = (vital: CoreWebVital): string[] => {
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  const ofVital = `vital == ${escapeStringValue(vital)}`;
  return [
    `${vital}_p75 = PERCENTILE(vital_value, 75) WHERE ${ofVital}`,
    `${vital}_samples = COUNT(*) WHERE ${ofVital}`,
    `${vital}_good = COUNT(*) WHERE ${ofVital} AND vital_value <= ${asFloat(good)}`,
    `${vital}_up_to_needs_improvement = COUNT(*) WHERE ${ofVital} AND vital_value <= ${asFloat(
      needsImprovement
    )}`,
  ];
};

/**
 * Only page views have a page URL, so the web vitals all fall in the session's row without one, and
 * its p75 is the session's: the next stage keeps it as is, and adds up the counts.
 */
const vitalTotals = (vital: CoreWebVital): string[] => [
  `${vital}_p75 = MAX(${vital}_p75)`,
  ...['samples', 'good', 'up_to_needs_improvement'].map(
    (count) => `${vital}_${count} = SUM(${vital}_${count})`
  ),
];

const COUNTS = [
  'event_count',
  'page_view_count',
  'page_load_count',
  'click_count',
  'js_error_count',
  'http_request_count',
  'http_failed_request_count',
] as const;

/**
 * One row per session of `sessionIds`, rebuilt from its events since `?rebuild_from`: its counts,
 * times, latest attributes and web vitals, and its journey. It aggregates per session and page URL
 * first, so the first view of each page comes out of the same pass, then per session. Counts what
 * the applications list counts, with the same event names and request outcomes.
 */
export const sessionSummaryQuery = (
  { changedTo, rebuildFrom }: { changedTo: string; rebuildFrom: string },
  sessionIds: readonly string[]
): SummaryQuery => ({
  query: `${NULLIFY_UNMAPPED_FIELDS}
${browserSessionEvents('rebuild_from', 'changed_to')}
  AND ${SOURCE_SESSION_ID_FIELD} IN (${texts(sessionIds)})
| EVAL event = COALESCE(${OTEL_EVENT_NAME}, ""), span = COALESCE(${OTEL_SPAN_NAME}, "")
| EVAL is_page_view = event IN (${texts(PAGE_VIEW_EVENTS)}) OR span IN (${texts(PAGE_VIEW_EVENTS)}),
       is_click = event IN (${texts(CLICK_EVENTS)}) OR span IN (${texts(CLICK_EVENTS)}),
       is_http_request = COALESCE(${KIND} == ${escapeStringValue(
    SPAN_KIND_CLIENT
  )}, false) AND ${HTTP_REQUEST_METHOD} IS NOT NULL,
       no_response = COALESCE(${STATUS_CODE} == ${escapeStringValue(SPAN_STATUS_ERROR)}, false),
       vital = CASE((event == ${escapeStringValue(EVENT_WEB_VITAL)} OR span == ${escapeStringValue(
    EVENT_WEB_VITAL
  )}) AND ${SOURCE_WEB_VITAL_VALUE_FIELD} IS NOT NULL, TO_LOWER(${SOURCE_WEB_VITAL_NAME_FIELD}), null),
       vital_value = ${SOURCE_WEB_VITAL_VALUE_FIELD},
       ${ATTRIBUTE_EVALS.join(',\n       ')}
| EVAL page_url = CASE(is_page_view, ${SOURCE_URL_FIELD}, null)
| STATS start_time = MIN(@timestamp),
        end_time = MAX(@timestamp),
        event_count = COUNT(@timestamp),
        page_view_count = COUNT(*) WHERE is_page_view,
        page_load_count = COUNT(*) WHERE event == ${escapeStringValue(EVENT_NAVIGATION_TIMING)},
        click_count = COUNT(*) WHERE is_click,
        js_error_count = COUNT(*) WHERE event == ${escapeStringValue(EVENT_EXCEPTION)},
        http_request_count = COUNT(*) WHERE is_http_request AND (${HTTP_RESPONSE_STATUS_CODE} IS NOT NULL OR no_response),
        http_failed_request_count = COUNT(*) WHERE is_http_request AND (COALESCE(${HTTP_RESPONSE_STATUS_CODE} >= 400, false) OR no_response),
        first_view = MIN(@timestamp) WHERE is_page_view,
        last_view = MAX(@timestamp) WHERE is_page_view,
        ${[...attributeStats(), ...CORE_WEB_VITALS.flatMap(vitalStats)].join(',\n        ')}
  BY service = ${SOURCE_SERVICE_NAME_FIELD}, session = ${SOURCE_SESSION_ID_FIELD}, page_url
| STATS start_time = MIN(start_time),
        end_time = MAX(end_time),
        ${COUNTS.map((count) => `${count} = SUM(${count})`).join(',\n        ')},
        pages = TOP(first_view, ${SESSIONS_JOURNEY_URL_CANDIDATES}, "asc", page_url) WHERE page_url IS NOT NULL,
        exit = LAST(page_url, last_view) WHERE page_url IS NOT NULL,
        ${[...attributeStats(), ...CORE_WEB_VITALS.flatMap(vitalTotals)].join(',\n        ')}
  BY service, session
| LIMIT ${ESQL_MAX_ROWS}`,
  params: [{ rebuild_from: rebuildFrom }, { changed_to: changedTo }],
});
