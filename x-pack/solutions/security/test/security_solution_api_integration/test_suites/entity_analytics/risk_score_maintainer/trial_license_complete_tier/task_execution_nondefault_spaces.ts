/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllRules, deleteAllAlerts } from '@kbn/detections-response-ftr-services';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import {
  readRiskScores,
  normalizeScores,
  EntityStoreUtils,
  entityMaintainerRouteHelpersFactory,
  cleanUpRiskScoreMaintainer,
  indexListOfDocumentsFactory,
  riskScoreMaintainerScenarioFactory,
  riskScoreMaintainerEntityBuilders,
  createAndSyncRuleAndAlertsFactory,
  setupMaintainerLogsDataStream,
  cleanupMaintainerLogsDataStream,
  waitForEntityStoreDoc,
  watchlistRouteHelpersFactory,
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
      });

      afterEach(async () => {
        await cleanUpRiskScoreMaintainer({ log, es, namespace });
        await entityStoreUtils.cleanEngines();
        await deleteAllAlerts(supertest, log, es);
        await deleteAllRules(supertest, log);
        await spaces.delete(namespace);
      });

      it('calculates and persists risk scores for alert documents', async () => {
        const suffix = uuidv4().slice(0, 8);
        const { documentIds, testEntities } = await maintainerScenario.seedEntities(
          Array(10)
            .fill(0)
            .map((_, i) =>
              riskScoreMaintainerEntityBuilders.host({ hostName: `host-${i}-${suffix}` })
            )
        );

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 10,
          riskScore: 40,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
          waitForEntities: false,
        });
        for (const entity of testEntities) {
          await waitForEntityStoreDoc({ es, retry, entityId: entity.expectedEuid, namespace });
        }
        await es.indices.refresh({ index: getEntitiesAlias(ENTITY_LATEST, namespace) });
        await maintainerRoutes.runMaintainerSync('risk-score');

        const index = `risk-score.risk-score-${namespace}`;
        const expectedEuids = testEntities.map((e) => e.expectedEuid).sort();

        await retry.waitForWithTimeout(
          `all 10 host scores present in namespace ${namespace}`,
          60_000,
          async () => {
            const scores = normalizeScores(await readRiskScores(es, [index]));
            const idValues = Array.from(
              new Set(scores.map(({ id_value: idValue }) => idValue).filter(Boolean))
            );
            return expectedEuids.every((euid) => idValues.includes(euid));
          }
        );

        const scores = await readRiskScores(es, [index]);
        const normalized = normalizeScores(scores);

        // Deduplicate: a sync run may overlap with a scheduled run, producing
        // duplicate score documents for the same entity in the same window.
        const idValues = Array.from(
          new Set(normalized.map(({ id_value: idValue }) => idValue).filter(Boolean))
        ).sort();
        expect(idValues).to.eql(expectedEuids);
      });

      it('applies the watchlist modifier of the space the maintainer runs in', async () => {
        const watchlistRoutes = watchlistRouteHelpersFactory(supertest, namespace);
        const watchlistName = `space-watchlist-${uuidv4().slice(0, 8)}`;
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName: `host-wl-${uuidv4().slice(0, 8)}` }),
        ]);
        const [host] = testEntities;
        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 1,
          riskScore: 30,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
          waitForEntities: false,
        });
        await waitForEntityStoreDoc({ es, retry, entityId: host.expectedEuid, namespace });

        const watchlistResponse = await watchlistRoutes.create({
          name: watchlistName,
          riskModifier: 1.5,
        });
        const watchlistId = watchlistResponse.body.id!;
        await maintainerScenario.setEntityWatchlists({
          testEntity: host,
          watchlistIds: [watchlistId],
        });
        await waitForEntityStoreDoc({
          es,
          retry,
          entityId: host.expectedEuid,
          requiredWatchlistId: watchlistId,
          namespace,
        });
        await es.indices.refresh({ index: getEntitiesAlias(ENTITY_LATEST, namespace) });
        await maintainerRoutes.runMaintainerSync('risk-score');

        const index = `risk-score.risk-score-${namespace}`;
        let modifiers: Array<Record<string, unknown>> = [];
        await retry.waitForWithTimeout(
          `risk score with the watchlist modifier for ${host.expectedEuid} in ${namespace}`,
          60_000,
          async () => {
            const rawScores = await readRiskScores(es, [index]);
            const doc = rawScores.find((score) => score.host?.risk?.id_value === host.expectedEuid);
            const docModifiers = (doc?.host?.risk?.modifiers ?? []) as Array<
              Record<string, unknown>
            >;
            if (!docModifiers.some(({ type }) => type === 'watchlist')) {
              return false;
            }
            modifiers = docModifiers;
            return true;
          }
        );

        const watchlistModifier = modifiers.find(({ type }) => type === 'watchlist');
        expect(watchlistModifier?.subtype).to.eql(watchlistName);
      });
    });
  });
};
