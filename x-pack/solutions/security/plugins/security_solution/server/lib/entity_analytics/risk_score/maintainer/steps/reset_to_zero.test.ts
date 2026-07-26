/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import type { Entity } from '@kbn/entity-store/common';
import { resetToZero } from './reset_to_zero';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { persistRiskScoresToEntityStore } from '../../persist_risk_scores_to_entity_store';
import type { WatchlistObject } from '../../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';

jest.mock('../../persist_risk_scores_to_entity_store');

describe('resetToZero (maintainer)', () => {
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let writer: RiskEngineDataWriter;
  let writerBulkMock: jest.Mock;
  let crudClient: jest.Mocked<EntityStoreCRUDClient>;
  const emptyWatchlistConfigs = new Map<string, WatchlistObject>();
  const now = '2026-01-01T00:00:00.000Z';

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    logger = loggingSystemMock.createLogger();
    writerBulkMock = jest.fn().mockResolvedValue({ errors: [], docs_written: 1 });
    writer = { bulk: writerBulkMock } as unknown as RiskEngineDataWriter;
    (persistRiskScoresToEntityStore as jest.Mock).mockResolvedValue([]);
    (esClient.indices.exists as jest.Mock).mockResolvedValue(true);
    crudClient = {
      createEntity: jest.fn(),
      updateEntity: jest.fn(),
      bulkUpdateEntity: jest.fn().mockResolvedValue([]),
      deleteEntity: jest.fn(),
      listEntities: jest.fn().mockResolvedValue({ entities: [], nextSearchAfter: undefined }),
    } as unknown as jest.Mocked<EntityStoreCRUDClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('writes zero scores with entity.id identifier field', async () => {
    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        values: [['host:host-1', null]],
      })
      .mockResolvedValueOnce({
        values: [],
      });

    const result = await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.host,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs: emptyWatchlistConfigs,
    });

    expect(result).toEqual({ scoresWritten: 1, pagesProcessed: 0, resetBatchLimitHit: false });
    expect(writerBulkMock).toHaveBeenCalledWith({
      host: [
        expect.objectContaining({
          id_field: 'entity.id',
          id_value: 'host:host-1',
          calculation_run_id: 'run-id-1',
          calculated_score: 0,
          calculated_score_norm: 0,
        }),
      ],
    });
  });

  it('fetches entities from entity store for modifier application', async () => {
    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        values: [['host:host-1', null]],
      })
      .mockResolvedValueOnce({
        values: [],
      });
    (crudClient.listEntities as jest.Mock).mockResolvedValue({
      entities: [
        { entity: { id: 'host:host-1' }, asset: { criticality: 'high_impact' } } as Entity,
      ],
      nextSearchAfter: undefined,
    });

    const result = await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.host,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs: emptyWatchlistConfigs,
    });

    expect(crudClient.listEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { terms: { 'entity.id': ['host:host-1'] } },
      })
    );
    expect(result).toEqual({ scoresWritten: 1, pagesProcessed: 0, resetBatchLimitHit: false });

    expect(writerBulkMock).toHaveBeenCalledWith({
      host: [
        expect.objectContaining({
          id_value: 'host:host-1',
          calculated_score: 0,
          calculated_score_norm: 0,
          criticality_level: 'high_impact',
          criticality_modifier: expect.any(Number),
        }),
      ],
    });
  });

  it('applies watchlist modifiers from entity store documents', async () => {
    const watchlistId = 'watchlist-1';
    const watchlistConfigs = new Map<string, WatchlistObject>([
      [
        watchlistId,
        {
          id: watchlistId,
          name: 'test-watchlist',
          riskModifier: 2.0,
          description: 'Test',
        } as WatchlistObject,
      ],
    ]);

    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        values: [['user:user-1', null]],
      })
      .mockResolvedValueOnce({
        values: [],
      });
    (crudClient.listEntities as jest.Mock).mockResolvedValue({
      entities: [
        {
          entity: {
            id: 'user:user-1',
            attributes: { watchlists: [watchlistId] },
          },
        } as Entity,
      ],
      nextSearchAfter: undefined,
    });

    const result = await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.user,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs,
    });

    expect(result).toEqual({ scoresWritten: 1, pagesProcessed: 0, resetBatchLimitHit: false });
    expect(writerBulkMock).toHaveBeenCalledWith({
      user: [
        expect.objectContaining({
          id_value: 'user:user-1',
          calculated_score: 0,
          calculated_score_norm: 0,
        }),
      ],
    });
  });

  it('supports service entity reset-to-zero writes', async () => {
    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        values: [['service:svc-1', null]],
      })
      .mockResolvedValueOnce({
        values: [],
      });

    const result = await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.service,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs: emptyWatchlistConfigs,
    });

    expect(result).toEqual({ scoresWritten: 1, pagesProcessed: 0, resetBatchLimitHit: false });
    expect(writerBulkMock).toHaveBeenCalledWith({
      service: [
        expect.objectContaining({
          id_value: 'service:svc-1',
          calculated_score: 0,
          calculated_score_norm: 0,
        }),
      ],
    });
  });

  it('proceeds with empty entity map when entity fetch fails', async () => {
    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        values: [['host:host-1', null]],
      })
      .mockResolvedValueOnce({
        values: [],
      });
    (crudClient.listEntities as jest.Mock).mockRejectedValue(new Error('Entity store error'));

    const result = await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.host,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs: emptyWatchlistConfigs,
    });

    expect(result).toEqual({ scoresWritten: 1, pagesProcessed: 0, resetBatchLimitHit: false });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching entities for reset-to-zero')
    );
    expect(writerBulkMock).toHaveBeenCalledWith({
      host: [
        expect.objectContaining({
          id_value: 'host:host-1',
          calculated_score: 0,
          calculated_score_norm: 0,
        }),
      ],
    });
  });

  it('returns zero when no stale entities are found', async () => {
    (esClient.esql.query as jest.Mock).mockResolvedValue({
      values: [],
    });

    const result = await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.host,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs: emptyWatchlistConfigs,
    });

    expect(result).toEqual({ scoresWritten: 0, pagesProcessed: 0, resetBatchLimitHit: false });
    expect(writerBulkMock).not.toHaveBeenCalled();
  });

  it('returns zero when risk score index does not exist yet', async () => {
    (esClient.indices.exists as jest.Mock).mockResolvedValue(false);

    const result = await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.host,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs: emptyWatchlistConfigs,
    });

    expect(result).toEqual({ scoresWritten: 0, pagesProcessed: 0, resetBatchLimitHit: false });
    expect(esClient.esql.query).not.toHaveBeenCalled();
    expect(writerBulkMock).not.toHaveBeenCalled();
  });

  it('queries stale base docs by latest run id', async () => {
    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        values: [['host:host-2', null]],
      })
      .mockResolvedValueOnce({
        values: [],
      });

    await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.host,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs: emptyWatchlistConfigs,
    });

    const query = (esClient.esql.query as jest.Mock).mock.calls[0][0].query as string;
    expect(query).toContain('WHERE score_type IS NULL OR score_type == "base"');
    expect(query).toContain('score = LAST(score, @timestamp)');
    expect(query).toContain('WHERE calculation_run_id IS NULL OR calculation_run_id != "run-id-1"');
  });

  it('writes to entity store when idBasedRiskScoringEnabled is true', async () => {
    (esClient.esql.query as jest.Mock)
      .mockResolvedValueOnce({
        values: [['host:host-1', null]],
      })
      .mockResolvedValueOnce({
        values: [],
      });

    await resetToZero({
      esClient,
      writer,
      spaceId: 'default',
      entityType: EntityType.host,
      logger,
      idBasedRiskScoringEnabled: true,
      crudClient,
      calculationRunId: 'run-id-1',
      now,
      watchlistConfigs: emptyWatchlistConfigs,
    });

    expect(persistRiskScoresToEntityStore).toHaveBeenCalledWith({
      crudClient,
      logger,
      scores: {
        host: [
          expect.objectContaining({
            id_value: 'host:host-1',
            calculated_score: 0,
            calculated_score_norm: 0,
          }),
        ],
      },
    });
  });
});
