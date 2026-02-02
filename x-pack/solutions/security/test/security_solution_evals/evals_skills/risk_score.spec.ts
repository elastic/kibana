/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { buildDocument } from '@kbn/test-suites-security-solution-apis/test_suites/entity_analytics/utils';
import { dataGeneratorFactory } from '@kbn/test-suites-security-solution-apis/test_suites/detections_response/utils';

import { evaluate } from '../src/evaluate';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';

const AGENT_ID = agentBuilderDefaultAgentId;

evaluate.describe(
  'Security Entity Analytics (Skills) - Risk Scores',
  { tag: '@svlSecurity' },
  () => {
    evaluate.describe('without data', () => {
      // No beforeAll needed - this tests the case where risk engine is not enabled
      evaluate(
        'entity analytics risk score questions (skills) - without data',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'entity-analytics-skills: risk score without data',
              description:
                'Risk score questions validated via Agent Builder skills (risk engine disabled)',
              agentId: AGENT_ID,
              examples: [
                {
                  input: { question: 'Which users have the highest risk scores?' },
                  output: {
                    criteria: [
                      'Responds about risk scores, risk engine, or indicates no data/results found',
                    ],
                    toolCalls: [{ id: 'invoke_skill' }],
                  },
                  metadata: { query_intent: 'Factual' },
                },
              ],
            },
          });
        }
      );
    });

    evaluate.describe('with risk score data', () => {
      const userId = uuidv4();

      evaluate.beforeAll(async ({ log, esClient, spaceId }) => {
        const { indexListOfDocuments } = dataGeneratorFactory({
          es: esClient,
          index: `ecs_compliant-${spaceId}`, // Space-scoped index
          log,
        });

        // Create the space-scoped ECS compliant index
        await esClient.indices.create(
          {
            index: `ecs_compliant-${spaceId}`,
            mappings: {
              properties: {
                '@timestamp': { type: 'date' },
                'user.name': { type: 'keyword' },
                'host.name': { type: 'keyword' },
              },
            },
          },
          { ignore: [400] }
        );

        const userDocs = Array(10)
          .fill({})
          .map((_, index) => buildDocument({ user: { name: `user-${index}` } }, userId));
        await indexListOfDocuments(userDocs);

        /**
         * Seed risk score indices directly with minimal documents the skills query.
         * This avoids needing risk engine to be enabled and creates space-scoped data.
         */
        const latestIndex = `risk-score.risk-score-latest-${spaceId}`;
        const timeSeriesIndex = `risk-score.risk-score-${spaceId}`;

        await esClient.indices.create({ index: latestIndex }, { ignore: [400] });
        await esClient.indices.create({ index: timeSeriesIndex }, { ignore: [400] });

        const now = new Date();
        const nowIso = now.toISOString();
        const daysAgo = (n: number) =>
          new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

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

        // Seed latest index with top risky users
        for (let i = 0; i < 10; i++) {
          const name = `user-${i}`;
          const score = 95 - i * 5; // descending
          bulkBody.push({ index: { _index: latestIndex } });
          bulkBody.push({
            '@timestamp': nowIso,
            user: { name, risk: makeUserRisk(name, nowIso, score) },
          });
        }

        // Seed time-series index with multiple points for user-1 over ~90 days
        const series = [
          { ts: daysAgo(90), score: 15 },
          { ts: daysAgo(45), score: 55 },
          { ts: daysAgo(1), score: 85 },
        ];
        for (const { ts, score } of series) {
          bulkBody.push({ index: { _index: timeSeriesIndex } });
          bulkBody.push({
            '@timestamp': ts,
            user: { name: 'user-1', risk: makeUserRisk('user-1', ts, score) },
          });
        }

        // Add at least one extra entity to time-series index so wildcard queries have data there too
        bulkBody.push({ index: { _index: timeSeriesIndex } });
        bulkBody.push({
          '@timestamp': nowIso,
          user: { name: 'user-0', risk: makeUserRisk('user-0', nowIso, 90) },
        });

        const bulkRes = await esClient.bulk({ refresh: 'wait_for', operations: bulkBody as any });
        if (bulkRes.errors) {
          log.warning(
            `Risk score seed bulk had errors: ${JSON.stringify(bulkRes.items).slice(0, 2000)}`
          );
        }
      });

      // evaluate.afterAll(async ({ esClient, spaceId }) => {
      //   // Cleanup space-scoped indices
      //   await esClient.indices.delete(
      //     {
      //       index: [
      //         `ecs_compliant-${spaceId}`,
      //         `risk-score.risk-score-latest-${spaceId}`,
      //         `risk-score.risk-score-${spaceId}`,
      //       ],
      //     },
      //     { ignore: [404] }
      //   );
      // });

      evaluate('top risky users (skills)', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-skills: risk score',
            description: 'Risk score questions validated via Agent Builder skills',
            agentId: AGENT_ID,
            examples: [
              {
                input: { question: 'Which users have the highest risk scores?' },
                output: {
                  criteria: [
                    'Returns at least 5 users',
                    'Mentions risk scores (0-100 normalized or equivalent)',
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
              {
                input: {
                  question: "Show me how user-1's risk score has changed over the last 90 days",
                },
                output: {
                  criteria: ['Mentions risk score changes over time', 'Mentions user-1'],
                  toolCalls: [
                    {
                      id: 'invoke_skill',
                      criteria: [
                        'The agent should invoke the skill tool "entity_analytics_get_risk_score_time_series".',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: { question: 'Which 10 users have the highest risk scores right now?' },
                output: {
                  criteria: ['Mentions top risky users', 'Mentions risk scores'],
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
  }
);
