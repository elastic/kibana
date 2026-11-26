/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { NO_WEB_VITALS } from '../../../common/core_web_vitals';
import { toComparedValue } from '../../../common/mobile/kpis';
import type { ApplicationOverview } from '../../../common/types/overview';
import { getOtelOverview } from '../../routes/overview/otel/get_otel_overview';
import { getOtelOverviewKpis } from '../../routes/overview/otel/get_otel_overview_kpis';
import { getScorecardReport } from './get_scorecard_report';

jest.mock('../../routes/overview/otel/get_otel_overview');
jest.mock('../../routes/overview/otel/get_otel_overview_kpis');

const HOUR = 3_600_000;

const overview: ApplicationOverview = {
  serviceName: 'shop',
  percentile: 75,
  pageLoads: { count: 10 },
  loadTime: { percentileMs: 1000 },
  webVitals: NO_WEB_VITALS,
  trend: [],
  trendHistogram: { interval: { value: 1, unit: 's' }, start: 0, end: 1 },
};

const compared = toComparedValue(1, 1);

describe('getScorecardReport', () => {
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
      counts: { sessions: 1, pageLoads: 1 },
    } as unknown as Awaited<ReturnType<typeof getOtelOverviewKpis>>);
  });

  const run = () =>
    getScorecardReport({
      client: elasticsearchServiceMock.createElasticsearchClient(),
      logger: loggingSystemMock.createLogger(),
      serviceName: 'shop',
      start: 10 * HOUR,
      end: 12 * HOUR,
    });

  it('searches the previous period up to the millisecond before the current one starts', async () => {
    jest
      .mocked(getOtelOverview)
      .mockResolvedValue({ overview, environments: [], filters: {} } as unknown as Awaited<
        ReturnType<typeof getOtelOverview>
      >);

    await run();

    const ranges = jest.mocked(getOtelOverview).mock.calls.map(([{ start, end }]) => [start, end]);
    expect(ranges).toEqual([
      [10 * HOUR, 12 * HOUR],
      [8 * HOUR, 10 * HOUR - 1],
    ]);
  });

  it('offers the environments of both periods', async () => {
    jest
      .mocked(getOtelOverview)
      .mockResolvedValueOnce({
        overview,
        environments: ['production'],
        filters: {},
      } as unknown as Awaited<ReturnType<typeof getOtelOverview>>)
      .mockResolvedValueOnce({
        overview,
        environments: ['production', 'staging'],
        filters: {},
      } as unknown as Awaited<ReturnType<typeof getOtelOverview>>);

    const report = await run();

    expect(report.environments).toEqual(['production', 'staging']);
  });
});
