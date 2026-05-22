/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { calculateScoresWithESQLV2 } from './calculate_scores_v2';
import { fetchEntitiesByIds } from '../maintainer/utils/fetch_entities_by_ids';
import { applyScoreModifiersFromEntities } from '../modifiers/apply_modifiers_from_entities';
import { fetchWatchlistConfigs } from '../maintainer/utils/fetch_watchlist_configs';

jest.mock('../maintainer/utils/fetch_entities_by_ids');
jest.mock('../modifiers/apply_modifiers_from_entities');
jest.mock('../maintainer/utils/fetch_watchlist_configs');

describe('calculateScoresWithESQLV2', () => {
  const esClient = {
    search: jest.fn(),
    esql: {
      query: jest.fn(),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
  const logger = {} as Logger;
  const crudClient = {} as EntityUpdateClient;
  const soClient = {} as SavedObjectsClientContract;

  beforeEach(() => {
    jest.resetAllMocks();

    (fetchWatchlistConfigs as jest.Mock).mockResolvedValue(new Map());
    (esClient.search as jest.Mock).mockResolvedValue({
      aggregations: {
        by_entity_id: {
          buckets: [{ key: { entity_id: 'host:known' } }, { key: { entity_id: 'host:missing' } }],
          after_key: undefined,
        },
      },
    });
    (esClient.esql.query as jest.Mock).mockResolvedValue({
      values: [
        [
          1,
          50,
          JSON.stringify({
            id: 'alert-known',
            index: '.alerts-security.alerts-default',
            risk_score: '50',
            contribution: '12',
            time: '2026-04-21T00:00:00.000Z',
            rule_name: 'Known alert',
          }),
          'host:known',
        ],
        [
          1,
          40,
          JSON.stringify({
            id: 'alert-missing',
            index: '.alerts-security.alerts-default',
            risk_score: '40',
            contribution: '8',
            time: '2026-04-21T00:00:00.000Z',
            rule_name: 'Missing alert',
          }),
          'host:missing',
        ],
      ],
    });
    (fetchEntitiesByIds as jest.Mock).mockResolvedValue(
      new Map([
        [
          'host:known',
          {
            entity: {
              id: 'host:known',
            },
          },
        ],
      ])
    );
    (applyScoreModifiersFromEntities as jest.Mock).mockImplementation(({ page }) =>
      page.scores.map((score: { entity_id: string }) => ({
        id_field: 'entity.id',
        id_value: score.entity_id,
      }))
    );
  });

  it('discards preview scores for entities missing from the entity store', async () => {
    const response = await calculateScoresWithESQLV2({
      afterKeys: {},
      identifierType: EntityType.host,
      index: 'test-index',
      pageSize: 100,
      range: { start: 'now-15d', end: 'now' },
      runtimeMappings: {},
      filter: undefined,
      weights: [],
      alertSampleSizePerShard: 100,
      excludeAlertStatuses: ['closed'],
      excludeAlertTags: [],
      filters: [],
      esClient,
      logger,
      crudClient,
      soClient,
      namespace: 'default',
    });

    expect(applyScoreModifiersFromEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        page: expect.objectContaining({
          scores: [expect.objectContaining({ entity_id: 'host:known' })],
        }),
      })
    );
    expect(response).toEqual({
      after_keys: {
        host: {},
      },
      scores: {
        host: [
          {
            id_field: 'entity.id',
            id_value: 'host:known',
          },
        ],
      },
    });
  });
});
