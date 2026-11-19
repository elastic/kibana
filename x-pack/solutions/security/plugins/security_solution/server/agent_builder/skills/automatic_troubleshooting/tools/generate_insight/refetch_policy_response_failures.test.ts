/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { getPolicyResponseFailureEvents } from './refetch_policy_response_failures';

interface Action {
  name: string;
  message: string;
  status: string;
}

const bucket = (agentId: string, osName: string, id: string, actions: Action[]) => ({
  key: agentId,
  doc_count: 1,
  latest_event: {
    hits: {
      hits: [
        {
          _id: id,
          _source: {
            agent: { id: agentId },
            Endpoint: { policy: { applied: { actions } } },
            host: { os: { name: osName } },
          },
        },
      ],
    },
  },
});

const mockEsClient = (buckets: unknown[]): ElasticsearchClient =>
  ({
    search: jest.fn().mockResolvedValue({
      aggregations: { latest_actions: { buckets } },
    }),
  } as unknown as ElasticsearchClient);

describe('getPolicyResponseFailureEvents', () => {
  it('queries metrics-endpoint.policy-* keyed on the provided endpointIds (latest per agent)', async () => {
    const esClient = mockEsClient([]);
    await getPolicyResponseFailureEvents(esClient, { endpointIds: ['a', 'b'] });

    const query = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(query.index).toEqual(['metrics-endpoint.policy-*']);
    expect(query.query.bool).toEqual({
      must: [{ terms: { 'agent.id': ['a', 'b'] } }],
      must_not: [
        { term: { 'Endpoint.policy.applied.id': '00000000-0000-0000-0000-000000000000' } },
      ],
    });
    expect(JSON.stringify(query.query)).not.toContain('range');
    expect(query.aggs.latest_actions.terms.field).toBe('agent.id');
    expect(query.aggs.latest_actions.aggs.latest_event.top_hits.sort).toEqual([
      { 'event.created': { order: 'desc' } },
    ]);
  });

  it('queries the CCS-prefixed pattern when ccsEnabled is true', async () => {
    const esClient = mockEsClient([]);
    await getPolicyResponseFailureEvents(esClient, { endpointIds: ['a'], ccsEnabled: true });

    const query = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(query.index).toEqual(['metrics-endpoint.policy-*,*:metrics-endpoint.policy-*']);
  });

  it('returns no rows when the latest policy response for every agent is all-success', async () => {
    const esClient = mockEsClient([
      bucket('a', 'Linux', 'doc-a', [
        {
          name: 'configure_diagnostic_ransomware',
          message: 'Successfully disabled',
          status: 'success',
        },
        { name: 'configure_malware', message: 'ok', status: 'success' },
      ]),
    ]);

    const result = await getPolicyResponseFailureEvents(esClient, { endpointIds: ['a'] });

    expect(result).toEqual([]);
  });

  it('returns only failure/warning actions from the latest doc per agent', async () => {
    const esClient = mockEsClient([
      bucket('a', 'Windows', 'doc-a', [
        { name: 'configure_malware', message: 'malware failed', status: 'failure' },
        { name: 'configure_ok', message: 'fine', status: 'success' },
        { name: 'configure_memory', message: 'memory warn', status: 'warning' },
      ]),
      bucket('b', 'Windows', 'doc-b', [
        { name: 'configure_malware', message: 'ok', status: 'success' },
      ]),
    ]);

    const result = await getPolicyResponseFailureEvents(esClient, { endpointIds: ['a', 'b'] });

    expect(result).toEqual([
      {
        _id: ['doc-a'],
        'agent.id': ['a'],
        'host.os.name': ['Windows'],
        'actions.name': ['configure_malware', 'configure_memory'],
        'actions.message': ['malware failed', 'memory warn'],
        'actions.status': ['failure', 'warning'],
      },
    ]);
  });

  it('falls back to "unknown" and still returns failures when host.os.name is absent', async () => {
    const esClient = mockEsClient([
      {
        key: 'a',
        doc_count: 1,
        latest_event: {
          hits: {
            hits: [
              {
                _id: 'doc-a',
                _source: {
                  agent: { id: 'a' },
                  Endpoint: {
                    policy: {
                      applied: {
                        actions: [
                          {
                            name: 'configure_malware',
                            message: 'malware failed',
                            status: 'failure',
                          },
                        ],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    ]);

    const result = await getPolicyResponseFailureEvents(esClient, { endpointIds: ['a'] });

    expect(result).toEqual([
      {
        _id: ['doc-a'],
        'agent.id': ['a'],
        'host.os.name': ['unknown'],
        'actions.name': ['configure_malware'],
        'actions.message': ['malware failed'],
        'actions.status': ['failure'],
      },
    ]);
  });

  it('returns an empty array when there are no aggregation buckets', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({}),
    } as unknown as ElasticsearchClient;

    const result = await getPolicyResponseFailureEvents(esClient, { endpointIds: ['a'] });

    expect(result).toEqual([]);
  });

  it('skips buckets with a malformed/partial _source instead of throwing', async () => {
    const esClient = mockEsClient([
      {
        key: 'a',
        doc_count: 1,
        latest_event: { hits: { hits: [{ _id: 'doc-a', _source: { agent: { id: 'a' } } }] } },
      },
      { key: 'b', doc_count: 0, latest_event: { hits: { hits: [] } } },
      bucket('c', 'Linux', 'doc-c', [
        { name: 'configure_malware', message: 'malware failed', status: 'failure' },
      ]),
    ]);

    const result = await getPolicyResponseFailureEvents(esClient, {
      endpointIds: ['a', 'b', 'c'],
    });

    expect(result).toEqual([
      {
        _id: ['doc-c'],
        'agent.id': ['c'],
        'host.os.name': ['Linux'],
        'actions.name': ['configure_malware'],
        'actions.message': ['malware failed'],
        'actions.status': ['failure'],
      },
    ]);
  });

  it('propagates the rejection when the Elasticsearch search fails', async () => {
    const esClient = {
      search: jest.fn().mockRejectedValue(new Error('search rejected')),
    } as unknown as ElasticsearchClient;

    await expect(getPolicyResponseFailureEvents(esClient, { endpointIds: ['a'] })).rejects.toThrow(
      'search rejected'
    );
  });
});
