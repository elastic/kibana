/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ensureLookupIndex, getLookupIndexName } from './lookup_index';
import type { CategorizedEntities, ScoredEntityPage } from '../steps/pipeline_types';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import {
  buildLookupSyncOperationsForPage,
  syncLookupIndex,
  syncLookupIndexForCategorizedPage,
} from './sync_lookup_index';

describe('lookup index utilities', () => {
  let esClient: ElasticsearchClient;
  const buildCategorized = (notInStoreEntityIds: string[]): CategorizedEntities => ({
    write_now: [],
    defer_to_phase_2: [],
    not_in_store: notInStoreEntityIds.map(
      (idValue) => ({ id_value: idValue } as EntityRiskScoreRecord)
    ),
  });

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    (esClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });
    (esClient.indices.exists as jest.Mock).mockResolvedValue(true);
  });

  it('creates lookup index with expected mapping when missing', async () => {
    (esClient.indices.exists as jest.Mock).mockResolvedValue(false);

    const index = await ensureLookupIndex({
      esClient,
      namespace: 'default',
    });

    expect(index).toBe('.entity_analytics.risk_score.lookup-default');
    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.entity_analytics.risk_score.lookup-default',
        settings: { 'index.mode': 'lookup' },
        mappings: {
          properties: {
            entity_id: { type: 'keyword' },
            resolution_target_id: { type: 'keyword' },
            propagation_target_id: { type: 'keyword' },
            relationship_type: { type: 'keyword' },
            '@timestamp': { type: 'date' },
          },
        },
      })
    );
  });

  it('ignores resource_already_exists_exception during concurrent create', async () => {
    (esClient.indices.exists as jest.Mock).mockResolvedValue(false);
    (esClient.indices.create as jest.Mock).mockRejectedValue(
      new Error('resource_already_exists_exception')
    );

    const index = await ensureLookupIndex({
      esClient,
      namespace: 'default',
    });

    expect(index).toBe('.entity_analytics.risk_score.lookup-default');
  });

  it('upserts lookup documents through bulk operations', async () => {
    await syncLookupIndex({
      esClient,
      index: getLookupIndexName('default'),
      upserts: [
        {
          entity_id: 'user:alias-1',
          resolution_target_id: 'user:target-1',
          propagation_target_id: null,
          relationship_type: 'entity.relationships.resolution.resolved_to',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
      deletes: [],
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: [
        {
          index: {
            _index: '.entity_analytics.risk_score.lookup-default',
            _id: 'user:alias-1',
          },
        },
        {
          entity_id: 'user:alias-1',
          resolution_target_id: 'user:target-1',
          propagation_target_id: null,
          relationship_type: 'entity.relationships.resolution.resolved_to',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
    });
  });

  it('deletes lookup documents through bulk operations', async () => {
    await syncLookupIndex({
      esClient,
      index: getLookupIndexName('default'),
      upserts: [],
      deletes: ['user:stale-1'],
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: [
        {
          delete: {
            _index: '.entity_analytics.risk_score.lookup-default',
            _id: 'user:stale-1',
          },
        },
      ],
    });
  });

  it('supports mixed upserts and deletes in one bulk call', async () => {
    await syncLookupIndex({
      esClient,
      index: getLookupIndexName('default'),
      upserts: [
        {
          entity_id: 'user:alias-2',
          resolution_target_id: 'user:target-2',
          propagation_target_id: null,
          relationship_type: 'entity.relationships.resolution.resolved_to',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
      deletes: ['user:stale-2'],
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: [
        {
          index: {
            _index: '.entity_analytics.risk_score.lookup-default',
            _id: 'user:alias-2',
          },
        },
        {
          entity_id: 'user:alias-2',
          resolution_target_id: 'user:target-2',
          propagation_target_id: null,
          relationship_type: 'entity.relationships.resolution.resolved_to',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
        {
          delete: {
            _index: '.entity_analytics.risk_score.lookup-default',
            _id: 'user:stale-2',
          },
        },
      ],
    });
  });

  it('builds page lookup sync operations from resolution relationships', () => {
    const page: ScoredEntityPage = {
      entityIds: ['user:alias-1'],
      scores: [],
      entities: new Map([
        [
          'user:alias-1',
          {
            entity: {
              id: 'user:alias-1',
              relationships: {
                resolution: { resolved_to: 'user:target-1' },
              },
            },
          },
        ],
      ]),
    };

    const operations = buildLookupSyncOperationsForPage({
      page,
      now: '2026-01-01T00:00:00.000Z',
      notInStoreEntityIds: ['user:stale-3'],
    });

    expect(operations).toEqual({
      upserts: [
        {
          entity_id: 'user:alias-1',
          resolution_target_id: 'user:target-1',
          propagation_target_id: null,
          relationship_type: 'entity.relationships.resolution.resolved_to',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
        {
          entity_id: 'user:target-1',
          resolution_target_id: 'user:target-1',
          propagation_target_id: null,
          relationship_type: 'self',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
      deletes: ['user:stale-3'],
    });
  });

  it('does not overwrite a resolution mapping with self mapping', () => {
    const page: ScoredEntityPage = {
      entityIds: ['user:a', 'user:b'],
      scores: [],
      entities: new Map([
        [
          'user:b',
          {
            entity: {
              id: 'user:b',
              relationships: {
                resolution: { resolved_to: 'user:c' },
              },
            },
          },
        ],
        [
          'user:a',
          {
            entity: {
              id: 'user:a',
              relationships: {
                resolution: { resolved_to: 'user:b' },
              },
            },
          },
        ],
      ]),
    };

    const operations = buildLookupSyncOperationsForPage({
      page,
      now: '2026-01-01T00:00:00.000Z',
      notInStoreEntityIds: [],
    });

    expect(operations.upserts).toEqual([
      {
        entity_id: 'user:b',
        resolution_target_id: 'user:c',
        propagation_target_id: null,
        relationship_type: 'entity.relationships.resolution.resolved_to',
        '@timestamp': '2026-01-01T00:00:00.000Z',
      },
      {
        entity_id: 'user:c',
        resolution_target_id: 'user:c',
        propagation_target_id: null,
        relationship_type: 'self',
        '@timestamp': '2026-01-01T00:00:00.000Z',
      },
      {
        entity_id: 'user:a',
        resolution_target_id: 'user:b',
        propagation_target_id: null,
        relationship_type: 'entity.relationships.resolution.resolved_to',
        '@timestamp': '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it.each([
    {
      title: 'adds self-rows for confirmed resolution targets without resolved_to',
      page: {
        entityIds: ['user:target-silent'],
        scores: [],
        entities: new Map([
          [
            'user:target-silent',
            {
              entity: {
                id: 'user:target-silent',
                relationships: {
                  resolution: {},
                },
              },
            },
          ],
        ]),
      } as ScoredEntityPage,
      resolutionTargetIds: ['user:target-silent'],
      expectedUpserts: [
        {
          entity_id: 'user:target-silent',
          resolution_target_id: 'user:target-silent',
          propagation_target_id: null,
          relationship_type: 'self',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    {
      title: 'does not overwrite existing alias rows when target ids are injected',
      page: {
        entityIds: ['user:b'],
        scores: [],
        entities: new Map([
          [
            'user:b',
            {
              entity: {
                id: 'user:b',
                relationships: {
                  resolution: { resolved_to: 'user:c' },
                },
              },
            },
          ],
        ]),
      } as ScoredEntityPage,
      resolutionTargetIds: ['user:b'],
      expectedUpserts: [
        {
          entity_id: 'user:b',
          resolution_target_id: 'user:c',
          propagation_target_id: null,
          relationship_type: 'entity.relationships.resolution.resolved_to',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
        {
          entity_id: 'user:c',
          resolution_target_id: 'user:c',
          propagation_target_id: null,
          relationship_type: 'self',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  ])('$title', ({ page, resolutionTargetIds, expectedUpserts }) => {
    const operations = buildLookupSyncOperationsForPage({
      page,
      now: '2026-01-01T00:00:00.000Z',
      notInStoreEntityIds: [],
      resolutionTargetIds,
    });

    expect(operations.upserts).toEqual(expectedUpserts);
  });

  it('syncs a scored page using one helper call', async () => {
    const page: ScoredEntityPage = {
      entityIds: ['user:alias-4'],
      scores: [],
      entities: new Map([
        [
          'user:alias-4',
          {
            entity: {
              id: 'user:alias-4',
              relationships: {
                resolution: { resolved_to: 'user:target-4' },
              },
            },
          },
        ],
      ]),
    };

    await syncLookupIndexForCategorizedPage({
      esClient,
      index: getLookupIndexName('default'),
      page,
      categorized: buildCategorized(['user:stale-4']),
      now: '2026-01-01T00:00:00.000Z',
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: [
        {
          index: {
            _index: '.entity_analytics.risk_score.lookup-default',
            _id: 'user:alias-4',
          },
        },
        {
          entity_id: 'user:alias-4',
          resolution_target_id: 'user:target-4',
          propagation_target_id: null,
          relationship_type: 'entity.relationships.resolution.resolved_to',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
        {
          index: {
            _index: '.entity_analytics.risk_score.lookup-default',
            _id: 'user:target-4',
          },
        },
        {
          entity_id: 'user:target-4',
          resolution_target_id: 'user:target-4',
          propagation_target_id: null,
          relationship_type: 'self',
          '@timestamp': '2026-01-01T00:00:00.000Z',
        },
        {
          delete: {
            _index: '.entity_analytics.risk_score.lookup-default',
            _id: 'user:stale-4',
          },
        },
      ],
    });
  });
});
