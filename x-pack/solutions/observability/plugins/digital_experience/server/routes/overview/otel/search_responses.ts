/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PercentilesAggregation,
  ValueCountAggregation,
} from '../../../lib/helpers/aggregations';
import type { WebVitalAggregations } from '../../../lib/helpers/web_vitals';
import type { ByEnvironmentAggregations } from '../../../lib/otel/environments';

// The aggregations `search_requests.ts` asks for, by the same names.

/** One bucket of the trend: the page loads it holds and their load time. */
export interface TrendBucket {
  key: number;
  doc_count: number;
  loadTime: PercentilesAggregation;
}

/** `logsSearch`: the metrics in the selected environment, and every environment for the picker. */
export type OverviewLogsAggregations = ByEnvironmentAggregations<
  WebVitalAggregations & {
    pageLoads: {
      doc_count: number;
      loadTime: PercentilesAggregation;
      loadTimeSamples: ValueCountAggregation;
      trend: { buckets: TrendBucket[] };
    };
    jsErrors: { doc_count: number };
  }
>;

/** `spansSearch`: the HTTP requests in the selected environment only. */
export interface OverviewSpansAggregations {
  inEnvironment: {
    requests: { doc_count: number };
    failed: { doc_count: number };
  };
}
