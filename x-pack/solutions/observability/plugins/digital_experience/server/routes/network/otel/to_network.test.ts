/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NO_ENVIRONMENTS,
  keyBuckets,
  termsAggregate,
} from '../../../lib/helpers/aggregate_fixtures.test_helpers';
import type { HttpRequestsAggregations, ResourcesAggregations } from './search_responses';
import { toHttpRequests, toSlowestResources } from './to_network';

type RequestBucket = HttpRequestsAggregations['inEnvironment']['requests']['buckets'][number];
type ResourceBucket =
  ResourcesAggregations['inEnvironment']['resources']['urls']['buckets'][number];

const percentile = (value: number | null) => {
  return {
    values: value === null ? [] : [{ key: 75, value }],
  };
};

const request = (
  url: string,
  method: string,
  count: number,
  failed: number,
  p95Ns: number | null
): RequestBucket => {
  return {
    key: [url, method],
    key_as_string: `${url}|${method}`,
    doc_count: count,
    withOutcome: { doc_count: count },
    failed: { doc_count: failed },
    duration: { values: p95Ns === null ? [] : [{ key: 95, value: p95Ns }] },
  };
};

const resources = (buckets: ResourceBucket[]): ResourcesAggregations => {
  return {
    ...NO_ENVIRONMENTS,
    inEnvironment: {
      doc_count: 0,
      resources: { doc_count: 0, urls: termsAggregate(buckets) },
    },
  };
};

describe('toHttpRequests', () => {
  it('returns no requests without aggregations', () => {
    expect(toHttpRequests(undefined)).toEqual([]);
  });

  it('maps each URL and method in the order of the search, durations from nanoseconds to milliseconds', () => {
    const aggregations: HttpRequestsAggregations = {
      ...NO_ENVIRONMENTS,
      inEnvironment: {
        doc_count: 0,
        requests: termsAggregate([
          request('https://api/cart', 'GET', 6, 0, 1_500_000),
          request('https://api/products', 'GET', 4, 1, 250_000_000),
          request('https://api/products', 'POST', 1, 0, null),
        ]),
      },
    };

    expect(toHttpRequests(aggregations)).toEqual([
      {
        method: 'GET',
        url: 'https://api/cart',
        count: 6,
        p95Ms: 1.5,
        failedCount: 0,
        failedRatio: 0,
      },
      {
        method: 'GET',
        url: 'https://api/products',
        count: 4,
        p95Ms: 250,
        failedCount: 1,
        failedRatio: 0.25,
      },
      {
        method: 'POST',
        url: 'https://api/products',
        count: 1,
        p95Ms: null,
        failedCount: 0,
        failedRatio: 0,
      },
    ]);
  });
});

describe('toSlowestResources', () => {
  it('returns no resources without aggregations', () => {
    expect(toSlowestResources(undefined)).toEqual([]);
  });

  it('flags the render-blocking resources and maps null percentiles', () => {
    const aggregations = resources([
      {
        key: 'https://cdn/app.js',
        doc_count: 2,
        duration: percentile(850.5),
        transferSize: percentile(4096),
        initiatorType: termsAggregate(keyBuckets(['script'])),
        renderBlocking: { doc_count: 1 },
      },
      {
        key: 'https://cdn/logo.svg',
        doc_count: 1,
        duration: percentile(null),
        transferSize: percentile(null),
        initiatorType: termsAggregate([]),
        renderBlocking: { doc_count: 0 },
      },
    ]);

    expect(toSlowestResources(aggregations)).toEqual([
      {
        url: 'https://cdn/app.js',
        initiatorType: 'script',
        renderBlocking: true,
        count: 2,
        p75Ms: 850.5,
        transferSizeP75Bytes: 4096,
      },
      {
        url: 'https://cdn/logo.svg',
        initiatorType: null,
        renderBlocking: false,
        count: 1,
        p75Ms: null,
        transferSizeP75Bytes: null,
      },
    ]);
  });
});
