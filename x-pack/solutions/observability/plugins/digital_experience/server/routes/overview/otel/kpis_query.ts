/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { DURATION, OTEL_EVENT_NAME } from '@kbn/apm-types';
import { escapeStringValue } from '@kbn/esql-utils';
import type { OverviewFilters, OverviewPercentile } from '../../../../common/overview_filters';
import {
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  OTEL_LOGS_INDEX,
  OTEL_TRACES_INDEX,
} from '../../../../common/otel_data';
import {
  SOURCE_LOAD_EVENT_END_FIELD,
  SOURCE_SESSION_ID_FIELD,
} from '../../../../common/otel_source_fields';
import { cleanedValue } from '../../../../common/esql_values';
import {
  esqlDocumentConditions,
  esqlLogConditions,
  esqlFilterEvals,
  esqlPageLoadConditions,
} from '../../../../common/overview_filters_esql';
import {
  HTTP_REQUEST_CONDITIONS,
  HTTP_REQUEST_EVALS,
} from '../../../services/sessions/summary_queries';

/**
 * The row of `overviewKpisQuery`. A column every document has null for is left out of the
 * response, so any can be missing.
 */
export interface OverviewKpisRow {
  page_loads?: number;
  load_time?: number | null;
  load_time_samples?: number;
  js_errors?: number;
  http_requests?: number;
  failed_http_requests?: number;
  /** In nanoseconds, as the spans store it. */
  request_duration?: number | null;
  sessions?: number;
  sessions_with_errors?: number;
}

const IS_JS_ERROR = `event == ${escapeStringValue(EVENT_EXCEPTION)}`;

/**
 * The KPIs of one application's browser documents in one period: the `filter` of the request
 * keeps the application, period, environment and KQL. The selected filters narrow every document,
 * the page every log (the HTTP request spans carry the URL they request, not the page's route) and
 * the URL text the page loads only, as on the rest of the Overview. Sessions count every event's
 * session, so a session with only clicks counts too.
 */
export const overviewKpisQuery = (
  filters: OverviewFilters,
  percentile: OverviewPercentile
): ComposerQuery => {
  const filterEvals = esqlFilterEvals(filters);
  const documentConditions = esqlDocumentConditions(filters);
  const logConditions = esqlLogConditions(filters);
  const isPageLoad = [
    `event == ${escapeStringValue(EVENT_NAVIGATION_TIMING)}`,
    ...esqlPageLoadConditions(filters),
  ].join(' AND ');

  const query = [
    `FROM ${OTEL_LOGS_INDEX}, ${OTEL_TRACES_INDEX}`,
    ...(filterEvals.length > 0 ? [`| EVAL ${filterEvals.join(', ')}`] : []),
    ...(documentConditions.length > 0 ? [`| WHERE ${documentConditions.join(' AND ')}`] : []),
    // Spans have no event name.
    ...(logConditions.length > 0
      ? [`| WHERE ${OTEL_EVENT_NAME} IS NULL OR (${logConditions.join(' AND ')})`]
      : []),
    `| EVAL event = ${OTEL_EVENT_NAME},
       session_id = ${cleanedValue(SOURCE_SESSION_ID_FIELD)},
       ${HTTP_REQUEST_EVALS}`,
    `| EVAL is_page_load = ${isPageLoad},
       is_failed_request = ${HTTP_REQUEST_CONDITIONS.http_failed_request_count}`,
    `| STATS page_loads = COUNT(*) WHERE is_page_load,
       load_time = PERCENTILE(${SOURCE_LOAD_EVENT_END_FIELD}, ${percentile}) WHERE is_page_load,
       load_time_samples = COUNT(${SOURCE_LOAD_EVENT_END_FIELD}) WHERE is_page_load,
       js_errors = COUNT(*) WHERE ${IS_JS_ERROR},
       http_requests = COUNT(*) WHERE ${HTTP_REQUEST_CONDITIONS.http_request_count},
       failed_http_requests = COUNT(*) WHERE is_failed_request,
       request_duration = AVG(${DURATION}) WHERE is_http_request,
       sessions = COUNT_DISTINCT(session_id),
       sessions_with_errors = COUNT_DISTINCT(session_id) WHERE ${IS_JS_ERROR} OR is_failed_request`,
  ].join('\n');

  // OTel attributes that one of the indices doesn't map read as null instead of failing the query.
  return esql(query).addSetCommand('unmapped_fields', 'nullify');
};
