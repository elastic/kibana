/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewPercentile } from '../../../../common/overview_filters';
import type { HistogramBuckets } from '../../../../common/types/applications';
import type { ApplicationOverview, OverviewTrendPoint } from '../../../../common/types/overview';
import { getPercentile } from '../../../lib/helpers/aggregations';
import { NO_WEB_VITALS } from '../../../../common/core_web_vitals';
import { toWebVitals } from '../../../lib/helpers/web_vitals';
import type { OverviewLogsAggregations } from './search_responses';

/** The trend of both charts: every bucket, with a `null` duration where nothing was timed. */
const toTrend = (logs?: OverviewLogsAggregations): OverviewTrendPoint[] =>
  (logs?.inEnvironment.pageLoads.trend.buckets ?? []).map(
    ({ key, doc_count: pageLoads, loadTime }) => ({
      timestamp: key,
      pageLoads,
      loadTimePercentileMs: getPercentile(loadTime),
    })
  );

/**
 * One application's Overview vitals and trend. Missing aggregations are the empty data of indices
 * that do not exist: counts are zero, and percentiles without samples are `null`.
 */
export const toOverview = (
  serviceName: string,
  percentile: OverviewPercentile,
  trendHistogram: HistogramBuckets,
  logs?: OverviewLogsAggregations
): ApplicationOverview => {
  const metrics = logs?.inEnvironment;
  return {
    serviceName,
    percentile,
    pageLoads: { count: metrics?.pageLoads.doc_count ?? 0 },
    loadTime: { percentileMs: metrics ? getPercentile(metrics.pageLoads.loadTime) : null },
    webVitals: metrics ? toWebVitals(metrics) : NO_WEB_VITALS,
    trend: toTrend(logs),
    trendHistogram,
  };
};
