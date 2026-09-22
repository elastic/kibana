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
 * Entity Store V2 — set_asset_criticality tool evals.
 *
 * Validates tool selection, argument extraction, confirmation gating, and
 * the unassign path for the `security.set_asset_criticality` action tool.
 */
evaluate.describe(
  'SIEM Entity Analytics V2 Skill - Set Asset Criticality',
  { tag: tags.serverless.security.complete },
  () => {
    const server1Euid = 'host:crit-server1';
    const aliceEuid = 'user:crit-alice';

    evaluate.beforeAll(async ({ log, esClient, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log, entityTypes: ['user', 'host'] });

      await bulkIndexEntities({
        esClient,
        entities: [{ euid: server1Euid, assetCriticality: 'low_impact' }, { euid: aliceEuid }],
      });
    });

    evaluate.afterAll(async ({ log, supertest }) => {
      await deleteEntityEngines({ supertest, log });
    });

    evaluate(
      'set_asset_criticality: tool routing and HITL confirmation',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: set_asset_criticality',
            description:
              'Validates that the entity-analytics skill routes criticality-set requests to ' +
              'security.set_asset_criticality, extracts the correct arguments, and presents ' +
              'a HITL confirmation before executing.',
            examples: [
              {
                input: {
                  question: 'Mark host crit-server1 as high impact',
                },
                output: {
                  criteria: [
                    'Ask the user to confirm before setting the asset criticality, or indicate that a confirmation prompt was presented.',
                    'Do not report that the criticality was changed without user confirmation.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.set_asset_criticality',
                      criteria: [
                        'The tool is called with entityId matching "crit-server1" (prefixed "host:crit-server1" or non-prefixed form).',
                        'The tool is called with entityType "host".',
                        'The tool is called with criticality "high_impact".',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Action' },
              },
              {
                input: {
                  question: 'Remove the asset criticality for user crit-alice',
                },
                output: {
                  criteria: [
                    'Ask the user to confirm before removing the asset criticality, or indicate that a confirmation prompt was presented.',
                    'Do not report the criticality as removed without user confirmation.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.set_asset_criticality',
                      criteria: [
                        'The tool is called with entityId matching "crit-alice" (prefixed "user:crit-alice" or non-prefixed form).',
                        'The tool is called with entityType "user".',
                        'The tool is called with criticality "unassigned".',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Action' },
              },
              // Argument extraction — level from natural language.
              {
                input: {
                  question: 'Set crit-server1 to extreme impact',
                },
                output: {
                  criteria: [
                    'Ask the user to confirm before setting the criticality, or indicate that a confirmation prompt was presented.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.set_asset_criticality',
                      criteria: [
                        'The tool is called with criticality "extreme_impact".',
                        'The tool is called with entityId referencing "crit-server1".',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Action' },
              },
            ],
          },
        });
      }
    );
  }
);
