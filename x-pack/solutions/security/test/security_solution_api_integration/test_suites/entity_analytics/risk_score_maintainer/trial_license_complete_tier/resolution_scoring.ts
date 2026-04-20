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

  describe('@ess @serverless @serverlessQA Risk Score Maintainer Resolution Scoring', function () {
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
          `resolution relationship ${aliasEuid} → ${targetEuid}`,
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

      const refreshResolutionLookup = async (): Promise<void> => {
        // Sync runs can read the lookup index immediately, so make the relationship visible first.
        await es.indices.refresh({ index: entityStoreIndex });
      };

      const getBestResolutionScore = ({
        scores,
        entityId,
      }: {
        scores: ReturnType<typeof normalizeScores>;
        entityId: string;
      }) =>
        scores
          .filter((s) => s.id_value === entityId && s.score_type === 'resolution')
          .sort(
            (a, b) =>
              (b.related_entities?.length ?? 0) - (a.related_entities?.length ?? 0) ||
              String(b.calculation_run_id ?? '').localeCompare(String(a.calculation_run_id ?? ''))
          )[0];

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

      it('produces a resolution score that aggregates alerts from both target and alias', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `res-target-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `res-alias-${shortId}` }),
        ]);
        const [targetUser, aliasUser] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 2,
          riskScore: 40,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 2 });

        // The maintainer is not auto-started, so we can safely set up the resolution
        // relationship before running it.

        await maintainerScenario.setEntityResolutionTarget({
          testEntity: aliasUser,
          resolvedToEntityId: targetUser.expectedEuid,
        });
        await waitForResolutionRelationship(aliasUser.expectedEuid, targetUser.expectedEuid);
        await refreshResolutionLookup();

        await maintainerRoutes.runMaintainerSync('risk-score');

        let allScores: ReturnType<typeof normalizeScores> = [];
        await retry.waitForWithTimeout(
          `resolution score for ${targetUser.expectedEuid}`,
          60_000,
          async () => {
            allScores = normalizeScores(await readRiskScores(es));
            return allScores.some(
              (s) => s.id_value === targetUser.expectedEuid && s.score_type === 'resolution'
            );
          }
        );

        const resolutionScore = allScores.find(
          (s) => s.id_value === targetUser.expectedEuid && s.score_type === 'resolution'
        )!;

        expect(resolutionScore.score_type).to.eql('resolution');
        expect(resolutionScore.calculated_score_norm).to.be.greaterThan(0);
        expect(resolutionScore.calculation_run_id).to.be.a('string');

        // The resolution score aggregates alerts from both target (1 alert) and
        // alias (1 alert), so it must be strictly higher than the target's own
        // base score (1 alert) produced in the same maintainer run.
        const baseScoreSameRun = allScores.find(
          (s) =>
            s.id_value === targetUser.expectedEuid &&
            s.score_type === 'base' &&
            s.calculation_run_id === resolutionScore.calculation_run_id
        );
        expect(baseScoreSameRun).to.not.be(undefined);
        expect(resolutionScore.calculated_score_norm).to.be.greaterThan(
          baseScoreSameRun!.calculated_score_norm!
        );

        // related_entities should list the alias (self is filtered out by the parser)
        expect(resolutionScore.related_entities).to.be.an('array');
        expect(resolutionScore.related_entities!.length).to.eql(1);
        expect(resolutionScore.related_entities![0].entity_id).to.eql(aliasUser.expectedEuid);
        expect(resolutionScore.related_entities![0].relationship_type).to.eql(
          'entity.relationships.resolution.resolved_to'
        );

        // The alias should still have its own base score
        const aliasBase = allScores.find(
          (s) => s.id_value === aliasUser.expectedEuid && s.score_type === 'base'
        );
        expect(aliasBase).to.not.be(undefined);
        expect(aliasBase!.calculated_score_norm).to.be.greaterThan(0);

        // Wait until the entity store has both individual and resolution risk
        await retry.waitForWithTimeout(
          `entity store dual-write for ${targetUser.expectedEuid}`,
          60_000,
          async () => {
            await es.indices.refresh({ index: entityStoreIndex });
            const response = await es.search({
              index: entityStoreIndex,
              size: 1,
              query: { term: { 'entity.id': targetUser.expectedEuid } },
            });
            const doc = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
            const baseRisk = getEntityField(doc, 'entity.risk.calculated_score_norm');
            const resolutionRisk = getEntityField(
              doc,
              'entity.relationships.resolution.risk.calculated_score_norm'
            );
            return (
              typeof baseRisk === 'number' &&
              baseRisk > 0 &&
              typeof resolutionRisk === 'number' &&
              resolutionRisk > 0
            );
          }
        );

        const response = await es.search({
          index: entityStoreIndex,
          size: 1,
          query: { term: { 'entity.id': targetUser.expectedEuid } },
        });
        const entityDoc = response.hits.hits[0]!._source as Record<string, unknown>;
        const baseRisk = getEntityField(entityDoc, 'entity.risk.calculated_score_norm');
        const baseLevel = getEntityField(entityDoc, 'entity.risk.calculated_level');
        const resolutionRisk = getEntityField(
          entityDoc,
          'entity.relationships.resolution.risk.calculated_score_norm'
        );
        const resolutionLevel = getEntityField(
          entityDoc,
          'entity.relationships.resolution.risk.calculated_level'
        );

        expect(baseRisk).to.be.a('number');
        expect(baseRisk as number).to.be.greaterThan(0);
        expect(baseLevel).to.be.a('string');

        expect(resolutionRisk).to.be.a('number');
        expect(resolutionRisk as number).to.be.greaterThan(0);
        expect(resolutionLevel).to.be.a('string');

        // Resolution risk aggregates more alerts, so it should be higher
        expect(resolutionRisk as number).to.be.greaterThan(baseRisk as number);
      });

      it('aggregates a multi-alias group into a single resolution score', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `multi-target-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `multi-alias1-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `multi-alias2-${shortId}` }),
        ]);
        const [target, alias1, alias2] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 3,
          riskScore: 40,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 3 });

        // The maintainer is not auto-started, so we can safely set up the resolution
        // relationships before running it.

        await maintainerScenario.setEntityResolutionTarget({
          testEntity: alias1,
          resolvedToEntityId: target.expectedEuid,
        });
        await maintainerScenario.setEntityResolutionTarget({
          testEntity: alias2,
          resolvedToEntityId: target.expectedEuid,
        });
        await waitForResolutionRelationship(alias1.expectedEuid, target.expectedEuid);
        await waitForResolutionRelationship(alias2.expectedEuid, target.expectedEuid);
        await refreshResolutionLookup();

        await maintainerRoutes.runMaintainerSync('risk-score');

        let allScores: ReturnType<typeof normalizeScores> = [];
        await retry.waitForWithTimeout(
          `resolution score with 2 aliases for ${target.expectedEuid}`,
          60_000,
          async () => {
            allScores = normalizeScores(await readRiskScores(es));
            const resScore = getBestResolutionScore({
              scores: allScores,
              entityId: target.expectedEuid,
            });
            return resScore !== undefined && (resScore.related_entities?.length ?? 0) === 2;
          }
        );

        const resolutionScore = getBestResolutionScore({
          scores: allScores,
          entityId: target.expectedEuid,
        })!;

        // Both aliases should appear in related_entities
        const relatedIds = resolutionScore.related_entities!.map((r) => r.entity_id).sort();
        expect(relatedIds).to.eql([alias1.expectedEuid, alias2.expectedEuid].sort());
        expect(
          resolutionScore.related_entities!.every(
            (r) => r.relationship_type === 'entity.relationships.resolution.resolved_to'
          )
        ).to.be(true);

        // No resolution scores should be produced for the aliases
        const alias1HasResolution = allScores.some(
          (s) => s.id_value === alias1.expectedEuid && s.score_type === 'resolution'
        );
        expect(alias1HasResolution).to.be(false);
        const alias2HasResolution = allScores.some(
          (s) => s.id_value === alias2.expectedEuid && s.score_type === 'resolution'
        );
        expect(alias2HasResolution).to.be(false);

        // The resolution score (3 alerts) should exceed the target's base score (1 alert)
        const baseScore = allScores.find(
          (s) =>
            s.id_value === target.expectedEuid &&
            s.score_type === 'base' &&
            s.calculation_run_id === resolutionScore.calculation_run_id
        );
        expect(baseScore).to.not.be(undefined);
        expect(resolutionScore.calculated_score_norm).to.be.greaterThan(
          baseScore!.calculated_score_norm!
        );
      });

      it('does not produce resolution scores when no resolution relationships exist', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { documentIds, testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `no-res-${shortId}` }),
        ]);
        const [user] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds,
          alerts: 1,
          riskScore: 35,
        });

        await maintainerScenario.installAndRunMaintainer({ dataViewPattern: testLogsIndex });

        // Wait for the base score to confirm the run completed
        await retry.waitForWithTimeout(`base score for ${user.expectedEuid}`, 60_000, async () => {
          const scores = normalizeScores(await readRiskScores(es));
          return scores.some((s) => s.id_value === user.expectedEuid && s.score_type === 'base');
        });

        const allScores = normalizeScores(await readRiskScores(es));
        expect(allScores.some((s) => s.score_type === 'resolution')).to.be(false);
      });

      describe('@skipInServerless resolution group-level modifiers', () => {
        const watchlistRoutes = watchlistRouteHelpersFactory(supertest);

        afterEach(async () => {
          await cleanUpWatchlists(watchlistRoutes);
        });

        it('applies the highest criticality and union of watchlists across the group', async () => {
          const shortId = uuidv4().slice(0, 8);
          const { documentIds, testEntities } = await maintainerScenario.seedEntities([
            riskScoreMaintainerEntityBuilders.idpUser({ userName: `mod-target-${shortId}` }),
            riskScoreMaintainerEntityBuilders.idpUser({ userName: `mod-alias-${shortId}` }),
          ]);
          const [targetUser, aliasUser] = testEntities;

          await maintainerScenario.createAlertsForDocumentIds({
            documentIds,
            alerts: 2,
            riskScore: 40,
          });

          await entityStoreUtils.installEntityStoreV2({
            entityTypes: ['user', 'host'],
            dataViewPattern: testLogsIndex,
          });
          await waitForEntityStoreEntities({ es, log, count: 2 });

          // The maintainer is not auto-started, so we can safely set up the resolution
          // relationships before running it.

          // Target: low_impact criticality, on watchlist-a
          // Alias: high_impact criticality, on watchlist-b
          await maintainerScenario.setEntityCriticality({
            testEntity: targetUser,
            criticalityLevel: 'low_impact',
          });
          await maintainerScenario.setEntityCriticality({
            testEntity: aliasUser,
            criticalityLevel: 'high_impact',
          });

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
            testEntity: aliasUser,
            watchlistIds: [wlBId],
          });

          await maintainerScenario.setEntityResolutionTarget({
            testEntity: aliasUser,
            resolvedToEntityId: targetUser.expectedEuid,
          });

          // Wait for entity store to reflect all modifier and relationship data
          await retry.waitForWithTimeout(
            'entity store modifiers and resolution materialized',
            60_000,
            async () => {
              await es.indices.refresh({ index: entityStoreIndex });
              const [targetResp, aliasResp] = await Promise.all([
                es.search({
                  index: entityStoreIndex,
                  size: 1,
                  query: { term: { 'entity.id': targetUser.expectedEuid } },
                }),
                es.search({
                  index: entityStoreIndex,
                  size: 1,
                  query: { term: { 'entity.id': aliasUser.expectedEuid } },
                }),
              ]);

              const targetDoc = targetResp.hits.hits[0]?._source as
                | Record<string, unknown>
                | undefined;
              const aliasDoc = aliasResp.hits.hits[0]?._source as
                | Record<string, unknown>
                | undefined;

              const targetHasCrit = getEntityField(targetDoc, 'asset.criticality') === 'low_impact';
              const targetWatchlists = getEntityField(targetDoc, 'entity.attributes.watchlists');
              const targetHasWl =
                Array.isArray(targetWatchlists) && targetWatchlists.includes(wlAId);
              const aliasHasCrit = getEntityField(aliasDoc, 'asset.criticality') === 'high_impact';
              const aliasWatchlists = getEntityField(aliasDoc, 'entity.attributes.watchlists');
              const aliasHasWl = Array.isArray(aliasWatchlists) && aliasWatchlists.includes(wlBId);
              const aliasResolved =
                getEntityField(aliasDoc, 'entity.relationships.resolution.resolved_to') ===
                targetUser.expectedEuid;
              return targetHasCrit && targetHasWl && aliasHasCrit && aliasHasWl && aliasResolved;
            }
          );

          await refreshResolutionLookup();

          // Resume the maintainer and trigger a fresh run
          await maintainerRoutes.runMaintainerSync('risk-score');

          // Wait for the resolution score to include both modifier types
          let allScores: ReturnType<typeof normalizeScores> = [];
          await retry.waitForWithTimeout(
            `resolution score with group modifiers for ${targetUser.expectedEuid}`,
            60_000,
            async () => {
              allScores = normalizeScores(await readRiskScores(es));
              const resScore = allScores.find(
                (s) => s.id_value === targetUser.expectedEuid && s.score_type === 'resolution'
              );
              if (!resScore) return false;
              const hasCritMod = resScore.modifiers?.some((m) => m.type === 'asset_criticality');
              const hasWlMods =
                (resScore.modifiers?.filter((m) => m.type === 'watchlist') ?? []).length >= 2;
              return Boolean(hasCritMod && hasWlMods);
            }
          );

          const resolutionScore = allScores.find(
            (s) => s.id_value === targetUser.expectedEuid && s.score_type === 'resolution'
          )!;

          // Criticality: should be the GROUP MAXIMUM — high_impact from alias wins
          // over low_impact from target
          expect(resolutionScore.criticality_level).to.eql('high_impact');
          expect(resolutionScore.criticality_modifier).to.be.a('number');
          expect(resolutionScore.criticality_modifier).to.be.greaterThan(0);

          const critMod = resolutionScore.modifiers!.find((m) => m.type === 'asset_criticality')!;
          expect((critMod.metadata as Record<string, unknown>)?.criticality_level).to.eql(
            'high_impact'
          );

          // Watchlists: should be the GROUP UNION — both wl-a (target) and wl-b (alias)
          const watchlistMods = resolutionScore.modifiers!.filter((m) => m.type === 'watchlist');
          const watchlistSubtypes = watchlistMods.map((m) => m.subtype).sort();
          expect(watchlistSubtypes).to.eql(['wl-a', 'wl-b']);

          for (const wlMod of watchlistMods) {
            expect(wlMod.modifier_value).to.be.a('number');
            expect(wlMod.contribution).to.be.a('number');
          }
        });
      });
    });
  });
};
