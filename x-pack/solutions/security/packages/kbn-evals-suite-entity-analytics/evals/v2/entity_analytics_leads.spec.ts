/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';

/**
 * Leads skill — list_leads tool routing evals.
 *
 * These specs validate that the leads skill correctly routes lead-review questions
 * to the `security.list_leads` tool. Tool routing assertions work without
 * pre-seeded leads data; the tool may return an empty list but the call must
 * still be made.
 */
evaluate.describe(
  'SIEM Entity Analytics - Leads Skill',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('leads skill: list_leads tool routing', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: leads',
          description:
            'Questions that should route to the security.list_leads tool via the leads skill',
          examples: [
            {
              input: {
                question: 'Show me the current open investigation leads',
              },
              output: {
                criteria: [
                  'Return a list of open (active) investigation leads, or clearly state no leads were found.',
                  'Include lead title, priority, and status for each result where available.',
                  'Do not fabricate lead data.',
                ],
                toolCalls: [
                  {
                    id: 'security.list_leads',
                    criteria: [
                      'The tool is called to retrieve leads; optionally with status "active".',
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Factual' },
            },
            {
              input: {
                question: 'Show me the dismissed leads',
              },
              output: {
                criteria: [
                  'Return dismissed leads, or clearly state no dismissed leads were found.',
                  'Do not fabricate lead data.',
                ],
                toolCalls: [
                  {
                    id: 'security.list_leads',
                    criteria: ['The tool is called with status "dismissed".'],
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
