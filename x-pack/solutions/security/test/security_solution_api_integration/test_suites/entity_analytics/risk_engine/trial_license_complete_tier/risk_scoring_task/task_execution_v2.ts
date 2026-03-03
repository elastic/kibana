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
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  waitForRiskScoresToBePresent,
  normalizeScores,
  riskEngineRouteHelpersFactory,
  getRiskEngineTask,
  waitForRiskEngineTaskToBeGone,
  enableEntityStoreV2,
  disableEntityStoreV2,
  entityStoreV2RouteHelpersFactory,
  assertRiskScoresWrittenToEntityStore,
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

  // Smoke test in the default space.
  // For more complex tests, see task_execution_nondefault_spaces_v2.ts.
  describe('@ess @serverless @serverlessQA Risk Scoring Task Execution - V2 (id-based)', () => {
    const { indexListOfDocuments } = dataGeneratorFactory({
      es,
      index: 'ecs_compliant',
      log,
    });

    before(async () => {
      await setupEntityStoreV2({
        entityStoreRoutes,
        enableEntityStore: async () => enableEntityStoreV2(kibanaServer),
      });
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
      );
      await teardownEntityStoreV2({
        entityStoreRoutes,
        disableEntityStore: async () => disableEntityStoreV2(kibanaServer),
      });
    });

    let documentId: string;

    beforeEach(async () => {
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
      await riskEngineRoutes.init();
    });

    afterEach(async () => {
      await riskEngineRoutes.cleanUp();
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
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

      const expectedValues = normalizeScores(scores).reduce<Record<string, number>>((acc, s) => {
        if (typeof s.id_value === 'string' && s.calculated_score_norm != null) {
          acc[s.id_value] = s.calculated_score_norm;
        }
        return acc;
      }, {});

      const entities = await assertRiskScoresWrittenToEntityStore({
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

    it('@skipInServerlessMKI calculates another round of scores after disable and re-enable', async () => {
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });
      await riskEngineRoutes.disable();
      await riskEngineRoutes.enable();

      await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });

      const scores = await readRiskScores(es);
      const expectedIds = Array(10)
        .fill(0)
        .map((_, index) => `host:host-${index}`);
      const actualIds = normalizeScores(scores).map(({ id_value: idValue }) => idValue);

      expect(actualIds.sort()).to.eql([...expectedIds, ...expectedIds].sort());
    });

    it('@skipInServerlessMKI removes the risk scoring task on disable', async () => {
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });

      const task = await getRiskEngineTask({ es });
      expect(task).not.to.be(undefined);
      await riskEngineRoutes.disable();
      await waitForRiskEngineTaskToBeGone({ es, log });
      const disabledTask = await getRiskEngineTask({ es });

      expect(disabledTask).to.eql(undefined);
    });
  });
};
