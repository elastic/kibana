/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllRules, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import { dataGeneratorFactory } from '../../../../detections_response/utils';
import {
  buildDocument,
  cleanupRiskEngineV2,
  createAndSyncRuleAndAlertsFactory,
  deleteAllRiskScores,
  readRiskScores,
  waitForRiskScoresToBePresent,
  normalizeScores,
  riskEngineRouteHelpersFactory,
  updateRiskEngineConfigSO,
  getRiskEngineTask,
  waitForRiskEngineTaskToBeGone,
  enableEntityStoreV2,
  disableEntityStoreV2,
  assetCriticalityRouteHelpersFactory,
  cleanAssetCriticality,
  waitForAssetCriticalityToBePresent,
  entityStoreV2RouteHelpersFactory,
  assertRiskScoresPropagatedToEntityStore,
  getEntityId,
  getEntityRisk,
  setupEntityStoreV2,
  teardownEntityStoreV2,
} from '../../../utils';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({ supertest, log });
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const entityStoreRoutes = entityStoreV2RouteHelpersFactory(supertest, es);

  describe('@ess @serverless @serverlessQA Risk Scoring Task Execution - V2 (id-based)', () => {
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
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      afterEach(async () => {
        await cleanupRiskEngineV2({ riskEngineRoutes, log, es });
      });

      after(async () => {
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      // Alerts and rules are created once and shared across tests in this block.
      // Tests must treat alerts as read-only; only risk engine state is reset between tests.
      describe('with some alerts containing hosts', () => {
        let documentId: string;

        before(async () => {
          documentId = uuidv4();
          await indexListOfDocuments(
            Array(10)
              .fill(0)
              .map((_, index) => buildDocument({ host: { name: `host-${index}` } }, documentId))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: 10,
            riskScore: 40,
          });
        });

        describe('initializing the risk engine', () => {
          beforeEach(async () => {
            await riskEngineRoutes.init();
          });

          it('@skipInServerlessMKI calculates and persists risk scores for alert documents and propagates to entity store', async () => {
            await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });

            const scores = await readRiskScores(es);
            const expectedIds = Array(10)
              .fill(0)
              .map((_, index) => `host:host-${index}`)
              .sort();

            expect(
              normalizeScores(scores)
                .map(({ id_value: idValue }) => idValue)
                .sort()
            ).to.eql(expectedIds);

            const expectedValues = normalizeScores(scores).reduce<Record<string, number>>(
              (acc, s) => {
                if (typeof s.id_value === 'string' && s.calculated_score_norm != null) {
                  acc[s.id_value] = s.calculated_score_norm;
                }
                return acc;
              },
              {}
            );

            const entities = await assertRiskScoresPropagatedToEntityStore({
              es,
              log,
              expectedValuesByEntityId: expectedValues,
              entityStoreRoutes,
              entityTypes: ['host'],
              expectedEntityCount: 10,
            });
            expect(entities.map((entity) => getEntityId(entity)).sort()).to.eql(expectedIds);

            entities.forEach((entity) => {
              const risk = getEntityRisk(entity);
              expect(risk).to.be.ok();
              expect(risk!.calculated_score_norm).to.be.greaterThan(0);
              expect(risk!.calculated_level).to.be.ok();
            });
          });

          describe('@skipInServerlessMKI disabling and re-enabling the risk engine', () => {
            beforeEach(async () => {
              await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
              await riskEngineRoutes.disable();
              await riskEngineRoutes.enable();
            });

            it('calculates another round of scores', async () => {
              await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });

              const scores = await readRiskScores(es);
              const expectedIds = Array(10)
                .fill(0)
                .map((_, index) => `host:host-${index}`);
              const actualIds = normalizeScores(scores).map(({ id_value: idValue }) => idValue);

              expect(actualIds.sort()).to.eql([...expectedIds, ...expectedIds].sort());
            });
          });

          describe('@skipInServerlessMKI disabling the risk engine', () => {
            beforeEach(async () => {
              await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
            });

            it('removes the risk scoring task', async () => {
              const task = await getRiskEngineTask({ es });
              expect(task).not.to.be(undefined);
              await riskEngineRoutes.disable();
              await waitForRiskEngineTaskToBeGone({ es, log });
              const disabledTask = await getRiskEngineTask({ es });

              expect(disabledTask).to.eql(undefined);
            });
          });

          describe('modifying configuration', () => {
            beforeEach(async () => {
              await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
              await riskEngineRoutes.disable();
            });

            describe('when task interval is modified', () => {
              beforeEach(async () => {
                await updateRiskEngineConfigSO({
                  attributes: {
                    interval: '1s',
                  },
                  kibanaServer,
                });
                await riskEngineRoutes.enable();
              });

              it('executes multiple times', async () => {
                await waitForRiskScoresToBePresent({ es, log, scoreCount: 30 });
                const riskScores = await readRiskScores(es);

                expect(riskScores.length).to.be.greaterThan(29);
              });
            });

            describe('when page size is smaller than the number of entities', () => {
              beforeEach(async () => {
                await updateRiskEngineConfigSO({
                  attributes: {
                    pageSize: 2,
                  },
                  kibanaServer,
                });
                await riskEngineRoutes.enable();
              });

              it('@skipInServerlessMKI pages through all entities via composite aggregation', async () => {
                await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });
                const scores = await readRiskScores(es);

                const expectedIds = Array(10)
                  .fill(0)
                  .map((_, index) => `host:host-${index}`);

                expect(
                  normalizeScores(scores)
                    .map(({ id_value: idValue }) => idValue)
                    .sort()
                ).to.eql([...expectedIds, ...expectedIds].sort());
              });
            });
          });
        });
      });

      describe('with some alerts containing hosts, users, and services', () => {
        let hostId: string;
        let userId: string;
        let serviceId: string;

        before(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);

          hostId = uuidv4();
          await indexListOfDocuments(
            Array(10)
              .fill(0)
              .map((_, index) => buildDocument({ host: { name: `host-${index}` } }, hostId))
          );

          userId = uuidv4();
          await indexListOfDocuments(
            Array(10)
              .fill(0)
              .map((_, index) => buildDocument({ user: { name: `user-${index}` } }, userId))
          );

          serviceId = uuidv4();
          await indexListOfDocuments(
            Array(10)
              .fill(0)
              .map((_, index) =>
                buildDocument({ service: { name: `service-${index}` } }, serviceId)
              )
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${userId} or id: ${hostId} or id: ${serviceId}`,
            alerts: 30,
            riskScore: 40,
          });
        });

        it('@skipInServerlessMKI calculates and persists risk scores for host, user, and service entities and propagates to entity store', async () => {
          await deleteAllRiskScores(log, es, undefined, true);
          await riskEngineRoutes.init();
          await waitForRiskScoresToBePresent({ es, log, scoreCount: 30 });
          const riskScores = await readRiskScores(es);

          expect(riskScores.length).to.be.greaterThan(0);
          const scoredIdentifiers = normalizeScores(riskScores).map(
            ({ id_field: idField }) => idField
          );
          expect(scoredIdentifiers).to.contain('entity.id');

          // Verify scores propagated to the entity store for both entity types
          const expectedValues = normalizeScores(riskScores).reduce<Record<string, number>>(
            (acc, s) => {
              if (typeof s.id_value === 'string' && s.calculated_score_norm != null) {
                acc[s.id_value] = s.calculated_score_norm;
              }
              return acc;
            },
            {}
          );

          const entities = await assertRiskScoresPropagatedToEntityStore({
            es,
            log,
            expectedValuesByEntityId: expectedValues,
            entityStoreRoutes,
            entityTypes: ['host', 'user', 'service'],
            expectedEntityCount: 30,
          });

          const hostEntities = entities.filter((entity) =>
            getEntityId(entity)?.startsWith('host:')
          );
          const userEntities = entities.filter((entity) =>
            getEntityId(entity)?.startsWith('user:')
          );
          const serviceEntities = entities.filter((entity) =>
            getEntityId(entity)?.startsWith('service:')
          );

          expect(hostEntities.length).to.eql(10);
          expect(userEntities.length).to.eql(10);
          expect(serviceEntities.length).to.eql(10);

          [...hostEntities, ...userEntities, ...serviceEntities].forEach((entity) => {
            const risk = getEntityRisk(entity);
            expect(risk).to.be.ok();
            expect(risk!.calculated_score_norm).to.be.greaterThan(0);
          });
        });

        // TODO: asset criticality currently does not work with entity store v2 unskip as part of https://github.com/elastic/security-team/issues/15904
        it.skip('@skipInServerless with asset criticality data', () => {
          const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

          beforeEach(async () => {
            await assetCriticalityRoutes.upsert({
              id_field: 'host.name',
              id_value: 'host-1',
              criticality_level: 'extreme_impact',
            });
          });

          afterEach(async () => {
            await cleanAssetCriticality({ log, es });
          });

          it('calculates risk scores with asset criticality data', async () => {
            await waitForAssetCriticalityToBePresent({ es, log });
            await riskEngineRoutes.init();
            await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });
            const riskScores = await readRiskScores(es);

            expect(riskScores.length).to.be.greaterThan(0);
            const assetCriticalityLevels = riskScores.map(
              (riskScore) => riskScore.host?.risk.criticality_level
            );
            const assetCriticalityModifiers = riskScores.map(
              (riskScore) => riskScore.host?.risk.criticality_modifier
            );

            expect(assetCriticalityLevels).to.contain('extreme_impact');
            expect(assetCriticalityModifiers).to.contain(2);

            const scoreWithCriticality = riskScores.find(
              (score) => score.host?.risk.id_value === 'host:host-1'
            );
            const normalized = normalizeScores([scoreWithCriticality!])[0];

            expect(normalized.id_field).to.eql('entity.id');
            expect(normalized.id_value).to.eql('host:host-1');
            expect(normalized.criticality_level).to.eql('extreme_impact');
            expect(normalized.criticality_modifier).to.eql(2);
            expect(normalized.calculated_level).to.eql('Moderate');
            expect(normalized.category_1_count).to.eql(10);
            expect(normalized.calculated_score).to.be.within(79.813459733, 79.813459734);
            expect(normalized.calculated_score_norm).to.be.within(47.0801624, 47.080162401);
            expect(normalized.category_1_score).to.be.within(30.787478681, 30.787478682);
          });

          it('filters out deleted asset criticality data when calculating score', async () => {
            await assetCriticalityRoutes.upsert({
              id_field: 'host.name',
              id_value: 'host-2',
              criticality_level: 'high_impact',
            });
            await assetCriticalityRoutes.delete('host.name', 'host-2');
            await waitForAssetCriticalityToBePresent({ es, log });
            await riskEngineRoutes.init();
            await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });
            const riskScores = await readRiskScores(es);

            expect(riskScores.length).to.be.greaterThan(0);
            const assetCriticalityLevels = riskScores.map(
              (riskScore) => riskScore.host?.risk.criticality_level
            );
            const assetCriticalityModifiers = riskScores.map(
              (riskScore) => riskScore.host?.risk.criticality_modifier
            );

            expect(assetCriticalityLevels).to.not.contain('deleted');
            expect(assetCriticalityModifiers).to.contain(2);

            const scoreWithCriticality = riskScores.find(
              (score) => score.host?.risk.id_value === 'host:host-2'
            );
            expect(normalizeScores([scoreWithCriticality!])[0].criticality_level).to.be(undefined);
          });
        });
      });

      describe('with alerts containing hosts with special-character IDs', () => {
        const specialHostNames = [
          'host-special"quote',
          'host-special\\slash',
          'host-special\t-tab',
        ];
        let documentId: string;

        before(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);

          documentId = uuidv4();
          await indexListOfDocuments(
            specialHostNames.map((name) => buildDocument({ host: { name } }, documentId))
          );

          await createAndSyncRuleAndAlerts({
            query: `id: ${documentId}`,
            alerts: specialHostNames.length,
            riskScore: 40,
          });
        });

        it('@skipInServerlessMKI calculates and persists host scores for special-character entity IDs', async () => {
          await deleteAllRiskScores(log, es, undefined, true);
          await riskEngineRoutes.init();
          await waitForRiskScoresToBePresent({ es, log, scoreCount: specialHostNames.length });

          const actualIds = normalizeScores(await readRiskScores(es))
            .map(({ id_value: idValue }) => idValue)
            .sort();
          const expectedIds = specialHostNames.map((name) => `host:${name}`).sort();

          expect(actualIds).to.eql(expectedIds);
        });
      });
    });
  });
};
