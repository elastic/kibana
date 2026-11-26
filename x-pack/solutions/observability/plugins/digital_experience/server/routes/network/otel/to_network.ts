/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpRequestGroup, SlowResource } from '../../../../common/types/network';
import { firstBucketKey, getP75, getPercentile, ratio } from '../../../lib/helpers/aggregations';
import type { HttpRequestsAggregations, ResourcesAggregations } from './search_responses';

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

/** Maps the requests by URL and method, most made first; span durations are in nanoseconds. */
export const toHttpRequests = (aggregations?: HttpRequestsAggregations): HttpRequestGroup[] => {
  const buckets = aggregations?.inEnvironment.requests.buckets ?? [];
  return buckets.map(({ key: [url, method], doc_count: count, withOutcome, failed, duration }) => {
    const p95 = getPercentile(duration);
    return {
      method,
      url,
      count,
      p95Ms: p95 === null ? null : p95 / NANOSECONDS_PER_MILLISECOND,
      failedCount: failed.doc_count,
      failedRatio: ratio(failed.doc_count, withOutcome.doc_count),
    };
  });
};

/** The slowest resources, in the order of the search (p75 duration, descending). */
export const toSlowestResources = (aggregations?: ResourcesAggregations): SlowResource[] => {
  return (aggregations?.inEnvironment.resources.urls.buckets ?? []).map(
    ({ key, doc_count: count, initiatorType, renderBlocking, duration, transferSize }) => {
      return {
        url: String(key),
        initiatorType: firstBucketKey(initiatorType),
        renderBlocking: renderBlocking.doc_count > 0,
        count,
        p75Ms: getP75(duration),
        transferSizeP75Bytes: getP75(transferSize),
      };
    }
  );
};
