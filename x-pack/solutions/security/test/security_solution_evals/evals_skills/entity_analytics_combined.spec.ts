/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { assetCriticalityRouteHelpersFactory } from '@kbn/test-suites-security-solution-apis/test_suites/entity_analytics/utils/asset_criticality';
import { getPrivilegedMonitorUsersIndex } from '@kbn/security-solution-plugin/common/entity_analytics/privileged_user_monitoring/utils';
import { evaluate } from '../src/evaluate';
import { cleanStandardListExceptAction } from '../src/helpers/saved_objects_cleanup';
import { seedAuthAnomalies, getMlAnomalyIndex } from '../src/helpers/ml_anomalies';

/**
 * Agent ID used for all entity analytics skills evaluation tests.
 * This references the default agent builder agent that has access to all registered skills.
 */
const AGENT_ID = agentBuilderDefaultAgentId;

/**
 * Test indices and data identifiers for cleanup tracking.
 */
const ENTITY_STORE_EVAL_INDEX = '.entities.skills_evals_combined';

evaluate.describe(
  'Security Entity Analytics (Skills) - Combined Evaluation',
  { tag: '@svlSecurity' },
  () => {
    /**
     * Global setup: Clean any stale saved objects from previous runs.
     * This ensures a clean slate for all entity analytics skill tests.
     */
    evaluate.beforeAll(async ({ kbnClient }) => {
      await cleanStandardListExceptAction(kbnClient);
    });

    /**
     * Global teardown: Clean up saved objects created during tests.
     */
    evaluate.afterAll(async ({ kbnClient }) => {
      await cleanStandardListExceptAction(kbnClient);
    });

    /**
     * Risk Score Evaluation Suite
     * Tests the entity_analytics_get_risk_scores and entity_analytics_get_risk_score_time_series tools.
     */
    evaluate.describe('Risk Scores', () => {
      evaluate.beforeAll(async ({ esClient, spaceId, log }) => {
        const latestIndex = `risk-score.risk-score-latest-${spaceId}`;
        const timeSeriesIndex = `risk-score.risk-score-${spaceId}`;

        await esClient.indices.create({ index: latestIndex }, { ignore: [400] });
        await esClient.indices.create({ index: timeSeriesIndex }, { ignore: [400] });

        const now = new Date();
        const nowIso = now.toISOString();

        const makeUserRisk = (name: string, ts: string, scoreNorm: number) => {
          const level =
            scoreNorm >= 75
              ? 'High'
              : scoreNorm >= 50
                ? 'Moderate'
                : scoreNorm >= 25
                  ? 'Low'
                  : 'Unknown';
          return {
            '@timestamp': ts,
            id_field: 'user.name',
            id_value: name,
            calculated_level: level,
            calculated_score: scoreNorm,
            calculated_score_norm: scoreNorm,
            category_1_score: scoreNorm,
            category_1_count: 1,
            inputs: [],
            notes: [],
            modifiers: [],
          };
        };

        const bulkBody: Array<Record<string, unknown>> = [];
        for (let i = 0; i < 5; i++) {
          const name = `combined-user-${i}`;
          const score = 90 - i * 10;
          bulkBody.push({ index: { _index: latestIndex } });
          bulkBody.push({
            '@timestamp': nowIso,
            user: { name, risk: makeUserRisk(name, nowIso, score) },
          });
        }

        const bulkRes = await esClient.bulk({ refresh: 'wait_for', operations: bulkBody as any });
        if (bulkRes.errors) {
          log.warning(`Risk score seed bulk had errors: ${JSON.stringify(bulkRes.items).slice(0, 2000)}`);
        }
      });

      evaluate.afterAll(async ({ esClient, spaceId }) => {
        await esClient.indices.delete(
          {
            index: [
              `risk-score.risk-score-latest-${spaceId}`,
              `risk-score.risk-score-${spaceId}`,
            ],
          },
          { ignore: [404] }
        );
      });

      evaluate('queries top risky entities', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-combined: risk scores',
            description: 'Risk score queries via entity analytics skills',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Which users have the highest risk scores?' },
                output: {
                  criteria: [
                    'Returns user entities with risk information',
                    'Mentions risk scores or risk levels',
                  ],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_get_risk_scores".',
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
    });

    /**
     * Asset Criticality Evaluation Suite
     * Tests the entity_analytics_get_asset_criticality tool.
     */
    evaluate.describe('Asset Criticality', () => {
      evaluate.beforeAll(async ({ supertest }) => {
        const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);
        await assetCriticalityRoutes.upsert({
          id_field: 'host.name',
          id_value: 'combined-critical-host',
          criticality_level: 'extreme_impact',
        });
      });

      evaluate.afterAll(async ({ supertest }) => {
        const assetCriticalityRoutes = assetCriticalityRouteHelpersFactory(supertest);
        await assetCriticalityRoutes.delete('host.name', 'combined-critical-host');
      });

      evaluate('lists critical assets', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-combined: asset criticality',
            description: 'Asset criticality queries via entity analytics skills',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'What assets have extreme impact criticality?' },
                output: {
                  criteria: [
                    'Mentions assets or hosts',
                    'Mentions criticality levels or impact',
                  ],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_get_asset_criticality".',
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
    });

    /**
     * Entity Store Evaluation Suite
     * Tests the entity_analytics_search_entity_store tool.
     */
    evaluate.describe('Entity Store', () => {
      evaluate.beforeAll(async ({ esClient }) => {
        await esClient.indices.create(
          {
            index: ENTITY_STORE_EVAL_INDEX,
            mappings: {
              dynamic: true,
              properties: {
                '@timestamp': { type: 'date' },
                entity: {
                  properties: {
                    id: { type: 'keyword' },
                    name: { type: 'keyword' },
                    type: { type: 'keyword' },
                    source: { type: 'keyword' },
                  },
                },
              },
            },
          },
          { ignore: [400] }
        );

        await esClient.index({
          index: ENTITY_STORE_EVAL_INDEX,
          document: {
            '@timestamp': new Date().toISOString(),
            entity: {
              id: 'user:combined-test-user',
              name: 'combined-test-user',
              type: 'user',
              source: 'skills_evals_combined',
            },
          },
          refresh: 'wait_for',
        });
      });

      evaluate.afterAll(async ({ esClient }) => {
        await esClient.indices.delete({ index: ENTITY_STORE_EVAL_INDEX }, { ignore: [404] });
      });

      evaluate('searches entity store', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-combined: entity store',
            description: 'Entity store queries via entity analytics skills',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Find information about combined-test-user in the entity store' },
                output: {
                  criteria: [
                    'Mentions the user or entity',
                    'Returns entity store or profile information',
                  ],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_search_entity_store".',
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
    });

    /**
     * Privileged Users Evaluation Suite
     * Tests the entity_analytics_list_privileged_users tool.
     */
    evaluate.describe('Privileged Users', () => {
      evaluate.beforeAll(async ({ esClient, spaceId }) => {
        await esClient.index({
          index: getPrivilegedMonitorUsersIndex(spaceId),
          document: {
            '@timestamp': new Date().toISOString(),
            user: { name: 'combined-admin-user', is_privileged: true },
            labels: { sources: ['api'] },
          },
          refresh: 'wait_for',
        });
      });

      evaluate.afterAll(async ({ esClient, spaceId }) => {
        await esClient.indices.delete(
          { index: getPrivilegedMonitorUsersIndex(spaceId) },
          { ignore: [404] }
        );
      });

      evaluate('lists privileged users', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-combined: privileged users',
            description: 'Privileged user monitoring queries via entity analytics skills',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Show all privileged users' },
                output: {
                  criteria: [
                    'Lists privileged user accounts',
                    'Mentions privileged access or elevated permissions',
                  ],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_list_privileged_users".',
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
    });

    /**
     * Anomaly Detection Evaluation Suite
     * Tests the entity_analytics_search_anomalies tool.
     */
    evaluate.describe('Anomaly Detection', () => {
      evaluate.beforeAll(async ({ esClient, spaceId }) => {
        await seedAuthAnomalies(esClient, spaceId);
      });

      evaluate.afterAll(async ({ esClient, spaceId }) => {
        await esClient.indices.delete(
          { index: getMlAnomalyIndex('security_auth', spaceId) },
          { ignore: [404] }
        );
      });

      evaluate('searches anomalies', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-combined: anomalies',
            description: 'Anomaly detection queries via entity analytics skills',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Show me any authentication anomalies detected' },
                output: {
                  criteria: [
                    'Mentions anomalies or ML detection results',
                    'Discusses authentication patterns or suspicious activity',
                  ],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_search_anomalies".',
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
    });
  }
);
