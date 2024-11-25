/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';

import { RISK_SCORE_ENTITY_CALCULATION_URL } from '@kbn/security-solution-plugin/common/constants';
import { v4 as uuidv4 } from 'uuid';
import { EntityRiskScoreRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics/common';
import { dataGeneratorFactory } from '../../../detections_response/utils';
import { deleteAllAlerts, deleteAllRules } from '../../../../../common/utils/security_solution';
import {
  buildDocument,
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  normalizeScores,
  waitForRiskScoresToBePresent,
  assetCriticalityRouteHelpersFactory,
  cleanAssetCriticality,
  waitForAssetCriticalityToBePresent,
  riskEngineRouteHelpersFactory,
  sanitizeScores,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });

  const calculateEntityRiskScores = async ({
    body,
  }: {
    body: object;
  }): Promise<{ score: EntityRiskScoreRecord; success: boolean }> => {
    const { body: result } = await supertest
      .post(RISK_SCORE_ENTITY_CALCULATION_URL)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .send(body)
      .expect(200);
    return result;
  };

  const createRuleAndWaitExecution = async (
    documentId: string,
    {
      alerts = 1,
      riskScore = 21,
      maxSignals = 100,
    }: { alerts?: number; riskScore?: number; maxSignals?: number } = {}
  ) => {
    await createAndSyncRuleAndAlerts({ query: `id: ${documentId}`, alerts, riskScore, maxSignals });
  };

  const calculateEntityRiskScore = async (identifier: string) => {
    return await calculateEntityRiskScores({
      body: {
        identifier_type: 'host',
        identifier,
      },
    });
  };

  describe('@ess @serverless @serverlessQA Risk Scoring Entity Calculation API', function () {
    this.tags(['esGate']);

    context('with auditbeat data', () => {
      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await riskEngineRoutes.cleanUp();
        await esArchiver.load('x-pack/test/functional/es_archives/security_solution/ecs_compliant');
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/security_solution/ecs_compliant'
        );
      });

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await riskEngineRoutes.cleanUp();
      });

      it('calculates and persists risk score for entity', async () => {
        const documentId = uuidv4();
        await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);
        await createRuleAndWaitExecution(documentId);
        await riskEngineRoutes.init();
        await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

        const results = await calculateEntityRiskScore('host-1');

        const expectedScore = {
          calculated_level: 'Unknown',
          calculated_score: 21,
          calculated_score_norm: 8.10060175898781,
          category_1_score: 8.10060175898781,
          category_1_count: 1,
          id_field: 'host.name',
          id_value: 'host-1',
        };

        const [score] = sanitizeScores([results.score]);

        expect(score).to.eql(expectedScore);
        expect(results.success).to.be(true);

        await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });
        const persistedScores = await readRiskScores(es);

        expect(persistedScores.length).to.greaterThan(1); // the risk score is calculated once by the risk engine and a second time by the API
        const [persistedScoreByApi, persistedScoreByEngine] = normalizeScores(persistedScores);

        expect(persistedScoreByApi).to.eql(expectedScore);
        expect(persistedScoreByApi).to.eql(persistedScoreByEngine);
      });

      describe('with asset criticality data', () => {
        const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

        beforeEach(async () => {
          await assetCriticalityRoutes.upsert({
            id_field: 'host.name',
            id_value: 'host-1',
            criticality_level: 'high_impact',
          });
        });

        afterEach(async () => {
          await cleanAssetCriticality({ log, es });
        });

        it('calculates and persists risk scores with additional criticality metadata and modifiers', async () => {
          const documentId = uuidv4();
          await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);
          await waitForAssetCriticalityToBePresent({ es, log });
          await createRuleAndWaitExecution(documentId);
          await riskEngineRoutes.init();
          await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

          const results = await calculateEntityRiskScore('host-1');

          const expectedScore = {
            criticality_level: 'high_impact',
            criticality_modifier: 1.5,
            calculated_level: 'Unknown',
            calculated_score: 21,
            calculated_score_norm: 11.677912063468526,
            category_1_score: 8.10060175898781,
            category_1_count: 1,
            id_field: 'host.name',
            id_value: 'host-1',
          };

          const [score] = sanitizeScores([results.score]);
          expect(results.success).to.be(true);
          expect(score).to.eql(expectedScore);

          await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });
          const persistedScores = await readRiskScores(es);

          expect(persistedScores.length).to.greaterThan(1); // the risk score is calculated once by the risk engine and a second time by the API
          const [persistedScoreByApi, persistedScoreByEngine] = normalizeScores(persistedScores);
          expect(persistedScoreByApi).to.eql(expectedScore);
          expect(persistedScoreByApi).to.eql(persistedScoreByEngine);

          const [rawScore] = persistedScores;

          expect(
            rawScore.host?.risk.category_1_score! + rawScore.host?.risk.category_2_score!
          ).to.be.within(
            persistedScoreByApi.calculated_score_norm! - 0.000000000000001,
            persistedScoreByApi.calculated_score_norm! + 0.000000000000001
          );
        });

        it('ignores deleted asset criticality when calculating and persisting risk scores with additional criticality metadata and modifiers', async () => {
          const documentId = uuidv4();
          await assetCriticalityRoutes.delete('host.name', 'host-1');
          await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);
          await waitForAssetCriticalityToBePresent({ es, log });
          await createRuleAndWaitExecution(documentId);
          await riskEngineRoutes.init();
          await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

          const results = await calculateEntityRiskScore('host-1');

          const expectedScore = {
            calculated_level: 'Unknown',
            calculated_score: 21,
            calculated_score_norm: 8.10060175898781,
            category_1_score: 8.10060175898781,
            category_1_count: 1,
            id_field: 'host.name',
            id_value: 'host-1',
          };

          const [score] = sanitizeScores([results.score]);
          expect(results.success).to.be(true);
          expect(score).to.eql(expectedScore);

          await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });
          const persistedScores = await readRiskScores(es);

          expect(persistedScores.length).to.greaterThan(1); // the risk score is calculated once by the risk engine and a second time by the API
          const [persistedScoreByApi, persistedScoreByEngine] = normalizeScores(persistedScores);
          expect(persistedScoreByApi).to.eql(expectedScore);
          expect(persistedScoreByApi).to.eql(persistedScoreByEngine);

          const [rawScore] = persistedScores;

          expect(
            rawScore.host?.risk.category_1_score! + rawScore.host?.risk.category_2_score!
          ).to.be.within(
            persistedScoreByApi.calculated_score_norm! - 0.000000000000001,
            persistedScoreByApi.calculated_score_norm! + 0.000000000000001
          );
        });
      });
    });
  });
};
