/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClassicBucket } from './search_responses';
import { toApplication } from './to_application';

const noVital = {
  doc_count: 0,
  p75: { values: [] },
  upToGood: { doc_count: 0 },
  upToNeedsImprovement: { doc_count: 0 },
};

const bucket = (pageLoads: number, jsErrors: number): ClassicBucket => ({
  key: 'shop',
  environments: { buckets: [] },
  pageLoads: { doc_count: pageLoads },
  jsErrors: { doc_count: jsErrors },
  httpSuccess: { doc_count: 0 },
  httpFailure: { doc_count: 0 },
  lcp: noVital,
  inp: noVital,
  cls: noVital,
  fcp: noVital,
  ttfb: noVital,
  lastSeen: { value: null },
});

describe('toApplication', () => {
  it('leaves errors per page load empty without page loads', () => {
    expect(toApplication(bucket(0, 3)).jsErrors).toEqual({ count: 3, perPageLoad: null });
  });

  it('lists no environments when the application has none', () => {
    expect(toApplication(bucket(1, 0)).environments).toEqual([]);
  });

  it('leaves the last seen time empty without any timestamp', () => {
    expect(toApplication(bucket(1, 0)).lastSeen).toBeNull();
  });
});
