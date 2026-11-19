/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateHistogramAggregation } from '../../../lib/helpers/time_series';
import type { WebVitalAggregations } from '../../../lib/helpers/web_vitals';
import type {
  ByEnvironmentAggregations,
  EnvironmentAggregations,
  PickerAggregations,
} from '../../../lib/otel/environments';

// The aggregations `search_requests.ts` asks for, by the same names.

/** One application in `logsSearch`. */
export type LogsBucket = EnvironmentAggregations &
  WebVitalAggregations & {
    key: string;
    pageLoads: { doc_count: number };
    jsErrors: { doc_count: number };
    lastSeen: { value: number | null };
  };

/** One application in `spansSearch`. */
export type SpansBucket = EnvironmentAggregations & {
  key: string;
  requests: { doc_count: number };
  failed: { doc_count: number };
  lastSeen: { value: number | null };
};

/** `logsSearch`: the applications, the page loads over time and every environment for the picker. */
export type LogsAggregations = ByEnvironmentAggregations<{
  applications: { buckets: LogsBucket[] };
  pageLoadsOverTime: { histogram: DateHistogramAggregation };
}>;

/**
 * `spansSearch`: the environments of the requests with an outcome for the picker, and in the
 * selected one the applications of the logs (`inLogs`) and the others (`spansOnly`), each absent
 * when its size would be 0.
 */
export interface SpansAggregations {
  picker: PickerAggregations;
  inEnvironment: {
    inLogs?: { buckets: SpansBucket[] };
    spansOnly?: { buckets: SpansBucket[] };
  };
}
