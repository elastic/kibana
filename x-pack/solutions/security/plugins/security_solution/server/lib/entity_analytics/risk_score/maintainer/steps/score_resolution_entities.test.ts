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

  it('caps composite page size at 1000 when configured pageSize is larger', async () => {
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

  it('keeps composite page size unchanged when configured pageSize is smaller', async () => {
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
        pageSize: 100,
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
              size: 100,
            }),
          },
        },
      })
    );
  });

  it('builds an IN list with exactly 1000 IDs when page has 1000 buckets', async () => {
    const buckets = Array.from({ length: MAX_RESOLUTION_TARGETS_PER_PAGE }, (_, i) => ({
      key: { resolution_target_id: `user:target-${i}` },
    }));
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        by_resolution_target: {
          buckets,
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

    const query = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
    const inClause = query.match(/resolution_target_id IN \(([^)]*)\)/)?.[1] ?? '';
    const ids = inClause.split(',').map((id) => id.trim());
    expect(ids).toHaveLength(MAX_RESOLUTION_TARGETS_PER_PAGE);
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
});
