/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { buildCandidateQuery } from './build_candidate_query';

const logger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
} as unknown as import('@kbn/core/server').Logger;

const buildMockEsClient = (
  hits: Array<{ _id: string }> = [],
  total = 0
): jest.Mocked<Pick<ElasticsearchClient, 'search'>> => ({
  search: jest.fn().mockResolvedValue({
    hits: {
      hits,
      total: { value: total, relation: 'eq' },
    },
  }),
});

describe('buildCandidateQuery', () => {
  it('returns empty ids when no reports exist', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
    });
    expect(result.ids).toHaveLength(0);
    expect(result.truncated).toBe(false);
  });

  it('returns ids for scheduled trigger (hunt-once gate)', async () => {
    const esClient = buildMockEsClient(
      [{ _id: 'rpt-1' }, { _id: 'rpt-2' }],
      2
    ) as unknown as ElasticsearchClient;
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
    });
    expect(result.ids).toEqual(['rpt-1', 'rpt-2']);
  });

  it('uses ids filter for manual trigger with explicit reportIds', async () => {
    const esClient = buildMockEsClient([{ _id: 'rpt-abc' }], 1) as unknown as ElasticsearchClient;
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'manual',
      reportIds: ['rpt-abc'],
      spaceId: 'default',
    });
    expect(result.ids).toContain('rpt-abc');
    const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
    // Manual bypass should include ids filter, not hunt-once gate
    expect(JSON.stringify(searchCall.query)).toContain('rpt-abc');
    expect(JSON.stringify(searchCall.query)).not.toContain('last_hunted_at');
  });

  it('caps limit at 10', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
      limit: 50,
    });
    const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
    expect(searchCall.size).toBe(10);
  });

  it('sets truncated when total > returned', async () => {
    const esClient = buildMockEsClient(
      [{ _id: 'r1' }, { _id: 'r2' }],
      20
    ) as unknown as ElasticsearchClient;
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
      limit: 2,
    });
    expect(result.truncated).toBe(true);
  });
});
