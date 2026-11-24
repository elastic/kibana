/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { termQuery } from '@kbn/es-query';
import { TELEMETRY_SDK_LANGUAGE } from '@kbn/apm-types';
import { getPreviousPeriod, toComparedValue } from '../../../../common/mobile/kpis';
import { BROWSER_SDK_LANGUAGE } from '../../../../common/otel_data';
import {
  DEFAULT_OVERVIEW_PERCENTILE,
  type OverviewPercentile,
} from '../../../../common/overview_filters';
import type { ApplicationOverviewKpisResponse } from '../../../../common/types/overview';
import { runEsql, timeFilter } from '../../../lib/esql';
import { serviceDocuments } from '../../../lib/otel/queries';
import type { ApplicationSearch } from '../../application_tab_route';
import { overviewKpisQuery, type OverviewKpisRow } from './kpis_query';

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

/** A ratio, `null` without anything to divide by. */
const ratioOf = (count: number, total: number): number | null => (total > 0 ? count / total : null);

/**
 * The share of the sessions without an error. Both counts are `COUNT_DISTINCT` estimates, so above
 * a few thousand sessions the sessions with errors can come out higher than all of them: kept
 * within 0 and 1 rather than shown as a negative share.
 */
const errorFreeShareOf = (sessions: number, sessionsWithErrors: number): number =>
  1 - Math.min(sessionsWithErrors, sessions) / sessions;

/** The KPIs of one period's row; a missing row or column has no data. */
const toKpis = (row: OverviewKpisRow | undefined) => {
  const sessions = row?.sessions ?? 0;
  const sessionsWithErrors = row?.sessions_with_errors ?? 0;
  const httpRequests = row?.http_requests ?? 0;
  const failedHttpRequests = row?.failed_http_requests ?? 0;
  const requestDuration = row?.request_duration ?? null;
  return {
    sessions,
    sessionsWithErrors,
    errorFreeSessions: sessions > 0 ? errorFreeShareOf(sessions, sessionsWithErrors) : null,
    pageLoads: row?.page_loads ?? 0,
    loadTime: row?.load_time ?? null,
    loadTimeSamples: row?.load_time_samples ?? 0,
    jsErrors: row?.js_errors ?? 0,
    httpRequests,
    failedHttpRequests,
    failedHttpRatio: ratioOf(failedHttpRequests, httpRequests),
    requestLatency: requestDuration === null ? null : requestDuration / NANOSECONDS_PER_MILLISECOND,
  };
};

/** One period's documents of the application, as the KPI query's `filter`. */
const periodFilter = (
  {
    serviceName,
    environment,
    kuery,
  }: Pick<ApplicationSearch, 'serviceName' | 'environment' | 'kuery'>,
  start: number,
  end: number
): estypes.QueryDslQueryContainer => ({
  bool: {
    filter: [
      timeFilter(start, end, environment),
      // Browser SDKs only: the OTel indices also hold backend services.
      ...termQuery(TELEMETRY_SDK_LANGUAGE, BROWSER_SDK_LANGUAGE),
      ...serviceDocuments(serviceName),
      ...(kuery ? [kuery] : []),
    ],
  },
});

/**
 * The KPI row of one EDOT Browser application's Overview: each KPI over the time range against
 * the period of equal length before, with the same filters.
 */
export const getOtelOverviewKpis = async ({
  esClient,
  start,
  end,
  filters = {},
  percentile = DEFAULT_OVERVIEW_PERCENTILE,
  ...application
}: ApplicationSearch & {
  percentile?: OverviewPercentile;
}): Promise<ApplicationOverviewKpisResponse> => {
  const previousPeriod = getPreviousPeriod(start, end);
  const query = overviewKpisQuery(filters, percentile);
  const [[currentRow], [previousRow]] = await Promise.all([
    runEsql<OverviewKpisRow>(
      esClient,
      'get_overview_kpis',
      query,
      periodFilter(application, start, end)
    ),
    runEsql<OverviewKpisRow>(
      esClient,
      'get_overview_kpis_previous',
      query,
      periodFilter(application, previousPeriod.start, previousPeriod.end)
    ),
  ]);
  const current = toKpis(currentRow);
  const previous = toKpis(previousRow);

  return {
    percentile,
    sessions: toComparedValue(current.sessions, previous.sessions),
    errorFreeSessions: toComparedValue(current.errorFreeSessions, previous.errorFreeSessions),
    pageLoads: toComparedValue(current.pageLoads, previous.pageLoads),
    loadTime: toComparedValue(current.loadTime, previous.loadTime),
    jsErrors: toComparedValue(current.jsErrors, previous.jsErrors),
    failedHttpRequests: toComparedValue(current.failedHttpRatio, previous.failedHttpRatio),
    requestLatency: toComparedValue(current.requestLatency, previous.requestLatency),
    counts: {
      sessionsWithErrors: current.sessionsWithErrors,
      loadTimeSamples: current.loadTimeSamples,
      httpRequests: current.httpRequests,
      failedHttpRequests: current.failedHttpRequests,
    },
  };
};
