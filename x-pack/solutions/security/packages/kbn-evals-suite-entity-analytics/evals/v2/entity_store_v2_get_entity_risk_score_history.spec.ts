/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';
import {
  bulkIndexEntities,
  deleteEntityEngines,
  installEntityStoreV2AndWait,
} from '../../src/setup_helpers';

/**
 * Entity Store V2 - risk score history chart evals.
 *
 * Validates that "has the risk score changed" / "show the risk trend" /
 * "risk score history chart" prompts route to
 * `security.get_entity_risk_score_history` and persist the
 * `security.entity_risk_score_history` conversation attachment.
 *
 * Seed strategy: install V2 engines and bulk-index a host and a user directly into the latest alias.
 * The assertion only needs the entities to be resolvable; history entries may be
 * empty when no risk-score docs are seeded — the tool still emits the chart
 * attachment (with an empty series).
 *
 * Seeded entities:
 *   host:attach-web01 — asset.criticality high_impact
 *   user:attach-alice — asset.criticality high_impact
 */
evaluate.describe(
  'SIEM Entity Analytics V2 Skill - Risk Score History',
  { tag: tags.serverless.security.complete },
  () => {
    const hostEuid = 'host:attach-web01';
    const userEuid = 'user:attach-alice';

    evaluate.beforeAll(async ({ log, esClient, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });
      await bulkIndexEntities({
        esClient,
        entities: [
          { euid: hostEuid, assetCriticality: 'high_impact' },
          { euid: userEuid, assetCriticality: 'high_impact' },
        ],
      });
    });

    evaluate.afterAll(async ({ log, supertest }) => {
      await deleteEntityEngines({ supertest, log });
    });

    evaluate('entity store v2: risk score history', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: risk score history',
          description:
            'Validates get_entity_risk_score_history tool routing and the security.entity_risk_score_history attachment for risk-over-time / chart prompts against seeded entity store V2 data.',
          examples: [
            {
              input: {
                question:
                  "Has host attach-web01's risk score changed significantly over the last 90 days?",
              },
              output: {
                criteria: [
                  "Analyse attach-web01's risk score history over the last 90 days and state whether the change is significant, or clearly state that no risk score history is available.",
                  'Do not dump every history data point as a markdown table — the chart attachment shows the series.',
                  'Do not fabricate risk score history.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity_risk_score_history',
                    criteria: [
                      'The tool is called with an entityId matching "attach-web01" (prefixed or non-prefixed form) and a time range covering roughly the last 90 days (e.g. from "now-90d" or equivalent).',
                    ],
                  },
                ],
                attachments: [
                  {
                    type: 'security.entity_risk_score_history',
                    shape: 'single',
                    entityType: 'host',
                    entityId: 'attach-web01',
                    count: { min: 1 },
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },

            {
              input: {
                question:
                  'Show me the risk score history chart for user attach-alice for the last 30 days',
              },
              output: {
                criteria: [
                  'Render the risk score history chart for user attach-alice over the last 30 days, or clearly state that no risk score history is available.',
                  'Do not dump every history data point as a markdown table.',
                  'Do not fabricate risk score history.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity_risk_score_history',
                    criteria: [
                      'The tool is called with an entityId matching "attach-alice" (prefixed or non-prefixed form) and a time range covering roughly the last 30 days (e.g. from "now-30d" or equivalent).',
                    ],
                  },
                ],
                attachments: [
                  {
                    type: 'security.entity_risk_score_history',
                    shape: 'single',
                    entityType: 'user',
                    entityId: 'attach-alice',
                    count: { min: 1 },
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },

            {
              input: {
                question:
                  'How has the resolution risk score of user attach-alice changed over time?',
              },
              output: {
                criteria: [
                  'Render or summarise the resolution-group risk score trend for user attach-alice, or clearly state that no resolution risk history is available.',
                  'Do not confuse the resolution-group series with the entity base score unless the tool returned base.',
                  'Do not fabricate risk score history.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity_risk_score_history',
                    criteria: [
                      'The tool is called with an entityId matching "attach-alice" and scoreType set to "resolution".',
                    ],
                  },
                ],
                attachments: [
                  {
                    type: 'security.entity_risk_score_history',
                    shape: 'single',
                    entityType: 'user',
                    entityId: 'attach-alice',
                    count: { min: 1 },
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
