/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSummary } from '../../../../common/types/applications';
import { pageLoadsOfSources, summarizeApplications } from './summarize_applications';

const noVital = { sampleCount: 0, ratings: null };

const app = ({
  serviceName = 'shop',
  source = 'otel' as ApplicationSummary['source'],
  pageLoads = 10,
  jsErrors = 0,
  requests = 0,
  failed = 0,
  lcp = null as number | null,
  inp = null as number | null,
  cls = null as number | null,
} = {}): ApplicationSummary => ({
  serviceName,
  source,
  environments: [],
  pageLoads: { count: pageLoads },
  webVitals: {
    lcp: { p75Ms: lcp, ...noVital },
    inp: { p75Ms: inp, ...noVital },
    cls: { p75: cls, ...noVital },
    fcp: { p75Ms: null, ...noVital },
    ttfb: { p75Ms: null, ...noVital },
  },
  jsErrors: { count: jsErrors, perPageLoad: null },
  httpRequests: { count: requests, failedCount: failed, failedRatio: null },
  lastSeen: null,
});

describe('summarizeApplications', () => {
  it('adds up the applications and their page loads', () => {
    const summary = summarizeApplications([
      app({ serviceName: 'shop', pageLoads: 10 }),
      app({ serviceName: 'docs', pageLoads: 30 }),
    ]);

    expect(summary.applications).toBe(2);
    expect(summary.pageLoads).toBe(40);
  });

  it('counts a name with data in both sources as one application, with the page loads of both', () => {
    const summary = summarizeApplications([
      app({ serviceName: 'shop', source: 'otel', pageLoads: 1 }),
      app({ serviceName: 'shop', source: 'classic', pageLoads: 500 }),
    ]);

    expect(summary.applications).toBe(1);
    expect(summary.pageLoads).toBe(501);
  });

  it('computes the error rate and the failed HTTP share over all the applications', () => {
    const summary = summarizeApplications([
      app({ pageLoads: 10, jsErrors: 5, requests: 10, failed: 1 }),
      app({ pageLoads: 30, jsErrors: 3, requests: 30, failed: 3 }),
    ]);

    expect(summary.errorsPerPageLoad).toBe(0.2);
    expect(summary.failedHttpRatio).toBe(0.1);
  });

  it('leaves the rates empty without page loads or requests', () => {
    const summary = summarizeApplications([]);

    expect(summary.errorsPerPageLoad).toBeNull();
    expect(summary.failedHttpRatio).toBeNull();
  });

  it('counts the applications with any poor Core Web Vital', () => {
    expect(
      summarizeApplications([
        app({ serviceName: 'a', lcp: 4500 }),
        app({ serviceName: 'b', inp: 600 }),
        app({ serviceName: 'c', cls: 0.3 }),
        app({ serviceName: 'c', source: 'classic', cls: 0.3 }),
        app({ serviceName: 'd', lcp: 2000, inp: 100, cls: 0.05 }),
        app({ serviceName: 'e' }),
      ]).poorCoreWebVitals
    ).toBe(3);
  });
});

describe('pageLoadsOfSources', () => {
  const pageLoadsOverTime = {
    otel: [
      { timestamp: 0, count: 1 },
      { timestamp: 60, count: 2 },
    ],
    classic: [
      { timestamp: 0, count: 3 },
      { timestamp: 60, count: 0 },
    ],
  };

  it('adds up both sources by bucket when no source is selected', () => {
    expect(pageLoadsOfSources(pageLoadsOverTime, undefined)).toEqual([
      { timestamp: 0, count: 4 },
      { timestamp: 60, count: 2 },
    ]);
  });

  it('returns the selected source only', () => {
    expect(pageLoadsOfSources(pageLoadsOverTime, 'classic')).toEqual(pageLoadsOverTime.classic);
  });
});
