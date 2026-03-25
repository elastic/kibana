/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';
import { assetCriticalityServiceMock } from '../asset_criticality/asset_criticality_service.mock';
import { privmonUserCrudServiceMock } from '../privilege_monitoring/users/privileged_users_crud.mock';

import { calculateAndPersistRiskScores } from './calculate_and_persist_risk_scores';
import { calculateScoresWithESQL } from './calculate_esql_risk_scores';
import { calculateScoresWithESQLMock } from './calculate_esql_risk_scores.mock';
import { riskScoreDataClientMock } from './risk_score_data_client.mock';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { ExperimentalFeatures } from '../../../../common';
import { EntityType } from '../../../../common/search_strategy';
import { EntityRiskLevelsEnum } from '../../../../common/api/entity_analytics/common';

jest.mock('./calculate_esql_risk_scores');

const calculateAndPersistRecentHostRiskScores = (
  esClient: ElasticsearchClient,
  logger: Logger,
  riskScoreDataClient: RiskScoreDataClient,
  idBasedRiskScoringEnabled = false,
  entityStoreCRUDClient?: EntityStoreCRUDClient
) => {
  return calculateAndPersistRiskScores({
    afterKeys: {},
    identifierType: EntityType.host,
    esClient,
    logger,
    index: 'index',
    pageSize: 500,
    spaceId: 'default',
    range: { start: 'now - 15d', end: 'now' },
    riskScoreDataClient,
    assetCriticalityService: assetCriticalityServiceMock.create(),
    privmonUserCrudService: privmonUserCrudServiceMock.create(),
    runtimeMappings: {},
    experimentalFeatures: {} as ExperimentalFeatures,
    idBasedRiskScoringEnabled,
    entityStoreCRUDClient,
  });
};

describe('calculateAndPersistRiskScores', () => {
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let riskScoreDataClient: RiskScoreDataClient;
  let mockUpsertEntitiesBulk: jest.Mock;
  let mockEntityStoreCRUDClient: EntityStoreCRUDClient;

  const calculate = (idBasedRiskScoringEnabled = false) =>
    calculateAndPersistRecentHostRiskScores(
      esClient,
      logger,
      riskScoreDataClient,
      idBasedRiskScoringEnabled,
      mockEntityStoreCRUDClient
    );

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    logger = loggingSystemMock.createLogger();
    riskScoreDataClient = riskScoreDataClientMock.create();
    mockUpsertEntitiesBulk = jest.fn().mockResolvedValue([]);
    mockEntityStoreCRUDClient = {
      upsertEntitiesBulk: mockUpsertEntitiesBulk,
    } as unknown as EntityStoreCRUDClient;
  });

  describe('with no risk scores to persist', () => {
    beforeEach(() => {
      (calculateScoresWithESQL as jest.Mock).mockResolvedValueOnce(
        calculateScoresWithESQLMock.buildResponse({ scores: { host: [] } })
      );
    });

    it('does not upgrade configurations', async () => {
      await calculate();

      expect(riskScoreDataClient.upgradeIfNeeded).not.toHaveBeenCalled();
    });

    it('returns an appropriate response', async () => {
      const results = await calculate();

      const entities = {
        host: [],
        user: [],
        service: [],
        generic: [],
      };
      expect(results).toEqual({ after_keys: {}, errors: [], scores_written: 0, entities });
    });
  });

  describe('with risk scores to persist', () => {
    beforeEach(() => {
      (calculateScoresWithESQL as jest.Mock).mockResolvedValueOnce(
        calculateScoresWithESQLMock.buildResponseWithOneScore()
      );
    });

    it('upgrades configurations when persisting risk scores', async () => {
      await calculate();

      expect(riskScoreDataClient.upgradeIfNeeded).toHaveBeenCalled();
    });

    it('does not call entity store when idBasedRiskScoringEnabled is false', async () => {
      await calculate(false);

      expect(mockUpsertEntitiesBulk).not.toHaveBeenCalled();
    });
  });

  describe('when idBasedRiskScoringEnabled is true', () => {
    it('does not call entity store when there are no scores to persist', async () => {
      (calculateScoresWithESQL as jest.Mock).mockResolvedValueOnce(
        calculateScoresWithESQLMock.buildResponse({ scores: { host: [] } })
      );

      await calculate(true);

      expect(mockUpsertEntitiesBulk).not.toHaveBeenCalled();
    });

    it('calls upsertEntitiesBulk with BulkObjects derived from scores', async () => {
      const hostScore = {
        '@timestamp': '2024-01-15T12:00:00Z',
        id_field: 'host.entity.id',
        id_value: 'host:abc123',
        calculated_level: EntityRiskLevelsEnum.High,
        calculated_score: 75,
        calculated_score_norm: 42,
        category_1_score: 50,
        category_1_count: 5,
        notes: [],
        inputs: [],
      };
      (calculateScoresWithESQL as jest.Mock).mockResolvedValueOnce(
        calculateScoresWithESQLMock.buildResponse({
          scores: { host: [hostScore], user: [], service: [], generic: [] },
        })
      );

      await calculate(true);

      expect(mockUpsertEntitiesBulk).toHaveBeenCalledTimes(1);
      const [{ objects: bulkObjects, force }] = mockUpsertEntitiesBulk.mock.calls[0];
      expect(bulkObjects).toHaveLength(1);
      expect(bulkObjects[0]).toEqual({
        type: EntityType.host,
        doc: {
          '@timestamp': hostScore['@timestamp'],
          host: {
            risk: {
              calculated_score: hostScore.calculated_score,
              calculated_score_norm: hostScore.calculated_score_norm,
              calculated_level: hostScore.calculated_level,
            },
          },
        },
      });
      expect(force).toBe(true);
    });

    it('includes identity source fields in V2 document when present on score', async () => {
      const hostScoreWithIdentity = {
        '@timestamp': '2024-01-15T12:00:00Z',
        id_field: 'host.entity.id',
        id_value: 'host:server1.example.com',
        calculated_level: EntityRiskLevelsEnum.High,
        calculated_score: 75,
        calculated_score_norm: 42,
        category_1_score: 50,
        category_1_count: 5,
        notes: [],
        inputs: [],
        euid_fields_raw:
          '{"host.domain":"example.com","host.entity.id":null,"host.hostname":"server1.example.com","host.id":null,"host.name":"server1"}',
      };
      (calculateScoresWithESQL as jest.Mock).mockResolvedValueOnce(
        calculateScoresWithESQLMock.buildResponse({
          scores: { host: [hostScoreWithIdentity], user: [], service: [], generic: [] },
        })
      );

      await calculate(true);

      const [{ objects: bulkObjects }] = mockUpsertEntitiesBulk.mock.calls[0];
      expect(bulkObjects).toHaveLength(1);
      const doc = bulkObjects[0].doc as Record<string, unknown>;
      expect(doc.host).toEqual(
        expect.objectContaining({
          name: 'server1',
          domain: 'example.com',
          hostname: 'server1.example.com',
        })
      );
      expect(doc.host).toEqual(
        expect.objectContaining({
          risk: {
            calculated_score: 75,
            calculated_score_norm: 42,
            calculated_level: 'High',
          },
        })
      );
    });
  });
});
