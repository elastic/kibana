/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  enrichRumAppInventory,
  mergeRumAppRows,
  mergeRumAppsResponses,
  overlayAppInventoryVitals,
  parseRumSessionTraffic,
  rumAppFromBucket,
  rumAppOpportunity,
  rumAppsInventoryKpis,
} from './rum_apps';
import { rumPerformanceScore } from './rum_performance_score';

describe('rumAppFromBucket', () => {
  it('computes error rate, android platform, and scores from errors when vitals are missing', () => {
    expect(
      rumAppFromBucket({
        name: 'weather-demo-app',
        sessions: 20,
        pageViews: 0,
        errorSessions: 5,
        p75Lcp: null,
        platformKeys: ['Android'],
      })
    ).toEqual({
      name: 'weather-demo-app',
      platform: 'android',
      sessions: 20,
      pageViews: 0,
      errorSessions: 5,
      errorRate: 0.25,
      p75Lcp: null,
      p75Inp: null,
      p75Cls: null,
      p75Fcp: null,
      p75Ttfb: null,
      score: rumPerformanceScore({ errorRate: 0.25 }),
      scoreTrend: [],
      environments: [],
      scoreDelta: null,
      sessionsDelta: null,
      errorRateDelta: null,
      opportunity: null,
      trend: [],
    });
  });

  it('scores from the collected vitals and error rate', () => {
    const row = rumAppFromBucket({
      name: 'shop',
      sessions: 10,
      pageViews: 40,
      errorSessions: 1,
      p75Lcp: 2000,
      p75Inp: 150,
      p75Cls: 0.05,
      platformKeys: ['web'],
      trend: [1, 3, 2],
    });
    expect(row.score).toBe(
      rumPerformanceScore({
        lcp: 2000,
        inp: 150,
        cls: 0.05,
        fcp: null,
        ttfb: null,
        errorRate: 0.1,
      })
    );
    expect(row.trend).toEqual([1, 3, 2]);
  });

  it('prefers Apdex ranks over p75 when scoring', () => {
    const row = rumAppFromBucket({
      name: 'shop',
      sessions: 10,
      pageViews: 40,
      errorSessions: 2,
      p75Lcp: 8000,
      ranks: { lcp: { good: 80, ni: 20, poor: 0 } },
      platformKeys: ['web'],
    });
    expect(row.score).toBe(
      rumPerformanceScore({
        lcp: 8000,
        errorRate: 0.2,
        ranks: { lcp: { good: 80, ni: 20, poor: 0 } },
      })
    );
    expect(row.score).toBe(72);
    expect(row.ranks).toEqual({ lcp: { good: 80, ni: 20, poor: 0 } });
  });
});

describe('mergeRumAppRows', () => {
  it('keeps the otel row when the same name exists on both fields', () => {
    const otel = [
      rumAppFromBucket({
        name: 'shop',
        sessions: 10,
        pageViews: 40,
        errorSessions: 1,
        p75Lcp: 2000,
        platformKeys: ['web'],
      }),
    ];
    const classic = [
      rumAppFromBucket({
        name: 'shop',
        sessions: 99,
        pageViews: 99,
        errorSessions: 9,
        p75Lcp: 100,
        platformKeys: ['web'],
      }),
      rumAppFromBucket({
        name: 'legacy',
        sessions: 3,
        pageViews: 3,
        errorSessions: 0,
        p75Lcp: null,
        platformKeys: [],
      }),
    ];
    expect(mergeRumAppRows(otel, classic).map((app) => app.name)).toEqual(['shop', 'legacy']);
  });
});

describe('rumAppsInventoryKpis', () => {
  it('rolls up traffic, weighted errors, and poor scores', () => {
    expect(
      rumAppsInventoryKpis([
        rumAppFromBucket({
          name: 'shop',
          sessions: 10,
          pageViews: 40,
          errorSessions: 1,
          p75Lcp: 2000,
          platformKeys: ['web'],
        }),
        rumAppFromBucket({
          name: 'slow',
          sessions: 10,
          pageViews: 10,
          errorSessions: 1,
          p75Lcp: 8000,
          p75Inp: 900,
          platformKeys: ['web'],
        }),
      ])
    ).toEqual({
      applications: 2,
      sessions: 20,
      pageViews: 50,
      errorRate: 0.1,
      poorScoreApps: 1,
      firingAlertApps: 0,
    });
  });

  it('counts scoped firing apps in the filtered set', () => {
    expect(
      rumAppsInventoryKpis(
        [
          rumAppFromBucket({
            name: 'shop',
            sessions: 10,
            pageViews: 10,
            errorSessions: 0,
            p75Lcp: 2000,
            platformKeys: ['web'],
          }),
          rumAppFromBucket({
            name: 'legacy',
            sessions: 4,
            pageViews: 4,
            errorSessions: 0,
            p75Lcp: 2000,
            platformKeys: ['web'],
          }),
        ],
        new Set(['shop'])
      ).firingAlertApps
    ).toBe(1);
  });
});

describe('rumAppOpportunity', () => {
  it('weights room-to-100 by fleet session share', () => {
    expect(rumAppOpportunity(50, 80, 100)).toBe(10);
    expect(rumAppOpportunity(0, 80, 100)).toBeNull();
    expect(rumAppOpportunity(50, null, 100)).toBeNull();
  });
});

describe('enrichRumAppInventory', () => {
  it('adds deltas and opportunity against the previous period', () => {
    const current = [
      rumAppFromBucket({
        name: 'shop',
        sessions: 20,
        pageViews: 40,
        errorSessions: 2,
        p75Lcp: 2000,
        platformKeys: ['web'],
      }),
    ];
    const previous = [
      rumAppFromBucket({
        name: 'shop',
        sessions: 10,
        pageViews: 20,
        errorSessions: 1,
        p75Lcp: 2000,
        platformKeys: ['web'],
      }),
    ];
    const [row] = enrichRumAppInventory(current, previous);
    expect(row.sessionsDelta).toBe(10);
    expect(row.errorRateDelta).toBe(0);
    expect(row.scoreDelta).toBe(0);
    expect(row.opportunity).toBe(rumAppOpportunity(20, row.score, 20));
  });
});

describe('parseRumSessionTraffic', () => {
  it('reads session cardinality per histogram bucket', () => {
    expect(
      parseRumSessionTraffic({
        buckets: [
          { key: 1_700_000_000_000, sessions: { value: 4 } },
          { key: 1_700_003_600_000, sessions: { value: 12 } },
        ],
      })
    ).toEqual([
      { timestamp: 1_700_000_000_000, sessions: 4 },
      { timestamp: 1_700_003_600_000, sessions: 12 },
    ]);
  });

  it('returns an empty list when the aggregation is missing', () => {
    expect(parseRumSessionTraffic(undefined)).toEqual([]);
    expect(parseRumSessionTraffic({})).toEqual([]);
  });

  it('reads doc_count when session cardinality is absent', () => {
    expect(
      parseRumSessionTraffic({
        buckets: [{ key: 1_700_000_000_000, doc_count: 7 }],
      })
    ).toEqual([{ timestamp: 1_700_000_000_000, sessions: 7 }]);
  });
});

describe('mergeRumAppsResponses', () => {
  it('adds tail sessions onto indexed rows and keeps indexed vitals', () => {
    const indexed = {
      apps: [
        rumAppFromBucket({
          name: 'shop',
          sessions: 10,
          pageViews: 20,
          errorSessions: 1,
          p75Lcp: 2000,
          platformKeys: ['web'],
        }),
      ],
      sessionTraffic: [{ timestamp: 1, sessions: 10 }],
      source: 'sessions' as const,
      remainder: true,
    };
    const live = {
      apps: [
        rumAppFromBucket({
          name: 'shop',
          sessions: 2,
          pageViews: 3,
          errorSessions: 1,
          p75Lcp: 8000,
          platformKeys: ['android'],
        }),
      ],
      sessionTraffic: [{ timestamp: 1, sessions: 2 }],
      source: 'raw' as const,
      remainder: false,
    };
    const merged = mergeRumAppsResponses(indexed, live);
    expect(merged.apps[0]).toMatchObject({
      name: 'shop',
      sessions: 12,
      pageViews: 23,
      errorSessions: 2,
      p75Lcp: 2000,
    });
    expect(merged.sessionTraffic).toEqual([{ timestamp: 1, sessions: 12 }]);
    expect(merged.remainder).toBe(false);
  });

  it('folds a finer remainder histogram into indexed bucket timestamps', () => {
    const indexed = {
      apps: [
        rumAppFromBucket({
          name: 'shop',
          sessions: 10,
          pageViews: 20,
          errorSessions: 0,
          p75Lcp: null,
          platformKeys: ['web'],
        }),
      ],
      sessionTraffic: [
        { timestamp: 0, sessions: 4 },
        { timestamp: 86_400_000, sessions: 6 },
      ],
      source: 'sessions' as const,
      remainder: true,
    };
    const live = {
      apps: [],
      sessionTraffic: [
        { timestamp: 86_400_000 + 60_000, sessions: 1 },
        { timestamp: 86_400_000 + 120_000, sessions: 2 },
      ],
      source: 'raw' as const,
      remainder: false,
    };
    expect(mergeRumAppsResponses(indexed, live).sessionTraffic).toEqual([
      { timestamp: 0, sessions: 4 },
      { timestamp: 86_400_000, sessions: 9 },
    ]);
  });
});

describe('overlayAppInventoryVitals', () => {
  it('keeps dest session counts and fills FCP/TTFB from raw', () => {
    const indexed = [
      rumAppFromBucket({
        name: 'shop',
        sessions: 10,
        pageViews: 20,
        errorSessions: 1,
        p75Lcp: 4000,
        p75Fcp: null,
        p75Ttfb: null,
        platformKeys: ['web'],
      }),
    ];
    const vitals = [
      rumAppFromBucket({
        name: 'shop',
        sessions: 99,
        pageViews: 99,
        errorSessions: 9,
        p75Lcp: 2100,
        p75Fcp: 1400,
        p75Ttfb: 200,
        platformKeys: ['web'],
      }),
    ];
    const next = overlayAppInventoryVitals(indexed, vitals);
    expect(next[0]?.sessions).toBe(10);
    expect(next[0]?.p75Lcp).toBe(2100);
    expect(next[0]?.p75Fcp).toBe(1400);
    expect(next[0]?.p75Ttfb).toBe(200);
  });
});
