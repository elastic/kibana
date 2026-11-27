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
import { getScorecardReport } from './get_scorecard_report';

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

/** The baseline KPIs over four periods: 40 sessions, 400 page loads and 8 JS errors in all. */
const BASELINE_KPIS = {
  sessions: 40,
  sessionsWithErrors: 4,
  errorFreeSessions: 0.9,
  pageLoads: 400,
  loadTime: 1800,
  loadTimeSamples: 400,
  jsErrors: 8,
  httpRequests: 100,
  failedHttpRequests: 1,
  failedHttpRatio: 0.01,
  requestLatency: 250,
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
    jest.mocked(getOtelPeriodKpis).mockResolvedValue(BASELINE_KPIS);
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
    expect(getOtelPeriodKpis).toHaveBeenCalledWith(
      expect.objectContaining({ start: 2 * HOUR, end: 10 * HOUR })
    );
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

  it('averages the counts of the baseline per period, and keeps its rates and percentiles', async () => {
    search.mockResolvedValue(response([]));

    const report = await run();

    const measures = report.sections.flatMap(({ measures: list }) => list);
    const baselineOf = (id: string) => measures.find((measure) => measure.id === id)?.baseline;
    expect(baselineOf('sessions')).toBe(10);
    expect(baselineOf('pageLoads')).toBe(100);
    expect(baselineOf('jsErrors')).toBe(2);
    expect(baselineOf('jsErrorsPer100')).toBe(2);
    expect(baselineOf('loadTime')).toBe(1800);
    expect(baselineOf('failedRequests')).toBe(0.01);
    expect(report.baselinePeriod).toEqual({ start: 2 * HOUR, end: 10 * HOUR });
  });

  it('has no baseline when the application sent nothing then', async () => {
    search.mockResolvedValue(response([]));
    jest
      .mocked(getOtelPeriodKpis)
      .mockResolvedValue({ ...BASELINE_KPIS, sessions: 0, pageLoads: 0 });

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
