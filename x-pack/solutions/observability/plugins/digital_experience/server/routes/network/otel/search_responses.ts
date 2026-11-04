/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PercentilesAggregation } from '../../../lib/helpers/aggregations';
import type { ByEnvironmentAggregations } from '../../../lib/otel/environments';

// The aggregations `search_requests.ts` asks for, by the same names.

export interface ResourceBucket {
  key: string;
  doc_count: number;
  duration: PercentilesAggregation;
  transferSize: PercentilesAggregation;
  initiatorType: { buckets: Array<{ key: string }> };
  renderBlocking: { doc_count: number };
}

/** `resourcesSearch`: the resources and top page in one environment, and every environment. */
export type ResourcesAggregations = ByEnvironmentAggregations<{
  resources: { urls: { buckets: ResourceBucket[] } };
  pageLoads: { topPage: { buckets: Array<{ key: string }> } };
}>;

/** The requests of one URL and method; the key is `[url, method]`. */
export interface RequestBucket {
  key: [string, string];
  doc_count: number;
  withOutcome: { doc_count: number };
  failed: { doc_count: number };
  duration: PercentilesAggregation;
}

/** `httpRequestsSearch`: the HTTP requests in the selected environment. */
export interface HttpRequestsAggregations {
  inEnvironment: {
    requests: { buckets: RequestBucket[] };
  };
}
