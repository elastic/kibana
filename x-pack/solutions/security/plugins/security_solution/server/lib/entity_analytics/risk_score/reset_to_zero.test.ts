/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { assetCriticalityServiceMock } from '../asset_criticality/asset_criticality_service.mock';
import { riskScoreDataClientMock } from './risk_score_data_client.mock';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { PrivmonUserCrudService } from '../privilege_monitoring/users/privileged_users_crud';
import { resetToZero } from './reset_to_zero';
import { EntityType } from '../../../../common/entity_analytics/types';
import { allowedExperimentalValues } from '../../../../common';
import { persistRiskScoresToEntityStore } from './persist_risk_scores_to_entity_store';

vi.mock('./persist_risk_scores_to_entity_store');

describe('resetToZero', () => {
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let dataClient: RiskScoreDataClient;
  let writerBulkMock: Mock;
  let privmonUserCrudService: Mocked<PrivmonUserCrudService>;
  let crudClient: Mocked<EntityStoreCRUDClient>;
  const experimentalFeatures = { ...allowedExperimentalValues };

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    logger = loggingSystemMock.createLogger();
    dataClient = riskScoreDataClientMock.create();
    writerBulkMock = vi.fn().mockResolvedValue({ errors: [], docs_written: 1 });
    (dataClient.getWriter as Mock).mockResolvedValue({ bulk: writerBulkMock });
    (persistRiskScoresToEntityStore as Mock).mockImplementation(
      async ({ scores }: { scores: Partial<Record<string, unknown[]>> }) => {
        const count = Object.values(scores).reduce(
          (sum, arr) => sum + ((arr as unknown[] | undefined)?.length ?? 0),
          0
        );
        return { docsWritten: count, unexpectedErrors: [] };
      }
    );
    privmonUserCrudService = {
      create: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    };
    crudClient = {
      createEntity: vi.fn(),
      updateEntity: vi.fn(),
      bulkUpdateEntity: vi.fn().mockResolvedValue([]),
      deleteEntity: vi.fn(),
      listEntities: vi.fn().mockResolvedValue({ entities: [], nextSearchAfter: undefined }),
    } as unknown as Mocked<EntityStoreCRUDClient>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses legacy id field and does not write to entity store when V2 is disabled', async () => {
    (esClient.esql.query as Mock).mockResolvedValue({
      values: [['host-a', 'host.name']],
    });

    const result = await resetToZero({
      esClient,
      dataClient,
      spaceId: 'default',
      entityType: EntityType.host,
      assetCriticalityService: assetCriticalityServiceMock.create(),
      privmonUserCrudService,
      experimentalFeatures,
      logger,
      excludedEntities: [],
      idBasedRiskScoringEnabled: false,
      refresh: 'wait_for',
    });

    expect(result).toEqual({ scoresWritten: 1 });
    expect(writerBulkMock).toHaveBeenCalledWith({
      host: [
        expect.objectContaining({
          id_field: 'host.name',
          id_value: 'host-a',
          calculated_score: 0,
          calculated_score_norm: 0,
        }),
      ],
      refresh: 'wait_for',
    });
    expect(persistRiskScoresToEntityStore).not.toHaveBeenCalled();
  });

  it('uses entity.id and writes zero scores to entity store when V2 is enabled', async () => {
    (esClient.esql.query as Mock).mockResolvedValue({
      values: [['host:abc123', null]],
    });

    await resetToZero({
      esClient,
      dataClient,
      spaceId: 'default',
      entityType: EntityType.host,
      assetCriticalityService: assetCriticalityServiceMock.create(),
      privmonUserCrudService,
      experimentalFeatures,
      logger,
      excludedEntities: ['host:do-not-reset'],
      idBasedRiskScoringEnabled: true,
      crudClient,
      refresh: 'wait_for',
    });

    expect(esClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          bool: { must_not: [{ terms: { 'entity.id': ['host:do-not-reset'] } }] },
        },
      })
    );

    expect(writerBulkMock).toHaveBeenCalledWith({
      host: [
        expect.objectContaining({
          id_field: 'entity.id',
          id_value: 'host:abc123',
          calculated_score: 0,
          calculated_score_norm: 0,
        }),
      ],
      refresh: 'wait_for',
    });
    expect(persistRiskScoresToEntityStore).toHaveBeenCalledWith({
      crudClient,
      logger,
      scores: {
        host: [
          expect.objectContaining({
            id_field: 'entity.id',
            id_value: 'host:abc123',
            calculated_score: 0,
            calculated_score_norm: 0,
          }),
        ],
      },
    });
  });

  it('ignores invalid id_value rows safely', async () => {
    (esClient.esql.query as Mock).mockResolvedValue({
      values: [
        [null, 'host.name'],
        ['', 'host.name'],
      ],
    });

    const result = await resetToZero({
      esClient,
      dataClient,
      spaceId: 'default',
      entityType: EntityType.host,
      assetCriticalityService: assetCriticalityServiceMock.create(),
      privmonUserCrudService,
      experimentalFeatures,
      logger,
      excludedEntities: [],
      idBasedRiskScoringEnabled: false,
    });

    expect(result).toEqual({ scoresWritten: 0 });
    expect(writerBulkMock).toHaveBeenCalledWith({ host: [], refresh: undefined });
  });
});
