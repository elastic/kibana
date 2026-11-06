/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ApplicationOverviewResponse } from '../../../common/types/overview';
import { getOtelOverview } from './otel/get_otel_overview';
import { APPLICATION_OVERVIEW_ENDPOINT, overviewRouteRepository } from './route';

jest.mock('./otel/get_otel_overview');

const mockedOtel = jest.mocked(getOtelOverview);

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T13:00:00.000Z';

const RESPONSE = {
  overview: { serviceName: 'shop' },
  environments: ['production'],
} as unknown as ApplicationOverviewResponse;

const esClient = { search: jest.fn() };

const runHandler = ({
  serviceName = 'shop',
  query = { start: START, end: END },
}: {
  serviceName?: string;
  query?: { start: string; end: string; environment?: string };
} = {}) => {
  const handler = overviewRouteRepository[APPLICATION_OVERVIEW_ENDPOINT].handler as unknown as (
    resources: unknown
  ) => Promise<ApplicationOverviewResponse>;
  return handler({
    params: { path: { serviceName }, query },
    context: { core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: esClient } } }) },
    request: { events: { aborted$: NEVER } },
    plugins: {},
    isServerless: false,
    isUxEnabled: true,
    logger: loggingSystemMock.createLogger(),
  });
};

const querySchema = () => {
  const { params } = overviewRouteRepository[APPLICATION_OVERVIEW_ENDPOINT];
  return (
    params as unknown as {
      shape: { query: { safeParse: (query: unknown) => { success: boolean } } };
    }
  ).shape.query;
};

const pathSchema = () => {
  const { params } = overviewRouteRepository[APPLICATION_OVERVIEW_ENDPOINT];
  return (
    params as unknown as {
      shape: { path: { safeParse: (path: unknown) => { success: boolean } } };
    }
  ).shape.path;
};

describe('GET /internal/digital_experience/applications/{serviceName}/overview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOtel.mockResolvedValue(RESPONSE);
  });

  it('searches the requested application with the current user and returns its Overview', async () => {
    await expect(runHandler()).resolves.toBe(RESPONSE);

    expect(mockedOtel).toHaveBeenCalledWith(
      expect.objectContaining({ serviceName: 'shop', esClient })
    );
  });

  it('converts the ISO range to epoch milliseconds and passes an abort signal', async () => {
    await runHandler();

    expect(mockedOtel).toHaveBeenCalledWith(
      expect.objectContaining({
        start: Date.parse(START),
        end: Date.parse(END),
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('filters by the selected environment, and by none when it is left out', async () => {
    await runHandler({ query: { start: START, end: END, environment: 'production' } });

    expect(mockedOtel).toHaveBeenCalledWith(expect.objectContaining({ environment: 'production' }));

    await runHandler();

    expect(mockedOtel).toHaveBeenLastCalledWith(
      expect.objectContaining({ environment: undefined })
    );
  });

  it('answers a failed search without the Elasticsearch details', async () => {
    mockedOtel.mockRejectedValue(new Error('no such index [logs-generic.otel-default]'));

    await expect(runHandler()).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 500 },
      message: 'Could not load the data. Check the Kibana server logs for details.',
    });
  });

  it('requires the Digital Experience and APM privileges, like the Applications list', () => {
    const { security } = overviewRouteRepository[APPLICATION_OVERVIEW_ENDPOINT];

    expect(security).toEqual({
      authz: { requiredPrivileges: ['read_digital_experience', 'apm'] },
    });
  });

  it('validates that the range starts before it ends', () => {
    const schema = querySchema();

    expect(schema.safeParse({ start: START, end: END }).success).toBe(true);
    expect(schema.safeParse({ start: END, end: END }).success).toBe(false);
    expect(schema.safeParse({ start: END, end: START }).success).toBe(false);
    expect(schema.safeParse({ start: 'foo', end: END }).success).toBe(false);
    expect(schema.safeParse({ end: END }).success).toBe(false);
  });

  it('accepts every environment the picker lists, up to 1024 characters', () => {
    const withEnvironment = (length: number) =>
      querySchema().safeParse({ start: START, end: END, environment: 'x'.repeat(length) });

    expect(withEnvironment(1024).success).toBe(true);
    expect(withEnvironment(1025).success).toBe(false);
    expect(withEnvironment(0).success).toBe(false);
  });

  it('requires an application name of up to 1024 characters', () => {
    const schema = pathSchema();

    expect(schema.safeParse({ serviceName: 'shop' }).success).toBe(true);
    expect(schema.safeParse({ serviceName: 'x'.repeat(1024) }).success).toBe(true);
    expect(schema.safeParse({ serviceName: 'x'.repeat(1025) }).success).toBe(false);
    expect(schema.safeParse({ serviceName: '' }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });
});
