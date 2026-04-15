/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import {
  calculateResolutionEntityScores,
  fetchResolutionGroupMemberIds,
} from './score_resolution_entities';
import type { ScopedLogger } from '../utils/with_log_context';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    warn: jest.fn(),
  } as unknown as ScopedLogger);

describe('score_resolution_entities', () => {
  it('returns an empty set when no resolution targets are provided', async () => {
    const crudClient = {
      listEntities: jest.fn(),
    } as unknown as EntityUpdateClient;
    const logger = buildLogger();

    const result = await fetchResolutionGroupMemberIds({
      crudClient,
      resolutionTargetIds: [],
      logger,
    });

    expect(result).toEqual(new Set());
    expect(crudClient.listEntities).not.toHaveBeenCalled();
  });

  it('returns an empty set and warns when entity-store query fails', async () => {
    const crudClient = {
      listEntities: jest.fn().mockRejectedValue(new Error('boom')),
    } as unknown as EntityUpdateClient;
    const logger = buildLogger();

    const result = await fetchResolutionGroupMemberIds({
      crudClient,
      resolutionTargetIds: ['user:target-1'],
      logger,
    });

    expect(result).toEqual(new Set());
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('merges watchlist modifiers from silent group members discovered via entity-store', async () => {
    const search = jest
      .fn()
      .mockResolvedValueOnce({
        aggregations: {
          by_resolution_target: {
            buckets: [{ key: { resolution_target_id: 'user:target-1' } }],
          },
        },
      })
      .mockResolvedValueOnce({
        aggregations: {
          by_resolution_target: {
            buckets: [],
          },
        },
      });
    const esqlQuery = jest.fn().mockResolvedValue({
      values: [[1, 50, JSON.stringify({ id: 'alert-1', risk_score: 50 }), [], 'user:target-1']],
    });

    const esClient = {
      search,
      esql: {
        query: esqlQuery,
      },
    } as unknown as ElasticsearchClient;

    const listEntities = jest.fn().mockImplementation(async ({ filter }) => {
      if (filter?.terms?.['entity.relationships.resolution.resolved_to']) {
        return {
          entities: [
            {
              entity: {
                id: 'user:alias-silent',
              },
            },
          ],
          nextSearchAfter: undefined,
        };
      }

      if (filter?.terms?.['entity.id']) {
        return {
          entities: [
            {
              entity: {
                id: 'user:target-1',
                attributes: {
                  watchlists: [],
                },
              },
              asset: {
                criticality: null,
              },
            },
            {
              entity: {
                id: 'user:alias-silent',
                attributes: {
                  watchlists: ['wl-silent'],
                },
                relationships: {
                  resolution: {
                    resolved_to: 'user:target-1',
                  },
                },
              },
              asset: {
                criticality: 'high_impact',
              },
            },
          ],
          nextSearchAfter: undefined,
        };
      }

      return { entities: [], nextSearchAfter: undefined };
    });
    const crudClient = {
      listEntities,
    } as unknown as EntityUpdateClient;
    const logger = buildLogger();
    const watchlistConfigs = new Map<string, WatchlistObject>([
      [
        'wl-silent',
        {
          id: 'wl-silent',
          name: 'departing',
          managed: false,
          riskModifier: 2,
        },
      ],
    ]);

    const generator = calculateResolutionEntityScores({
      esClient,
      crudClient,
      logger,
      entityType: EntityType.user,
      alertsIndex: '.alerts-test',
      lookupIndex: '.lookup-test',
      pageSize: 100,
      sampleSize: 100,
      now: '2026-01-01T00:00:00.000Z',
      calculationRunId: 'run-1',
      watchlistConfigs,
    });

    const firstPage = await generator.next();
    expect(firstPage.done).toBe(false);
    const firstResolutionScore = firstPage.value[0];
    expect(firstResolutionScore).toBeDefined();
    expect(
      firstResolutionScore.modifiers?.some(
        (modifier) => modifier.type === 'watchlist' && modifier.subtype === 'departing'
      )
    ).toBe(true);

    const secondPage = await generator.next();
    expect(secondPage.done).toBe(true);

    const fetchByIdsCall = listEntities.mock.calls.find(
      ([args]) => args.filter?.terms?.['entity.id'] !== undefined
    )?.[0];
    const requestedEntityIds = fetchByIdsCall?.filter?.terms?.['entity.id'] ?? [];
    expect(requestedEntityIds).toEqual(
      expect.arrayContaining(['user:target-1', 'user:alias-silent'])
    );
  });
});
