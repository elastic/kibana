/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { huntForThreat } from './hunt_for_threat';
import type { ResolvedIndexScope } from '../common/types';

const scope: ResolvedIndexScope = {
  technology: 'aws_iam',
  status: 'ok',
  required: ['logs-aws.*'],
  optional: ['logs-endpoint.events.*', '.alerts-security.alerts-default'],
  missing: [],
  window: { from: '2026-08-19T00:00:00.000Z', to: '2026-09-18T00:00:00.000Z' },
  rowLimit: 25,
};

const buildEsClient = (searchResponse: unknown): ElasticsearchClient =>
  ({
    search: jest.fn().mockResolvedValue(searchResponse),
  } as unknown as ElasticsearchClient);

const emptySearchResponse = {
  hits: { total: { value: 0 }, hits: [] },
  aggregations: {
    per_index: { buckets: [] },
    affected_hosts: { buckets: [] },
    affected_users: { buckets: [] },
  },
};

describe('huntForThreat', () => {
  it('returns no_searchable_terms without querying ES when no IOC/technique maps to an ECS field', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'hash', value: 'too-short-to-map' }],
    });

    expect(result.status).toBe('no_searchable_terms');
    expect(result.hasConfirmedHit).toBe(false);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('returns no_environment_hits when the search finds nothing', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.status).toBe('no_environment_hits');
    expect(result.hasConfirmedHit).toBe(false);
    expect(result.counts.totalHits).toBe(0);
  });

  it('sets hasConfirmedHit when a hit lands in a required index', async () => {
    const esClient = buildEsClient({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _index: 'logs-aws.cloudtrail-default',
            _id: 'abc',
            _score: 1.2,
            _source: { '@timestamp': '2026-09-01T00:00:00.000Z', 'source.ip': '10.0.0.1' },
          },
        ],
      },
      aggregations: {
        per_index: { buckets: [{ key: 'logs-aws.cloudtrail-default', doc_count: 1 }] },
        affected_hosts: { buckets: [] },
        affected_users: { buckets: [] },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.status).toBe('environment_hits_found');
    expect(result.hasConfirmedHit).toBe(true);
    expect(result.hits).toHaveLength(1);
  });

  it('does NOT set hasConfirmedHit when the only hit is in an optional index', async () => {
    const esClient = buildEsClient({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _index: 'logs-endpoint.events.process-default',
            _id: 'def',
            _score: 0.9,
            _source: { '@timestamp': '2026-09-01T00:00:00.000Z' },
          },
        ],
      },
      aggregations: {
        per_index: { buckets: [{ key: 'logs-endpoint.events.process-default', doc_count: 1 }] },
        affected_hosts: { buckets: [] },
        affected_users: { buckets: [] },
      },
    });

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
    });

    expect(result.status).toBe('environment_hits_found');
    expect(result.hasConfirmedHit).toBe(false);
  });

  it('searches both required and optional patterns together with ignore_unavailable', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    await huntForThreat(esClient, { scope, iocs: [{ type: 'ip', value: '10.0.0.1' }] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: [...scope.required, ...scope.optional],
        ignore_unavailable: true,
        allow_no_indices: true,
        size: scope.rowLimit,
      })
    );
  });

  it('honors a caller-supplied timeRange and size override', async () => {
    const esClient = buildEsClient(emptySearchResponse);
    const timeRange = { from: '2026-09-17T00:00:00.000Z', to: '2026-09-18T00:00:00.000Z' };

    const result = await huntForThreat(esClient, {
      scope,
      iocs: [{ type: 'ip', value: '10.0.0.1' }],
      timeRange,
      size: 100,
    });

    expect(result.timeRange).toEqual(timeRange);
    expect(esClient.search).toHaveBeenCalledWith(expect.objectContaining({ size: 100 }));
  });

  it('maps technique IDs to the threat.technique.id terms clause', async () => {
    const esClient = buildEsClient(emptySearchResponse);

    await huntForThreat(esClient, { scope, techniques: ['T1078'] });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([
              { terms: { 'kibana.alert.rule.threat.technique.id': ['T1078'] } },
            ]),
          }),
        }),
      })
    );
  });
});
