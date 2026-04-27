/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { deleteAllAlerts, deleteAllRules } from '@kbn/detections-response-ftr-services';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common';
import {
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  normalizeScores,
  EntityStoreUtils,
  entityMaintainerRouteHelpersFactory,
  cleanUpRiskScoreMaintainer,
  watchlistRouteHelpersFactory,
  cleanUpWatchlists,
  riskScoreMaintainerScenarioFactory,
  riskScoreMaintainerEntityBuilders,
  waitForEntityStoreEntities,
  waitForEntityStoreDoc,
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
  const entityStoreIndex = getEntitiesAlias(ENTITY_LATEST, 'default');

  // Failing: See https://github.com/elastic/kibana/issues/265177
  describe.skip('@ess @serverless @serverlessQA Risk Score Maintainer Resolution Scoring', function () {
    this.tags(['esGate']);

    context('with test log data', () => {
      const getEntityField = (
        entity: Record<string, unknown> | undefined,
        field: string
      ): unknown => {
        if (!entity) {
          return undefined;
        }
        if (field in entity) {
          return entity[field];
        }
        return field.split('.').reduce<unknown>((current, key) => {
          if (current != null && typeof current === 'object') {
            return (current as Record<string, unknown>)[key];
          }
          return undefined;
        }, entity);
      };

      const indexListOfDocuments = indexListOfDocumentsFactory({ es, log, index: testLogsIndex });
      const maintainerScenario = riskScoreMaintainerScenarioFactory({
        indexListOfDocuments,
        createAndSyncRuleAndAlerts,
        entityStoreUtils,
        retry,
        routes: maintainerRoutes,
      });

      const waitForResolutionRelationship = async (
        aliasEuid: string,
        targetEuid: string
      ): Promise<void> => {
        await retry.waitForWithTimeout(
          `resolution relationship ${aliasEuid} -> ${targetEuid}`,
          60_000,
          async () => {
            await es.indices.refresh({ index: entityStoreIndex });
            const response = await es.search({
              index: entityStoreIndex,
              size: 1,
              query: { term: { 'entity.id': aliasEuid } },
            });
            const doc = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
            return (
              getEntityField(doc, 'entity.relationships.resolution.resolved_to') === targetEuid
            );
          }
        );
      };

      const waitForResolutionRelationshipCleared = async (aliasEuid: string): Promise<void> => {
        await retry.waitForWithTimeout(
          `resolution relationship cleared for ${aliasEuid}`,
          60_000,
          async () => {
            await es.indices.refresh({ index: entityStoreIndex });
            const response = await es.search({
              index: entityStoreIndex,
              size: 1,
              query: { term: { 'entity.id': aliasEuid } },
            });
            const doc = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
            return (
              getEntityField(doc, 'entity.relationships.resolution.resolved_to') == null ||
              getEntityField(doc, 'entity.relationships.resolution.resolved_to') === ''
            );
          }
        );
      };

      const refreshResolutionLookup = async (): Promise<void> => {
        await es.indices.refresh({ index: entityStoreIndex });
      };

      const getBestScore = ({
        scores,
        entityId,
        scoreType,
      }: {
        scores: ReturnType<typeof normalizeScores>;
        entityId: string;
        scoreType: 'base' | 'resolution';
      }) =>
        scores
          .filter((score) => score.id_value === entityId && score.score_type === scoreType)
          .sort(
            (left, right) =>
              (scoreType === 'resolution'
                ? (right.related_entities?.length ?? 0) - (left.related_entities?.length ?? 0)
                : 0) ||
              String(right.calculation_run_id ?? '').localeCompare(
                String(left.calculation_run_id ?? '')
              )
          )[0];

      const getMatchingScore = ({
        scores,
        entityId,
        scoreType,
        predicate,
      }: {
        scores: ReturnType<typeof normalizeScores>;
        entityId: string;
        scoreType: 'base' | 'resolution';
        predicate?: (score: ReturnType<typeof normalizeScores>[number]) => boolean;
      }) =>
        scores
          .filter(
            (score) =>
              score.id_value === entityId &&
              score.score_type === scoreType &&
              (!predicate || predicate(score))
          )
          .sort(
            (left, right) =>
              (scoreType === 'resolution'
                ? (right.related_entities?.length ?? 0) - (left.related_entities?.length ?? 0)
                : 0) ||
              String(right.calculation_run_id ?? '').localeCompare(
                String(left.calculation_run_id ?? '')
              )
          )[0];

      const waitForScore = async ({
        entityId,
        scoreType,
        waitLabel,
        predicate,
      }: {
        entityId: string;
        scoreType: 'base' | 'resolution';
        waitLabel: string;
        predicate?: (score: ReturnType<typeof normalizeScores>[number]) => boolean;
      }) => {
        let bestScore: ReturnType<typeof normalizeScores>[number] | undefined;

        await retry.waitForWithTimeout(waitLabel, 60_000, async () => {
          const scores = normalizeScores(await readRiskScores(es));
          const score = predicate
            ? getMatchingScore({ scores, entityId, scoreType, predicate })
            : getBestScore({ scores, entityId, scoreType });
          if (!score) {
            return false;
          }

          bestScore = score;
          return true;
        });

        expect(bestScore).to.not.be(undefined);
        return bestScore!;
      };

      const waitForResolutionScore = async (
        params: Omit<Parameters<typeof waitForScore>[0], 'scoreType'>
      ) => waitForScore({ ...params, scoreType: 'resolution' });

      const waitForBaseScore = async (
        params: Omit<Parameters<typeof waitForScore>[0], 'scoreType'>
      ) => waitForScore({ ...params, scoreType: 'base' });

      const hasPositiveCalculatedScore = (
        score: ReturnType<typeof normalizeScores>[number]
      ): boolean => (score.calculated_score_norm ?? 0) > 0;

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

      it('aggregates alerts from both target and alias into a single resolved score', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `res-target-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `res-alias-${shortId}` }),
        ]);
        const [targetUser, aliasUser] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [targetUser.documentId, aliasUser.documentId],
          alerts: 2,
          riskScore: 40,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 2 });

        await maintainerScenario.setEntityResolutionTarget({
          testEntity: aliasUser,
          resolvedToEntityId: targetUser.expectedEuid,
        });
        await waitForResolutionRelationship(aliasUser.expectedEuid, targetUser.expectedEuid);
        await refreshResolutionLookup();

        await maintainerRoutes.runMaintainerSync('risk-score');

        const resolutionScore = await waitForResolutionScore({
          entityId: targetUser.expectedEuid,
          waitLabel: `resolved score for target and alias ${targetUser.expectedEuid}`,
          predicate: (score) => {
            const relatedEntityIds =
              score.related_entities?.map((entity) => entity.entity_id) ?? [];
            return (
              hasPositiveCalculatedScore(score) && relatedEntityIds.includes(aliasUser.expectedEuid)
            );
          },
        });

        const baseScore = await waitForBaseScore({
          entityId: targetUser.expectedEuid,
          waitLabel: `base score for ${targetUser.expectedEuid}`,
          predicate: (score) =>
            score.calculation_run_id === resolutionScore.calculation_run_id &&
            hasPositiveCalculatedScore(score),
        });

        expect(resolutionScore.score_type).to.eql('resolution');
        expect(resolutionScore.related_entities).to.be.an('array');
        expect(resolutionScore.related_entities!.map((entity) => entity.entity_id)).to.eql([
          aliasUser.expectedEuid,
        ]);
        expect(resolutionScore.related_entities![0].relationship_type).to.eql(
          'entity.relationships.resolution.resolved_to'
        );
        expect(baseScore.score_type).to.eql('base');
        expect(resolutionScore.calculated_score_norm).to.be.greaterThan(
          baseScore.calculated_score_norm!
        );
      });

      it('does not produce resolved scores when no resolution relationships exist', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `no-res-${shortId}` }),
        ]);
        const [user] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [user.documentId],
          alerts: 1,
          riskScore: 35,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 1 });

        await maintainerRoutes.runMaintainerSync('risk-score');

        const baseScore = await waitForBaseScore({
          entityId: user.expectedEuid,
          waitLabel: `base score for ${user.expectedEuid}`,
          predicate: hasPositiveCalculatedScore,
        });
        expect(baseScore.score_type).to.eql('base');

        const allScores = normalizeScores(await readRiskScores(es));
        expect(
          allScores.some(
            (score) => score.id_value === user.expectedEuid && score.score_type === 'resolution'
          )
        ).to.be(false);
      });

      it('writes resolved risk to the canonical target when only the canonical target has alerts', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `canonical-target-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `canonical-alias-${shortId}` }),
        ]);
        const [targetUser, silentAlias] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [targetUser.documentId],
          alerts: 1,
          riskScore: 50,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 2 });

        await maintainerScenario.setEntityResolutionTarget({
          testEntity: silentAlias,
          resolvedToEntityId: targetUser.expectedEuid,
        });
        await waitForResolutionRelationship(silentAlias.expectedEuid, targetUser.expectedEuid);
        await refreshResolutionLookup();

        await maintainerRoutes.runMaintainerSync('risk-score');

        const resolutionScore = await waitForResolutionScore({
          entityId: targetUser.expectedEuid,
          waitLabel: `resolved score for canonical target ${targetUser.expectedEuid}`,
          predicate: hasPositiveCalculatedScore,
        });
        expect(resolutionScore.score_type).to.eql('resolution');
        expect(resolutionScore.id_value).to.eql(targetUser.expectedEuid);
        expect(resolutionScore.calculated_score_norm).to.be.greaterThan(0);
        expect(resolutionScore.calculation_run_id).to.be.a('string');
      });

      it('stops attributing alias alerts to the previous target after unlink reconciliation', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `unlink-target-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `unlink-alias-${shortId}` }),
        ]);
        const [targetUser, aliasUser] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [targetUser.documentId, aliasUser.documentId],
          alerts: 2,
          riskScore: 45,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 2 });

        await maintainerScenario.setEntityResolutionTarget({
          testEntity: aliasUser,
          resolvedToEntityId: targetUser.expectedEuid,
        });
        await waitForResolutionRelationship(aliasUser.expectedEuid, targetUser.expectedEuid);
        await refreshResolutionLookup();
        await maintainerRoutes.runMaintainerSync('risk-score');

        const linkedResolutionScore = await waitForResolutionScore({
          entityId: targetUser.expectedEuid,
          waitLabel: `linked resolution score for ${targetUser.expectedEuid}`,
          predicate: (score) => {
            const relatedEntityIds =
              score.related_entities?.map((entity) => entity.entity_id) ?? [];
            return relatedEntityIds.includes(aliasUser.expectedEuid);
          },
        });

        await entityStoreUtils.unlinkEntitiesViaResolutionApi({
          entityIds: [aliasUser.expectedEuid],
        });
        await entityStoreUtils.forceExtractEntities({ entityType: 'user' });
        await waitForResolutionRelationshipCleared(aliasUser.expectedEuid);

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [aliasUser.documentId],
          alerts: 1,
          riskScore: 70,
        });

        await refreshResolutionLookup();
        await maintainerRoutes.runMaintainerSync('risk-score');

        let postUnlinkRunId: string | undefined;
        await retry.waitForWithTimeout(
          `post-unlink unreconciled resolution cleared for ${aliasUser.expectedEuid}`,
          60_000,
          async () => {
            const allScores = normalizeScores(await readRiskScores(es));
            const candidateRunId = allScores
              .filter(
                (score) =>
                  score.id_value === aliasUser.expectedEuid &&
                  score.score_type === 'base' &&
                  hasPositiveCalculatedScore(score) &&
                  score.calculation_run_id !== linkedResolutionScore.calculation_run_id
              )
              .map((score) => score.calculation_run_id)
              .find(
                (runId): runId is string =>
                  typeof runId === 'string' &&
                  !allScores.some(
                    (score) =>
                      score.calculation_run_id === runId &&
                      score.score_type === 'resolution' &&
                      ((score.id_value === aliasUser.expectedEuid &&
                        hasPositiveCalculatedScore(score)) ||
                        score.related_entities?.some(
                          (entity) => entity.entity_id === aliasUser.expectedEuid
                        ))
                  )
              );

            if (!candidateRunId) {
              return false;
            }

            postUnlinkRunId = candidateRunId;
            return true;
          }
        );

        expect(postUnlinkRunId).to.be.a('string');

        const allScores = normalizeScores(await readRiskScores(es));
        const postUnlinkTargetResolutionScores = allScores.filter(
          (score) =>
            score.id_value === targetUser.expectedEuid &&
            score.score_type === 'resolution' &&
            score.calculation_run_id === postUnlinkRunId
        );
        const postUnlinkAliasResolutionScores = allScores.filter(
          (score) =>
            score.id_value === aliasUser.expectedEuid &&
            score.score_type === 'resolution' &&
            score.calculation_run_id === postUnlinkRunId
        );

        expect(
          postUnlinkTargetResolutionScores.some((score) =>
            score.related_entities?.some((entity) => entity.entity_id === aliasUser.expectedEuid)
          )
        ).to.be(false);
        expect(postUnlinkAliasResolutionScores.length).to.eql(0);
      });

      describe('@skipInServerless resolution group-level modifiers', () => {
        const watchlistRoutes = watchlistRouteHelpersFactory(supertest);

        afterEach(async () => {
          await cleanUpWatchlists(watchlistRoutes);
        });

        it('merges watchlists and highest criticality from silent group members into resolved target output', async () => {
          const shortId = uuidv4().slice(0, 8);
          const { testEntities } = await maintainerScenario.seedEntities([
            riskScoreMaintainerEntityBuilders.idpUser({ userName: `mod-target-${shortId}` }),
            riskScoreMaintainerEntityBuilders.idpUser({ userName: `mod-alias-${shortId}` }),
          ]);
          const [targetUser, silentAlias] = testEntities;

          await maintainerScenario.createAlertsForDocumentIds({
            documentIds: [targetUser.documentId],
            alerts: 1,
            riskScore: 50,
          });

          await entityStoreUtils.installEntityStoreV2({
            entityTypes: ['user', 'host'],
            dataViewPattern: testLogsIndex,
          });
          await waitForEntityStoreEntities({ es, log, count: 2 });

          const wlAResponse = await watchlistRoutes.create({
            name: 'wl-a',
            riskModifier: 1.2,
          });
          if (wlAResponse.status !== 200) {
            throw new Error(`Failed to create watchlist-a: ${JSON.stringify(wlAResponse.body)}`);
          }
          const wlAId = wlAResponse.body.id!;

          const wlBResponse = await watchlistRoutes.create({
            name: 'wl-b',
            riskModifier: 1.5,
          });
          if (wlBResponse.status !== 200) {
            throw new Error(`Failed to create watchlist-b: ${JSON.stringify(wlBResponse.body)}`);
          }
          const wlBId = wlBResponse.body.id!;

          await maintainerScenario.setEntityWatchlists({
            testEntity: targetUser,
            watchlistIds: [wlAId],
          });
          await maintainerScenario.setEntityWatchlists({
            testEntity: silentAlias,
            watchlistIds: [wlBId],
          });
          await maintainerScenario.setEntityCriticality({
            testEntity: silentAlias,
            criticalityLevel: 'high_impact',
          });
          await maintainerScenario.setEntityResolutionTarget({
            testEntity: silentAlias,
            resolvedToEntityId: targetUser.expectedEuid,
          });

          await waitForEntityStoreDoc({
            es,
            retry,
            entityId: targetUser.expectedEuid,
            requiredWatchlistId: wlAId,
          });
          await waitForEntityStoreDoc({
            es,
            retry,
            entityId: silentAlias.expectedEuid,
            requireCriticality: 'high_impact',
            requiredWatchlistId: wlBId,
          });
          await waitForResolutionRelationship(silentAlias.expectedEuid, targetUser.expectedEuid);

          await refreshResolutionLookup();
          await maintainerRoutes.runMaintainerSync('risk-score');

          const resolutionScore = await waitForResolutionScore({
            entityId: targetUser.expectedEuid,
            waitLabel: `resolved modifiers for ${targetUser.expectedEuid}`,
            predicate: (score) => {
              const watchlistSubtypes =
                score.modifiers
                  ?.filter((modifier) => modifier.type === 'watchlist')
                  .map((modifier) => modifier.subtype)
                  .sort() ?? [];

              return (
                score.criticality_level === 'high_impact' &&
                watchlistSubtypes.length === 2 &&
                watchlistSubtypes[0] === 'wl-a' &&
                watchlistSubtypes[1] === 'wl-b'
              );
            },
          });

          expect(resolutionScore.criticality_level).to.eql('high_impact');
          expect(resolutionScore.criticality_modifier).to.be.a('number');
          expect(resolutionScore.criticality_modifier).to.be.greaterThan(0);

          const critMod = resolutionScore.modifiers!.find(
            (modifier) => modifier.type === 'asset_criticality'
          );
          expect(critMod).to.not.be(undefined);
          expect((critMod!.metadata as Record<string, unknown>)?.criticality_level).to.eql(
            'high_impact'
          );

          const watchlistMods = resolutionScore.modifiers!.filter(
            (modifier) => modifier.type === 'watchlist'
          );
          const watchlistSubtypes = watchlistMods.map((modifier) => modifier.subtype).sort();
          expect(watchlistSubtypes).to.eql(['wl-a', 'wl-b']);
          for (const watchlistMod of watchlistMods) {
            expect(watchlistMod.modifier_value).to.be.a('number');
            expect(watchlistMod.contribution).to.be.a('number');
          }
        });
      });
    });
  });
};
