/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreWebVital } from '../../../../common/core_web_vitals';
import type { PercentilesAggregation, TermsAggregation } from '../../../lib/helpers/aggregations';

// The aggregations `sessions_search_requests.ts` asks for, by the same names.

interface SumAggregation {
  value: number;
}

/** One vital in `sessionsSearch`: the sums of its sample counts, and the p75 of the sessions' p75. */
export interface SessionsVitalBucket {
  samples: SumAggregation;
  good: SumAggregation;
  needsImprovement: SumAggregation;
  p75: PercentilesAggregation;
}

/** One application in `sessionsSearch`. */
export type SessionsBucket = Record<CoreWebVital, SessionsVitalBucket> & {
  key: string;
  /** The sessions of the application that overlap the time range. */
  doc_count: number;
  environments: TermsAggregation;
  pageLoads: SumAggregation;
  jsErrors: SumAggregation;
  httpRequests: SumAggregation;
  failedHttpRequests: SumAggregation;
  lastSeen: { value: number | null };
};

/** `sessionsSearch`: the applications and the page loads over time in the selected environment. */
export interface SessionsAggregations {
  environments: TermsAggregation;
  environmentNotDefined: { doc_count: number };
  inEnvironment: {
    applications: { buckets: SessionsBucket[] };
    pageLoadsOverTime: {
      // The sessions that started in the bucket, and the page loads they hold.
      buckets: Array<{ key: number; doc_count: number; pageLoads: SumAggregation }>;
    };
  };
}
