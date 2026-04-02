/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  assetCriticalityRouteHelpersFactory,
  cleanAssetCriticality,
  getAssetCriticalityEsDocument,
  watchlistRouteHelpersFactory,
  cleanUpWatchlists,
  riskScoreMaintainerScenarioFactory,
  riskScoreMaintainerEntityBuilders,
  findScoreForEntity,
  waitForEntityScoreResetToZero,
  waitForEntityStoreEntities,
  indexListOfDocumentsFactory,
  waitForEntityStoreDoc,
  readEntityStoreEntities,
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

  describe('@ess @serverless @serverlessQA Risk Score Maintainer Entity Calculation', function () {
    this.tags(['esGate']);

    context('with test log data', () => {
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

      it('calculates and persists risk score for a single host entity', async () => {
        const documentId = uuidv4();
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName: 'host-1', documentId }),
        ]);
        const [host] = testEntities;
        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 1,
          riskScore: 21,
        });
        await maintainerScenario.installAndRunMaintainer({ dataViewPattern: testLogsIndex });
        const score = await waitForRiskScoreForId({
          es,
          log,
          idValue: host.expectedEuid,
          expectedCalculatedScore: 21,
        });

        expect(score.calculated_level).to.eql('Unknown');
        expect(score.calculated_score).to.eql(21);
        expect(score.calculated_score_norm).to.be.within(8.1006017, 8.100602);
        expect(score.category_1_score).to.be.within(8.1006017, 8.100602);
        expect(score.category_1_count).to.eql(1);
        expect(score.id_value).to.eql(host.expectedEuid);
      });

      describe('risk score document structure', () => {
        const watchlistRoutes = watchlistRouteHelpersFactory(supertest);
        const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

        afterEach(async () => {
          await cleanAssetCriticality({ log, es });
          await cleanUpWatchlists(watchlistRoutes);
        });

        it('persists a complete base score document with expected shape', async () => {
          const hostName = `host-shape-${uuidv4().slice(0, 8)}`;
          const { documentIds, testEntities } = await maintainerScenario.seedEntities([
            riskScoreMaintainerEntityBuilders.host({ hostName }),
          ]);
          const [host] = testEntities;
          await maintainerScenario.createAlertsForDocumentIds({
            documentIds,
            alerts: 1,
            riskScore: 50,
          });

          await maintainerScenario.installAndRunMaintainer({ dataViewPattern: testLogsIndex });
          await waitForRiskScoresToBePresent({ es, log, scoreCount: 1 });

          const rawScores = await readRiskScores(es);
          const ecsDoc = rawScores.find((s) => s.host?.risk?.id_value === host.expectedEuid);
          expect(ecsDoc).to.not.be(undefined);

          expect(ecsDoc!['@timestamp']).to.be.a('string');
          expect(ecsDoc!.host?.name).to.be.a('string');
          expect(ecsDoc!.host?.risk).to.be.an('object');

          const risk = ecsDoc!.host!.risk!;

          expect(risk.id_field).to.eql('entity_id');
          expect(risk.id_value).to.eql(host.expectedEuid);
          expect(risk.score_type).to.eql('base');
          expect(risk.calculation_run_id).to.be.a('string');
          expect(risk.calculated_level).to.be.a('string');
          expect(risk.calculated_score).to.be.a('number');
          expect(risk.calculated_score_norm).to.be.a('number');
          expect(risk.calculated_score_norm).to.be.greaterThan(0);
          expect(risk.calculated_score_norm).to.be.lessThan(101);
          expect(risk.category_1_score).to.be.a('number');
          expect(risk.category_1_count).to.eql(1);
          expect(risk.notes).to.eql([]);

          expect(risk.category_2_score).to.eql(0);
          expect(risk.category_2_count).to.eql(0);
          expect(risk.criticality_level).to.be(undefined);
          expect(risk.criticality_modifier).to.be(undefined);

          expect(risk.modifiers).to.be.an('array');
          expect(risk.modifiers!.length).to.eql(0);

          expect(risk.inputs).to.be.an('array');
          expect(risk.inputs.length).to.eql(1);
          const input = risk.inputs[0];
          expect(input.id).to.be.a('string');
          expect(input.index).to.be.a('string');
          expect(input.description).to.match(/^Alert from Rule:/);
          expect(input.category).to.eql('category_1');
          expect(input.risk_score).to.be.a('number');
          expect(input.timestamp).to.be.a('string');
          expect(input.contribution_score).to.be.a('number');
        });

        it('persists modifier shape for asset criticality and watchlist', async () => {
          const hostName = `host-modshape-${uuidv4().slice(0, 8)}`;
          const { documentIds, testEntities } = await maintainerScenario.seedEntities([
            riskScoreMaintainerEntityBuilders.host({ hostName }),
          ]);
          const [host] = testEntities;
          await maintainerScenario.createAlertsForDocumentIds({
            documentIds,
            alerts: 1,
            riskScore: 30,
          });

          await assetCriticalityRoutes.upsert({
            id_field: 'host.name',
            id_value: hostName,
            criticality_level: 'high_impact',
          });

          await entityStoreUtils.installEntityStoreV2({
            entityTypes: ['user', 'host'],
            dataViewPattern: testLogsIndex,
          });
          await waitForEntityStoreEntities({ es, log, count: 1 });

          await maintainerScenario.setEntityCriticality({
            testEntity: host,
            criticalityLevel: 'high_impact',
          });
          await waitForEntityStoreDoc({
            es,
            retry,
            entityId: host.expectedEuid,
            requireCriticality: 'high_impact',
          });

          const wlResponse = await watchlistRoutes.create({
            name: 'shape-test-watchlist',
            riskModifier: 1.5,
          });
          if (wlResponse.status !== 200) {
            throw new Error(`Failed to create watchlist: ${JSON.stringify(wlResponse.body)}`);
          }
          const watchlistId = wlResponse.body.id!;
          await maintainerScenario.setEntityWatchlists({
            testEntity: host,
            watchlistIds: [watchlistId],
          });
          await waitForEntityStoreDoc({
            es,
            retry,
            entityId: host.expectedEuid,
            requireCriticality: 'high_impact',
            requiredWatchlistId: watchlistId,
          });

          await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });

          let risk: Record<string, unknown> = {};
          await retry.waitForWithTimeout(
            `risk score with both criticality and watchlist modifiers for ${host.expectedEuid}`,
            60_000,
            async () => {
              const rawScores = await readRiskScores(es);
              const ecsDoc = rawScores.find(
                (s) =>
                  s.host?.risk?.id_value === host.expectedEuid &&
                  Array.isArray(s.host?.risk?.modifiers) &&
                  s.host.risk.modifiers.length === 2
              );
              if (!ecsDoc) {
                return false;
              }
              risk = ecsDoc.host!.risk! as Record<string, unknown>;
              return true;
            }
          );

          expect(risk.criticality_level).to.eql('high_impact');
          expect(risk.criticality_modifier).to.be.a('number');
          expect(risk.criticality_modifier).to.be.greaterThan(0);
          expect(risk.category_2_score).to.be.a('number');
          expect(risk.category_2_count).to.eql(1);

          expect(risk.modifiers).to.be.an('array');
          expect((risk.modifiers as unknown[])!.length).to.eql(2);

          const critMod = (risk.modifiers as Array<Record<string, unknown>>)!.find(
            (m) => m.type === 'asset_criticality'
          );
          expect(critMod).to.not.be(undefined);
          expect(critMod!.modifier_value).to.be.a('number');
          expect(critMod!.modifier_value).to.be.greaterThan(0);
          expect(critMod!.contribution).to.be.a('number');
          expect((critMod!.metadata as Record<string, unknown>)?.criticality_level).to.eql(
            'high_impact'
          );

          const wlMod = (risk.modifiers as Array<Record<string, unknown>>)!.find(
            (m) => m.type === 'watchlist'
          );
          expect(wlMod).to.not.be(undefined);
          expect(wlMod!.subtype).to.eql('shape-test-watchlist');
          expect(wlMod!.modifier_value).to.be.a('number');
          expect(wlMod!.contribution).to.be.a('number');
          expect((wlMod!.metadata as Record<string, unknown>)?.watchlist_id).to.eql(watchlistId);
        });
      });

      it('calculates risk scores for hosts and users together', async () => {
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName: 'host-1' }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: 'user-1' }),
        ]);
        const [host, idpUser] = testEntities;
        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 2,
          riskScore: 21,
        });
        await maintainerScenario.installAndRunMaintainer({ dataViewPattern: testLogsIndex });
        await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });

        const scores = await readRiskScores(es);
        const normalized = normalizeScores(scores);
        const idValues = normalized.map(({ id_value: idValue }) => idValue).sort();

        expect(idValues).to.contain(host.expectedEuid);
        expect(idValues).to.contain(idpUser.expectedEuid);
      });

      it('calculates risk score for a local user EUID', async () => {
        const localHostId = `host-local-${uuidv4()}`;
        const localUserName = `local-user-${uuidv4()}`;
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.localUser({
            userName: localUserName,
            hostId: localHostId,
            hostName: `host-local-name-${uuidv4()}`,
          }),
        ]);
        const [localUser] = testEntities;
        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 1,
          riskScore: 21,
        });
        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreDoc({ es, retry, entityId: localUser.expectedEuid });
        await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });
        const score = await waitForRiskScoreForId({
          es,
          log,
          idValue: localUser.expectedEuid,
          expectedCalculatedScore: 21,
        });

        expect(score.id_value).to.eql(localUser.expectedEuid);
      });

      it('calculates and persists risk score for a service entity', async () => {
        const serviceName = `svc-${uuidv4().slice(0, 8)}`;
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.service({ serviceName }),
        ]);
        const [serviceEntity] = testEntities;
        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 1,
          riskScore: 21,
        });
        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host', 'service'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreDoc({ es, retry, entityId: serviceEntity.expectedEuid });
        await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });

        let ecsDoc: Awaited<ReturnType<typeof readRiskScores>>[number] | undefined;
        await retry.waitForWithTimeout(
          `risk score present for service entity ${serviceEntity.expectedEuid}`,
          60_000,
          async () => {
            const rawScores = await readRiskScores(es);
            ecsDoc = rawScores.find(
              (s) => s.service?.risk?.id_value === serviceEntity.expectedEuid
            );
            return ecsDoc !== undefined;
          }
        );
        expect(ecsDoc).to.not.be(undefined);
        expect(ecsDoc!.service?.name).to.be.a('string');
        expect(ecsDoc!.service?.risk?.score_type).to.eql('base');
        expect(ecsDoc!.service?.risk?.calculated_score_norm).to.be.greaterThan(0);
      });

      describe('@skipInServerless with asset criticality modifiers', () => {
        const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);

        afterEach(async () => {
          await cleanAssetCriticality({ log, es });
        });

        it('calculates risk scores with criticality modifiers', async () => {
          const documentId = uuidv4();
          const hostName = `host-${uuidv4()}`;
          const { documentIds, testEntities } = await maintainerScenario.seedEntities([
            riskScoreMaintainerEntityBuilders.host({ hostName, documentId }),
          ]);
          const [testHost] = testEntities;

          await assetCriticalityRoutes.upsert({
            id_field: 'host.name',
            id_value: hostName,
            criticality_level: 'high_impact',
          });

          await retry.waitForWithTimeout(
            `asset criticality present for ${hostName}`,
            30_000,
            async () => {
              const doc = await getAssetCriticalityEsDocument({
                es,
                idField: 'host.name',
                idValue: hostName,
              });
              return doc?.criticality_level === 'high_impact';
            }
          );
          await maintainerScenario.createAlertsForDocumentIds({
            documentIds,
            alerts: 1,
            riskScore: 21,
          });

          await entityStoreUtils.installEntityStoreV2({
            entityTypes: ['user', 'host'],
            dataViewPattern: testLogsIndex,
          });
          await waitForEntityStoreDoc({ es, retry, entityId: testHost.expectedEuid });
          await maintainerScenario.setEntityCriticality({
            testEntity: testHost,
            criticalityLevel: 'high_impact',
          });
          await waitForEntityStoreDoc({
            es,
            retry,
            entityId: testHost.expectedEuid,
            requireCriticality: 'high_impact',
          });
          await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });
          const score = await waitForRiskScoreForId({
            es,
            log,
            idValue: testHost.expectedEuid,
            expectedCalculatedScore: 21,
          });

          expect(score.criticality_level).to.eql('high_impact');
          expect(score.criticality_modifier).to.eql(1.5);
          expect(score.calculated_level).to.eql('Unknown');
          expect(score.calculated_score).to.eql(21);
          expect(score.calculated_score_norm).to.be.within(11.677912, 11.6779121);
          expect(score.category_1_score).to.be.within(8.1006017, 8.100602);
          expect(score.category_1_count).to.eql(1);
          expect(score.id_value).to.eql(testHost.expectedEuid);
        });
      });

      describe('@skipInServerless with watchlist modifiers', () => {
        const watchlistRoutes = watchlistRouteHelpersFactory(supertest);

        afterEach(async () => {
          await cleanUpWatchlists(watchlistRoutes);
        });

        it('calculates risk scores with watchlist modifiers', async () => {
          const documentId = uuidv4();
          const userName = `watchlist-user-${uuidv4()}`;
          const { documentIds, testEntities } = await maintainerScenario.seedEntities([
            riskScoreMaintainerEntityBuilders.idpUser({ userName, documentId }),
          ]);
          const [idpUser] = testEntities;
          await maintainerScenario.createAlertsForDocumentIds({
            documentIds,
            alerts: 1,
            riskScore: 21,
          });

          // Create a watchlist with a custom riskModifier
          const createResponse = await watchlistRoutes.create({
            name: 'high-risk-vendors',
            riskModifier: 1.8,
          });
          if (createResponse.status !== 200) {
            throw new Error(
              `Failed to create watchlist; expected 200 but got ${
                createResponse.status
              }: ${JSON.stringify(createResponse.body)}`
            );
          }
          const watchlistId = createResponse.body.id!;
          const watchlists = await watchlistRoutes.list();
          expect(watchlists.body.map((watchlist: { id?: string }) => watchlist.id)).to.contain(
            watchlistId
          );

          await maintainerScenario.installAndRunMaintainer({ dataViewPattern: testLogsIndex });
          const baseScore = await waitForRiskScoreForId({
            es,
            log,
            idValue: idpUser.expectedEuid,
            expectedCalculatedScore: 21,
          });
          const baseNormScore = baseScore.calculated_score_norm!;

          // Update the entity in the entity store to add watchlist membership
          await maintainerScenario.setEntityWatchlists({
            testEntity: idpUser,
            watchlistIds: [watchlistId],
          });
          await waitForEntityStoreDoc({
            es,
            retry,
            entityId: idpUser.expectedEuid,
            requiredWatchlistId: watchlistId,
          });
          const entityResponse = await es.search({
            index: '.entities.v2.latest.security_default',
            size: 1,
            query: { term: { 'entity.id': idpUser.expectedEuid } },
          });
          const entityDoc = entityResponse.hits.hits[0]?._source as
            | { entity?: { attributes?: { watchlists?: string[] } } }
            | undefined;
          expect(entityDoc?.entity?.attributes?.watchlists ?? []).to.contain(watchlistId);

          await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });
          await retry.waitForWithTimeout(
            `risk score with watchlist modifier for ${idpUser.expectedEuid}`,
            60_000,
            async () => {
              const scores = await readRiskScores(es);
              const normalized = normalizeScores(scores).filter(
                ({ id_value: idValue }) => idValue === idpUser.expectedEuid
              );
              const scoresAfterMembershipUpdate = normalized.filter(
                (score) => score.calculation_run_id !== baseScore.calculation_run_id
              );
              const scoredWithWatchlistModifier = scoresAfterMembershipUpdate.find((score) =>
                score.modifiers?.some(
                  (modifier) =>
                    modifier.type === 'watchlist' &&
                    modifier.subtype === 'high-risk-vendors' &&
                    modifier.modifier_value === 1.8
                )
              );

              // We expect the second run to produce a new score doc after entity update.
              if (scoresAfterMembershipUpdate.length === 0 || !scoredWithWatchlistModifier) {
                return false;
              }

              expect(scoredWithWatchlistModifier.calculated_score_norm).to.be.greaterThan(
                baseNormScore
              );
              expect(scoredWithWatchlistModifier.id_value).to.eql(idpUser.expectedEuid);
              return true;
            }
          );
        });
      });

      describe('reset-to-zero behavior', () => {
        it('resets stale entity scores to zero after maintainer run', async () => {
          const activeHostName = `host-active-${uuidv4().slice(0, 8)}`;
          const staleHostName = `host-stale-${uuidv4().slice(0, 8)}`;

          const { documentIds: activeDocIds, testEntities: activeEntities } =
            await maintainerScenario.seedEntities([
              riskScoreMaintainerEntityBuilders.host({ hostName: activeHostName }),
            ]);
          const [activeHost] = activeEntities;

          const { documentIds: staleDocIds, testEntities: staleEntities } =
            await maintainerScenario.seedEntities([
              riskScoreMaintainerEntityBuilders.host({ hostName: staleHostName }),
            ]);
          const [staleHost] = staleEntities;

          await maintainerScenario.createAlertsForDocumentIds({
            documentIds: [...activeDocIds, ...staleDocIds],
            alerts: 2,
            riskScore: 40,
          });

          // Install entity store first, then wait for BOTH entities to appear
          // before running the maintainer. installAndRunMaintainer only waits
          // for 1 entity, and the maintainer drops not_in_store entities.
          await entityStoreUtils.installEntityStoreV2({
            entityTypes: ['user', 'host'],
            dataViewPattern: testLogsIndex,
          });
          await waitForEntityStoreEntities({ es, log, count: 2 });
          await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });
          await waitForRiskScoresToBePresent({ es, log, scoreCount: 2 });

          const firstRunScores = normalizeScores(await readRiskScores(es));
          const staleFirstScore = findScoreForEntity(firstRunScores, staleHost);
          expect(staleFirstScore).to.not.be(undefined);
          expect(staleFirstScore!.calculated_score_norm).to.be.greaterThan(0);

          // Stop the maintainer to prevent scheduled runs during the alert transition
          await maintainerRoutes.stopMaintainer('risk-score');

          // Remove all rules/alerts, then recreate only for the active host
          await deleteAllRules(supertest, log);
          await deleteAllAlerts(supertest, log, es);
          await maintainerScenario.createAlertsForDocumentIds({
            documentIds: activeDocIds,
            alerts: 1,
            riskScore: 40,
          });

          // Resume the maintainer and trigger a new run.
          // Active host will be scored (new run_id), stale host will not be scored
          // (no alerts) and its previous positive score will be reset to zero.
          await maintainerRoutes.startMaintainer('risk-score');
          await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });

          await waitForEntityScoreResetToZero({ es, retry, entityId: staleHost.expectedEuid });

          // Verify the entity store also reflects the zero risk score
          await retry.waitForWithTimeout(
            `entity store risk reset for ${staleHost.expectedEuid}`,
            30_000,
            async () => {
              const entities = await readEntityStoreEntities(es);
              const staleEntity = entities.find((e) => e.entity.id === staleHost.expectedEuid);
              return (
                staleEntity !== undefined && staleEntity.entity.risk?.calculated_score_norm === 0
              );
            }
          );

          // Active host should still have a positive score from the new run
          const finalScores = normalizeScores(await readRiskScores(es));
          const activeScores = finalScores.filter((s) => s.id_value === activeHost.expectedEuid);
          expect(activeScores.some((s) => (s.calculated_score_norm ?? 0) > 0)).to.be(true);
        });

        it('does not reset stale scores when enableResetToZero is false', async () => {
          const hostName = `host-retain-${uuidv4().slice(0, 8)}`;
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
          const firstScore = await waitForRiskScoreForId({
            es,
            log,
            idValue: host.expectedEuid,
            expectedCalculatedScore: 40,
          });
          expect(firstScore.calculated_score_norm).to.be.greaterThan(0);

          // Disable reset-to-zero via the configuration saved object
          await supertest
            .put('/api/risk_score/engine/saved_object/configure')
            .set('kbn-xsrf', 'true')
            .set('x-elastic-internal-origin', 'Kibana')
            .set('elastic-api-version', '2023-10-31')
            .send({ enable_reset_to_zero: false })
            .expect(200);

          // Stop maintainer, remove alerts, restart
          await maintainerRoutes.stopMaintainer('risk-score');
          await deleteAllRules(supertest, log);
          await deleteAllAlerts(supertest, log, es);
          await maintainerRoutes.startMaintainer('risk-score');
          await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });

          // The entity should NOT have been reset to zero — only positive scores should exist
          const scores = normalizeScores(await readRiskScores(es));
          const hostScores = scores.filter((s) => s.id_value === host.expectedEuid);
          expect(hostScores.every((s) => (s.calculated_score_norm ?? 0) > 0)).to.be(true);
        });
      });

      describe('@skipInServerless multi-entity scoring at scale with mixed modifiers', () => {
        const watchlistRoutesScale = watchlistRouteHelpersFactory(supertest);

        afterEach(async () => {
          await cleanAssetCriticality({ log, es });
          await cleanUpWatchlists(watchlistRoutesScale);
        });

        it('scores many entities with asset criticality and watchlist modifiers', async () => {
          const shortId = uuidv4().slice(0, 8);
          const hostSeeds = Array.from({ length: 8 }, (_, i) =>
            riskScoreMaintainerEntityBuilders.host({ hostName: `scale-host-${i}-${shortId}` })
          );
          const userSeeds = Array.from({ length: 4 }, (_, i) =>
            riskScoreMaintainerEntityBuilders.idpUser({ userName: `scale-user-${i}-${shortId}` })
          );

          const { documentIds, testEntities } = await maintainerScenario.seedEntities([
            ...hostSeeds,
            ...userSeeds,
          ]);

          await maintainerScenario.createAlertsForDocumentIds({
            documentIds,
            alerts: documentIds.length,
            riskScore: 30,
            maxSignals: 200,
          });

          await entityStoreUtils.installEntityStoreV2({
            entityTypes: ['user', 'host'],
            dataViewPattern: testLogsIndex,
          });
          await waitForEntityStoreEntities({ es, log, count: testEntities.length });

          // Assign criticality to first 4 entities (2 hosts + 2 users)
          const criticalEntities = testEntities.slice(0, 4);
          for (const entity of criticalEntities) {
            await maintainerScenario.setEntityCriticality({
              testEntity: entity,
              criticalityLevel: 'high_impact',
            });
          }

          // Create a watchlist and assign membership to entities 2-4 (overlap with criticality)
          const wlCreateResponse = await watchlistRoutesScale.create({
            name: 'scale-test-watchlist',
            riskModifier: 1.5,
          });
          if (wlCreateResponse.status !== 200) {
            throw new Error(`Failed to create watchlist: ${JSON.stringify(wlCreateResponse.body)}`);
          }
          const watchlistId = wlCreateResponse.body.id!;

          const watchlistEntities = testEntities.slice(2, 5);
          for (const entity of watchlistEntities) {
            await maintainerScenario.setEntityWatchlists({
              testEntity: entity,
              watchlistIds: [watchlistId],
            });
          }

          // Wait for entity store to reflect at least one criticality and one watchlist assignment
          await waitForEntityStoreDoc({
            es,
            retry,
            entityId: criticalEntities[0].expectedEuid,
            requireCriticality: 'high_impact',
          });
          await waitForEntityStoreDoc({
            es,
            retry,
            entityId: watchlistEntities[0].expectedEuid,
            requiredWatchlistId: watchlistId,
          });

          await waitForMaintainerRun({ retry, routes: maintainerRoutes, minRuns: 1 });
          await waitForRiskScoresToBePresent({ es, log, scoreCount: testEntities.length });

          const scores = normalizeScores(await readRiskScores(es));

          // All entities should have been scored
          for (const entity of testEntities) {
            const entityScores = scores.filter((s) => s.id_value === entity.expectedEuid);
            expect(entityScores.length).to.be.greaterThan(0);
          }

          // Entities with criticality should have the modifier applied
          for (const entity of criticalEntities) {
            const entityScore = findScoreForEntity(scores, entity);
            expect(entityScore?.criticality_level).to.eql('high_impact');
            expect(entityScore?.criticality_modifier).to.eql(1.5);
          }

          // Entities with watchlist membership should have a watchlist modifier
          for (const entity of watchlistEntities) {
            const entityScore = findScoreForEntity(scores, entity);
            const hasWatchlistMod = entityScore?.modifiers?.some(
              (m) =>
                m.type === 'watchlist' &&
                m.subtype === 'scale-test-watchlist' &&
                m.modifier_value === 1.5
            );
            expect(hasWatchlistMod).to.be(true);
          }

          // Entities without any modifiers should have no criticality metadata
          const plainEntities = testEntities.filter(
            (e) => !criticalEntities.includes(e) && !watchlistEntities.includes(e)
          );
          for (const entity of plainEntities) {
            const entityScore = findScoreForEntity(scores, entity);
            expect(entityScore?.criticality_level).to.be(undefined);
          }
        });
      });
    });
  });
};
