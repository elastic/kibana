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
  waitForMaintainerRun,
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

  // FLAKY: https://github.com/elastic/kibana/issues/261469
  describe.skip('@ess @serverless @serverlessQA Risk Score Maintainer Task Lifecycle', function () {
    this.tags(['esGate']);

    context('with auditbeat data', () => {
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

      it('@skipInServerlessMKI produces additional scores after stop and restart', async () => {
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

        await maintainerScenario.installAndRunMaintainer({ dataViewPattern: testLogsIndex });
        await waitForRiskScoreForId({
          es,
          log,
          idValue: host.expectedEuid,
          expectedCalculatedScore: 40,
        });

        const preRestartScores = await readRiskScores(es);
        const preRestartCount = preRestartScores.length;

        await maintainerRoutes.stopMaintainer('risk-score');
        await maintainerRoutes.startMaintainer('risk-score');
        await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });

        await waitForRiskScoresToBePresent({ es, log, scoreCount: preRestartCount + 1 });
        const postRestartScores = await readRiskScores(es);
        expect(postRestartScores.length).to.be.greaterThan(preRestartCount);

        const normalized = normalizeScores(postRestartScores);
        const hostScores = normalized.filter((s) => s.id_value === host.expectedEuid);
        expect(hostScores.length).to.be.greaterThan(1);
      });

      it('@skipInServerlessMKI produces additional scores after manual trigger', async () => {
        const hostName = `host-manual-${uuidv4().slice(0, 8)}`;
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName }),
        ]);
        const [host] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 1,
          riskScore: 40,
        });

        await maintainerScenario.installAndRunMaintainer({ dataViewPattern: testLogsIndex });
        await waitForRiskScoreForId({
          es,
          log,
          idValue: host.expectedEuid,
          expectedCalculatedScore: 40,
        });

        const preManualScores = await readRiskScores(es);
        const preManualCount = preManualScores.length;

        await maintainerRoutes.runMaintainer('risk-score');
        await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });

        await waitForRiskScoresToBePresent({ es, log, scoreCount: preManualCount + 1 });
        const postManualScores = await readRiskScores(es);
        expect(postManualScores.length).to.be.greaterThan(preManualCount);
      });
    });
  });
};
