/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { hasSessionsSourceData } from './has_sessions_source_data';
import { BROWSER_SESSIONS_PLATFORM, MOBILE_SESSIONS_PLATFORM } from './sessions_platforms';

const NOW = Date.parse('2026-11-23T12:00:00.000Z');

const resultWith = (rows: number): estypes.EsqlEsqlResult => ({
  columns: [{ name: '@timestamp', type: 'date' }],
  values: Array.from({ length: rows }, () => ['2026-11-23T11:00:00.000Z']),
});

describe('hasSessionsSourceData', () => {
  const logger = loggingSystemMock.createLogger();
  const client = elasticsearchServiceMock.createElasticsearchClient();

  afterEach(() => {
    jest.resetAllMocks();
  });

  const respondWith = (browserRows: number, mobileRows: number) =>
    client.esql.query.mockImplementation((async ({ query }) =>
      resultWith(
        query.includes(BROWSER_SESSIONS_PLATFORM.events('data_from', 'data_to'))
          ? browserRows
          : mobileRows
      )) as typeof client.esql.query);

  it('looks for one event of each platform within the days sessions are built from', async () => {
    respondWith(0, 0);

    expect(await hasSessionsSourceData(client, logger, NOW)).toBe(false);

    const params = [
      { data_from: '2026-10-24T12:00:00.000Z' },
      { data_to: '2026-11-23T12:00:00.000Z' },
    ];
    const queries = client.esql.query.mock.calls.map(([request]) => request);
    expect(queries).toEqual([
      {
        query: expect.stringContaining(BROWSER_SESSIONS_PLATFORM.events('data_from', 'data_to')),
        params,
      },
      {
        query: expect.stringContaining(MOBILE_SESSIONS_PLATFORM.events('data_from', 'data_to')),
        params,
      },
    ]);
    queries.forEach(({ query }) => expect(query).toMatch(/\| LIMIT 1$/));
  });

  it.each([
    ['browser', 1, 0],
    ['mobile', 0, 1],
  ])('finds data when there is a %s event', async (_platform, browserRows, mobileRows) => {
    respondWith(browserRows, mobileRows);

    expect(await hasSessionsSourceData(client, logger, NOW)).toBe(true);
  });

  it('counts a failed search, as when no source index exists yet, as no data', async () => {
    client.esql.query.mockRejectedValue(new Error('Unknown index [traces-*.otel-*]'));

    expect(await hasSessionsSourceData(client, logger, NOW)).toBe(false);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Unknown index [traces-*.otel-*]')
    );
  });
});
