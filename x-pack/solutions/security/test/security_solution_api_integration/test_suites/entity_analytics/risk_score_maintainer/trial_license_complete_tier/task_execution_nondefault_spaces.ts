/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllRules, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import {
  readRiskScores,
  waitForRiskScoresToBePresent,
  normalizeScores,
  EntityStoreUtils,
  entityMaintainerRouteHelpersFactory,
  cleanUpRiskScoreMaintainer,
  indexListOfDocumentsFactory,
  riskScoreMaintainerScenarioFactory,
  createAndSyncRuleAndAlertsFactory,
  setupMaintainerLogsDataStream,
  cleanupMaintainerLogsDataStream,
} from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const spaces = getService('spaces');

  describe('@ess Risk Score Maintainer in non-default space', () => {
    describe('with alerts in a non-default space', () => {
      const testLogsIndex = 'logs-testlogs-default';
      const testLogsTemplate = 'logs-testlogs-default-template';
      const namespace = uuidv4();

      const indexListOfDocuments = indexListOfDocumentsFactory({ es, log, index: testLogsIndex });
      const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({
        supertest,
        log,
        namespace,
        indices: [testLogsIndex],
      });
      const entityStoreUtils = EntityStoreUtils(getService, namespace);
      const maintainerRoutes = entityMaintainerRouteHelpersFactory(supertest, namespace);

      const maintainerScenario = riskScoreMaintainerScenarioFactory({
        indexListOfDocuments,
        createAndSyncRuleAndAlerts,
        entityStoreUtils,
        retry,
        routes: maintainerRoutes,
      });

      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
        await setupMaintainerLogsDataStream({
          es,
          index: testLogsIndex,
          template: testLogsTemplate,
        });
      });

      after(async () => {
        await cleanupMaintainerLogsDataStream({
          es,
          index: testLogsIndex,
          template: testLogsTemplate,
        });
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/ecs_compliant'
        );
      });

      beforeEach(async () => {
        // Clean stale state from any previous run (handles crashed/incomplete cleanup)
        await cleanUpRiskScoreMaintainer({ log, es, namespace });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);

        try {
          await spaces.delete(namespace);
        } catch {
          // Space may not exist on first run
        }
        await spaces.create({
          id: namespace,
          name: namespace,
          disabledFeatures: [],
        });

        const { documentIds } = await maintainerScenario.seedEntities(
          Array(10)
            .fill(0)
            .map((_, i) => ({ kind: 'host', hostName: `host-${i}` }))
        );

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 10,
          riskScore: 40,
        });

        await maintainerScenario.installAndRunMaintainer({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
      });

      afterEach(async () => {
        await cleanUpRiskScoreMaintainer({ log, es, namespace });
        await entityStoreUtils.cleanEngines();
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await spaces.delete(namespace);
      });

      it('calculates and persists risk scores for alert documents', async () => {
        const index = `risk-score.risk-score-${namespace}`;

        await waitForRiskScoresToBePresent({
          es,
          log,
          scoreCount: 10,
          index: [index],
        });

        const scores = await readRiskScores(es, [index]);
        const normalized = normalizeScores(scores);
        expect(normalized.length).to.eql(10);

        const idValues = normalized.map(({ id_value: idValue }) => idValue).sort();
        const expectedEuids = Array(10)
          .fill(0)
          .map((_, _index) => `host:host-${_index}`)
          .sort();
        expect(idValues).to.eql(expectedEuids);
      });
    });
  });
};
