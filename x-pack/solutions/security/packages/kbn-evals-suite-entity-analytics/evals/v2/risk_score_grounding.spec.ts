/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import {
  createAndSyncRuleAndAlertsFactory,
  deleteAllRiskScores,
  indexListOfDocumentsFactory,
  setupMaintainerLogsDataStream,
  cleanupMaintainerLogsDataStream,
  riskScoreMaintainerEntityBuilders,
  buildTestEntity,
  waitForRiskScoreForId,
} from '@kbn/test-suites-security-solution-apis/test_suites/entity_analytics/utils';
import { deleteAllRules } from '@kbn/detections-response-ftr-services/rules';
import { deleteAllAlerts, createAlertsIndex } from '@kbn/detections-response-ftr-services/alerts';
import { evaluate } from '../../src/evaluate';
import { createEntityMaintainerHelpers } from '../../src/entity_maintainer_helpers';

/**
 * Risk score grounding evals with deterministic seeded data (Entity Store V2).
 *
 * Three users are seeded with deliberately different risk profiles so criteria
 * can assert exact entity names, correct risk levels, and relative ordering.
 * The risk score maintainer normalizes alert-level scores using weighted
 * aggregation, so high-contrast inputs ensure each user lands in a distinct
 * risk level bucket:
 *
 *   eval-alice  — riskScore=99, 50 alerts → Critical
 *   eval-bob    — riskScore=70, 15 alerts → High
 *   eval-carol  — riskScore=25,  2 alerts → Low
 */
evaluate.describe(
  'SIEM Entity Analytics V2 Skill - Risk Score Grounding',
  { tag: tags.serverless.security.complete },
  () => {
    const testLogsIndex = 'logs-testlogs-default';
    const testLogsTemplate = 'logs-testlogs-default-template';

    const alice = buildTestEntity(
      riskScoreMaintainerEntityBuilders.idpUser({ userName: 'eval-alice' })
    );
    const bob = buildTestEntity(
      riskScoreMaintainerEntityBuilders.idpUser({ userName: 'eval-bob' })
    );
    const carol = buildTestEntity(
      riskScoreMaintainerEntityBuilders.idpUser({ userName: 'eval-carol' })
    );

    evaluate.beforeAll(async ({ log, esClient: es, supertest }) => {
      await createAlertsIndex(supertest, log);
      await setupMaintainerLogsDataStream({ es, index: testLogsIndex, template: testLogsTemplate });

      const indexListOfDocuments = indexListOfDocumentsFactory({ es, log, index: testLogsIndex });

      // Seed multiple documents per user so each generates enough alerts
      await indexListOfDocuments([
        ...Array(50).fill(alice.document),
        ...Array(15).fill(bob.document),
        ...Array(2).fill(carol.document),
      ]);

      const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({
        supertest,
        log,
        indices: [testLogsIndex],
      });

      await createAndSyncRuleAndAlerts({
        query: `id: ${alice.documentId}`,
        alerts: 50,
        riskScore: 99,
      });
      await createAndSyncRuleAndAlerts({
        query: `id: ${bob.documentId}`,
        alerts: 15,
        riskScore: 70,
      });
      await createAndSyncRuleAndAlerts({
        query: `id: ${carol.documentId}`,
        alerts: 2,
        riskScore: 25,
      });

      const maintainerHelpers = createEntityMaintainerHelpers(supertest);
      await maintainerHelpers.installEntityStoreV2({
        dataViewPattern: testLogsIndex,
        esClient: es,
      });
      await maintainerHelpers.waitForMaintainerRun('risk-score', {
        minRuns: 1,
        timeoutMs: 120_000,
      });

      // Confirm the highest-risk entity has a score before the eval runs
      await waitForRiskScoreForId({
        es,
        log,
        idValue: alice.expectedEuid,
      });
    });

    evaluate.afterAll(async ({ esClient: es, log, supertest }) => {
      const maintainerHelpers = createEntityMaintainerHelpers(supertest);
      await deleteAllRiskScores(log, es);
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await maintainerHelpers.uninstallEntityStore();
      await cleanupMaintainerLogsDataStream({
        es,
        index: testLogsIndex,
        template: testLogsTemplate,
      });
    });

    evaluate('risk score grounding: known entities', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: risk score grounding',
          description:
            'Grounding evals asserting exact entity names and risk levels from seeded data',
          examples: [
            {
              input: {
                question: 'Which users have the highest risk scores?',
              },
              output: {
                criteria: [
                  'The response must include the user "eval-alice" as the highest-risk user.',
                  'The response must include the user "eval-bob".',
                  'The user "eval-alice" must have a higher risk score than "eval-bob".',
                  'The user "eval-bob" must have a higher risk score than "eval-carol".',
                  'Do not include user names that were not seeded (no hallucinated entity names).',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool is called with parameters that sort or filter by risk score.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What is the risk level for user eval-alice?',
              },
              output: {
                criteria: [
                  'The response must mention "eval-alice" by name.',
                  'The response must report eval-alice as having a Critical risk level.',
                  'Do not fabricate risk score values or risk inputs.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity',
                    criteria: ['The tool is called with an entityId matching "eval-alice".'],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What is the risk level for user eval-bob?',
              },
              output: {
                criteria: [
                  'The response must mention "eval-bob" by name.',
                  'The response must report eval-bob as having a High risk level.',
                  'Do not fabricate risk score values or risk inputs.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity',
                    criteria: ['The tool is called with an entityId matching "eval-bob".'],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What is the risk level for user eval-carol?',
              },
              output: {
                criteria: [
                  'The response must mention "eval-carol" by name.',
                  'The response must report eval-carol as having a Low risk level.',
                  'Do not fabricate risk score values or risk inputs.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity',
                    criteria: ['The tool is called with an entityId matching "eval-carol".'],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me all Critical risk users',
              },
              output: {
                criteria: [
                  'The response must include "eval-alice" as a Critical risk user.',
                  'The response must NOT include "eval-bob" or "eval-carol" as Critical risk users.',
                  'Do not hallucinate entity names that were not seeded.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool query filters by Critical risk level or sorts by risk score descending.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Compare the risk profiles of eval-alice, eval-bob, and eval-carol',
              },
              output: {
                criteria: [
                  'The response must mention all three users: eval-alice, eval-bob, and eval-carol.',
                  'The response must correctly rank them: eval-alice (Critical) > eval-bob (High) > eval-carol (Low).',
                  'The response must report distinct risk levels for each user, not the same level for all.',
                  'Do not fabricate risk score values or risk inputs.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
          ],
        },
      });
    });
  }
);
