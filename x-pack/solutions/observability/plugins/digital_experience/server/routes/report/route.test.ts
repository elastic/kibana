/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { NO_WEB_VITALS } from '../../../common/core_web_vitals';
import { toComparedValue } from '../../../common/mobile/kpis';
import type {
  ApplicationOverviewKpisResponse,
  ApplicationOverviewResponse,
} from '../../../common/types/overview';
import { getOtelOverview } from '../overview/otel/get_otel_overview';
import { getOtelOverviewKpis } from '../overview/otel/get_otel_overview_kpis';
import { APPLICATION_SCORECARD_ENDPOINT, reportRouteRepository } from './route';

jest.mock('../overview/otel/get_otel_overview');
jest.mock('../overview/otel/get_otel_overview_kpis');

const mockedOverview = jest.mocked(getOtelOverview);
const mockedKpis = jest.mocked(getOtelOverviewKpis);

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T14:00:00.000Z';

const RESPONSE: ApplicationOverviewResponse = {
  overview: {
    serviceName: 'shop',
    percentile: 75,
    pageLoads: { count: 100 },
    loadTime: { percentileMs: 2000 },
    webVitals: NO_WEB_VITALS,
    trend: [],
    trendHistogram: { interval: { value: 1, unit: 's' }, start: 0, end: 1_000 },
  },
  environments: [],
  filters: {} as ApplicationOverviewResponse['filters'],
};

const KPIS: ApplicationOverviewKpisResponse = {
  percentile: 75,
  sessions: toComparedValue(10, 8),
  errorFreeSessions: toComparedValue(0.9, 0.9),
  pageLoads: toComparedValue(100, 80),
  loadTime: toComparedValue(2000, 2500),
  jsErrors: toComparedValue(1, 2),
  failedHttpRequests: toComparedValue(0, 0.1),
  requestLatency: toComparedValue(300, 400),
  counts: { sessionsWithErrors: 1, loadTimeSamples: 100, httpRequests: 10, failedHttpRequests: 0 },
};

const esClient = { search: jest.fn() };

const runHandler = (
  query: { start: string; end: string; environment?: string } = {
    start: START,
    end: END,
  }
) => {
  const handler = reportRouteRepository[APPLICATION_SCORECARD_ENDPOINT].handler as unknown as (
    resources: unknown
  ) => Promise<unknown>;
  return {
    result: handler({
      params: { path: { serviceName: 'shop' }, query },
      context: {
        core: Promise.resolve({
          elasticsearch: { client: { asCurrentUser: esClient } },
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      request: { events: { aborted$: NEVER } },
      plugins: {},
      isServerless: false,
      isUxEnabled: true,
      logger: loggingSystemMock.createLogger(),
    }),
  };
};

describe('GET /internal/digital_experience/applications/{serviceName}/report/scorecard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOverview.mockResolvedValue(RESPONSE);
    mockedKpis.mockResolvedValue(KPIS);
  });

  it('answers with the scorecard of the application', async () => {
    const { result } = runHandler({ start: START, end: END, environment: 'production' });

    expect(await result).toEqual(
      expect.objectContaining({
        serviceName: 'shop',
        environment: 'production',
        period: { start: Date.parse(START), end: Date.parse(END) },
        sections: [
          expect.objectContaining({ id: 'traffic' }),
          expect.objectContaining({ id: 'webVitals' }),
        ],
      })
    );
  });

  it('searches the requested period and the one before it, as the current user', async () => {
    await runHandler({ start: START, end: END, environment: 'production' }).result;

    const start = Date.parse(START);
    const end = Date.parse(END);
    expect(mockedOverview).toHaveBeenCalledTimes(2);
    expect(mockedOverview).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'shop',
        esClient,
        start,
        end,
        environment: 'production',
      })
    );
    expect(mockedOverview).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient,
        start: start - (end - start),
        end: start,
        environment: 'production',
      })
    );
    expect(mockedKpis).toHaveBeenCalledWith(
      expect.objectContaining({ serviceName: 'shop', start, end, environment: 'production' })
    );
  });
});
