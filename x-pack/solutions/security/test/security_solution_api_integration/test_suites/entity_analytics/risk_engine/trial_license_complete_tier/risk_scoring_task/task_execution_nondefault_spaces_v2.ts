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
  assertRiskScoresPropagatedToEntityStore,
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

        const entities = await assertRiskScoresPropagatedToEntityStore({
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
    });
  });
};
