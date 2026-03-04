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
  assertRiskScoresWrittenToEntityStore,
  buildDocument,
  cleanupRiskEngineV2,
  createAndSyncRuleAndAlertsFactory,
  normalizeScores,
  readRiskScores,
  riskEngineRouteHelpersFactory,
  waitForRiskScoresToBePresent,
  waitForRiskEngineRun,
  enableEntityStoreV2,
  disableEntityStoreV2,
  entityStoreV2RouteHelpersFactory,
  getEntitiesById,
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
  const { indexListOfDocuments } = dataGeneratorFactory({
    es,
    index: 'ecs_compliant',
    log,
  });

  const deleteAlertsByField = async (field: string, values: string[]) => {
    await es.deleteByQuery({
      index: '.alerts-security.alerts-*',
      query: {
        bool: { filter: [{ terms: { [field]: values } }] },
      },
      refresh: true,
    });
  };

  describe('@ess @serverless @serverlessQA Risk Scoring Task Reset To Zero - V2 (id-based)', () => {
    before(async () => {
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
      await setupEntityStoreV2({
        entityStoreRoutes,
        enableEntityStore: async () => enableEntityStoreV2(kibanaServer),
      });
      await cleanupRiskEngineV2({ riskEngineRoutes, log, es });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    afterEach(async () => {
      await cleanupRiskEngineV2({ riskEngineRoutes, log, es });
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await teardownEntityStoreV2({
        entityStoreRoutes,
        disableEntityStore: async () => disableEntityStoreV2(kibanaServer),
      });
    });

    const runResetToZeroScenario = async ({
      entityType,
      field,
    }: {
      entityType: 'host' | 'user' | 'service';
      field: string;
    }) => {
      const deletedEntities = Array(5)
        .fill(0)
        .map((_, index) => `${entityType}-${index + 5}`);

      const allEntityNames = Array(10)
        .fill(0)
        .map((_, index) => `${entityType}-${index}`);

      const documentId = uuidv4();
      await indexListOfDocuments(
        allEntityNames.map((name) => buildDocument({ [entityType]: { name } }, documentId))
      );

      await createAndSyncRuleAndAlerts({
        query: `id: ${documentId}`,
        alerts: 10,
        riskScore: 40,
      });

      await riskEngineRoutes.init();
      await waitForRiskEngineRun({ log, supertest });
      await waitForRiskScoresToBePresent({ es, log, scoreCount: 10 });

      const initialScores = normalizeScores(await readRiskScores(es));
      expect(initialScores.length).to.eql(10);
      expect(initialScores.every((score) => (score.calculated_score_norm ?? 0) > 0)).to.eql(true);

      await deleteAlertsByField(field, deletedEntities);

      await riskEngineRoutes.scheduleNow();

      await waitForRiskScoresToBePresent({ es, log, scoreCount: 20 });

      const allScores = normalizeScores(await readRiskScores(es));

      const zeroScoreIds = allScores
        .filter((score) => score.calculated_score_norm === 0)
        .map((score) => score.id_value)
        .sort();

      expect(zeroScoreIds).to.eql(
        deletedEntities.map((entity) => `${entityType}:${entity}`).sort()
      );

      const nonZeroCountByEntity = allScores
        .filter((score) => (score.calculated_score_norm ?? 0) > 0)
        .reduce<Record<string, number>>((acc, score) => {
          const id = score.id_value;
          if (typeof id === 'string') {
            acc[id] = (acc[id] ?? 0) + 1;
          }
          return acc;
        }, {});

      const expectedNonZeroIds = Array(5)
        .fill(0)
        .map((_, index) => `${entityType}:${entityType}-${index}`);

      expectedNonZeroIds.forEach((id) => {
        expect(nonZeroCountByEntity[id]).to.eql(2);
      });

      const allEntityIds = Array(10)
        .fill(0)
        .map((_, index) => `${entityType}:${entityType}-${index}`);

      const expectedZeroValues = deletedEntities.reduce<Record<string, number>>((acc, entity) => {
        acc[`${entityType}:${entity}`] = 0;
        return acc;
      }, {});

      await assertRiskScoresWrittenToEntityStore({
        es,
        log,
        entityStoreRoutes,
        expectedValuesByEntityId: expectedZeroValues,
        entityTypes: [entityType],
      });

      const entities = await getEntitiesById({ es, entityIds: allEntityIds });
      expect(entities.length).to.eql(10);

      const riskByEntityId = entities.reduce<Record<string, number | undefined>>((acc, entity) => {
        const entityId = entity.entity?.id;
        if (typeof entityId === 'string') {
          acc[entityId] = getEntityRisk(entity)?.calculated_score_norm;
        }
        return acc;
      }, {});

      deletedEntities.forEach((entity) => {
        expect(riskByEntityId[`${entityType}:${entity}`]).to.eql(0);
      });

      expectedNonZeroIds.forEach((id) => {
        expect((riskByEntityId[id] ?? 0) > 0).to.eql(true);
      });
    };

    it('@skipInServerlessMKI resets host risk scores to zero for entities whose alerts were deleted and propagates to entity store', async () => {
      await runResetToZeroScenario({ entityType: 'host', field: 'host.name' });
    });

    it('@skipInServerlessMKI resets user risk scores to zero for entities whose alerts were deleted and propagates to entity store', async () => {
      await runResetToZeroScenario({ entityType: 'user', field: 'user.name' });
    });

    it('@skipInServerlessMKI resets service risk scores to zero for entities whose alerts were deleted and propagates to entity store', async () => {
      await runResetToZeroScenario({ entityType: 'service', field: 'service.name' });
    });
  });
};
