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
import type { EntityRiskScoreRecord } from '@kbn/security-solution-plugin/common/api/entity_analytics/common';
import type { EcsRiskScore } from '@kbn/security-solution-plugin/common/entity_analytics/risk_engine';
import {
  createAndSyncRuleAndAlertsFactory,
  readRiskScores,
  normalizeScores,
  EntityStoreUtils,
  entityMaintainerRouteHelpersFactory,
  cleanUpRiskScoreMaintainer,
  riskScoreMaintainerScenarioFactory,
  riskScoreMaintainerEntityBuilders,
  waitForEntityStoreEntities,
  indexListOfDocumentsFactory,
  setupMaintainerLogsDataStream,
  cleanupMaintainerLogsDataStream,
} from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  type StoredRiskScore = Omit<EntityRiskScoreRecord, '@timestamp'>;

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

  describe('@ess @serverless @serverlessQA Risk Score Maintainer Propagation Scoring', function () {
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
              (right.related_entities?.length ?? 0) - (left.related_entities?.length ?? 0) ||
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
        let latestCandidate: ReturnType<typeof normalizeScores>[number] | undefined;

        try {
          await retry.waitForWithTimeout(waitLabel, 60_000, async () => {
            const scores = normalizeScores(await readRiskScores(es));
            const score = getBestScore({ scores, entityId, scoreType });
            if (!score) {
              return false;
            }
            latestCandidate = score;
            if (predicate && !predicate(score)) {
              return false;
            }

            bestScore = score;
            return true;
          });
        } catch (error) {
          throw new Error(
            `${waitLabel}: ${
              error instanceof Error ? error.message : String(error)
            }. Latest candidate: ${JSON.stringify(latestCandidate)}`
          );
        }

        expect(bestScore).to.not.be(undefined);
        return bestScore!;
      };

      const waitForBaseScore = async (
        params: Omit<Parameters<typeof waitForScore>[0], 'scoreType'>
      ) => waitForScore({ ...params, scoreType: 'base' });

      const findUserRiskScore = ({
        scores,
        entityId,
        calculationRunId,
        scoreType,
      }: {
        scores: EcsRiskScore[];
        entityId: string;
        calculationRunId?: string;
        scoreType: 'base' | 'resolution';
      }): StoredRiskScore | undefined =>
        scores
          .map((score) => score.user?.risk)
          .find(
            (risk): risk is StoredRiskScore =>
              risk != null &&
              risk.id_value === entityId &&
              risk.score_type === scoreType &&
              (calculationRunId == null || risk.calculation_run_id === calculationRunId)
          );

      const hasPositiveCalculatedScore = (
        score: ReturnType<typeof normalizeScores>[number]
      ): boolean => (score.calculated_score_norm ?? 0) > 0;

      const waitForOwnsRelationship = async (
        userEuid: string,
        expectedOwnedEntityIds: string[]
      ): Promise<void> => {
        const expectedSet = new Set(expectedOwnedEntityIds);
        await retry.waitForWithTimeout(
          `owns relationship for ${userEuid} -> [${expectedOwnedEntityIds.join(', ')}]`,
          60_000,
          async () => {
            await es.indices.refresh({ index: entityStoreIndex });
            const response = await es.search({
              index: entityStoreIndex,
              size: 1,
              query: { term: { 'entity.id': userEuid } },
            });
            const doc = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
            const ownedIdsValue = getEntityField(doc, 'entity.relationships.owns.ids');
            if (!Array.isArray(ownedIdsValue)) {
              return expectedSet.size === 0;
            }
            const currentSet = new Set(
              ownedIdsValue.filter((value): value is string => typeof value === 'string')
            );

            if (currentSet.size !== expectedSet.size) {
              return false;
            }
            return [...expectedSet].every((ownedId) => currentSet.has(ownedId));
          }
        );
      };

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

      it('inherits host alert risk into user base score through owns relationship', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName: `prop-host-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `prop-user-${shortId}` }),
        ]);
        const [host, user] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [host.documentId],
          alerts: 1,
          riskScore: 50,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 2 });

        await maintainerScenario.setEntityOwnsRelationships({
          testEntity: user,
          ownedEntityIds: [host.expectedEuid],
        });
        await waitForOwnsRelationship(user.expectedEuid, [host.expectedEuid]);

        await maintainerRoutes.runMaintainerSync('risk-score');

        const propagatedUserBaseScore = await waitForBaseScore({
          entityId: user.expectedEuid,
          waitLabel: `propagated base score for user ${user.expectedEuid}`,
          predicate: (score) =>
            hasPositiveCalculatedScore(score) &&
            score.related_entities?.some(
              (entity) =>
                entity.entity_id === host.expectedEuid && entity.relationship_type === 'host_ownership'
            ) === true,
        });

        expect(propagatedUserBaseScore.score_type).to.eql('base');
        expect(propagatedUserBaseScore.calculated_score_norm).to.be.greaterThan(0);

        const rawScores = await readRiskScores(es);
        const propagatedStoredScore = findUserRiskScore({
          scores: rawScores,
          entityId: user.expectedEuid,
          calculationRunId: propagatedUserBaseScore.calculation_run_id,
          scoreType: 'base',
        });

        expect(propagatedStoredScore).to.not.be(undefined);
        if (!propagatedStoredScore) {
          throw new Error(`Missing propagated user risk score for ${user.expectedEuid}`);
        }

        expect(
          propagatedStoredScore.inputs.some((input) => input.entity_id === host.expectedEuid)
        ).to.be(true);
        expect(
          propagatedStoredScore.related_entities?.some(
            (entity) =>
              entity.entity_id === host.expectedEuid && entity.relationship_type === 'host_ownership'
          )
        ).to.be(true);
      });

      it('propagates the same host risk to multiple owning users', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName: `shared-host-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `owner-a-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `owner-b-${shortId}` }),
        ]);
        const [host, ownerA, ownerB] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [host.documentId],
          alerts: 1,
          riskScore: 35,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 3 });

        await maintainerScenario.setEntityOwnsRelationships({
          testEntity: ownerA,
          ownedEntityIds: [host.expectedEuid],
        });
        await maintainerScenario.setEntityOwnsRelationships({
          testEntity: ownerB,
          ownedEntityIds: [host.expectedEuid],
        });
        await waitForOwnsRelationship(ownerA.expectedEuid, [host.expectedEuid]);
        await waitForOwnsRelationship(ownerB.expectedEuid, [host.expectedEuid]);

        await maintainerRoutes.runMaintainerSync('risk-score');

        const ownerAScore = await waitForBaseScore({
          entityId: ownerA.expectedEuid,
          waitLabel: `propagated base score for owner A ${ownerA.expectedEuid}`,
          predicate: (score) =>
            hasPositiveCalculatedScore(score) &&
            score.related_entities?.some((entity) => entity.entity_id === host.expectedEuid) === true,
        });
        const ownerBScore = await waitForBaseScore({
          entityId: ownerB.expectedEuid,
          waitLabel: `propagated base score for owner B ${ownerB.expectedEuid}`,
          predicate: (score) =>
            hasPositiveCalculatedScore(score) &&
            score.related_entities?.some((entity) => entity.entity_id === host.expectedEuid) === true,
        });

        expect(ownerAScore.score_type).to.eql('base');
        expect(ownerBScore.score_type).to.eql('base');
        expect(ownerAScore.calculated_score_norm).to.be.greaterThan(0);
        expect(ownerBScore.calculated_score_norm).to.be.greaterThan(0);
      });

      it('aggregates propagated risk from multiple owned hosts into one user base score', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName: `owned-host-a-${shortId}` }),
          riskScoreMaintainerEntityBuilders.host({ hostName: `owned-host-b-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `multi-owner-${shortId}` }),
        ]);
        const [hostA, hostB, owner] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [hostA.documentId, hostB.documentId],
          alerts: 2,
          riskScore: 40,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 3 });

        await maintainerScenario.setEntityOwnsRelationships({
          testEntity: owner,
          ownedEntityIds: [hostA.expectedEuid, hostB.expectedEuid],
        });
        await waitForOwnsRelationship(owner.expectedEuid, [hostA.expectedEuid, hostB.expectedEuid]);

        await maintainerRoutes.runMaintainerSync('risk-score');

        const ownerScore = await waitForBaseScore({
          entityId: owner.expectedEuid,
          waitLabel: `aggregated propagated score for owner ${owner.expectedEuid}`,
          predicate: (score) => {
            const relatedEntityIds = score.related_entities?.map((entity) => entity.entity_id) ?? [];
            return (
              hasPositiveCalculatedScore(score) &&
              relatedEntityIds.includes(hostA.expectedEuid) &&
              relatedEntityIds.includes(hostB.expectedEuid)
            );
          },
        });

        expect(ownerScore.score_type).to.eql('base');
        expect(ownerScore.calculated_score_norm).to.be.greaterThan(0);
      });

      it('keeps propagated base scoring when the owner is also resolved', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName: `chain-host-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `chain-target-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `chain-alias-${shortId}` }),
        ]);
        const [host, targetUser, aliasUser] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [host.documentId, aliasUser.documentId],
          alerts: 2,
          riskScore: 45,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 3 });

        await maintainerScenario.setEntityOwnsRelationships({
          testEntity: aliasUser,
          ownedEntityIds: [host.expectedEuid],
        });
        await maintainerScenario.setEntityResolutionTarget({
          testEntity: aliasUser,
          resolvedToEntityId: targetUser.expectedEuid,
        });
        await waitForOwnsRelationship(aliasUser.expectedEuid, [host.expectedEuid]);
        await waitForResolutionRelationship(aliasUser.expectedEuid, targetUser.expectedEuid);

        await maintainerRoutes.runMaintainerSync('risk-score');

        const aliasBaseScore = await waitForBaseScore({
          entityId: aliasUser.expectedEuid,
          waitLabel: `propagated alias base score for ${aliasUser.expectedEuid}`,
          predicate: (score) =>
            hasPositiveCalculatedScore(score) &&
            score.related_entities?.some((entity) => entity.entity_id === host.expectedEuid) === true,
        });

        expect(aliasBaseScore.score_type).to.eql('base');
        expect(aliasBaseScore.calculated_score_norm).to.be.greaterThan(0);
      });

      it('removes propagated contribution after ownership is cleared', async () => {
        const shortId = uuidv4().slice(0, 8);
        const { testEntities } = await maintainerScenario.seedEntities([
          riskScoreMaintainerEntityBuilders.host({ hostName: `unlink-host-${shortId}` }),
          riskScoreMaintainerEntityBuilders.idpUser({ userName: `unlink-owner-${shortId}` }),
        ]);
        const [host, owner] = testEntities;

        await maintainerScenario.createAlertsForDocumentIds({
          documentIds: [host.documentId],
          alerts: 1,
          riskScore: 50,
        });

        await entityStoreUtils.installEntityStoreV2({
          entityTypes: ['user', 'host'],
          dataViewPattern: testLogsIndex,
        });
        await waitForEntityStoreEntities({ es, log, count: 2 });

        await maintainerScenario.setEntityOwnsRelationships({
          testEntity: owner,
          ownedEntityIds: [host.expectedEuid],
        });
        await waitForOwnsRelationship(owner.expectedEuid, [host.expectedEuid]);

        await maintainerRoutes.runMaintainerSync('risk-score');

        const linkedScore = await waitForBaseScore({
          entityId: owner.expectedEuid,
          waitLabel: `linked propagated score for ${owner.expectedEuid}`,
          predicate: (score) =>
            hasPositiveCalculatedScore(score) &&
            score.related_entities?.some((entity) => entity.entity_id === host.expectedEuid) === true,
        });

        await maintainerScenario.setEntityOwnsRelationships({
          testEntity: owner,
          ownedEntityIds: [],
        });
        await waitForOwnsRelationship(owner.expectedEuid, []);

        await maintainerRoutes.runMaintainerSync('risk-score');

        const allScores = normalizeScores(await readRiskScores(es));
        const newerPropagatedScore = allScores.find(
          (score) =>
            score.id_value === owner.expectedEuid &&
            score.score_type === 'base' &&
            score.calculation_run_id !== linkedScore.calculation_run_id &&
            score.related_entities?.some((entity) => entity.entity_id === host.expectedEuid)
        );

        expect(newerPropagatedScore).to.be(undefined);
      });
    });
  });
};
