/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { buildCandidateQuery } from './build_candidate_query';
import { buildHuntInvestigationConversationId } from './hunt_investigation_id';

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

const searchBodyOf = (esClient: ElasticsearchClient) =>
  (esClient.search as jest.Mock).mock.calls[0][0];

describe('buildCandidateQuery', () => {
  it('returns empty ids when no reports exist', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
    });
    expect(result.ids).toHaveLength(0);
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
  });

  it('lifts the hunt-once gate for a manually named report', async () => {
    const esClient = buildMockEsClient([{ _id: 'rpt-abc' }], 1) as unknown as ElasticsearchClient;
    await buildCandidateQuery(esClient, logger, {
      trigger: 'manual',
      reportIds: ['rpt-abc'],
      spaceId: 'default',
    });
    expect(JSON.stringify(searchBodyOf(esClient).query)).not.toContain('last_hunted_at');
  });

  describe('the hunt-once gate', () => {
    // The report mapping is `dynamic: strict` and has no top-level `feedback`
    // field: hunt outcomes live in the per-space nested `evidence[]` array. A flat
    // `exists` on `feedback.last_hunted_at` therefore matches nothing, the
    // `must_not` always passes, and every sweep re-hunts the whole pool. These two
    // assertions are the regression guard for exactly that.
    it('excludes reports already hunted in this space via a nested evidence query', async () => {
      const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
      await buildCandidateQuery(esClient, logger, {
        trigger: 'scheduled',
        spaceId: 'hunt-a',
      });
      expect(searchBodyOf(esClient).query.bool.filter).toContainEqual({
        bool: {
          must_not: [
            {
              nested: {
                path: 'evidence',
                query: {
                  bool: {
                    filter: [
                      { term: { 'evidence.space_id': 'hunt-a' } },
                      { exists: { field: 'evidence.last_hunted_at' } },
                    ],
                  },
                },
              },
            },
          ],
        },
      });
    });

    it('never gates on the unmapped flat feedback field', async () => {
      const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
      await buildCandidateQuery(esClient, logger, {
        trigger: 'scheduled',
        spaceId: 'hunt-a',
      });
      expect(JSON.stringify(searchBodyOf(esClient).query)).not.toContain('feedback.last_hunted_at');
    });

    it('sorts corroborated_rank_score as a nested field scoped to this space', async () => {
      const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
      await buildCandidateQuery(esClient, logger, {
        trigger: 'scheduled',
        spaceId: 'hunt-a',
      });
      expect(searchBodyOf(esClient).sort[0]).toEqual({
        'evidence.corroborated_rank_score': {
          order: 'desc',
          missing: 0,
          nested: { path: 'evidence', filter: { term: { 'evidence.space_id': 'hunt-a' } } },
        },
      });
    });
  });

  describe('the open-proposal guard', () => {
    const hunted = 'rpt-open';
    const free = 'rpt-free';
    const readOpenProposals = async () => new Set([buildHuntInvestigationConversationId(hunted)]);

    it('drops a report whose Hunt Proposal is still open', async () => {
      const esClient = buildMockEsClient(
        [{ _id: hunted }, { _id: free }],
        2
      ) as unknown as ElasticsearchClient;
      const result = await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'scheduled', spaceId: 'default' },
        readOpenProposals
      );
      expect(result.ids).toEqual([free]);
    });

    it('reports the dropped report under skipped with reason open_proposal', async () => {
      const esClient = buildMockEsClient(
        [{ _id: hunted }, { _id: free }],
        2
      ) as unknown as ElasticsearchClient;
      const result = await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'scheduled', spaceId: 'default' },
        readOpenProposals
      );
      expect(result.skipped).toContainEqual({ id: hunted, reason: 'open_proposal' });
    });

    it('applies to a manually named report too, so replay cannot bypass a parked gate', async () => {
      const esClient = buildMockEsClient([{ _id: hunted }], 1) as unknown as ElasticsearchClient;
      const result = await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'manual', reportIds: [hunted], spaceId: 'default' },
        readOpenProposals
      );
      expect(result.ids).toEqual([]);
    });

    it('selects nothing when the proposal store cannot be read', async () => {
      // Failing open would re-hunt a report whose containment is parked at a gate.
      const esClient = buildMockEsClient([{ _id: free }], 1) as unknown as ElasticsearchClient;
      const result = await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'scheduled', spaceId: 'default' },
        async () => {
          throw new Error('proposals index unavailable');
        }
      );
      expect(result.ids).toEqual([]);
    });
  });

  it('reports a manually named report that matched nothing as not_found', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'manual',
      reportIds: ['rpt-missing'],
      spaceId: 'default',
    });
    expect(result.skipped).toContainEqual({ id: 'rpt-missing', reason: 'not_found' });
  });

  it('caps returned ids at 10 however many the caller asks for', async () => {
    const hits = Array.from({ length: 30 }, (_, i) => ({ _id: `rpt-${i}` }));
    const esClient = buildMockEsClient(hits, 30) as unknown as ElasticsearchClient;
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
      limit: 50,
    });
    expect(result.ids).toHaveLength(10);
  });

  it('over-fetches on the scheduled path so post-search exclusions still fill the page', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
      limit: 5,
    });
    expect(searchBodyOf(esClient).size).toBe(15);
  });

  it('asks for exactly the named ids on the manual path', async () => {
    const esClient = buildMockEsClient([], 0) as unknown as ElasticsearchClient;
    await buildCandidateQuery(esClient, logger, {
      trigger: 'manual',
      reportIds: ['a', 'b'],
      spaceId: 'default',
      limit: 5,
    });
    expect(searchBodyOf(esClient).size).toBe(5);
  });

  it('sets truncated when total exceeds what was returned', async () => {
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
