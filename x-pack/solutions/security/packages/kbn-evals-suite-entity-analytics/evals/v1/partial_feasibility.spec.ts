/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';
import { padJobIds, lmdJobIds } from '../../src/ml_helpers';
import { deleteEntityEngines, installEntityStoreV2AndWait } from '../../src/setup_helpers';

/**
 * Tier 2b partial-feasibility prompts. The system may produce a reasonable answer;
 * criteria use looser assertions (e.g. query structure, tool usage). Some may need data seeding.
 * The entity store is installed because security.search_entities stays unavailable
 * until the latest-entities index exists.
 */
evaluate.describe(
  'SIEM Entity Analytics - Partial Feasibility',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ log, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });
    });

    evaluate.afterAll(async ({ log, supertest }) => {
      await deleteEntityEngines({ supertest, log });
    });

    evaluate('entity analytics partial feasibility questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: partial feasibility',
          description:
            'Prompts with partial feasibility; assert AI uses appropriate tools or builds reasonable queries',
          examples: [
            {
              input: {
                question: "Who's had the biggest jump in risk score in the last day?",
              },
              output: {
                criteria: [
                  'Use risk score or entity analytics to answer; query risk-score indices (e.g. risk-score.risk-score-default) with time range.',
                  'Return at least one entity with risk change, or clearly state no data or no trend concept.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses entity analytics risk score (or related) capability; ESQL may use MIN/MAX or time-bounded query.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What are the riskiest hosts in my environment that are high impact?',
              },
              output: {
                criteria: [
                  'Combine risk and impact/criticality where possible; return riskiest high-impact hosts or explain data needs.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses at least one of risk_score or asset_criticality to surface hosts by risk or criticality.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: "Has John Smith's risk score changed significantly?",
              },
              output: {
                criteria: [
                  'Use risk score over time for the named user; return whether change is significant or not, or explain lack of trend data.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity_risk_score_history',
                    criteria: [
                      'The response uses risk score history for John Smith, by name or entity id.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What activities did user jsmith123 perform?',
              },
              output: {
                criteria: [
                  'Use logs or entity-related queries to describe activity for the user; do not fabricate specific events.',
                ],
                toolCalls: [],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'What systems did this compromised account interact with?',
              },
              output: {
                criteria: [
                  'Use entity relationships, alerts, or logs to surface systems the account interacted with, or explain that data is needed.',
                ],
                toolCalls: [],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Has anyone sent emails with large attachments?',
              },
              output: {
                criteria: [
                  'Build a reasonable query or explain that email/attachment data is required; do not fabricate results.',
                ],
                toolCalls: [],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me accounts with increasing risk trends',
              },
              output: {
                criteria: [
                  'Use risk score over time (ESQL over risk-score indices) or clearly state that risk trend concept is limited.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses entity analytics risk score with a time-bounded or scoring-over-time query where applicable.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which privileged users have anomalous activity?',
              },
              output: {
                criteria: [
                  'Use ML jobs (e.g. PAD, LMD) and optionally risk score to surface privileged users with anomalies.',
                ],
                toolCalls: [
                  {
                    id: 'find.security.ml.jobs',
                    criteria: [
                      `The response uses find.security.ml.jobs and at least one of: ${[
                        ...padJobIds,
                        ...lmdJobIds,
                      ]
                        .slice(0, 3)
                        .join(', ')} or similar PAD/LMD job IDs, or risk/entity analytics.`,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question:
                  'Are any privileged accounts accessing systems outside their normal scope?',
              },
              output: {
                criteria: [
                  'Use ML jobs (e.g. PAD) or entity analytics to surface privileged accounts with unusual access.',
                ],
                toolCalls: [
                  {
                    id: 'find.security.ml.jobs',
                    criteria: [
                      `The response uses find.security.ml.jobs with PAD or privileged-access job IDs (e.g. ${padJobIds
                        .slice(0, 2)
                        .join(', ')}), or explains that ML jobs are required.`,
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
