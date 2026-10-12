/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { riskHistorySignal } from './risk_history';
import type { EntityRef, SignalContext } from './types';

const USER: EntityRef = {
  euid: 'user:a.rodriguez@acme.example@okta',
  type: 'user',
  name: 'a.rodriguez',
};
const HOST: EntityRef = { euid: 'host:laptop', type: 'host', name: 'LAPTOP-FIN03' };
const SERVICE: EntityRef = { euid: 'service:build', type: 'service', name: 'build' };

const timeRange = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-08T00:00:00.000Z' };

const day = (date: string, value: number | null) => ({
  key: new Date(date).getTime(),
  key_as_string: date,
  score: { value },
});

describe('riskHistorySignal', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const abortSignal = new AbortController().signal;
  const ctx: SignalContext = {
    esClient,
    spaceId: 'default',
    timeRange,
    now: new Date(timeRange.to),
    logger: loggingSystemMock.createLogger(),
    user: { username: 'elastic' },
    getCasesClient: async () => undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is scoped to entities with the risk scoring capability', async () => {
    expect(riskHistorySignal.scope).toBe('entities');
    expect(riskHistorySignal.capability).toBe('risk_scoring');
    expect(await riskHistorySignal.isAvailable(ctx)).toEqual({ available: true });
  });

  it('reads daily max risk from the history index for the window with the abort signal', async () => {
    esClient.search.mockResolvedValue({ aggregations: {} } as never);

    await riskHistorySignal.run(ctx, { entities: [USER, HOST] }, abortSignal);

    const [request, options] = esClient.search.mock.calls[0] as [
      estypes.SearchRequest,
      { signal: AbortSignal }
    ];
    expect(request).toMatchObject({
      index: 'risk-score.risk-score-default',
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
            expect.anything(),
          ],
        },
      },
      aggs: {
        user: {
          terms: { field: 'user.risk.id_value', include: [HOST.euid, USER.euid], size: 2 },
          aggs: {
            days: {
              date_histogram: { field: '@timestamp', fixed_interval: '1d', time_zone: 'UTC' },
              aggs: { score: { max: { field: 'user.risk.calculated_score_norm' } } },
            },
          },
        },
      },
    });
    expect(Object.keys(request.aggs ?? {})).toEqual(['host', 'user', 'service']);
    expect(options.signal).toBe(abortSignal);
  });

  it('keeps the largest day-over-day rise of at least ten points per entity', async () => {
    esClient.search.mockResolvedValue({
      aggregations: {
        user: {
          buckets: [
            {
              key: USER.euid,
              days: {
                buckets: [
                  day('2026-10-02T00:00:00.000Z', 20),
                  day('2026-10-03T00:00:00.000Z', 35.4),
                  day('2026-10-04T00:00:00.000Z', 70.2),
                  day('2026-10-05T00:00:00.000Z', 40),
                  day('2026-10-06T00:00:00.000Z', 55),
                ],
              },
            },
          ],
        },
        host: {
          buckets: [
            {
              key: HOST.euid,
              days: {
                // Rises are all below the threshold, and a day without a score is skipped.
                buckets: [
                  day('2026-10-02T00:00:00.000Z', 30),
                  day('2026-10-03T00:00:00.000Z', 39.9),
                  day('2026-10-04T00:00:00.000Z', null),
                  day('2026-10-05T00:00:00.000Z', 42),
                ],
              },
            },
          ],
        },
        service: { buckets: [] },
      },
    } as never);

    const { facts } = await riskHistorySignal.run(
      ctx,
      { entities: [USER, HOST, SERVICE] },
      abortSignal
    );

    expect(facts).toEqual([
      {
        kind: 'risk_jump',
        title: 'Risk jump for a.rodriguez',
        at: '2026-10-04T00:00:00.000Z',
        entities: [USER],
        numbers: { from: 35, to: 70, delta: 35 },
      },
    ]);
  });

  it('orders unsorted buckets by time before measuring jumps', async () => {
    esClient.search.mockResolvedValue({
      aggregations: {
        service: {
          buckets: [
            {
              key: SERVICE.euid,
              days: {
                buckets: [day('2026-10-03T00:00:00.000Z', 60), day('2026-10-02T00:00:00.000Z', 20)],
              },
            },
          ],
        },
      },
    } as never);

    const { facts } = await riskHistorySignal.run(ctx, { entities: [SERVICE] }, abortSignal);

    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({
      at: '2026-10-03T00:00:00.000Z',
      numbers: { from: 20, to: 60, delta: 40 },
    });
  });

  it('does not query for no entities', async () => {
    expect(await riskHistorySignal.run(ctx, { entities: [] }, abortSignal)).toEqual({ facts: [] });
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
