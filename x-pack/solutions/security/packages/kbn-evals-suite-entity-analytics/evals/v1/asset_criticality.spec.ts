/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';
import { deleteEntityEngines, installEntityStoreV2AndWait } from '../../src/setup_helpers';

/**
 * Asset criticality prompts (P-AC1, P-AC2). Uses security.search_entities.
 * The tool is unavailable until the space has a latest-entities index, so the
 * store is installed first. Seeding criticality data is only needed for grounding.
 */
evaluate.describe(
  'SIEM Entity Analytics Skill - Asset Criticality',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ log, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });
    });

    evaluate.afterAll(async ({ log, supertest }) => {
      await deleteEntityEngines({ supertest, log });
    });

    evaluate('entity analytics asset criticality questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: asset criticality',
          description: 'Questions to test the SIEM Entity Analytics skill - asset criticality tool',
          examples: [
            {
              input: {
                question: 'What is the asset criticality of host X?',
              },
              output: {
                criteria: [
                  'Use the entity analytics asset criticality capability to answer.',
                  'Return the asset criticality for the host, or clearly state that no data is available for host X.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses the asset criticality tool or clearly explains that the host was not found.',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me all business-critical assets with elevated risk',
              },
              output: {
                criteria: [
                  'Return business-critical assets and their risk, or explain that asset criticality and risk data are required.',
                  'Do not fabricate asset or risk data; use entity analytics tools.',
                ],
                toolCalls: [
                  {
                    id: 'security.search_entities',
                    criteria: [
                      'The response uses entity search to surface business-critical or high-risk entities.',
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
