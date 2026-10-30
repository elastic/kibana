/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationOverview, OverviewTrendPoint } from '../../../../common/types/overview';
import { getP75 } from '../../../lib/helpers/aggregations';
import { toHttpRequests } from '../../../lib/helpers/http_requests';
import { NO_WEB_VITALS } from '../../../../common/core_web_vitals';
import { toWebVitals } from '../../../lib/helpers/web_vitals';
import type { OverviewLogsAggregations, OverviewSpansAggregations } from './search_responses';

/** The trend of both charts: every bucket, with a `null` duration where nothing was timed. */
const toTrend = (logs?: OverviewLogsAggregations): OverviewTrendPoint[] =>
  (logs?.inEnvironment.pageLoads.trend.buckets ?? []).map(
    ({ key, doc_count: pageLoads, loadTime }) => ({
      timestamp: key,
      pageLoads,
      loadTimeP75Ms: getP75(loadTime),
    })
  );

/**
 * One application's Overview. Missing aggregations are the empty data of indices that do not exist:
 * counts are zero, and percentiles and ratios without samples are `null`.
 */
export const toOverview = (
  serviceName: string,
  logs?: OverviewLogsAggregations,
  spans?: OverviewSpansAggregations
): ApplicationOverview => {
  const metrics = logs?.inEnvironment;
  return {
    serviceName,
    pageLoads: { count: metrics?.pageLoads.doc_count ?? 0 },
    loadTime: {
      p75Ms: metrics ? getP75(metrics.pageLoads.loadTime) : null,
      sampleCount: metrics?.pageLoads.loadTimeSamples.value ?? 0,
    },
    jsErrors: { count: metrics?.jsErrors.doc_count ?? 0 },
    httpRequests: toHttpRequests(
      spans?.inEnvironment.requests.doc_count ?? 0,
      spans?.inEnvironment.failed.doc_count ?? 0
    ),
    webVitals: metrics ? toWebVitals(metrics) : NO_WEB_VITALS,
    trend: toTrend(logs),
  };
};
