/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';
import { lmdJobIds, padJobIds } from '../../src/ml_helpers';
import { deleteEntityEngines, installEntityStoreV2AndWait } from '../../src/setup_helpers';

/**
 * Multi-skill routing prompts (P-MS1, P-MS2, and new cross-domain prompts).
 * These prompts require the AI to route to MULTIPLE tools in a single response.
 * Unlike partial_feasibility.spec.ts which asserts a single tool, these examples
 * assert that BOTH tools are called (all toolCalls entries must pass).
 *
 * Entity documents are not required. The entity store is installed because
 * security.search_entities stays unavailable until the latest-entities index exists.
 */
evaluate.describe(
  'SIEM Entity Analytics - Multi-Skill Routing',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ log, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });
    });

    evaluate.afterAll(async ({ log, supertest }) => {
      await deleteEntityEngines({ supertest, log });
    });

    evaluate('entity analytics multi-skill routing questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: multi-skill routing',
          description:
            'Cross-domain prompts requiring multiple tools to be called in a single response',
          examples: [
            {
              input: {
                question: 'Which privileged users have anomalous activity?',
              },
              output: {
                criteria: [
                  'Use both ML jobs and risk score or entity analytics to surface privileged users with anomalous activity.',
                  'Do not fabricate user or anomaly data.',
                ],
                toolCalls: [
                  {
                    id: 'find.security.ml.jobs',
                    criteria: [
                      `The response uses find.security.ml.jobs with at least one PAD or LMD job ID (e.g. ${[
                        ...padJobIds,
                        ...lmdJobIds,
                      ]
                        .slice(0, 3)
                        .join(
                          ', '
                        )}), or explains that ML jobs are required for anomaly detection.`,
                    ],
                  },
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses entity analytics (risk score or asset criticality) to identify or enrich privileged users.',
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
                  'Use both ML anomaly detection and entity analytics to surface privileged accounts with unusual access patterns.',
                  'Do not fabricate account or access data.',
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
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses entity analytics to identify or rank privileged accounts by risk or criticality.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me high-risk users with anomalous login patterns',
              },
              output: {
                criteria: [
                  'Use both risk scoring and ML anomaly detection to identify high-risk users with anomalous logins.',
                  'Do not fabricate user, risk, or login data.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses entity analytics risk scoring to identify or filter high-risk users.',
                    ],
                  },
                  {
                    id: 'find.security.ml.jobs',
                    criteria: [
                      'The response uses find.security.ml.jobs to detect anomalous login patterns via security auth or related ML jobs.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Which business-critical assets have had risk score increases?',
              },
              output: {
                criteria: [
                  'Use both asset criticality and risk scoring to surface business-critical assets with risk increases.',
                  'Do not fabricate asset or risk data.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses asset criticality to identify business-critical assets.',
                    ],
                  },
                  {
                    id: 'security.get_entity_risk_score_history',
                    criteria: [
                      'The response uses risk score history to detect risk score increases or changes over time.',
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
