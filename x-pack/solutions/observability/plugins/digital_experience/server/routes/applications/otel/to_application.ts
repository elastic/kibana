/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLICATION_SOURCE } from '../../../../common/application_source';
import type { ApplicationSummary } from '../../../../common/types/applications';
import { bucketKeys, ratio, toLastSeen } from '../../../lib/helpers/aggregations';
import { toDurationVital, toScoreVital } from '../../../lib/helpers/web_vitals';
import type { EnvironmentAggregations, LogsBucket, SpansBucket } from './search_responses';

/** The environment names in the given aggregations, without duplicates. */
export const environmentsOf = (
  ...aggregations: Array<EnvironmentAggregations | undefined>
): string[] => [
  ...new Set(
    aggregations.flatMap((aggregation) => [
      ...bucketKeys(aggregation?.environments),
      ...bucketKeys(aggregation?.environmentNames),
    ])
  ),
];

/** One application from its logs bucket and, when it made HTTP requests, its spans bucket. */
export const toApplication = (logs: LogsBucket, spans?: SpansBucket): ApplicationSummary => {
  const requests = spans?.requests.doc_count ?? 0;
  const failedRequests = spans?.failed.doc_count ?? 0;
  return {
    serviceName: logs.key,
    source: APPLICATION_SOURCE.otel,
    environments: environmentsOf(logs, spans),
    pageLoads: { count: logs.pageLoads.doc_count },
    webVitals: {
      lcp: toDurationVital(logs.lcp),
      inp: toDurationVital(logs.inp),
      cls: toScoreVital(logs.cls),
      fcp: toDurationVital(logs.fcp),
      ttfb: toDurationVital(logs.ttfb),
    },
    jsErrors: {
      count: logs.jsErrors.doc_count,
      perPageLoad: ratio(logs.jsErrors.doc_count, logs.pageLoads.doc_count),
    },
    httpRequests: {
      count: requests,
      failedCount: failedRequests,
      failedRatio: ratio(failedRequests, requests),
    },
    lastSeen: toLastSeen(logs.lastSeen.value, spans?.lastSeen.value),
  };
};
