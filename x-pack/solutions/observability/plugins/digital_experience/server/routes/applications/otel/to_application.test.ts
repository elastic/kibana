/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogsBucket } from './search_responses';
import { toApplication } from './to_application';

const terms = (...keys: string[]) => ({ buckets: keys.map((key) => ({ key })) });

const noVital = {
  doc_count: 0,
  p75: { values: [] },
  upToGood: { doc_count: 0 },
  upToNeedsImprovement: { doc_count: 0 },
};

const logsBucket = (pageLoads: number, jsErrors: number): LogsBucket => ({
  key: 'shop',
  environments: terms(),
  environmentNames: terms(),
  pageLoads: { doc_count: pageLoads },
  jsErrors: { doc_count: jsErrors },
  lcp: noVital,
  inp: noVital,
  cls: noVital,
  fcp: noVital,
  ttfb: noVital,
  lastSeen: { value: null },
});

describe('toApplication', () => {
  it('leaves errors per page load empty without page loads', () => {
    expect(toApplication(logsBucket(0, 2)).jsErrors).toEqual({ count: 2, perPageLoad: null });
  });

  it('leaves the last seen time empty without any timestamp', () => {
    expect(toApplication(logsBucket(1, 0)).lastSeen).toBeNull();
  });
});
