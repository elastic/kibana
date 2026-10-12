/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { CasesClient } from '@kbn/cases-plugin/server';
import { responseStatusSignal } from './response_status';
import type { EntityRef, SignalContext } from './types';

const USER: EntityRef = {
  euid: 'user:a.rodriguez@acme.example@okta',
  type: 'user',
  name: 'a.rodriguez',
};
const HOST: EntityRef = { euid: 'host:230a0eef', type: 'host', name: 'LAPTOP-FIN03' };
const ALIAS = 'user:a.rodriguez@230a0eef@local';

const timeRange = { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' };

const groupHits = {
  hits: {
    hits: [
      { fields: { 'entity.id': [USER.euid] } },
      { fields: { 'entity.id': [HOST.euid] } },
      {
        fields: {
          'entity.id': [ALIAS],
          'entity.relationships.resolution.resolved_to': [USER.euid],
        },
      },
    ],
  },
};

const alertAggregations = {
  aggregations: {
    entities: {
      buckets: {
        e0: {
          doc_count: 8,
          statuses: {
            buckets: [
              { key: 'open', doc_count: 5 },
              { key: 'acknowledged', doc_count: 2 },
              { key: 'closed', doc_count: 1 },
            ],
          },
          cases: { buckets: [{ key: 'case-1' }] },
        },
        e1: {
          doc_count: 3,
          statuses: { buckets: [{ key: 'in-progress', doc_count: 3 }] },
          cases: { buckets: [{ key: 'case-1' }] },
        },
      },
    },
  },
};

describe('responseStatusSignal', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const abortSignal = new AbortController().signal;
  const bulkGet = jest.fn();
  const casesClient = { cases: { bulkGet } } as unknown as CasesClient;
  const logger = loggingSystemMock.createLogger();
  const getCasesClient = jest.fn<Promise<CasesClient | undefined>, []>();

  const ctx: SignalContext = {
    esClient,
    spaceId: 'default',
    timeRange,
    now: new Date(timeRange.to),
    logger,
    user: { username: 'elastic' },
    getCasesClient,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    esClient.search
      .mockResolvedValueOnce(groupHits as never)
      .mockResolvedValueOnce(alertAggregations as never);
    getCasesClient.mockResolvedValue(casesClient);
    bulkGet.mockResolvedValue({
      cases: [
        {
          id: 'case-1',
          title: 'Phishing follow-up',
          status: 'in-progress',
          created_at: '2026-10-08T10:00:00.000Z',
        },
      ],
      errors: [],
    });
  });

  it('is scoped to entities and always available', async () => {
    expect(responseStatusSignal.scope).toBe('entities');
    expect(responseStatusSignal.capability).toBe('cases');
    expect(await responseStatusSignal.isAvailable(ctx)).toEqual({ available: true });
  });

  it('queries the alerts index for the window and every resolution group member', async () => {
    await responseStatusSignal.run(ctx, { entities: [USER, HOST] }, abortSignal);

    const [alertsRequest, alertsOptions] = esClient.search.mock.calls[1] as [
      estypes.SearchRequest,
      { signal: AbortSignal }
    ];
    expect(alertsRequest).toMatchObject({
      index: '.alerts-security.alerts-default',
      size: 0,
      allow_partial_search_results: false,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
            expect.anything(),
          ],
          must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
        },
      },
      aggs: {
        entities: {
          filters: {
            filters: {
              e0: {
                bool: {
                  should: [
                    { terms: { 'kibana.alert.entity.id': [USER.euid, ALIAS] } },
                    expect.anything(),
                    expect.anything(),
                  ],
                },
              },
              e1: expect.anything(),
            },
          },
        },
      },
    });
    expect(JSON.stringify(alertsRequest.query)).toContain(ALIAS);
    expect(Object.keys(alertsRequest.runtime_mappings ?? {})).toEqual([
      'entity_user',
      'entity_host',
    ]);
    expect(alertsOptions.signal).toBe(abortSignal);

    const [groupRequest, groupOptions] = esClient.search.mock.calls[0] as [
      estypes.SearchRequest,
      { signal: AbortSignal }
    ];
    expect(groupRequest.index).toBe('entities-latest-default');
    expect(groupOptions.signal).toBe(abortSignal);
  });

  it('emits alert_response facts per entity and one case fact for shared cases', async () => {
    const output = await responseStatusSignal.run(ctx, { entities: [USER, HOST] }, abortSignal);

    expect(bulkGet).toHaveBeenCalledWith({ ids: ['case-1'] });
    expect(output.facts).toEqual([
      {
        kind: 'alert_response',
        title: 'Alert response for a.rodriguez',
        entities: [USER],
        numbers: { open: 5, acknowledged: 2, closed: 1 },
      },
      {
        kind: 'alert_response',
        title: 'Alert response for LAPTOP-FIN03',
        entities: [HOST],
        numbers: { open: 0, acknowledged: 3, closed: 0 },
      },
      {
        kind: 'case',
        title: 'Phishing follow-up',
        at: '2026-10-08T10:00:00.000Z',
        entities: [USER, HOST],
        details: { status: 'in-progress' },
        source: { type: 'case', id: 'case-1', name: 'Phishing follow-up' },
      },
    ]);
  });

  it('omits entities without alerts and skips cases when none are attached', async () => {
    esClient.search.mockReset();
    esClient.search.mockResolvedValueOnce(groupHits as never).mockResolvedValueOnce({
      aggregations: { entities: { buckets: { e0: { doc_count: 0 }, e1: { doc_count: 0 } } } },
    } as never);

    const output = await responseStatusSignal.run(ctx, { entities: [USER, HOST] }, abortSignal);

    expect(output.facts).toEqual([]);
    expect(getCasesClient).not.toHaveBeenCalled();
  });

  it('keeps alert facts when the cases client is unavailable', async () => {
    getCasesClient.mockResolvedValue(undefined);

    const output = await responseStatusSignal.run(ctx, { entities: [USER, HOST] }, abortSignal);

    expect(output.facts.map(({ kind }) => kind)).toEqual(['alert_response', 'alert_response']);
    expect(bulkGet).not.toHaveBeenCalled();
  });

  it('keeps alert facts and logs when cases cannot be read', async () => {
    bulkGet.mockRejectedValue(new Error('forbidden'));

    const output = await responseStatusSignal.run(ctx, { entities: [USER, HOST] }, abortSignal);

    expect(output.facts.map(({ kind }) => kind)).toEqual(['alert_response', 'alert_response']);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('forbidden'));
  });

  it('does not query for no entities', async () => {
    esClient.search.mockReset();

    expect(await responseStatusSignal.run(ctx, { entities: [] }, abortSignal)).toEqual({
      facts: [],
    });
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
