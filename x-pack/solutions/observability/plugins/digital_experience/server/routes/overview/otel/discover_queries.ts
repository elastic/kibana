/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { DURATION, OTEL_EVENT_NAME, SERVICE_NAME, TELEMETRY_SDK_LANGUAGE } from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import { cleanedValue, esqlEnvironmentCondition } from '../../../../common/esql_values';
import type { OverviewFilters } from '../../../../common/overview_filters';
import {
  BROWSER_SDK_LANGUAGE,
  ENVIRONMENT_FIELDS,
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../../../../common/otel_data';
import {
  SOURCE_LOAD_EVENT_END_FIELD,
  SOURCE_SESSION_ID_FIELD,
} from '../../../../common/otel_source_fields';
import type { DiscoverTile, OverviewDiscoverQueries } from '../../../../common/types/overview';
import {
  esqlDocumentConditions,
  esqlFilterEvals,
  esqlLogConditions,
  esqlPageLoadConditions,
} from '../../../../common/overview_filters_esql';
import {
  HTTP_REQUEST_CONDITIONS,
  HTTP_REQUEST_EVALS,
} from '../../../services/sessions/summary_queries';

/** What narrows the Overview besides the time range, as the KPI request has it. */
export interface DiscoverScope {
  serviceName: string;
  environment?: string;
  filters: OverviewFilters;
  /** The Overview's KQL query as typed. */
  kuery?: string;
}

/** Discover fills `?_tstart` and `?_tend` with its time range; the end is exclusive, as here. */
const IN_DISCOVER_TIME_RANGE = '@timestamp >= ?_tstart AND @timestamp < ?_tend';

/** The sessions count the events that have a session id, which the KPI cleans like the summaries. */
const HAS_SESSION_ID = `${cleanedValue(SOURCE_SESSION_ID_FIELD)} IS NOT NULL`;

const IS_JS_ERROR = `${OTEL_EVENT_NAME} == ${escapeStringValue(EVENT_EXCEPTION)}`;

/** The tile's events, besides the Overview's filters, and how Discover sorts them. */
const TILE_EVENTS: Record<DiscoverTile, { condition?: string; sort: string }> = {
  sessions: { condition: HAS_SESSION_ID, sort: '@timestamp DESC' },
  // The events that make a session count as having an error, which lower the rate.
  errorFreeSessions: {
    condition: `(${IS_JS_ERROR} OR (${HTTP_REQUEST_CONDITIONS.http_failed_request_count})) AND ${HAS_SESSION_ID}`,
    sort: '@timestamp DESC',
  },
  pageLoads: {
    condition: `${OTEL_EVENT_NAME} == ${escapeStringValue(EVENT_NAVIGATION_TIMING)}`,
    sort: '@timestamp DESC',
  },
  // The slowest page loads first.
  loadTime: {
    condition: `${OTEL_EVENT_NAME} == ${escapeStringValue(
      EVENT_NAVIGATION_TIMING
    )} AND ${SOURCE_LOAD_EVENT_END_FIELD} IS NOT NULL`,
    sort: `${SOURCE_LOAD_EVENT_END_FIELD} DESC`,
  },
  jsErrors: { condition: IS_JS_ERROR, sort: '@timestamp DESC' },
  failedHttpRequests: {
    condition: HTTP_REQUEST_CONDITIONS.http_failed_request_count,
    sort: '@timestamp DESC',
  },
  // The slowest requests first: every request with a duration, as the average reads them.
  requestLatency: {
    condition: `is_http_request AND ${DURATION} IS NOT NULL`,
    sort: `${DURATION} DESC`,
  },
};

const NEEDS_HTTP_EVALS: readonly DiscoverTile[] = [
  'errorFreeSessions',
  'failedHttpRequests',
  'requestLatency',
];

const discoverQueryOf = (
  tile: DiscoverTile,
  { serviceName, environment, filters, kuery }: DiscoverScope
): string => {
  const { condition, sort } = TILE_EVENTS[tile];
  const filterEvals = esqlFilterEvals(filters);
  const logConditions = esqlLogConditions(filters);
  const pageLoadConditions =
    tile === 'pageLoads' || tile === 'loadTime' ? esqlPageLoadConditions(filters) : [];
  const environmentWhere = esqlEnvironmentCondition(environment, ENVIRONMENT_FIELDS);
  const needsHttpEvals = NEEDS_HTTP_EVALS.includes(tile);
  const evals = [...filterEvals, ...(needsHttpEvals ? [HTTP_REQUEST_EVALS] : [])];
  // The columns only the conditions read, which Discover would list as fields.
  const helperColumns = [
    ...filterEvals.map((expression) => expression.split(' = ')[0]),
    ...(needsHttpEvals ? ['is_http_request', 'no_response'] : []),
  ];
  const tileConditions = [...(condition ? [condition] : []), ...pageLoadConditions];
  const documentConditions = esqlDocumentConditions(filters);

  const query = [
    `FROM ${OTEL_LOGS_INDEX}, ${OTEL_TRACES_INDEX}`,
    `| WHERE ${SERVICE_NAME} == ${escapeStringValue(
      serviceName
    )} AND ${TELEMETRY_SDK_LANGUAGE} == ${escapeStringValue(
      BROWSER_SDK_LANGUAGE
    )} AND ${IN_DISCOVER_TIME_RANGE}`,
    ...(environmentWhere ? [`| WHERE ${environmentWhere}`] : []),
    ...(kuery?.trim() ? [`| WHERE KQL(${escapeStringValue(kuery)})`] : []),
    ...(evals.length > 0 ? [`| EVAL ${evals.join(',\n       ')}`] : []),
    ...(documentConditions.length > 0 ? [`| WHERE ${documentConditions.join(' AND ')}`] : []),
    // Spans have no event name.
    ...(logConditions.length > 0
      ? [`| WHERE ${OTEL_EVENT_NAME} IS NULL OR (${logConditions.join(' AND ')})`]
      : []),
    ...(tileConditions.length > 0 ? [`| WHERE ${tileConditions.join(' AND ')}`] : []),
    ...(helperColumns.length > 0 ? [`| DROP ${helperColumns.join(', ')}`] : []),
    `| SORT ${sort}`,
  ].join('\n');

  // OTel attributes that one of the indices doesn't map read as null instead of failing the query.
  return esql(query).addSetCommand('unmapped_fields', 'nullify').print('pipe-multiline');
};

/**
 * The ES|QL that Discover opens for each tile of the Overview: the events behind its value,
 * narrowed like the value is, so the rows in Discover are the ones that were counted.
 */
export const overviewDiscoverQueries = (scope: DiscoverScope): OverviewDiscoverQueries => ({
  sessions: discoverQueryOf('sessions', scope),
  errorFreeSessions: discoverQueryOf('errorFreeSessions', scope),
  pageLoads: discoverQueryOf('pageLoads', scope),
  loadTime: discoverQueryOf('loadTime', scope),
  jsErrors: discoverQueryOf('jsErrors', scope),
  failedHttpRequests: discoverQueryOf('failedHttpRequests', scope),
  requestLatency: discoverQueryOf('requestLatency', scope),
});
