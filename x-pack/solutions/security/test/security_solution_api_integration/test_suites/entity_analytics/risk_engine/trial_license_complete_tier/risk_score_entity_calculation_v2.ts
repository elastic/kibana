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
import type { EntityRiskScoreRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics/common';
import { deleteAllAlerts, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { dataGeneratorFactory } from '../../../detections_response/utils';
import {
  assertRiskScoresPropagatedToEntityStore,
  buildDocument,
  cleanupRiskEngineV2,
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  normalizeScores,
  waitForRiskScoresToBePresent,
  assetCriticalityRouteHelpersFactory,
  cleanAssetCriticality,
  waitForAssetCriticalityToBePresent,
  riskEngineRouteHelpersFactory,
  enableEntityStoreV2,
  disableEntityStoreV2,
  sanitizeScores,
  entityStoreV2RouteHelpersFactory,
  getEntityRisk,
  setupEntityStoreV2,
  teardownEntityStoreV2,
} from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const entityStoreRoutes = entityStoreV2RouteHelpersFactory(supertest, es);

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

  const calculateEntityRiskScore = async (
    identifier: string,
    identifierType: 'host' | 'service'
  ) => {
    return await calculateEntityRiskScores({
      body: {
        identifier_type: identifierType,
        identifier,
      },
    });
  };

  describe('@ess @serverless @serverlessQA Risk Scoring Entity Calculation API - V2 (id-based)', function () {
    this.tags(['esGate']);

    before(async () => {
      await setupEntityStoreV2({
        entityStoreRoutes,
        enableEntityStore: async () => enableEntityStoreV2(kibanaServer),
      });
    });

    after(async () => {
      await teardownEntityStoreV2({
        entityStoreRoutes,
        disableEntityStore: async () => disableEntityStoreV2(kibanaServer),
      });
    });

    context('with auditbeat data', () => {
      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });

      before(async () => {
        await cleanupRiskEngineV2({ riskEngineRoutes, log, es });
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await cleanupRiskEngineV2({ riskEngineRoutes, log, es });
      });

      it('calculates and persists risk score for entity and propagates to entity store', async () => {
        const documentId = uuidv4();
        await indexListOfDocuments([buildDocument({ host: { name: 'host-1' } }, documentId)]);
        await createRuleAndWaitExecution(documentId);
        await riskEngineRoutes.init();
        await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

        const results = await calculateEntityRiskScore('host-1', 'host');

        const expectedScore = {
          calculated_level: 'Unknown',
          calculated_score: 21,
          calculated_score_norm: 8.100601759,
          category_1_score: 8.100601759,
          category_1_count: 1,
          euid_fields: {
            'host.name': 'host-1',
          },
          id_field: 'entity.id',
          id_value: 'host:host-1',
          modifiers: [],
        };

        const [score] = sanitizeScores([results.score]);

        expect(score).to.eql(expectedScore);
        expect(results.success).to.be(true);

        await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });
        const persistedScores = await readRiskScores(es);

        expect(persistedScores.length).to.greaterThan(1);
        const [persistedScoreByApi, persistedScoreByEngine] = normalizeScores(persistedScores);

        expect(persistedScoreByApi).to.eql(expectedScore);
        expect(persistedScoreByApi).to.eql(persistedScoreByEngine);

        const entities = await assertRiskScoresPropagatedToEntityStore({
          es,
          log,
          expectedValuesByEntityId: { 'host:host-1': expectedScore.calculated_score_norm },
          entityStoreRoutes,
          entityTypes: ['host'],
          expectedEntityCount: 1,
        });
        const risk = getEntityRisk(entities[0]);
        expect(risk).to.be.ok();
        // Entity store has more precision than the API, so we need to round the values to 10 decimal places
        expect(Math.fround(risk!.calculated_score_norm!)).to.eql(
          Math.fround(expectedScore.calculated_score_norm)
        );
        expect(risk!.calculated_level).to.eql(expectedScore.calculated_level);
      });

      it('calculates and persists risk score for service entity and propagates to entity store', async () => {
        const documentId = uuidv4();
        await indexListOfDocuments([buildDocument({ service: { name: 'service-1' } }, documentId)]);
        await createRuleAndWaitExecution(documentId);
        await riskEngineRoutes.init();
        await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

        const results = await calculateEntityRiskScore('service-1', 'service');

        const expectedScore = {
          calculated_level: 'Unknown',
          calculated_score: 21,
          calculated_score_norm: 8.100601759,
          category_1_score: 8.100601759,
          category_1_count: 1,
          euid_fields: {
            'service.name': 'service-1',
          },
          id_field: 'entity.id',
          id_value: 'service:service-1',
          modifiers: [],
        };

        const [score] = sanitizeScores([results.score]);

        expect(score).to.eql(expectedScore);
        expect(results.success).to.be(true);

        await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });
        const persistedScores = await readRiskScores(es);
        const persistedServiceScores = normalizeScores(persistedScores).filter(
          (persistedScore) => persistedScore.id_value === 'service:service-1'
        );

        expect(persistedServiceScores.length).to.eql(2);
        expect(persistedServiceScores[0]).to.eql(expectedScore);
        expect(persistedServiceScores[1]).to.eql(expectedScore);

        const entities = await assertRiskScoresPropagatedToEntityStore({
          es,
          log,
          expectedValuesByEntityId: { 'service:service-1': expectedScore.calculated_score_norm },
          entityStoreRoutes,
          entityTypes: ['service'],
          expectedEntityCount: 1,
        });

        const risk = getEntityRisk(entities[0]);
        expect(risk).to.be.ok();
        expect(Math.fround(risk!.calculated_score_norm!)).to.eql(
          Math.fround(expectedScore.calculated_score_norm)
        );
        expect(risk!.calculated_level).to.eql(expectedScore.calculated_level);
      });

      // TODO: asset criticality currently does not work with entity store v2 unskip as part of https://github.com/elastic/security-team/issues/15904
      describe.skip('with asset criticality data', () => {
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

          const results = await calculateEntityRiskScore('host-1', 'host');

          const expectedScore = {
            criticality_level: 'high_impact',
            criticality_modifier: 1.5,
            calculated_level: 'Unknown',
            calculated_score: 21,
            calculated_score_norm: 11.6779120635,
            category_1_score: 8.100601759,
            category_1_count: 1,
            id_field: 'entity.id',
            id_value: 'host:host-1',
            euid_fields: {
              'host.name': 'host-1',
            },
            modifiers: [
              {
                type: 'asset_criticality',
                modifier_value: 1.5,
                metadata: {
                  criticality_level: 'high_impact',
                },
                contribution: 3.5773103045,
              },
            ],
          };

          const [score] = sanitizeScores([results.score]);
          expect(results.success).to.be(true);
          expect(score).to.eql(expectedScore);

          await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });
          const persistedScores = await readRiskScores(es);

          expect(persistedScores.length).to.greaterThan(1);
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

          const results = await calculateEntityRiskScore('host-1', 'host');

          const expectedScore = {
            calculated_level: 'Unknown',
            calculated_score: 21,
            calculated_score_norm: 8.100601759,
            category_1_score: 8.100601759,
            category_1_count: 1,
            id_field: 'entity.id',
            id_value: 'host:host-1',
            euid_fields: {
              'host.name': 'host-1',
            },
            modifiers: [],
          };

          const [score] = sanitizeScores([results.score]);
          expect(results.success).to.be(true);
          expect(score).to.eql(expectedScore);

          await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });
          const persistedScores = await readRiskScores(es);

          expect(persistedScores.length).to.greaterThan(1);
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
