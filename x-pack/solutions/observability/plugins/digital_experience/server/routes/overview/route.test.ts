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
  // As the schema parses it: the percentile is a number by now.
  query?: { start: string; end: string; environment?: string; percentile?: number } & Partial<
    Record<'browser' | 'os' | 'device' | 'country' | 'pageUrl' | 'kuery', string>
  >;
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
      shape: {
        query: {
          safeParse: (query: unknown) => { success: boolean; data?: { percentile?: number } };
        };
      };
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

  it('passes the selected filters as values, included or excluded, and none when left out', async () => {
    await runHandler({
      query: {
        start: START,
        end: END,
        browser: 'Chrome,!Safari',
        os: 'macOS',
        device: 'iPhone',
        country: 'DE',
        pageUrl: 'https://shop.example.com/a\\,b',
      },
    });

    expect(mockedOtel).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: {
          browser: [
            { value: 'Chrome', exclude: false },
            { value: 'Safari', exclude: true },
          ],
          os: [{ value: 'macOS', exclude: false }],
          device: [{ value: 'iPhone', exclude: false }],
          country: [{ value: 'DE', exclude: false }],
          pageUrl: [{ value: 'https://shop.example.com/a,b', exclude: false }],
        },
      })
    );

    await runHandler();

    expect(mockedOtel).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters: { browser: [], os: [], device: [], country: [], pageUrl: [] },
      })
    );
  });

  it('passes the percentile, and none when it is left out', async () => {
    await runHandler({ query: { start: START, end: END, percentile: 95 } });

    expect(mockedOtel).toHaveBeenCalledWith(expect.objectContaining({ percentile: 95 }));

    await runHandler();

    expect(mockedOtel).toHaveBeenLastCalledWith(expect.objectContaining({ percentile: undefined }));
  });

  it('passes the KQL query as a query, and none when it is left out', async () => {
    await runHandler({ query: { start: START, end: END, kuery: 'user_agent.name: Chrome' } });

    expect(mockedOtel).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: expect.objectContaining({ bool: expect.anything() }),
      })
    );

    await runHandler();

    expect(mockedOtel).toHaveBeenLastCalledWith(expect.objectContaining({ kuery: undefined }));
  });

  it('answers a KQL query that does not parse with a 400 and searches nothing', async () => {
    await expect(
      runHandler({ query: { start: START, end: END, kuery: 'user_agent.name: (Chrome' } })
    ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 400 } });

    expect(mockedOtel).not.toHaveBeenCalled();
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

  it('accepts each filter value up to its length, and rejects an empty or longer one', () => {
    const withFilter = (name: string, raw: string) =>
      querySchema().safeParse({ start: START, end: END, [name]: raw }).success;
    const lengths = { browser: 256, os: 256, device: 256, country: 16, pageUrl: 1024 };

    Object.entries(lengths).forEach(([name, length]) => {
      expect(withFilter(name, 'x'.repeat(length))).toBe(true);
      expect(withFilter(name, 'x'.repeat(length + 1))).toBe(false);
      expect(withFilter(name, '')).toBe(false);
    });
  });

  it('accepts several values of a filter, each up to its length, in a param of up to 2048', () => {
    const withBrowser = (raw: string) =>
      querySchema().safeParse({ start: START, end: END, browser: raw }).success;

    expect(withBrowser('Chrome,!Safari,Firefox')).toBe(true);
    expect(withBrowser(`${'a'.repeat(256)},${'b'.repeat(256)}`)).toBe(true);
    expect(withBrowser(`${'a'.repeat(256)},${'b'.repeat(257)}`)).toBe(false);
    expect(withBrowser('x,'.repeat(1025))).toBe(false);
  });

  it('rejects a filter param that would be repaired instead of answering with another filter', () => {
    const withBrowser = (raw: string) =>
      querySchema().safeParse({ start: START, end: END, browser: raw }).success;
    const eleven = Array.from({ length: 11 }, (_, index) => `b${index}`).join(',');
    const ten = Array.from({ length: 10 }, (_, index) => `b${index}`).join(',');

    expect(withBrowser(ten)).toBe(true);
    expect(withBrowser(eleven)).toBe(false);
    expect(withBrowser('Chrome,Chrome')).toBe(false);
    expect(withBrowser('Chrome,!Chrome')).toBe(false);
    expect(withBrowser('Chrome,,Safari')).toBe(false);
    expect(withBrowser('Chrome,')).toBe(false);
    expect(withBrowser('!')).toBe(false);
    expect(withBrowser('Chrome\\')).toBe(false);
    expect(withBrowser('Chrome\\\\')).toBe(true);
    expect(withBrowser('a\\,b')).toBe(true);
  });

  it('accepts the percentiles the Overview offers only, and reads them as numbers', () => {
    const parse = (raw: string) =>
      querySchema().safeParse({ start: START, end: END, percentile: raw });

    ['50', '75', '90', '95', '99'].forEach((raw) => {
      const { success, data } = parse(raw);
      expect(success).toBe(true);
      expect(data?.percentile).toBe(Number(raw));
    });
    ['', '0', '100', '75.5', 'p95', '9'.repeat(1_000_000)].forEach((raw) =>
      expect(parse(raw).success).toBe(false)
    );
    expect(querySchema().safeParse({ start: START, end: END }).data?.percentile).toBeUndefined();
  });

  it('bounds the KQL query to 2048 characters', () => {
    const withKuery = (raw: string) =>
      querySchema().safeParse({ start: START, end: END, kuery: raw }).success;

    expect(withKuery('a: b')).toBe(true);
    expect(withKuery('x'.repeat(2048))).toBe(true);
    expect(withKuery('x'.repeat(2049))).toBe(false);
    expect(withKuery('')).toBe(false);
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
