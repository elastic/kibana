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

  it('writes only the alias row for alias entities', async () => {
    // Targets that aren't themselves iterated have no lookup row; Phase 2
    // ES|QL recovers their target_id via COALESCE(resolution_target_id,
    // entity_id) after the LOOKUP JOIN.
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
      ],
    });
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

  it('skips bulk and still refreshes once for an empty entity store', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValueOnce({
      entities: [],
      nextSearchAfter: undefined,
    });

    await buildLookupIndex({
      esClient,
      crudClient,
      logger,
      lookupIndex: '.lookup-default',
      entityTypes: [EntityType.host],
      calculationRunId: RUN_ID,
      now: NOW,
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

  // Covers the bulk-summary path where ES reports `errors: true` but echoes
  // no `items`. We must charge the entire batch as failed under the catch-all
  // reason instead of silently treating the page as a no-op.
  it('charges all items as failed when bulk reports errors with no item details', async () => {
    (crudClient.listEntities as jest.Mock).mockResolvedValueOnce({
      entities: [{ entity: { id: 'host:1' } }, { entity: { id: 'host:2' } }],
      nextSearchAfter: undefined,
    });
    (esClient.bulk as jest.Mock).mockResolvedValueOnce({ errors: true, items: [] });

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
      'Phase 0 lookup build had 2 failed item(s) across 2 iterated entities; reasons: 2x unknown_bulk_error'
    );
  });
});
