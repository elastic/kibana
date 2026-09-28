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
 * Entity Store V2 - graph preview evals.
 *
 * Validates that "show me the graph for this host" / "how is this user
 * connected?" prompts route to the `security.get_entity_graph` tool and persist
 * the `security.entity_graph` conversation attachment (the inline preview),
 * rather than dumping raw node/edge data or attempting to embed the full
 * interactive graph investigation.
 *
 * Seed strategy mirrors `entity_attachment_side_effect.spec.ts`: install V2
 * engines and bulk-index a host and a user directly into the latest alias. The
 * assertion only needs the entities to be resolvable by
 * `security.get_entity_graph`, which resolves against the latest alias; the
 * graph data itself is fetched client-side by the attachment renderer and is
 * not exercised by the converse flow.
 *
 * Seeded entities:
 *   host:attach-web01 — asset.criticality high_impact
 *   user:attach-alice — asset.criticality high_impact
 */
evaluate.describe(
  'SIEM Entity Analytics V2 Skill - Graph Preview',
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

    evaluate('entity store v2: graph preview', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: graph preview',
          description:
            'Validates get_entity_graph tool routing and the security.entity_graph attachment for "show the graph" / "how is this connected" prompts against seeded entity store V2 data.',
          examples: [
            {
              input: {
                question: 'Show me the relationship graph for host attach-web01',
              },
              output: {
                criteria: [
                  'Render the entity relationship graph preview for host attach-web01.',
                  'Do not dump raw graph nodes/edges as JSON or a table.',
                  'Do not claim to embed the full interactive graph investigation inline.',
                  'Do not fabricate entity data.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity_graph',
                    criteria: [
                      'The tool is called with an entityId matching "attach-web01" (prefixed or non-prefixed form).',
                    ],
                  },
                ],
                attachments: [
                  {
                    type: 'security.entity_graph',
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
                question: 'How is user attach-alice connected to other entities?',
              },
              output: {
                criteria: [
                  'Render the entity relationship graph preview for user attach-alice.',
                  'Do not dump raw graph nodes/edges as JSON or a table.',
                  'Do not fabricate connections that are not in the data.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity_graph',
                    criteria: [
                      'The tool is called with an entityId matching "attach-alice" (prefixed or non-prefixed form).',
                    ],
                  },
                ],
                attachments: [
                  {
                    type: 'security.entity_graph',
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
                question: 'Show me the graph for host zzz_missing_999xyz',
              },
              output: {
                criteria: [
                  'Clearly state that the entity zzz_missing_999xyz was not found.',
                  'Do not fabricate a graph for a non-existent entity.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_entity_graph',
                    criteria: [
                      'The tool is called with an entityId matching "zzz_missing_999xyz" or equivalent.',
                    ],
                  },
                ],
                attachments: [
                  {
                    type: 'security.entity_graph',
                    count: { exact: 0 },
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
