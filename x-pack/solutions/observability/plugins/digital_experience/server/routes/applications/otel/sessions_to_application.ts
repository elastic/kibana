/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLICATION_SOURCE } from '../../../../common/application_source';
import type { ApplicationSummary, TimeSeriesPoint } from '../../../../common/types/applications';
import { bucketKeys, ratio, toLastSeen } from '../../../lib/helpers/aggregations';
import { toHttpRequests } from '../../../lib/helpers/http_requests';
import { toWebVitals, type VitalAggregation } from '../../../lib/helpers/web_vitals';
import type {
  SessionsAggregations,
  SessionsBucket,
  SessionsVitalBucket,
} from './sessions_search_responses';

/** The vital as `toWebVitals` reads it: the samples, and those up to each rating threshold. */
const toVitalAggregation = ({
  samples,
  good,
  needsImprovement,
  p75,
}: SessionsVitalBucket): VitalAggregation => ({
  doc_count: samples.value,
  p75,
  upToGood: { doc_count: good.value },
  upToNeedsImprovement: { doc_count: good.value + needsImprovement.value },
});

/** One application from its sessions bucket. */
export const toSessionsApplication = ({
  key,
  environments,
  pageLoads,
  jsErrors,
  httpRequests,
  failedHttpRequests,
  lcp,
  inp,
  cls,
  fcp,
  ttfb,
  lastSeen,
}: SessionsBucket): ApplicationSummary => ({
  serviceName: key,
  source: APPLICATION_SOURCE.otel,
  environments: bucketKeys(environments),
  pageLoads: { count: pageLoads.value },
  webVitals: toWebVitals({
    lcp: toVitalAggregation(lcp),
    inp: toVitalAggregation(inp),
    cls: toVitalAggregation(cls),
    fcp: toVitalAggregation(fcp),
    ttfb: toVitalAggregation(ttfb),
  }),
  jsErrors: { count: jsErrors.value, perPageLoad: ratio(jsErrors.value, pageLoads.value) },
  httpRequests: toHttpRequests(httpRequests.value, failedHttpRequests.value),
  lastSeen: toLastSeen(lastSeen.value),
});

/** The page loads of the sessions that started in each bucket. */
export const toSessionsTimeSeries = (
  aggregations?: SessionsAggregations['inEnvironment']
): TimeSeriesPoint[] =>
  (aggregations?.pageLoadsOverTime.buckets ?? []).map(({ key, pageLoads }) => ({
    timestamp: key,
    count: pageLoads.value,
  }));
