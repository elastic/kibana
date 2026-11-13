/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { encode } from '@kbn/rison';
import { encodeOverviewFilters } from '../../common/overview_filters_param';

const include = (...values: string[]) => values.map((value) => ({ value, exclude: false }));
const exclude = (...values: string[]) => values.map((value) => ({ value, exclude: true }));
const phrases = (key: string, params: string[]) => ({
  meta: { key, type: 'phrases', params, negate: false },
});
const phrase = (key: string, query: string, negate = false) => ({
  meta: { key, type: 'phrase', params: { query }, negate },
});

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
  takesPage = true,
}: {
  route: () => ApplicationRoute;
  /** The mocked function the handler returns the result of. */
  getData: jest.Mock;
  /** Whether the route takes the Overview's filters and KQL query too. */
  hasFilters?: boolean;
  /** Whether the route applies the page filter; the one whose documents have no page URL does not. */
  takesPage?: boolean;
}) => {
  const esClient = { search: jest.fn() };
  const RESPONSE = { data: 'response' };

  const runHandler = (query: {
    start: string;
    end: string;
    environment?: string;
    filters?: string;
    kuery?: string;
  }) => {
    return (route().handler as (resources: unknown) => Promise<unknown>)({
      params: { path: { serviceName: 'shop' }, query },
      context: {
        core: Promise.resolve({
          elasticsearch: { client: { asCurrentUser: esClient } },
          // The route guard reads the `digitalExperience.enabled` flag before the handler runs.
          featureFlags: {
            getBooleanValue: async () => {
              return true;
            },
          },
        }),
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
        shape: Record<
          string,
          { safeParse: (value: unknown) => { success: boolean; data?: Record<string, unknown> } }
        >;
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
    it('passes the selected filters as values, and none when they are left out', async () => {
      await runHandler({
        start: START,
        end: END,
        filters: encodeOverviewFilters({
          browser: [...include('Chrome'), ...exclude('Safari')],
          ...(takesPage ? { pageUrl: include('https://shop.test/') } : {}),
        }),
      });
      expect(getData).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: {
            browser: [
              { value: 'Chrome', exclude: false },
              { value: 'Safari', exclude: true },
            ],
            ...(takesPage ? { pageUrl: [{ value: 'https://shop.test/', exclude: false }] } : {}),
          },
        })
      );

      await runHandler({ start: START, end: END });
      expect(getData).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: {}, kuery: undefined })
      );
    });

    it('passes the KQL query as a query, and answers one that does not parse with a 400', async () => {
      await runHandler({ start: START, end: END, kuery: 'browser.name: Chrome' });
      expect(getData).toHaveBeenLastCalledWith(
        expect.objectContaining({ kuery: expect.objectContaining({ bool: expect.anything() }) })
      );

      await expect(
        runHandler({ start: START, end: END, kuery: 'browser.name: (Chrome' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
    });

    it('bounds the filters and the query like the Overview route', () => {
      const query = (params: Record<string, string>) => ({ start: START, end: END, ...params });
      const filters = (name: string, value: string) =>
        encodeOverviewFilters({ [name]: include(value) }) ?? '';

      expect(
        schemaOf('query').safeParse(query({ filters: filters('browser', 'Chrome') })).success
      ).toBe(true);
      expect(schemaOf('query').safeParse(query({ filters: '' })).success).toBe(false);
      expect(schemaOf('query').safeParse(query({ filters: 'not rison ((' })).success).toBe(false);
      expect(
        schemaOf('query').safeParse(query({ filters: filters('browser', 'x'.repeat(257)) })).success
      ).toBe(false);
      expect(
        schemaOf('query').safeParse(query({ filters: filters('country', 'x'.repeat(17)) })).success
      ).toBe(false);
      expect(schemaOf('query').safeParse(query({ kuery: '' })).success).toBe(false);
      expect(schemaOf('query').safeParse(query({ kuery: 'x'.repeat(2049) })).success).toBe(false);
    });

    it('rejects a filters param that would need repairing', () => {
      const withFilters = (filters: string) =>
        schemaOf('query').safeParse({ start: START, end: END, filters }).success;

      expect(withFilters(encode([phrases('browser', ['Chrome', 'Chrome'])]))).toBe(false);
      expect(
        withFilters(encode([phrase('browser', 'Chrome'), phrase('browser', 'Chrome', true)]))
      ).toBe(false);
      expect(
        withFilters(
          encode([
            phrases(
              'browser',
              Array.from({ length: 11 }, (_, index) => `b${index}`)
            ),
          ])
        )
      ).toBe(false);
    });

    if (takesPage) {
      it('bounds the page like the Overview route', () => {
        const query = (pageUrl: string) => ({
          start: START,
          end: END,
          filters: encodeOverviewFilters({ pageUrl: include(pageUrl) }),
        });

        expect(schemaOf('query').safeParse(query('x'.repeat(1024))).success).toBe(true);
        expect(schemaOf('query').safeParse(query('x'.repeat(1025))).success).toBe(false);
      });
    } else {
      it('rejects a page filter, as its documents have no page URL', () => {
        const withFilters = (filters: string) =>
          schemaOf('query').safeParse({ start: START, end: END, filters }).success;

        expect(withFilters(encodeOverviewFilters({ browser: include('Chrome') }) ?? '')).toBe(true);
        expect(withFilters(encodeOverviewFilters({ pageContains: include('/cart') }) ?? '')).toBe(
          false
        );
        expect(
          withFilters(encodeOverviewFilters({ pageUrl: include('https://shop.test/') }) ?? '')
        ).toBe(false);
      });
    }
  }
};
