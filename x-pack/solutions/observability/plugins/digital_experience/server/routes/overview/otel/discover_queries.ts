/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import {
  DURATION,
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
  OTEL_EVENT_NAME,
  SERVICE_NAME,
  TELEMETRY_SDK_LANGUAGE,
} from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import type { OverviewFilters } from '../../../../common/overview_filters';
import {
  BROWSER_SDK_LANGUAGE,
  ENVIRONMENT_FIELDS,
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../../../../common/otel_data';
import { SOURCE_LOAD_EVENT_END_FIELD } from '../../../../common/otel_source_fields';
import type { DiscoverTile, OverviewDiscoverQueries } from '../../../../common/types/overview';
import {
  esqlDocumentConditions,
  esqlFilterEvals,
  esqlLogConditions,
  esqlPageLoadConditions,
} from '../../../lib/otel/overview_filters_esql';
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

/**
 * The documents in `environment`, as the routes' `environmentFilter` keeps them: either
 * environment field, or "Not defined" for APM's sentinel or neither; all for all environments.
 */
const environmentCondition = (environment: string | undefined): string | undefined => {
  if (!environment || environment === ENVIRONMENT_ALL_VALUE) {
    return undefined;
  }
  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    const notSet = ENVIRONMENT_FIELDS.map((field) => `${field} IS NULL`).join(' AND ');
    const sentinel = ENVIRONMENT_FIELDS.map(
      (field) => `${field} == ${escapeStringValue(ENVIRONMENT_NOT_DEFINED_VALUE)}`
    ).join(' OR ');
    return `(${sentinel} OR (${notSet}))`;
  }
  return `(${ENVIRONMENT_FIELDS.map(
    (field) => `${field} == ${escapeStringValue(environment)}`
  ).join(' OR ')})`;
};

const IS_JS_ERROR = `${OTEL_EVENT_NAME} == ${escapeStringValue(EVENT_EXCEPTION)}`;

/** The tile's events, besides the Overview's filters, and how Discover sorts them. */
const TILE_EVENTS: Record<DiscoverTile, { condition?: string; sort: string }> = {
  sessions: { sort: '@timestamp DESC' },
  // The events that make a session count as having an error.
  errorFreeSessions: {
    condition: `(${IS_JS_ERROR} OR (${HTTP_REQUEST_CONDITIONS.http_failed_request_count}))`,
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
  // The slowest requests first.
  requestLatency: {
    condition: HTTP_REQUEST_CONDITIONS.http_request_count,
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
  const environmentWhere = environmentCondition(environment);
  const evals = [...filterEvals, ...(NEEDS_HTTP_EVALS.includes(tile) ? [HTTP_REQUEST_EVALS] : [])];
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
