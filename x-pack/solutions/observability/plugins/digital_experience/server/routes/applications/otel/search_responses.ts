/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TermsAggregation } from '../../../lib/helpers/aggregations';
import type { DateHistogramAggregation } from '../../../lib/helpers/time_series';
import type { VitalAggregation } from '../../../lib/helpers/web_vitals';

// The aggregations `search_requests.ts` asks for, by the same names.

export interface EnvironmentAggregations {
  environments: TermsAggregation;
  environmentNames: TermsAggregation;
}

/** One application in `logsSearch`. */
export type LogsBucket = EnvironmentAggregations & {
  key: string;
  pageLoads: { doc_count: number };
  jsErrors: { doc_count: number };
  lcp: VitalAggregation;
  inp: VitalAggregation;
  cls: VitalAggregation;
  fcp: VitalAggregation;
  ttfb: VitalAggregation;
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
export type LogsAggregations = EnvironmentAggregations & {
  environmentNotDefined: { doc_count: number };
  inEnvironment: {
    applications: { buckets: LogsBucket[] };
    pageLoadsOverTime: { histogram: DateHistogramAggregation };
  };
};

/** `spansSearch`: the applications in the selected environment only. */
export interface SpansAggregations {
  inEnvironment: { applications: { buckets: SpansBucket[] } };
}
