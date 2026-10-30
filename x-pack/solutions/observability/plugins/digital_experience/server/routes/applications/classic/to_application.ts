/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLICATION_SOURCE } from '../../../../common/application_source';
import type { ApplicationSummary } from '../../../../common/types/applications';
import { bucketKeys, ratio, toLastSeen } from '../../../lib/helpers/aggregations';
import { toHttpRequests } from '../../../lib/helpers/http_requests';
import { toWebVitals } from '../../../lib/helpers/web_vitals';
import type { ClassicBucket } from './search_responses';

/** One application from its bucket. */
export const toApplication = (bucket: ClassicBucket): ApplicationSummary => {
  const failedRequests = bucket.httpFailure.doc_count;
  const requests = bucket.httpSuccess.doc_count + failedRequests;
  return {
    serviceName: bucket.key,
    source: APPLICATION_SOURCE.classic,
    environments: bucketKeys(bucket.environments),
    pageLoads: { count: bucket.pageLoads.doc_count },
    webVitals: toWebVitals(bucket),
    jsErrors: {
      count: bucket.jsErrors.doc_count,
      perPageLoad: ratio(bucket.jsErrors.doc_count, bucket.pageLoads.doc_count),
    },
    httpRequests: toHttpRequests(requests, failedRequests),
    lastSeen: toLastSeen(bucket.lastSeen.value),
  };
};
