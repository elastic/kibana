/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { searchByAnchors } from './search_by_anchors';

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as unknown as import('@kbn/core/server').Logger;

const buildMockEsClient = (
  hits: Array<{ _id: string; _score?: number; _source?: Record<string, unknown> }> = [],
  total = 0
): jest.Mocked<Pick<ElasticsearchClient, 'search'>> => ({
  search: jest.fn().mockResolvedValue({
    hits: { hits, total: { value: total, relation: 'eq' } },
  }),
});

describe('searchByAnchors', () => {
  it('returns empty when no discriminating anchors', async () => {
    const esClient = buildMockEsClient() as unknown as ElasticsearchClient;
    const result = await searchByAnchors(esClient, logger, 'default', {
      anchors: {
        iocs: [{ type: 'domain', value: 'example.com' }], // noise domain
        ioc_set_hash: null,
        actors: [],
      },
    });
    expect(result.hits).toHaveLength(0);
    expect(result.anchor_summary.discriminating_anchor_count).toBe(0);
    expect(esClient.search as jest.Mock).not.toHaveBeenCalled();
  });

  it('queries when hash IOC is present', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    await searchByAnchors(esClient, logger, 'default', {
      anchors: {
        iocs: [
          {
            type: 'hash',
            value: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
          },
        ],
      },
    });
    expect(esClient.search as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('excludes self-match when source_report_id provided', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    await searchByAnchors(esClient, logger, 'default', {
      source_report_id: 'rpt-self',
      anchors: {
        actors: ['APT29'],
      },
    });
    const callArg = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(callArg.query)).toContain('rpt-self');
  });

  it('returns anchor_summary with correct counts', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    const result = await searchByAnchors(esClient, logger, 'default', {
      anchors: {
        iocs: [
          {
            type: 'hash',
            value: 'deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000001',
          },
          { type: 'ip', value: '10.0.0.1' },
        ],
        actors: ['APT28'],
      },
    });
    expect(result.anchor_summary.hash_ioc_count).toBe(1);
    expect(result.anchor_summary.network_ioc_count).toBe(1);
    expect(result.anchor_summary.actor_count).toBe(1);
    expect(result.anchor_summary.discriminating_anchor_count).toBe(2); // hash + actor
  });
});
