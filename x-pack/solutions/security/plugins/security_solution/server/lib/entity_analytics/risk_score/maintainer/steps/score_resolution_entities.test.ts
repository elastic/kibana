/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { MAX_RESOLUTION_TARGETS_PER_PAGE } from '../../constants';
import {
  buildZeroResolutionScores,
  calculateResolutionEntityScores,
  fetchResolutionGroupMemberIds,
} from './score_resolution_entities';
import type { ScopedLogger } from '../utils/with_log_context';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ScopedLogger);

const collectPages = async <T>(generator: AsyncGenerator<T>): Promise<T[]> => {
  const pages: T[] = [];
  for await (const page of generator) {
    pages.push(page);
  }
  return pages;
};

describe('score_resolution_entities', () => {
  let esClient: ElasticsearchClient;
  let crudClient: EntityUpdateClient;
  let logger: ScopedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    crudClient = { listEntities: jest.fn() } as unknown as EntityUpdateClient;
    logger = buildLogger();
    (esClient.esql.query as jest.Mock).mockResolvedValue({ values: [] });
  });

  it('caps composite page size at MAX_RESOLUTION_TARGETS_PER_PAGE when configured pageSize is larger', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        by_resolution_target: {
          buckets: [{ key: { resolution_target_id: 'user:target-1' } }],
        },
      },
    });

    await collectPages(
      calculateResolutionEntityScores({
        esClient,
        crudClient,
        logger,
        entityType: EntityType.user,
        alertsIndex: '.alerts-security.alerts-default',
        lookupIndex: '.entity_analytics.risk_score.lookup-default',
        pageSize: 10_000,
        sampleSize: 1000,
        now: '2026-01-01T00:00:00.000Z',
        calculationRunId: 'run-1',
        watchlistConfigs: new Map(),
        alertFilters: [],
      })
    );

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: {
          by_resolution_target: {
            composite: expect.objectContaining({
              size: MAX_RESOLUTION_TARGETS_PER_PAGE,
            }),
          },
        },
      })
    );
  });

  it('only pages through resolution targets of the entity type being scored', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: { by_resolution_target: { buckets: [] } },
    });

    await collectPages(
      calculateResolutionEntityScores({
        esClient,
        crudClient,
        logger,
        entityType: EntityType.user,
        alertsIndex: '.alerts-security.alerts-default',
        lookupIndex: '.entity_analytics.risk_score.lookup-default',
        pageSize: 10_000,
        sampleSize: 1000,
        now: '2026-01-01T00:00:00.000Z',
        calculationRunId: 'run-1',
        watchlistConfigs: new Map(),
        alertFilters: [],
      })
    );

    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([{ prefix: { resolution_target_id: 'user:' } }]),
          },
        },
      })
    );
  });

  it('applies the alert filters to the resolution scoring query', async () => {
    const alertFilters = [
      { range: { '@timestamp': { gte: 'now-30d', lt: 'now' } } },
      { bool: { must_not: { terms: { 'kibana.alert.workflow_status': ['closed'] } } } },
    ];
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        by_resolution_target: {
          buckets: [{ key: { resolution_target_id: 'user:target-1' } }],
        },
      },
    });

    await collectPages(
      calculateResolutionEntityScores({
        esClient,
        crudClient,
        logger,
        entityType: EntityType.user,
        alertsIndex: '.alerts-security.alerts-default',
        lookupIndex: '.entity_analytics.risk_score.lookup-default',
        pageSize: 10_000,
        sampleSize: 1000,
        now: '2026-01-01T00:00:00.000Z',
        calculationRunId: 'run-1',
        watchlistConfigs: new Map(),
        alertFilters,
      })
    );

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ filter: { bool: { filter: alertFilters } } }),
      expect.anything()
    );
  });

  it("scores each page of a full run by the range of targets it covers, from this run's lookup rows", async () => {
    (esClient.search as jest.Mock)
      .mockResolvedValueOnce({
        aggregations: {
          by_resolution_target: {
            buckets: [
              { key: { resolution_target_id: 'user:target-a' } },
              { key: { resolution_target_id: 'user:target-b' } },
            ],
            after_key: { resolution_target_id: 'user:target-b' },
          },
        },
      })
      .mockResolvedValueOnce({
        aggregations: {
          by_resolution_target: {
            buckets: [{ key: { resolution_target_id: 'user:target-c' } }],
          },
        },
      });

    await collectPages(
      calculateResolutionEntityScores({
        esClient,
        crudClient,
        logger,
        entityType: EntityType.user,
        alertsIndex: '.alerts-security.alerts-default',
        lookupIndex: '.entity_analytics.risk_score.lookup-default',
        pageSize: 10_000,
        sampleSize: 1000,
        now: '2026-01-01T00:00:00.000Z',
        calculationRunId: 'run-1',
        watchlistConfigs: new Map(),
        alertFilters: [],
      })
    );

    const queries = (esClient.esql.query as jest.Mock).mock.calls.map(([{ query }]) => query);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain(
      'WHERE calculation_run_id == "run-1" AND resolution_target_id <= "user:target-b"'
    );
    expect(queries[1]).toContain(
      'WHERE calculation_run_id == "run-1" AND resolution_target_id > "user:target-b" AND resolution_target_id <= "user:target-c"'
    );
  });

  it('keeps the explicit ID list when scoring requested targets only', async () => {
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        by_resolution_target: {
          buckets: [{ key: { resolution_target_id: 'user:target-1' } }],
        },
      },
    });

    await collectPages(
      calculateResolutionEntityScores({
        esClient,
        crudClient,
        logger,
        entityType: EntityType.user,
        alertsIndex: '.alerts-security.alerts-default',
        lookupIndex: '.entity_analytics.risk_score.lookup-default',
        pageSize: 10_000,
        sampleSize: 1000,
        now: '2026-01-01T00:00:00.000Z',
        calculationRunId: 'run-1',
        watchlistConfigs: new Map(),
        alertFilters: [],
        targetEntityIds: ['user:target-1'],
      })
    );

    const [[{ query }]] = (esClient.esql.query as jest.Mock).mock.calls;
    expect(query).toContain('WHERE resolution_target_id IN ("user:target-1")');
  });

  it('throws when member fetch receives more than the capped ids', async () => {
    await expect(
      fetchResolutionGroupMemberIds({
        esClient,
        logger,
        lookupIndex: '.entity_analytics.risk_score.lookup-default',
        resolutionTargetIds: Array.from(
          { length: MAX_RESOLUTION_TARGETS_PER_PAGE + 1 },
          (_, i) => `user:target-${i}`
        ),
      })
    ).rejects.toThrow('exceeding cap');
  });

  // Regression: a hit with entity_id === '' previously caused an infinite loop —
  // the truthy check on searchAfter folded '' to undefined for ES (returning
  // the same first page) while the loop termination kept treating '' as a
  // valid cursor. The fix swapped to a strict undefined check.
  it('terminates pagination when an entity_id is the empty string', async () => {
    let callCount = 0;
    (esClient.search as jest.Mock).mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return {
          hits: {
            hits: [
              { _source: { entity_id: '' }, sort: [''] },
              { _source: { entity_id: 'user:b' }, sort: ['user:b'] },
            ],
          },
        };
      }
      return { hits: { hits: [] } };
    });

    const memberIds = await fetchResolutionGroupMemberIds({
      esClient,
      logger,
      lookupIndex: '.entity_analytics.risk_score.lookup-default',
      resolutionTargetIds: ['user:target-1'],
    });

    // Two calls: page-1 (returns the two hits) + page-2 (empty, terminates).
    expect(callCount).toBe(2);
    expect(memberIds).toEqual(new Set(['', 'user:b']));

    // Page-2 must use the last sort value as cursor (here 'user:b'),
    // not undefined — verifying the strict undefined check is in place.
    const secondCall = (esClient.search as jest.Mock).mock.calls[1][0];
    expect(secondCall.search_after).toEqual(['user:b']);
  });

  describe('buildZeroResolutionScores', () => {
    const LOOKUP_INDEX = '.entity_analytics.risk_score.lookup-default';
    const TARGET_ID = 'user:alice@ad';
    const ALIAS_ID = 'user:alice@okta';

    const lookupMembers = (entityIds: string[]): SearchResponse => ({
      took: 0,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: entityIds.map((entityId) => ({
          _index: LOOKUP_INDEX,
          _id: entityId,
          _source: { entity_id: entityId },
          sort: [entityId],
        })),
      },
    });

    const targetWithResolutionScore = {
      entity: {
        id: TARGET_ID,
        relationships: { resolution: { risk: { calculated_score_norm: 55 } } },
      },
    };

    const build = () =>
      buildZeroResolutionScores({
        esClient,
        crudClient,
        logger,
        entityType: EntityType.user,
        lookupIndex: LOOKUP_INDEX,
        now: '2026-01-01T00:00:00.000Z',
        calculationRunId: 'run-1',
        watchlistConfigs: new Map([
          ['watchlist-alias', { name: 'contractors', managed: false, riskModifier: 1.5 }],
        ]),
        resolutionTargetIds: [TARGET_ID],
      });

    it('carries the criticality and watchlists that sit on an alias', async () => {
      jest
        .mocked(crudClient.listEntities)
        .mockResolvedValueOnce({ entities: [targetWithResolutionScore] })
        .mockResolvedValueOnce({
          entities: [
            { entity: { id: TARGET_ID }, asset: { criticality: 'low_impact' } },
            {
              entity: {
                id: ALIAS_ID,
                attributes: { watchlists: ['watchlist-alias'] },
                relationships: { resolution: { resolved_to: TARGET_ID } },
              },
              asset: { criticality: 'high_impact' },
            },
          ],
        });
      jest
        .mocked(esClient.search)
        .mockResolvedValueOnce(lookupMembers([ALIAS_ID]))
        .mockResolvedValueOnce(lookupMembers([]));

      const scores = await build();

      expect(scores).toEqual([
        expect.objectContaining({
          id_value: TARGET_ID,
          score_type: 'resolution',
          calculated_score_norm: 0,
          related_entities: [],
          modifiers: [
            expect.objectContaining({
              type: 'asset_criticality',
              metadata: { criticality_level: 'high_impact', contributor_euid: ALIAS_ID },
            }),
            expect.objectContaining({
              type: 'watchlist',
              metadata: { watchlist_id: 'watchlist-alias' },
            }),
          ],
        }),
      ]);
    });

    it('builds nothing for a target that has never had a resolution score', async () => {
      // A zero there would put a 0 on screen where there was nothing before.
      jest
        .mocked(crudClient.listEntities)
        .mockResolvedValueOnce({ entities: [{ entity: { id: TARGET_ID } }] });

      expect(await build()).toEqual([]);
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('builds nothing when the target cannot be loaded for its modifiers', async () => {
      // A zero without the group's modifiers is worse than leaving the previous score alone.
      jest
        .mocked(crudClient.listEntities)
        .mockResolvedValueOnce({ entities: [targetWithResolutionScore] })
        .mockRejectedValueOnce(new Error('entity store unavailable'));
      jest
        .mocked(esClient.search)
        .mockResolvedValueOnce(lookupMembers([ALIAS_ID]))
        .mockResolvedValueOnce(lookupMembers([]));

      expect(await build()).toEqual([]);
    });
  });
});
