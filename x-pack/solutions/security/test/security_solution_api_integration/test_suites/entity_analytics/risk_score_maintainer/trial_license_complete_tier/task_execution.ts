/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllAlerts, deleteAllRules } from '@kbn/detections-response-ftr-services';
import {
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  normalizeScores,
  waitForRiskScoresToBePresent,
  waitForRiskScoreForId,
  EntityStoreUtils,
  entityMaintainerRouteHelpersFactory,
  cleanUpRiskScoreMaintainer,
  riskScoreMaintainerScenarioFactory,
  riskScoreMaintainerEntityBuilders,
  indexListOfDocumentsFactory,
  setupMaintainerLogsDataStream,
  cleanupMaintainerLogsDataStream,
} from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const retry = getService('retry');
  const testLogsIndex = 'logs-testlogs-default';
  const testLogsTemplate = 'logs-testlogs-default-template';
  const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({
    supertest,
    log,
    indices: [testLogsIndex],
  });
  const entityStoreUtils = EntityStoreUtils(getService);
  const maintainerRoutes = entityMaintainerRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Risk Score Maintainer Task Lifecycle', function () {
    this.tags(['esGate']);

    context('with maintainer test logs data', () => {
      const indexListOfDocuments = indexListOfDocumentsFactory({ es, log, index: testLogsIndex });
      const maintainerScenario = riskScoreMaintainerScenarioFactory({
        indexListOfDocuments,
        createAndSyncRuleAndAlerts,
        entityStoreUtils,
        retry,
        routes: maintainerRoutes,
      });

      before(async () => {
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
      });

      beforeEach(async () => {
        await es.deleteByQuery({
          index: testLogsIndex,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        });
        await entityStoreUtils.cleanEngines();
        await cleanUpRiskScoreMaintainer({ log, es });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      afterEach(async () => {
        await entityStoreUtils.cleanEngines();
        await cleanUpRiskScoreMaintainer({ log, es });
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
      });

      it('@skipInServerlessMKI resumes producing additional scores after stop and restart when triggered', async () => {
        const hostName = `host-lifecycle-${uuidv4().slice(0, 8)}`;
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName }),
        ]);
        const [host] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 1,
          riskScore: 40,
        });

        await maintainerScenario.installAndRunMaintainer({
          dataViewPattern: testLogsIndex,
          runMode: 'async',
        });
        await waitForRiskScoreForId({
          es,
          log,
          idValue: host.expectedEuid,
          expectedCalculatedScore: 40,
        });

        const preRestartScores = await readRiskScores(es);
        const preRestartCount = preRestartScores.length;

        // Wait for the maintainer to be fully idle before stopping it.
        // Stopping while taskStatus is still running can cause a Task Manager
        // version conflict and wedge the task document in serverless runs.
        await retry.waitForWithTimeout('maintainer to finish first run', 30_000, async () => {
          const response = await maintainerRoutes.getMaintainers(200, ['risk-score']);
          const maintainer = response.body.maintainers.find(
            (m: { id: string; runs: number; taskStatus: string }) => m.id === 'risk-score'
          );
          return (
            maintainer !== undefined &&
            maintainer.runs >= 1 &&
            maintainer.taskStatus.toLowerCase() !== 'running'
          );
        });

        await maintainerRoutes.stopMaintainer('risk-score');
        await maintainerRoutes.startMaintainer('risk-score');
        // Restart only re-enables scheduling, so use a sync trigger here to
        // verify the maintainer can resume deterministically after restart.
        await maintainerRoutes.runMaintainerSync('risk-score');

        await waitForRiskScoresToBePresent({ es, log, scoreCount: preRestartCount + 1 });
        const postRestartScores = await readRiskScores(es);
        expect(postRestartScores.length).to.be.greaterThan(preRestartCount);

        const normalized = normalizeScores(postRestartScores);
        const hostScores = normalized.filter((s) => s.id_value === host.expectedEuid);
        expect(hostScores.length).to.be.greaterThan(1);
      });
    });
  });
};
