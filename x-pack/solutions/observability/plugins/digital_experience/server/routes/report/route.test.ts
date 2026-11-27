/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScorecardReport } from '../../../common/types/scorecard';
import { getScorecardReport } from '../../lib/report/get_scorecard_report';
import { APPLICATION_SCORECARD_ENDPOINT, reportRouteRepository } from './route';

jest.mock('../../lib/report/get_scorecard_report');

const mockedReport = jest.mocked(getScorecardReport);

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T14:00:00.000Z';

const REPORT = { serviceName: 'shop', sections: [] } as unknown as ScorecardReport;

const esClient = { search: jest.fn() };

const runHandler = (query: { start: string; end: string; environment?: string }) => {
  const handler = reportRouteRepository[APPLICATION_SCORECARD_ENDPOINT].handler as unknown as (
    resources: unknown
  ) => Promise<unknown>;
  return handler({
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
  });
};

describe('GET /internal/digital_experience/applications/{serviceName}/report/scorecard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReport.mockResolvedValue(REPORT);
  });

  it('answers with the scorecard of the application over the requested range', async () => {
    const result = await runHandler({ start: START, end: END, environment: 'production' });

    expect(result).toBe(REPORT);
    expect(mockedReport).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'shop',
        start: Date.parse(START),
        end: Date.parse(END),
        environment: 'production',
        esClient: expect.anything(),
      })
    );
  });
});
