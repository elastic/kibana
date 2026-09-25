/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { buildCandidateQuery } from './build_candidate_query';
import { buildHuntInvestigationConversationId } from './hunt_investigation_id';

const logger = loggingSystemMock.createLogger();

const searchBodyOf = (esClient: ElasticsearchClient, page = 0) =>
  (esClient.search as jest.Mock).mock.calls[page][0];

/** Builds a minimal, fully-typed SearchResponse from just the hit ids the test cares about. */
const searchResponseOf = (ids: string[], total?: number): SearchResponse<unknown, unknown> => ({
  took: 0,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    hits: ids.map((id): SearchHit<unknown> => ({ _index: 'reports', _id: id })),
    total: { value: total ?? ids.length, relation: 'eq' },
  },
});

/**
 * Serves `pool` in rank order across pages, honouring both `size` and the id
 * exclusion the way Elasticsearch does, so a test that pages really pages.
 */
const servePool = (pool: string[]) => async (request: unknown) => {
  const { size, query } = request as {
    size: number;
    query: { bool: { must_not?: Array<{ ids: { values: string[] } }> } };
  };
  const excluded = new Set(query.bool.must_not?.[0]?.ids.values ?? []);
  const remaining = pool.filter((id) => !excluded.has(id));
  return searchResponseOf(remaining.slice(0, size), remaining.length);
};

describe('buildCandidateQuery', () => {
  it('returns empty ids when no reports exist', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf([]));
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
    });
    expect(result.ids).toHaveLength(0);
  });

  it('throws when the reports search fails so callers do not treat it as an empty pool', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockRejectedValue(new Error('index_not_found_exception'));
    await expect(
      buildCandidateQuery(esClient, logger, {
        trigger: 'scheduled',
        spaceId: 'default',
      })
    ).rejects.toThrow('index_not_found_exception');
  });

  it('does not ignore a missing reports index, so an outage cannot read as an empty pool', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf([]));

    await buildCandidateQuery(esClient, logger, { trigger: 'scheduled', spaceId: 'default' });

    expect(searchBodyOf(esClient).ignore_unavailable).toBe(false);
  });

  it('returns ids for scheduled trigger (hunt-once gate)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf(['rpt-1', 'rpt-2']));
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
    });
    expect(result.ids).toEqual(['rpt-1', 'rpt-2']);
  });

  it('uses ids filter for manual trigger with explicit report_ids', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf(['rpt-abc']));
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'manual',
      report_ids: ['rpt-abc'],
      spaceId: 'default',
    });
    expect(result.ids).toContain('rpt-abc');
  });

  describe('manually named ids', () => {
    it('searches every named id rather than only the first `limit` of them', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf(['rpt-a', 'rpt-b']));

      await buildCandidateQuery(esClient, logger, {
        trigger: 'manual',
        report_ids: ['rpt-a', 'rpt-b'],
        spaceId: 'default',
        limit: 1,
      });

      expect(searchBodyOf(esClient).size).toBe(2);
    });

    it('does not claim a named report is missing just because it fell outside `limit`', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      // Honours `size` the way Elasticsearch does, so asking for too few really
      // does hide the remaining ids from the `not_found` comparison below.
      esClient.search.mockImplementation(async (request) =>
        searchResponseOf(['rpt-a', 'rpt-b'].slice(0, (request as { size: number }).size), 2)
      );

      const result = await buildCandidateQuery(esClient, logger, {
        trigger: 'manual',
        report_ids: ['rpt-a', 'rpt-b'],
        spaceId: 'default',
        limit: 1,
      });

      expect(result.skipped).toEqual([]);
      expect(result.ids).toEqual(['rpt-a']);
      expect(result.truncated).toBe(true);
    });

    it('still reports a named id that genuinely matched nothing', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf(['rpt-a']));

      const result = await buildCandidateQuery(esClient, logger, {
        trigger: 'manual',
        report_ids: ['rpt-a', 'rpt-gone'],
        spaceId: 'default',
      });

      expect(result.skipped).toEqual([{ id: 'rpt-gone', reason: 'not_found' }]);
    });
  });

  it('lifts the hunt-once gate for a manually named report', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf(['rpt-abc']));
    await buildCandidateQuery(esClient, logger, {
      trigger: 'manual',
      report_ids: ['rpt-abc'],
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
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf([]));
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
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf([]));
      await buildCandidateQuery(esClient, logger, {
        trigger: 'scheduled',
        spaceId: 'hunt-a',
      });
      expect(JSON.stringify(searchBodyOf(esClient).query)).not.toContain('feedback.last_hunted_at');
    });

    it('sorts corroborated_rank_score as a nested field scoped to this space', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf([]));
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
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf([hunted, free]));
      const result = await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'scheduled', spaceId: 'default' },
        readOpenProposals
      );
      expect(result.ids).toEqual([free]);
    });

    it('reports the dropped report under skipped with reason open_proposal', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf([hunted, free]));
      const result = await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'scheduled', spaceId: 'default' },
        readOpenProposals
      );
      expect(result.skipped).toContainEqual({ id: hunted, reason: 'open_proposal' });
    });

    it('applies to a manually named report too, so replay cannot bypass a parked gate', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf([hunted]));
      const result = await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'manual', report_ids: [hunted], spaceId: 'default' },
        readOpenProposals
      );
      expect(result.ids).toEqual([]);
    });

    it('throws when the proposal store cannot be read so callers do not treat it as an empty pool', async () => {
      // Failing open would re-hunt a report whose containment is parked at a gate, and an
      // empty page would hide the broken store behind "nothing to hunt".
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue(searchResponseOf([free]));
      await expect(
        buildCandidateQuery(
          esClient,
          logger,
          { trigger: 'scheduled', spaceId: 'default' },
          async () => {
            throw new Error('proposals index unavailable');
          }
        )
      ).rejects.toThrow('proposals index unavailable');
    });
  });

  describe('paging past parked reports', () => {
    // The guard runs after the search, so a run of top-ranked reports with open
    // Proposals used to consume the whole first page and return nothing. Every
    // later sweep read the same page and returned nothing again, which put eligible
    // reports behind that run permanently out of reach.
    const parkedIds = (count: number) => Array.from({ length: count }, (_, i) => `rpt-parked-${i}`);
    const readOpenProposals = (parked: string[]) => async () =>
      new Set(parked.map((id) => buildHuntInvestigationConversationId(id)));

    it('selects reports ranked behind a full page of open Proposals', async () => {
      const parked = parkedIds(30);
      const free = Array.from({ length: 10 }, (_, i) => `rpt-free-${i}`);
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockImplementation(servePool([...parked, ...free]));

      const result = await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'scheduled', spaceId: 'default' },
        readOpenProposals(parked)
      );

      expect(result.ids).toEqual(free);
    });

    it('excludes the examined prefix by id rather than paging with `from`', async () => {
      // `corroborated_rank_score` and `rank_score` have no writer yet, so reports tie
      // at `missing: 0` and the sort is unstable between requests. `from` would let a
      // report come back twice or be stepped over; excluding by id cannot.
      const parked = parkedIds(30);
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockImplementation(servePool([...parked, 'rpt-free']));

      await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'scheduled', spaceId: 'default' },
        readOpenProposals(parked)
      );

      const secondPage = searchBodyOf(esClient, 1);
      expect(secondPage.query.bool.must_not).toEqual([{ ids: { values: parked } }]);
      expect(secondPage.from).toBeUndefined();
    });

    it('stops at the page cap and says so rather than reporting a quiet empty page', async () => {
      const cappedLogger = loggingSystemMock.createLogger();
      const parked = parkedIds(500);
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockImplementation(servePool(parked));

      const result = await buildCandidateQuery(
        esClient,
        cappedLogger,
        { trigger: 'scheduled', spaceId: 'default' },
        readOpenProposals(parked)
      );

      expect(esClient.search).toHaveBeenCalledTimes(5);
      expect(result.ids).toEqual([]);
      expect(result.truncated).toBe(true);
      expect(cappedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('stopped after 5 pages having examined 150 reports')
      );
    });

    it('does not report truncated when every report in the pool was examined', async () => {
      // Everything really does carry an open Proposal, so there is nothing further to
      // reach and the caller should not be told to come back for more.
      const quietLogger = loggingSystemMock.createLogger();
      const parked = parkedIds(40);
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockImplementation(servePool(parked));

      const result = await buildCandidateQuery(
        esClient,
        quietLogger,
        { trigger: 'scheduled', spaceId: 'default' },
        readOpenProposals(parked)
      );

      expect(result.skipped).toHaveLength(40);
      expect(result.truncated).toBe(false);
      expect(quietLogger.warn).not.toHaveBeenCalled();
    });

    it('does not page a manually named request, whose page already holds every named id', async () => {
      const parked = parkedIds(2);
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockImplementation(servePool(parked));

      await buildCandidateQuery(
        esClient,
        logger,
        { trigger: 'manual', report_ids: parked, spaceId: 'default', limit: 10 },
        readOpenProposals(parked)
      );

      expect(esClient.search).toHaveBeenCalledTimes(1);
    });
  });

  it('reports a manually named report that matched nothing as not_found', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf([]));
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'manual',
      report_ids: ['rpt-missing'],
      spaceId: 'default',
    });
    expect(result.skipped).toContainEqual({ id: 'rpt-missing', reason: 'not_found' });
  });

  it('caps returned ids at 10 however many the caller asks for', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `rpt-${i}`);
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf(ids, 30));
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
      limit: 50,
    });
    expect(result.ids).toHaveLength(10);
  });

  it('over-fetches on the scheduled path so post-search exclusions still fill the page', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf([]));
    await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
      limit: 5,
    });
    expect(searchBodyOf(esClient).size).toBe(15);
  });

  it('asks for exactly the named ids on the manual path', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf([]));
    await buildCandidateQuery(esClient, logger, {
      trigger: 'manual',
      report_ids: ['a', 'b'],
      spaceId: 'default',
      limit: 5,
    });
    expect(searchBodyOf(esClient).size).toBe(2);
  });

  it('sets truncated when total exceeds what was returned', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValue(searchResponseOf(['r1', 'r2'], 20));
    const result = await buildCandidateQuery(esClient, logger, {
      trigger: 'scheduled',
      spaceId: 'default',
      limit: 2,
    });
    expect(result.truncated).toBe(true);
  });
});
