/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { getClassicApplications } from './classic/get_classic_applications';
import { getOtelApplications } from './otel/get_otel_applications';
import { APPLICATIONS_ENDPOINT, applicationsRouteRepository } from './route';

jest.mock('./classic/get_classic_applications');
jest.mock('./otel/get_otel_applications');

const mockedClassic = jest.mocked(getClassicApplications);

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T13:00:00.000Z';
const mockedOtel = jest.mocked(getOtelApplications);

const runHandler = ({
  isServerless,
  query = { start: START, end: END },
  withApmDataAccess = true,
}: {
  isServerless: boolean;
  query?: { start: string; end: string; environment?: string };
  withApmDataAccess?: boolean;
}) => {
  const context = {
    core: Promise.resolve({
      elasticsearch: { client: { asCurrentUser: {} } },
      savedObjects: { client: {} },
      uiSettings: { client: { get: jest.fn().mockResolvedValue(false) } },
    }),
  };
  const getApmIndices = jest.fn().mockResolvedValue({});
  const handler = applicationsRouteRepository[APPLICATIONS_ENDPOINT].handler as unknown as (
    resources: unknown
  ) => Promise<{
    applications: unknown[];
    environments: string[];
  }>;
  const result = handler({
    params: { query },
    context,
    request: { events: { aborted$: NEVER } },
    plugins: { apmDataAccess: withApmDataAccess ? { getApmIndices } : undefined },
    isServerless,
    logger: loggingSystemMock.createLogger(),
  });
  return { result, getApmIndices };
};

describe('GET /internal/digital_experience/applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOtel.mockResolvedValue({
      applications: [],
      environments: ['production'],
      pageLoadsOverTime: [],
    });
    mockedClassic.mockResolvedValue({
      applications: [],
      environments: ['staging'],
      pageLoadsOverTime: [],
    });
  });

  it('queries both sources on stateful', async () => {
    await runHandler({ isServerless: false }).result;

    expect(mockedOtel).toHaveBeenCalledTimes(1);
    expect(mockedClassic).toHaveBeenCalledTimes(1);
  });

  it('passes the environment to both sources and returns every environment', async () => {
    const response = await runHandler({
      isServerless: false,
      query: { start: START, end: END, environment: 'production' },
    }).result;

    expect(mockedOtel).toHaveBeenCalledWith(expect.objectContaining({ environment: 'production' }));
    expect(mockedClassic).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'production' })
    );
    expect(response.environments).toEqual(['production', 'staging']);
  });

  it('converts the ISO range to epoch milliseconds and passes an abort signal to OTel', async () => {
    await runHandler({ isServerless: false }).result;

    expect(mockedOtel).toHaveBeenCalledWith(
      expect.objectContaining({
        start: Date.parse(START),
        end: Date.parse(END),
        signal: expect.any(AbortSignal),
      })
    );
    expect(mockedClassic).toHaveBeenCalledWith(
      expect.objectContaining({ start: Date.parse(START), end: Date.parse(END) })
    );
  });

  it('skips Classic without the APM data access plugin', async () => {
    const response = await runHandler({ isServerless: false, withApmDataAccess: false }).result;

    expect(mockedOtel).toHaveBeenCalledTimes(1);
    expect(mockedClassic).not.toHaveBeenCalled();
    expect(response.environments).toEqual(['production']);
  });

  it('never queries the Classic indices on serverless', async () => {
    const { result, getApmIndices } = runHandler({ isServerless: true });
    await result;

    expect(mockedOtel).toHaveBeenCalledTimes(1);
    expect(mockedClassic).not.toHaveBeenCalled();
    expect(getApmIndices).not.toHaveBeenCalled();
  });

  it('validates that the range starts before it ends', () => {
    const { params } = applicationsRouteRepository[APPLICATIONS_ENDPOINT];
    const schema = params as unknown as {
      shape: { query: { safeParse: (query: unknown) => { success: boolean } } };
    };

    expect(schema.shape.query.safeParse({ start: START, end: END }).success).toBe(true);
    expect(schema.shape.query.safeParse({ start: END, end: END }).success).toBe(false);
    expect(schema.shape.query.safeParse({ start: END, end: START }).success).toBe(false);
  });
});
