/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T13:00:00.000Z';

interface ApplicationRoute {
  handler: unknown;
  params?: unknown;
  options?: unknown;
  security?: unknown;
}

/**
 * The cases every route of an application's tab shares with the Overview route: params forwarded,
 * the range parsed, the environment optional, the same privileges and params schema.
 */
export const applicationRouteTestCases = ({
  route,
  getData,
  hasFilters = false,
}: {
  route: () => ApplicationRoute;
  /** The mocked function the handler returns the result of. */
  getData: jest.Mock;
  /** Whether the route takes the Overview's filters too. */
  hasFilters?: boolean;
}) => {
  const esClient = { search: jest.fn() };
  const RESPONSE = { data: 'response' };

  const runHandler = (query: {
    start: string;
    end: string;
    environment?: string;
    browser?: string;
    pageUrl?: string;
  }) => {
    return (route().handler as (resources: unknown) => Promise<unknown>)({
      params: { path: { serviceName: 'shop' }, query },
      context: {
        core: Promise.resolve({ elasticsearch: { client: { asCurrentUser: esClient } } }),
      },
      request: { events: { aborted$: NEVER } },
      plugins: {},
      isServerless: false,
      isUxEnabled: true,
      logger: loggingSystemMock.createLogger(),
    });
  };

  const schemaOf = (key: 'path' | 'query') => {
    return (
      route().params as {
        shape: Record<string, { safeParse: (value: unknown) => { success: boolean } }>;
      }
    ).shape[key];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getData.mockResolvedValue(RESPONSE);
  });

  it('searches the requested application with the current user and returns the result', async () => {
    await expect(runHandler({ start: START, end: END })).resolves.toBe(RESPONSE);

    expect(getData).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'shop',
        esClient: expect.objectContaining({ client: esClient }),
      })
    );
  });

  it('converts the ISO range to epoch milliseconds and searches with an abort signal', async () => {
    await runHandler({ start: START, end: END });

    expect(getData).toHaveBeenCalledWith(
      expect.objectContaining({ start: Date.parse(START), end: Date.parse(END) })
    );
    esClient.search.mockResolvedValue({ body: {} });
    const [[{ esClient: tracedClient }]] = getData.mock.calls;
    await tracedClient.search('search', { index: 'logs-*', size: 0, track_total_hits: false });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('filters by the selected environment, and by none when it is left out', async () => {
    await runHandler({ start: START, end: END, environment: 'production' });
    expect(getData).toHaveBeenLastCalledWith(
      expect.objectContaining({ environment: 'production' })
    );

    await runHandler({ start: START, end: END });
    expect(getData).toHaveBeenLastCalledWith(expect.objectContaining({ environment: undefined }));
  });

  it('is internal and requires the Digital Experience and APM privileges', () => {
    expect(route().options).toEqual({ access: 'internal' });
    expect(route().security).toEqual({
      authz: { requiredPrivileges: ['read_digital_experience', 'apm'] },
    });
  });

  it('validates the time range and the application name like the Overview route', () => {
    expect(schemaOf('query').safeParse({ start: START, end: END }).success).toBe(true);
    expect(schemaOf('query').safeParse({ start: END, end: START }).success).toBe(false);
    expect(schemaOf('path').safeParse({ serviceName: 'x'.repeat(1024) }).success).toBe(true);
    expect(schemaOf('path').safeParse({ serviceName: 'x'.repeat(1025) }).success).toBe(false);
    expect(schemaOf('path').safeParse({ serviceName: '' }).success).toBe(false);
  });

  if (hasFilters) {
    it('passes the selected filters, and none when they are left out', async () => {
      await runHandler({
        start: START,
        end: END,
        browser: 'Chrome',
        pageUrl: 'https://shop.test/',
      });
      expect(getData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: {
            browser: 'Chrome',
            os: undefined,
            device: undefined,
            country: undefined,
            pageUrl: 'https://shop.test/',
          },
        })
      );

      await runHandler({ start: START, end: END });
      expect(getData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: {
            browser: undefined,
            os: undefined,
            device: undefined,
            country: undefined,
            pageUrl: undefined,
          },
        })
      );
    });

    it('bounds the filters like the Overview route', () => {
      const query = (filters: Record<string, string>) => ({ start: START, end: END, ...filters });

      expect(schemaOf('query').safeParse(query({ browser: 'Chrome' })).success).toBe(true);
      expect(schemaOf('query').safeParse(query({ browser: '' })).success).toBe(false);
      expect(schemaOf('query').safeParse(query({ country: 'x'.repeat(17) })).success).toBe(false);
      expect(schemaOf('query').safeParse(query({ pageUrl: 'x'.repeat(1025) })).success).toBe(false);
    });
  }
};
