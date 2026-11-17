/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { NO_WEB_VITALS } from '../../../common/core_web_vitals';
import type { ApplicationOverviewResponse } from '../../../common/types/overview';
import { getOtelOverview } from '../overview/otel/get_otel_overview';
import { APPLICATION_SCORECARD_PDF_ENDPOINT, reportRouteRepository } from './route';

jest.mock('../overview/otel/get_otel_overview');

const mockedOverview = jest.mocked(getOtelOverview);

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T14:00:00.000Z';

const RESPONSE: ApplicationOverviewResponse = {
  overview: {
    serviceName: 'shop',
    percentile: 75,
    pageLoads: { count: 100 },
    loadTime: { percentileMs: 2000, sampleCount: 100 },
    jsErrors: { count: 1 },
    httpRequests: { count: 10, failedCount: 0, failedRatio: 0 },
    webVitals: NO_WEB_VITALS,
    trend: [],
  },
  environments: [],
  filters: {} as ApplicationOverviewResponse['filters'],
};

const esClient = { search: jest.fn() };

const runHandler = (
  query: { start: string; end: string; environment?: string } = {
    start: START,
    end: END,
  }
) => {
  const ok = jest.fn((options: unknown) => options);
  const handler = reportRouteRepository[APPLICATION_SCORECARD_PDF_ENDPOINT].handler as unknown as (
    resources: unknown
  ) => Promise<unknown>;
  return {
    ok,
    result: handler({
      params: { path: { serviceName: 'shop' }, query },
      context: {
        core: Promise.resolve({
          elasticsearch: { client: { asCurrentUser: esClient } },
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      request: { events: { aborted$: NEVER } },
      response: { ok },
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
  });

  it('answers with the scorecard as a PDF', async () => {
    const { ok, result } = runHandler();
    await result;

    expect(ok).toHaveBeenCalledWith({
      body: expect.any(Buffer),
      headers: expect.objectContaining({ 'content-type': 'application/pdf' }),
    });
    const { body } = ok.mock.calls[0][0] as { body: Buffer };
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
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
  });
});
