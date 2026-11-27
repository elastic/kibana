/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toComparedValue } from '../../../common/mobile/kpis';
import type { ApplicationSearch } from '../../routes/application_tab_route';
import {
  getOtelOverviewKpis,
  getOtelPeriodKpis,
} from '../../routes/overview/otel/get_otel_overview_kpis';
import { averageBaselineKpis, getScorecardReport } from './get_scorecard_report';

jest.mock('../../routes/overview/otel/get_otel_overview_kpis');

const HOUR = 3_600_000;

const compared = toComparedValue(1, 1);

const NO_VITALS = { doc_count: 0, p75: { values: {} }, upToGood: { doc_count: 0 } };

/** A search response that lists `environments` and has no web vital samples. */
const response = (environments: string[]) => ({
  aggregations: {
    environments: { buckets: environments.map((key) => ({ key, doc_count: 1 })) },
    environmentNames: { buckets: [] },
    environmentNotDefined: { doc_count: 0 },
    inEnvironment: {
      lcp: NO_VITALS,
      inp: NO_VITALS,
      cls: NO_VITALS,
      fcp: NO_VITALS,
      ttfb: NO_VITALS,
    },
  },
});

/** The KPIs of one baseline period. */
const PERIOD_KPIS = {
  sessions: 10,
  sessionsWithErrors: 1,
  errorFreeSessions: 0.9,
  pageLoads: 100,
  loadTime: 1800,
  loadTimeSamples: 100,
  jsErrors: 2,
  httpRequests: 25,
  failedHttpRequests: 1,
  failedHttpRatio: 0.04,
  requestLatency: 250,
};

/** A period in which the application sent nothing. */
const NO_KPIS = {
  sessions: 0,
  sessionsWithErrors: 0,
  errorFreeSessions: null,
  pageLoads: 0,
  loadTime: null,
  loadTimeSamples: 0,
  jsErrors: 0,
  httpRequests: 0,
  failedHttpRequests: 0,
  failedHttpRatio: null,
  requestLatency: null,
};

describe('getScorecardReport', () => {
  const search = jest.fn();
  const esClient = { search } as unknown as ApplicationSearch['esClient'];

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(getOtelOverviewKpis).mockResolvedValue({
      percentile: 75,
      sessions: compared,
      errorFreeSessions: compared,
      pageLoads: compared,
      loadTime: compared,
      jsErrors: compared,
      failedHttpRequests: compared,
      requestLatency: compared,
      counts: {},
    } as unknown as Awaited<ReturnType<typeof getOtelOverviewKpis>>);
    jest.mocked(getOtelPeriodKpis).mockResolvedValue(PERIOD_KPIS);
  });

  const run = () =>
    getScorecardReport({ esClient, serviceName: 'shop', start: 10 * HOUR, end: 12 * HOUR });

  it('searches the web vitals of the period and of the one before it, which end where it starts', async () => {
    search.mockResolvedValue(response([]));

    await run();

    const ranges = search.mock.calls.map(
      ([, request]) => request.query.bool.filter[0].range['@timestamp']
    );
    expect(ranges).toEqual([
      expect.objectContaining({ gte: 10 * HOUR, lt: 12 * HOUR }),
      expect.objectContaining({ gte: 8 * HOUR, lt: 10 * HOUR }),
      // The baseline: the four periods before this one.
      expect.objectContaining({ gte: 2 * HOUR, lt: 10 * HOUR }),
    ]);
    // The baseline's KPIs: one search per period, so each counts its own sessions.
    expect(
      jest.mocked(getOtelPeriodKpis).mock.calls.map(([{ start, end }]) => [start, end])
    ).toEqual([
      [2 * HOUR, 4 * HOUR],
      [4 * HOUR, 6 * HOUR],
      [6 * HOUR, 8 * HOUR],
      [8 * HOUR, 10 * HOUR],
    ]);
  });

  it('asks for no page-load percentiles, trend or filter facets', async () => {
    search.mockResolvedValue(response([]));

    await run();

    const [, request] = search.mock.calls[0];
    expect(Object.keys(request.aggs).sort()).toEqual(
      ['environmentNames', 'environmentNotDefined', 'environments', 'inEnvironment'].sort()
    );
    expect(Object.keys(request.aggs.inEnvironment.aggs).sort()).toEqual([
      'cls',
      'fcp',
      'inp',
      'lcp',
      'ttfb',
    ]);
  });

  it("averages each measure over the baseline's periods", async () => {
    search.mockResolvedValue(response([]));

    const report = await run();

    const measures = report.sections.flatMap(({ measures: list }) => list);
    const baselineOf = (id: string) => measures.find((measure) => measure.id === id)?.baseline;
    expect(baselineOf('sessions')).toBe(10);
    expect(baselineOf('pageLoads')).toBe(100);
    expect(baselineOf('jsErrors')).toBe(2);
    expect(baselineOf('jsErrorsPer100')).toBe(2);
    expect(baselineOf('loadTime')).toBe(1800);
    expect(baselineOf('failedRequests')).toBe(0.04);
    expect(report.baselinePeriod).toEqual({ start: 2 * HOUR, end: 10 * HOUR });
  });

  it('has no baseline when the application sent nothing then', async () => {
    search.mockResolvedValue(response([]));
    jest.mocked(getOtelPeriodKpis).mockResolvedValue(NO_KPIS);

    const report = await run();

    expect(
      report.sections.flatMap(({ measures }) => measures.map(({ baseline }) => baseline))
    ).toEqual(expect.not.arrayContaining([expect.any(Number)]));
  });

  it('offers the environments of this period, the previous one and the baseline', async () => {
    search
      .mockResolvedValueOnce(response(['production']))
      .mockResolvedValueOnce(response(['production', 'staging']))
      .mockResolvedValueOnce(response(['qa']));

    const report = await run();

    expect(report.environments).toEqual(['production', 'qa', 'staging']);
  });
});

describe('averageBaselineKpis', () => {
  it('leaves out the periods without telemetry, e.g. before the application was instrumented', () => {
    expect(
      averageBaselineKpis([NO_KPIS, NO_KPIS, PERIOD_KPIS, { ...PERIOD_KPIS, sessions: 30 }])
    ).toMatchObject({ sessions: 20, pageLoads: 100, loadTime: 1800 });
  });

  it('keeps a period with only requests or JS errors, which have no session or page load', () => {
    expect(
      averageBaselineKpis([
        {
          ...NO_KPIS,
          httpRequests: 4,
          failedHttpRequests: 1,
          failedHttpRatio: 0.25,
          requestLatency: 100,
        },
        { ...NO_KPIS, jsErrors: 3 },
      ])
    ).toMatchObject({ sessions: 0, jsErrors: 1.5, failedHttpRequests: 0.25, requestLatency: 100 });
  });

  it('has no baseline without any telemetry', () => {
    expect(averageBaselineKpis([NO_KPIS, NO_KPIS]).sessions).toBeNull();
  });
});
