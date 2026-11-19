/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsBucket, SpansBucket } from './search_responses';
import { toApplication } from './to_application';

const terms = (...keys: string[]) => ({ buckets: keys.map((key) => ({ key })) });

const noSamples = {
  doc_count: 0,
  p75: { values: [] },
  upToGood: { doc_count: 0 },
  upToNeedsImprovement: { doc_count: 0 },
};

const NO_VITAL = { p75Ms: null, sampleCount: 0, ratings: null };

const logsBucket = (pageLoads: number, jsErrors: number): LogsBucket => ({
  key: 'shop',
  environments: terms(),
  environmentNames: terms(),
  pageLoads: { doc_count: pageLoads },
  jsErrors: { doc_count: jsErrors },
  lcp: noSamples,
  inp: noSamples,
  cls: noSamples,
  fcp: noSamples,
  ttfb: noSamples,
  lastSeen: { value: null },
});

describe('toApplication', () => {
  it('leaves errors per page load empty without page loads', () => {
    expect(toApplication('shop', logsBucket(0, 2)).jsErrors).toEqual({
      count: 2,
      perPageLoad: null,
    });
  });

  it('leaves the last seen time empty without any timestamp', () => {
    expect(toApplication('shop', logsBucket(1, 0)).lastSeen).toBeNull();
  });

  it('builds an application from its HTTP requests alone', () => {
    const spans: SpansBucket = {
      key: 'checkout',
      environments: terms('production'),
      environmentNames: terms(),
      requests: { doc_count: 4 },
      failed: { doc_count: 1 },
      lastSeen: { value: Date.parse('2021-01-18T12:33:30.000Z') },
    };

    expect(toApplication('checkout', undefined, spans)).toEqual({
      serviceName: 'checkout',
      source: 'otel',
      environments: ['production'],
      pageLoads: { count: 0 },
      sessions: null,
      webVitals: {
        lcp: NO_VITAL,
        inp: NO_VITAL,
        cls: { p75: null, sampleCount: 0, ratings: null },
        fcp: NO_VITAL,
        ttfb: NO_VITAL,
      },
      jsErrors: { count: 0, perPageLoad: null },
      httpRequests: { count: 4, failedCount: 1, failedRatio: 0.25 },
      lastSeen: '2021-01-18T12:33:30.000Z',
    });
  });
});
