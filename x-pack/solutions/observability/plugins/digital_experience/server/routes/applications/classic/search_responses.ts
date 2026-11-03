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

/** One application in `classicSearch`. */
export interface ClassicBucket {
  key: string;
  environments: TermsAggregation;
  pageLoads: { doc_count: number };
  jsErrors: { doc_count: number };
  httpSuccess: { doc_count: number };
  httpFailure: { doc_count: number };
  lcp: VitalAggregation;
  inp: VitalAggregation;
  cls: VitalAggregation;
  fcp: VitalAggregation;
  ttfb: VitalAggregation;
  lastSeen: { value: number | null };
}

export interface SearchAggregations {
  environments: TermsAggregation;
  environmentNotDefined: { doc_count: number };
  inEnvironment: {
    applications: { buckets: ClassicBucket[] };
    pageLoadsOverTime: { histogram: DateHistogramAggregation };
  };
}
