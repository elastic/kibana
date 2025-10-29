/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { assetCriticalityServiceMock } from '../asset_criticality/asset_criticality_service.mock';

import { calculateAndPersistRiskScores } from './calculate_and_persist_risk_scores';
import { calculateRiskScores } from './calculate_risk_scores';
import { calculateRiskScoresMock } from './calculate_risk_scores.mock';
import { calculateScoresWithESQL } from './calculate_esql_risk_scores';
import { calculateScoresWithESQLMock } from './calculate_esql_risk_scores.mock';
import { riskScoreDataClientMock } from './risk_score_data_client.mock';
import type { RiskScoreDataClient } from './risk_score_data_client';
import type { ExperimentalFeatures } from '../../../../common';
import { EntityType } from '../../../../common/search_strategy';

jest.mock('./calculate_risk_scores');
jest.mock('./calculate_esql_risk_scores');

const calculateAndPersistRecentHostRiskScores = (
  esClient: ElasticsearchClient,
  logger: Logger,
  riskScoreDataClient: RiskScoreDataClient,
  esql: boolean = false
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
    runtimeMappings: {},
    experimentalFeatures: {
      disableESQLRiskScoring: !esql,
    } as ExperimentalFeatures,
  });
};

describe('calculateAndPersistRiskScores', () => {
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let riskScoreDataClient: RiskScoreDataClient;

  describe('scripted metric', () => {
    const calculate = () =>
      calculateAndPersistRecentHostRiskScores(esClient, logger, riskScoreDataClient, false);

    beforeEach(() => {
      esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      logger = loggingSystemMock.createLogger();
      riskScoreDataClient = riskScoreDataClientMock.create();
    });

    describe('with no risk scores to persist', () => {
      beforeEach(() => {
        (calculateRiskScores as jest.Mock).mockResolvedValueOnce(
          calculateRiskScoresMock.buildResponse({ scores: { host: [] } })
        );
      });

      it('does not upgrade configurations', async () => {
        await calculate();

        expect(riskScoreDataClient.upgradeIfNeeded).not.toHaveBeenCalled();
      });

      it('returns an appropriate response', async () => {
        const results = await calculate();

        const entities = {
          host: ['hostname'],
          user: [],
          service: [],
          generic: [],
        };
        expect(results).toEqual({ after_keys: {}, errors: [], scores_written: 0, entities });
      });
    });
    describe('with risk scores to persist', () => {
      beforeEach(() => {
        (calculateRiskScores as jest.Mock).mockResolvedValueOnce(
          calculateRiskScoresMock.buildResponseWithOneScore()
        );
      });
      it('upgrades configurations when persisting risk scores', async () => {
        await calculate();

        expect(riskScoreDataClient.upgradeIfNeeded).toHaveBeenCalled();
      });
    });
  });

  describe('ESQL', () => {
    const calculate = () =>
      calculateAndPersistRecentHostRiskScores(esClient, logger, riskScoreDataClient, true);
    beforeEach(() => {
      esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      logger = loggingSystemMock.createLogger();
      riskScoreDataClient = riskScoreDataClientMock.create();
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
          host: ['hostname'],
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
    });
  });
});
