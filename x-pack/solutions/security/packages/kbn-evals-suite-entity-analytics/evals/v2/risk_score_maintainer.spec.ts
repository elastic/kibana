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

evaluate.describe(
  'SIEM Entity Analytics V2 Skill - Risk Score Maintainer Tests',
  { tag: tags.serverless.security.complete },
  () => {
    const testLogsIndex = 'logs-testlogs-default';
    const testLogsTemplate = 'logs-testlogs-default-template';

    evaluate.beforeAll(async ({ log, esClient: es, supertest }) => {
      await createAlertsIndex(supertest, log);
      await setupMaintainerLogsDataStream({ es, index: testLogsIndex, template: testLogsTemplate });

      const indexListOfDocuments = indexListOfDocumentsFactory({ es, log, index: testLogsIndex });
      const userEntities = Array.from({ length: 10 }, (_, i) =>
        buildTestEntity(riskScoreMaintainerEntityBuilders.idpUser({ userName: `user-${i}` }))
      );
      await indexListOfDocuments(userEntities.map(({ document }) => document));

      const createAndSyncRuleAndAlerts = createAndSyncRuleAndAlertsFactory({
        supertest,
        log,
        indices: [testLogsIndex],
      });
      await createAndSyncRuleAndAlerts({
        query: userEntities.map(({ documentId }) => `id: ${documentId}`).join(' or '),
        alerts: userEntities.length,
        riskScore: 40,
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

      await waitForRiskScoreForId({
        es,
        log,
        idValue: userEntities[0].expectedEuid,
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

    evaluate('entity store v2: risk score maintainer questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: risk score maintainer',
          description:
            'Questions to test the SIEM Entity Analytics V2 skill - risk score with seeded data',
          examples: [
            {
              input: {
                question: 'Which users have the highest risk scores?',
              },
              output: {
                criteria: [
                  'Return 10 users with the highest risk scores.',
                  'Return the risk scores of those users.',
                  'Return the risk levels of those users.',
                  'Return the criticality of these users',
                  'Do not fabricate entity data.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool is called with parameters that sort or filter by risk score (e.g. riskScoreMin or default sort by risk score).',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: "Show me how user-1's risk score has changed over the last 90 days",
              },
              output: {
                criteria: [
                  "Analyse user-1's risk score history over the last 90 days.",
                  'State whether the change is significant or not significant.',
                  'Include previous and current risk scores where available.',
                  'Do not fabricate entity or risk data.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity',
                    criteria: [
                      'The tool is called with an entityId matching "user-1" and an interval parameter of "90d" or equivalent.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which 15 users have the highest risk scores right now?',
              },
              output: {
                criteria: [
                  'Return up to 15 users ranked by risk score.',
                  'Return the risk scores of those users.',
                  'Return the risk levels of those users.',
                  'Return the criticality of these users',
                  'Do not fabricate entity data.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The tool is called with a maxResults parameter of 15 or equivalent to return 15 results.',
                    ],
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
