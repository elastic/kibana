/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { MAX_RESOLUTION_TARGETS_PER_PAGE } from '../../constants';
import {
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
});
