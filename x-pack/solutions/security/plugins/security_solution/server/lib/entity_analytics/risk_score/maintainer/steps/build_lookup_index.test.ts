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
import { buildLookupIndex } from './build_lookup_index';
import type { ScopedLogger } from '../utils/with_log_context';

const NOW = '2026-01-01T00:00:00.000Z';
const RUN_ID = 'run-123';

const buildLogger = (): ScopedLogger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ScopedLogger);

describe('build_lookup_index', () => {
  let esClient: ElasticsearchClient;
  let crudClient: EntityUpdateClient;
  let logger: ScopedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    (esClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });
    (esClient.indices.refresh as jest.Mock).mockResolvedValue({});
    logger = buildLogger();
    crudClient = {
      listEntities: jest.fn(),
    } as unknown as EntityUpdateClient;
  });

  it('writes a self-row for a non-alias entity', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValueOnce({
      entities: [{ entity: { id: 'host:1' } }],
      nextSearchAfter: undefined,
    });

    const result = await buildLookupIndex({
      esClient,
      crudClient,
      logger,
      lookupIndex: '.lookup-default',
      entityTypes: [EntityType.host],
      calculationRunId: RUN_ID,
      now: NOW,
    });

    expect(result).toEqual({
      lookupRowsWritten: 1,
      entitiesIterated: 1,
      pagesProcessed: 1,
      bulkBatches: 1,
      lookupRowsFailed: 0,
    });
    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { terms: { 'entity.EngineMetadata.Type': [EntityType.host] } },
      })
    );
    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: [
        { index: { _index: '.lookup-default', _id: 'host:1' } },
        {
          entity_id: 'host:1',
          resolution_target_id: 'host:1',
          propagation_target_id: null,
          relationship_type: 'self',
          calculation_run_id: RUN_ID,
          '@timestamp': NOW,
        },
      ],
    });
  });

  it('writes alias and target self rows for alias entities', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValueOnce({
      entities: [
        {
          entity: {
            id: 'user:alias',
            relationships: { resolution: { resolved_to: 'user:target' } },
          },
        },
      ],
      nextSearchAfter: undefined,
    });

    await buildLookupIndex({
      esClient,
      crudClient,
      logger,
      lookupIndex: '.lookup-default',
      entityTypes: [EntityType.user],
      calculationRunId: RUN_ID,
      now: NOW,
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: [
        { index: { _index: '.lookup-default', _id: 'user:alias' } },
        {
          entity_id: 'user:alias',
          resolution_target_id: 'user:target',
          propagation_target_id: null,
          relationship_type: 'entity.relationships.resolution.resolved_to',
          calculation_run_id: RUN_ID,
          '@timestamp': NOW,
        },
        { index: { _index: '.lookup-default', _id: 'user:target' } },
        {
          entity_id: 'user:target',
          resolution_target_id: 'user:target',
          propagation_target_id: null,
          relationship_type: 'self',
          calculation_run_id: RUN_ID,
          '@timestamp': NOW,
        },
      ],
    });
  });

  it('preserves alias row over self-row during page deduplication', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValueOnce({
      entities: [
        { entity: { id: 'user:b' } },
        {
          entity: {
            id: 'user:a',
            relationships: { resolution: { resolved_to: 'user:b' } },
          },
        },
      ],
      nextSearchAfter: undefined,
    });

    await buildLookupIndex({
      esClient,
      crudClient,
      logger,
      lookupIndex: '.lookup-default',
      entityTypes: [EntityType.user],
      calculationRunId: RUN_ID,
      now: NOW,
    });

    const operations = (esClient.bulk as jest.Mock).mock.calls[0][0].operations;
    expect(operations).toEqual([
      { index: { _index: '.lookup-default', _id: 'user:b' } },
      expect.objectContaining({
        entity_id: 'user:b',
        resolution_target_id: 'user:b',
        relationship_type: 'self',
      }),
      { index: { _index: '.lookup-default', _id: 'user:a' } },
      expect.objectContaining({
        entity_id: 'user:a',
        resolution_target_id: 'user:b',
        relationship_type: 'entity.relationships.resolution.resolved_to',
      }),
    ]);
  });

  it('iterates through multiple pages with searchAfter', async () => {
    (crudClient.listEntities as jest.Mock)
      .mockResolvedValueOnce({
        entities: [{ entity: { id: 'host:1' } }],
        nextSearchAfter: ['cursor-1'],
      })
      .mockResolvedValueOnce({
        entities: [{ entity: { id: 'host:2' } }],
        nextSearchAfter: undefined,
      });

    const result = await buildLookupIndex({
      esClient,
      crudClient,
      logger,
      lookupIndex: '.lookup-default',
      entityTypes: [EntityType.host],
      calculationRunId: RUN_ID,
      now: NOW,
    });

    expect(result).toEqual({
      lookupRowsWritten: 2,
      entitiesIterated: 2,
      pagesProcessed: 2,
      bulkBatches: 2,
      lookupRowsFailed: 0,
    });
    expect(crudClient.listEntities).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ searchAfter: undefined })
    );
    expect(crudClient.listEntities).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ searchAfter: ['cursor-1'] })
    );
  });

  it('returns early when aborted between pages', async () => {
    const abortController = new AbortController();
    (crudClient.listEntities as jest.Mock).mockImplementationOnce(() => {
      abortController.abort();
      return Promise.resolve({
        entities: [{ entity: { id: 'host:1' } }],
        nextSearchAfter: ['cursor-1'],
      });
    });

    const result = await buildLookupIndex({
      esClient,
      crudClient,
      logger,
      lookupIndex: '.lookup-default',
      entityTypes: [EntityType.host],
      calculationRunId: RUN_ID,
      now: NOW,
      abortSignal: abortController.signal,
    });

    expect(result).toEqual({
      lookupRowsWritten: 1,
      entitiesIterated: 1,
      pagesProcessed: 1,
      bulkBatches: 1,
      lookupRowsFailed: 0,
    });
    expect(esClient.indices.refresh).not.toHaveBeenCalled();
  });

  it('returns zero counters for empty entity store and refreshes once', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValueOnce({
      entities: [],
      nextSearchAfter: undefined,
    });

    const result = await buildLookupIndex({
      esClient,
      crudClient,
      logger,
      lookupIndex: '.lookup-default',
      entityTypes: [EntityType.host],
      calculationRunId: RUN_ID,
      now: NOW,
    });

    expect(result).toEqual({
      lookupRowsWritten: 0,
      entitiesIterated: 0,
      pagesProcessed: 1,
      bulkBatches: 0,
      lookupRowsFailed: 0,
    });
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(esClient.indices.refresh).toHaveBeenCalledTimes(1);
  });

  it('accumulates mixed bulk failures across pages and throws once at the end', async () => {
    (crudClient.listEntities as jest.Mock)
      .mockResolvedValueOnce({
        entities: [{ entity: { id: 'host:1' } }, { entity: { id: 'host:2' } }],
        nextSearchAfter: ['cursor-1'],
      })
      .mockResolvedValueOnce({
        entities: [{ entity: { id: 'host:3' } }, { entity: { id: 'host:4' } }],
        nextSearchAfter: undefined,
      });
    (esClient.bulk as jest.Mock)
      .mockResolvedValueOnce({
        errors: true,
        items: [
          { index: { _id: 'host:1', status: 201 } },
          { index: { _id: 'host:2', status: 400, error: { reason: 'failed reason A' } } },
        ],
      })
      .mockResolvedValueOnce({
        errors: true,
        items: [
          { index: { _id: 'host:3', status: 201 } },
          { index: { _id: 'host:4', status: 409, error: { reason: 'failed reason B' } } },
        ],
      });

    await expect(
      buildLookupIndex({
        esClient,
        crudClient,
        logger,
        lookupIndex: '.lookup-default',
        entityTypes: [EntityType.host],
        calculationRunId: RUN_ID,
        now: NOW,
      })
    ).rejects.toThrow(
      'Phase 0 lookup build had 2 failed item(s) across 4 iterated entities; reasons: 1x failed reason A; 1x failed reason B'
    );
    expect(esClient.indices.refresh).not.toHaveBeenCalled();
  });

  it('aggregates duplicate failure reasons across pages', async () => {
    (crudClient.listEntities as jest.Mock)
      .mockResolvedValueOnce({
        entities: [{ entity: { id: 'host:1' } }],
        nextSearchAfter: ['cursor-1'],
      })
      .mockResolvedValueOnce({
        entities: [{ entity: { id: 'host:2' } }],
        nextSearchAfter: undefined,
      });
    (esClient.bulk as jest.Mock)
      .mockResolvedValueOnce({
        errors: true,
        items: [{ index: { _id: 'host:1', status: 400, error: { reason: 'same reason' } } }],
      })
      .mockResolvedValueOnce({
        errors: true,
        items: [{ index: { _id: 'host:2', status: 400, error: { reason: 'same reason' } } }],
      });

    await expect(
      buildLookupIndex({
        esClient,
        crudClient,
        logger,
        lookupIndex: '.lookup-default',
        entityTypes: [EntityType.host],
        calculationRunId: RUN_ID,
        now: NOW,
      })
    ).rejects.toThrow('2x same reason');
  });
});
