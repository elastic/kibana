/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { riskEngineConfigurationTypeName } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_engine/saved_object';
import { deleteAllRules, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import { dataGeneratorFactory } from '../../../../detections_response/utils';
import {
  assertRiskScoresWrittenToEntityStore,
  buildDocument,
  cleanupRiskEngineV2,
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  waitForRiskScoresToBePresent,
  normalizeScores,
  riskEngineRouteHelpersFactory,
  enableEntityStoreV2,
  disableEntityStoreV2,
  entityStoreV2RouteHelpersFactory,
  getEntityId,
  getEntityRisk,
  setupEntityStoreV2,
  teardownEntityStoreV2,
} from '../../../utils';
import type { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';

export default ({ getService }: FtrProviderContextWithSpaces): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  describe('@ess Risk Scoring Task in non-default space - V2 (id-based)', () => {
    describe('with alerts in a non-default space', () => {
      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });
      const namespace = uuidv4();
      const documentId = uuidv4();
      const index = [`risk-score.risk-score-${namespace}`];
      const createAndSyncRuleAndAlertsForOtherSpace = createAndSyncRuleAndAlertsFactory({
        supertest,
        log,
        namespace,
      });
      const riskEngineRoutesForNamespace = riskEngineRouteHelpersFactory(supertest, namespace);
      const entityStoreRoutesForNamespace = entityStoreV2RouteHelpersFactory(
        supertest,
        es,
        namespace
      );
      const updatePageSizeForNamespace = async (pageSize: number) => {
        await es.updateByQuery({
          index: '.kibana_security_solution_*',
          query: {
            bool: {
              must: [
                { term: { type: { value: riskEngineConfigurationTypeName } } },
                { term: { namespaces: { value: namespace } } },
              ],
            },
          },
          script: {
            source: 'ctx._source["risk-engine-configuration"].pageSize = params.pageSize',
            lang: 'painless',
            params: { pageSize },
          },
          conflicts: 'proceed',
          refresh: true,
        });
      };

      before(async () => {
        await cleanupRiskEngineV2({
          riskEngineRoutes: riskEngineRoutesForNamespace,
          log,
          es,
          namespace,
        });
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
        await Promise.all([deleteAllAlerts(supertest, log, es), deleteAllRules(supertest, log)]);

        await getService('spaces').create({
          id: namespace,
          name: namespace,
          disabledFeatures: [],
        });

        await setupEntityStoreV2({
          entityStoreRoutes: entityStoreRoutesForNamespace,
          enableEntityStore: async () => enableEntityStoreV2(kibanaServer, namespace),
        });

        await Promise.all([
          indexListOfDocuments(
            Array(10)
              .fill(0)
              .map((_, _index) => buildDocument({ host: { name: `host-${_index}` } }, documentId))
          ),
          createAndSyncRuleAndAlertsForOtherSpace({
            query: `id: ${documentId}`,
            alerts: 10,
            riskScore: 40,
          }),
        ]);

        await riskEngineRoutesForNamespace.init();
      });

      afterEach(async () => {
        await cleanupRiskEngineV2({
          riskEngineRoutes: riskEngineRoutesForNamespace,
          log,
          es,
          namespace,
        });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await teardownEntityStoreV2({
          entityStoreRoutes: entityStoreRoutesForNamespace,
          disableEntityStore: async () => disableEntityStoreV2(kibanaServer, namespace),
        });
        await getService('spaces').delete(namespace);
      });

      it('calculates and persists risk scores for alert documents and propagates to entity store', async () => {
        await waitForRiskScoresToBePresent({
          es,
          log,
          scoreCount: 10,
          index,
        });

        const scores = await readRiskScores(es, index);
        const expectedIds = Array(10)
          .fill(0)
          .map((_, _index) => `host:host-${_index}`)
          .sort();

        expect(
          normalizeScores(scores)
            .map(({ id_value: idValue }) => idValue)
            .sort()
        ).to.eql(expectedIds);

        const entities = await assertRiskScoresWrittenToEntityStore({
          es,
          log,
          expectedValuesByEntityId: normalizeScores(scores).reduce<Record<string, number>>(
            (acc, s) => {
              if (typeof s.id_value === 'string' && s.calculated_score_norm != null) {
                acc[s.id_value] = s.calculated_score_norm;
              }
              return acc;
            },
            {}
          ),
          entityStoreRoutes: entityStoreRoutesForNamespace,
          entityTypes: ['host'],
          expectedEntityCount: 10,
          namespace,
        });

        expect(entities.map((entity) => getEntityId(entity)).sort()).to.eql(expectedIds);

        entities.forEach((entity) => {
          const risk = getEntityRisk(entity);
          expect(risk).to.be.ok();
          expect(risk!.calculated_score_norm).to.be.greaterThan(0);
          expect(risk!.calculated_level).to.be.ok();
        });
      });

      describe('modifying configuration', () => {
        beforeEach(async () => {
          await waitForRiskScoresToBePresent({ es, log, scoreCount: 10, index });
          await riskEngineRoutesForNamespace.disable();
        });

        describe('when page size is smaller than the number of entities', () => {
          beforeEach(async () => {
            await updatePageSizeForNamespace(2);
            await riskEngineRoutesForNamespace.enable();
          });

          it('@skipInServerlessMKI pages through all entities via composite aggregation', async () => {
            await waitForRiskScoresToBePresent({ es, log, scoreCount: 20, index });
            const scores = await readRiskScores(es, index);

            const expectedIds = Array(10)
              .fill(0)
              .map((_, _index) => `host:host-${_index}`);

            expect(
              normalizeScores(scores)
                .map(({ id_value: idValue }) => idValue)
                .sort()
            ).to.eql([...expectedIds, ...expectedIds].sort());
          });
        });
      });
    });

    describe('with host, user, and service alerts in a non-default space', () => {
      const { indexListOfDocuments } = dataGeneratorFactory({
        es,
        index: 'ecs_compliant',
        log,
      });
      const namespace = uuidv4();
      const hostId = uuidv4();
      const userId = uuidv4();
      const serviceId = uuidv4();
      const index = [`risk-score.risk-score-${namespace}`];
      const createAndSyncRuleAndAlertsForOtherSpace = createAndSyncRuleAndAlertsFactory({
        supertest,
        log,
        namespace,
      });
      const riskEngineRoutesForNamespace = riskEngineRouteHelpersFactory(supertest, namespace);
      const entityStoreRoutesForNamespace = entityStoreV2RouteHelpersFactory(
        supertest,
        es,
        namespace
      );

      before(async () => {
        await cleanupRiskEngineV2({
          riskEngineRoutes: riskEngineRoutesForNamespace,
          log,
          es,
          namespace,
        });
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
        await Promise.all([deleteAllAlerts(supertest, log, es), deleteAllRules(supertest, log)]);

        await getService('spaces').create({
          id: namespace,
          name: namespace,
          disabledFeatures: [],
        });

        await setupEntityStoreV2({
          entityStoreRoutes: entityStoreRoutesForNamespace,
          enableEntityStore: async () => enableEntityStoreV2(kibanaServer, namespace),
        });

        await indexListOfDocuments(
          Array(10)
            .fill(0)
            .map((_, _index) => buildDocument({ host: { name: `host-${_index}` } }, hostId))
        );
        await indexListOfDocuments(
          Array(10)
            .fill(0)
            .map((_, _index) => buildDocument({ user: { name: `user-${_index}` } }, userId))
        );
        await indexListOfDocuments(
          Array(10)
            .fill(0)
            .map((_, _index) =>
              buildDocument({ service: { name: `service-${_index}` } }, serviceId)
            )
        );

        await createAndSyncRuleAndAlertsForOtherSpace({
          query: `id: ${userId} or id: ${hostId} or id: ${serviceId}`,
          alerts: 30,
          riskScore: 40,
        });

        await riskEngineRoutesForNamespace.init();
      });

      afterEach(async () => {
        await cleanupRiskEngineV2({
          riskEngineRoutes: riskEngineRoutesForNamespace,
          log,
          es,
          namespace,
        });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await teardownEntityStoreV2({
          entityStoreRoutes: entityStoreRoutesForNamespace,
          disableEntityStore: async () => disableEntityStoreV2(kibanaServer, namespace),
        });
        await getService('spaces').delete(namespace);
      });

      it('calculates and persists host, user, and service risk scores and propagates to entity store', async () => {
        await waitForRiskScoresToBePresent({
          es,
          log,
          scoreCount: 30,
          index,
        });

        const riskScores = await readRiskScores(es, index);
        expect(riskScores.length).to.be.greaterThan(0);

        const entities = await assertRiskScoresWrittenToEntityStore({
          es,
          log,
          expectedValuesByEntityId: normalizeScores(riskScores).reduce<Record<string, number>>(
            (acc, score) => {
              if (typeof score.id_value === 'string' && score.calculated_score_norm != null) {
                acc[score.id_value] = score.calculated_score_norm;
              }
              return acc;
            },
            {}
          ),
          entityStoreRoutes: entityStoreRoutesForNamespace,
          entityTypes: ['host', 'user', 'service'],
          expectedEntityCount: 30,
          namespace,
        });

        const hostEntities = entities.filter((entity) => getEntityId(entity)?.startsWith('host:'));
        const userEntities = entities.filter((entity) => getEntityId(entity)?.startsWith('user:'));
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
    });
  });
};
