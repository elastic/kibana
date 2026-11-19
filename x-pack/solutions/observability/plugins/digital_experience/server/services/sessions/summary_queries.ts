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
  SOURCE_LOAD_EVENT_END_FIELD,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  SOURCE_URL_FIELD,
  SOURCE_WEB_VITAL_NAME_FIELD,
  SOURCE_WEB_VITAL_VALUE_FIELD,
} from '../../lib/otel/source_fields';
import { ESQL_DEFAULT_MAX_ROWS } from './esql_max_rows';
import { HASH_SPACE, hashPrefix, type HashRange } from './hash_ranges';

/**
 * Rows an ES|QL response holds, whatever the `LIMIT`: the cluster's
 * `esql.query.result_truncation_max_size`, read by `esqlMaxRows`. A batch whose response reaches
 * it is split and asked again, as the rows it would have held past the cut are gone silently.
 */
export const ESQL_MAX_ROWS = ESQL_DEFAULT_MAX_ROWS;

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
const SESSION_HASH = 'session_hash';
/** The column of the changed session ids query: the ids of one hash bucket, multi-valued. */
export const SESSION_IDS_COLUMN = 'session_ids';
/** Hex digits of the hash that name a bucket: 4,096 buckets, well under the default row limit. */
const BUCKET_DIGITS = 3;

/**
 * Hex digits that name a bucket of the changed ids, so that every bucket is a row of the response:
 * a bucket past the cut takes its sessions with it, and nothing says it was left out. One digit
 * fewer is 16 times fewer buckets, and none at all puts every id in a single row.
 */
export const bucketDigitsOf = (maxRows: number): number => {
  let digits = BUCKET_DIGITS;
  while (digits > 0 && 16 ** digits > maxRows) {
    digits -= 1;
  }
  return digits;
};

/**
 * The ids of the sessions of `range` with an event in the window, a row per bucket of their hash:
 * ES|QL returns at most 10,000 rows, but a row can hold any number of ids, so one aggregation of
 * the window returns them all. The rebuild then filters on them as literals, which Elasticsearch
 * looks up in the index: a subquery would scan the whole lookback.
 */
export const changedSessionIdsQuery = (
  window: ChangedWindow,
  range: HashRange,
  maxRows: number = ESQL_MAX_ROWS
): SummaryQuery => {
  const conditions = [
    ...(range.from > 0 ? [`${SESSION_HASH} >= ?hash_from`] : []),
    ...(range.to < HASH_SPACE ? [`${SESSION_HASH} < ?hash_to`] : []),
  ];
  const digits = bucketDigitsOf(maxRows);
  return {
    query: `${NULLIFY_UNMAPPED_FIELDS}
${browserSessionEvents('changed_from', 'changed_to')}
| STATS BY ${SESSION_ID} = ${SOURCE_SESSION_ID_FIELD}
| EVAL ${SESSION_HASH} = HASH("sha256", ${SESSION_ID})${
      conditions.length > 0 ? `\n| WHERE ${conditions.join(' AND ')}` : ''
    }
| STATS ${SESSION_IDS_COLUMN} = VALUES(${SESSION_ID})${
      digits > 0 ? ` BY bucket = SUBSTRING(${SESSION_HASH}, 1, ${digits})` : ''
    }
| LIMIT ${maxRows}`,
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
/** The column of a source field's value on the latest event of its group, e.g. `raw_attributes_user_id`. */
const RAW_PREFIX = 'raw_';
const rawColumn = (field: string): string => `${RAW_PREFIX}${field.replace(/\./g, '_')}`;
const groupFields = (attributes: readonly SessionAttribute[]): string[] => [
  ...new Set(attributes.flatMap((attribute) => SESSION_ATTRIBUTE_FIELDS[attribute])),
];

// A group's timestamp only on the events that carry any of its fields, which LAST() then picks
// from: it skips rows without a timestamp, and keeps a null value of the latest one.
const SEEN_EVALS = Object.entries(SESSION_ATTRIBUTE_GROUPS).map(
  ([group, attributes]) =>
    `${seenColumn(group)} = CASE(${groupFields(attributes)
      .map((field) => `${field} IS NOT NULL`)
      .join(' OR ')}, @timestamp, null)`
);

/** A column of the summary and the aggregation that computes it. */
type Stat = readonly [column: string, aggregation: string];

/**
 * Each source field of a group as it is on the group's latest event. The fields are cleaned into
 * attributes only once per session, after the last stage: cleaning every event's fields took
 * about 40% of the query.
 */
const ATTRIBUTE_STATS: Stat[] = Object.entries(SESSION_ATTRIBUTE_GROUPS).flatMap(
  ([group, attributes]) =>
    groupFields(attributes).map(
      (field): Stat => [rawColumn(field), `LAST(TO_STRING(${field}), ${seenColumn(group)})`]
    )
);

/** Each attribute from its group's latest event: the first of its fields with a value. */
const ATTRIBUTE_EVALS = Object.entries(SESSION_ATTRIBUTE_FIELDS).map(
  ([attribute, fields]) =>
    `${attributeColumn(attribute as SessionAttribute)} = COALESCE(${fields
      .map((field) => cleaned(rawColumn(field)))
      .join(', ')})`
);

/**
 * The thresholds as `float` fields store them: EDOT Browser's `browser.web_vital.value` is a float,
 * so a CLS of 0.1 reads back as 0.10000000149011612 and must still be good.
 */
const asFloat = (value: number): string => String(Math.fround(value));

// A column per web vital, so that its stats need no filter and compare a number, not a string.
const VITAL_EVALS = CORE_WEB_VITALS.map(
  (vital) => `${vital} = CASE(vital == ${escapeStringValue(vital)}, vital_value, null)`
);

const vitalStatsOf = (vital: CoreWebVital): Stat[] => {
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  return [
    [`${vital}_p75`, `PERCENTILE(${vital}, 75)`],
    [`${vital}_samples`, `COUNT(${vital})`],
    [`${vital}_good`, `COUNT(*) WHERE ${vital} <= ${asFloat(good)}`],
    [`${vital}_up_to_needs_improvement`, `COUNT(*) WHERE ${vital} <= ${asFloat(needsImprovement)}`],
  ];
};

const SESSION_STATS: Stat[] = [
  ['start_time', 'MIN(@timestamp)'],
  ['end_time', 'MAX(@timestamp)'],
  ['event_count', 'COUNT(@timestamp)'],
  ['page_view_count', 'COUNT(*) WHERE is_page_view'],
  ['page_load_count', `COUNT(*) WHERE event == ${escapeStringValue(EVENT_NAVIGATION_TIMING)}`],
  ['click_count', 'COUNT(*) WHERE is_click'],
  ['js_error_count', `COUNT(*) WHERE event == ${escapeStringValue(EVENT_EXCEPTION)}`],
  [
    'http_request_count',
    `COUNT(*) WHERE is_http_request AND (${HTTP_RESPONSE_STATUS_CODE} IS NOT NULL OR no_response)`,
  ],
  [
    'http_failed_request_count',
    `COUNT(*) WHERE is_http_request AND (COALESCE(${HTTP_RESPONSE_STATUS_CODE} >= 400, false) OR no_response)`,
  ],
  ...ATTRIBUTE_STATS,
];

const VITAL_STATS: Stat[] = CORE_WEB_VITALS.flatMap(vitalStatsOf);

const LOAD_TIME_STATS: Stat[] = [
  ['load_time_p75', 'PERCENTILE(load_time, 75)'],
  ['load_time_samples', 'COUNT(load_time)'],
];

// A session without a web vital or a timed page load has no row in that branch.
const BRANCH_COUNT_EVALS = [...VITAL_STATS, ...LOAD_TIME_STATS].flatMap(([column, aggregation]) =>
  aggregation.startsWith('COUNT(') ? [`${column} = COALESCE(${column}, 0)`] : []
);

// Only one branch has each of these columns, so its row is the only non-null value.
const MERGED_STATS: Stat[] = [...SESSION_STATS, ...VITAL_STATS, ...LOAD_TIME_STATS].map(
  ([column]) => [column, `MAX(${column})`]
);

// The branch filters are on the source fields: the COALESCE of `event` and `span` keeps Lucene
// from applying them.
const PAGE_VIEW_FILTER = `${OTEL_EVENT_NAME} IN (${texts(
  PAGE_VIEW_EVENTS
)}) OR ${OTEL_SPAN_NAME} IN (${texts(PAGE_VIEW_EVENTS)})`;
const WEB_VITAL_FILTER = `(${OTEL_EVENT_NAME} == ${escapeStringValue(
  EVENT_WEB_VITAL
)} OR ${OTEL_SPAN_NAME} == ${escapeStringValue(
  EVENT_WEB_VITAL
)}) AND ${SOURCE_WEB_VITAL_VALUE_FIELD} IS NOT NULL`;
// Page loads without a load event are counted but have no load time, as in the Overview.
const LOAD_TIME_FILTER = `${OTEL_EVENT_NAME} == ${escapeStringValue(
  EVENT_NAVIGATION_TIMING
)} AND ${SOURCE_LOAD_EVENT_END_FIELD} IS NOT NULL`;

const renderStats = (stats: readonly Stat[], indent: string): string =>
  stats.map(([column, aggregation]) => `${column} = ${aggregation}`).join(`,\n${indent}`);

/**
 * One row per session of `sessionIds`, rebuilt from its events since `?rebuild_from`: its counts,
 * times, latest attributes, web vitals and load time, and its journey. One branch aggregates per
 * session, one the first and last view of each page, one the web vitals and one the load time,
 * which the last stage merges per session. Counts what the applications list counts, with the same event names and request
 * outcomes. Design: "Summary query" in the plugin README; measurements: `query_performance.md`.
 */
export const sessionSummaryQuery = (
  { changedTo, rebuildFrom }: { changedTo: string; rebuildFrom: string },
  sessionIds: readonly string[],
  maxRows: number = ESQL_MAX_ROWS
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
       ${SEEN_EVALS.join(',\n       ')}
| FORK (STATS ${renderStats(SESSION_STATS, '              ')}
          BY service = ${SOURCE_SERVICE_NAME_FIELD}, session = ${SOURCE_SESSION_ID_FIELD})
       (WHERE ${PAGE_VIEW_FILTER}
        | STATS first_view = MIN(@timestamp), last_view = MAX(@timestamp)
            BY service = ${SOURCE_SERVICE_NAME_FIELD}, session = ${SOURCE_SESSION_ID_FIELD}, page_url = ${SOURCE_URL_FIELD})
       (WHERE ${WEB_VITAL_FILTER}
        | EVAL vital = TO_LOWER(${SOURCE_WEB_VITAL_NAME_FIELD}), vital_value = ${SOURCE_WEB_VITAL_VALUE_FIELD}
        | EVAL ${VITAL_EVALS.join(', ')}
        | STATS ${renderStats(VITAL_STATS, '                ')}
            BY service = ${SOURCE_SERVICE_NAME_FIELD}, session = ${SOURCE_SESSION_ID_FIELD})
       (WHERE ${LOAD_TIME_FILTER}
        | EVAL load_time = TO_DOUBLE(${SOURCE_LOAD_EVENT_END_FIELD})
        | STATS ${renderStats(LOAD_TIME_STATS, '                ')}
            BY service = ${SOURCE_SERVICE_NAME_FIELD}, session = ${SOURCE_SESSION_ID_FIELD})
| STATS ${renderStats(MERGED_STATS, '        ')},
        pages = TOP(first_view, ${SESSIONS_JOURNEY_URL_CANDIDATES}, "asc", page_url) WHERE page_url IS NOT NULL,
        exit = LAST(page_url, last_view) WHERE page_url IS NOT NULL
  BY service, session
| EVAL ${ATTRIBUTE_EVALS.join(',\n       ')}
| EVAL ${BRANCH_COUNT_EVALS.join(', ')}
| DROP ${RAW_PREFIX}*
| LIMIT ${maxRows}`,
  params: [{ rebuild_from: rebuildFrom }, { changed_to: changedTo }],
});
