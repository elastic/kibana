/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';

/**
 * Entity Store V2 - entity_relationship_history tool routing evals.
 *
 * Validates that temporal relationship questions route to
 * `security.entity_relationship_history`.
 *
 * Tool-routing cases do not require seeded metadata; the tool may return empty
 * records but must still be called.
 */
evaluate.describe(
  'SIEM Entity Analytics V2 Skill - Entity Relationship History',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate(
      'entity store v2: entity relationship history questions',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: entity relationship history',
            description: 'Questions that should route to security.entity_relationship_history',
            examples: [
              {
                input: {
                  question: 'When did user:alice@local first access host:laptopA?',
                },
                output: {
                  criteria: [
                    'Attempt to find the first access relationship between user:alice@local and host:laptopA, or clearly state that no relationship observations were found.',
                    'Do not fabricate relationship timestamps or kinds.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.entity_relationship_history',
                      criteria: [
                        'The tool is called with an entityId matching user:alice@local (or equivalent prefixed form).',
                        'The call includes a target matching host:laptopA and prefers first-seen semantics (sortOrder asc and/or maxResults 1).',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'Has user:alice@local ever communicated with host:laptopA?',
                },
                output: {
                  criteria: [
                    'Attempt to determine whether a communicates_with (or related) observation exists between the user and host, or clearly state none were found.',
                    'Do not fabricate relationship data.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.entity_relationship_history',
                      criteria: [
                        'The tool is called with an entityId matching user:alice@local.',
                        'The call filters by kind communicates_with and/or target host:laptopA.',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'What hosts did user:alice@local touch in the last 30 days?',
                },
                output: {
                  criteria: [
                    'Attempt to list hosts related to user:alice@local in the last ~30 days from relationship history, or clearly state none were found.',
                    'Do not fabricate host names or relationship events.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.entity_relationship_history',
                      criteria: [
                        'The tool is called with an entityId matching user:alice@local.',
                        'The call includes a from filter covering roughly the last 30 days (e.g. now-30d or equivalent).',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
              {
                input: {
                  question: 'When did Alice first access a host?',
                },
                output: {
                  criteria: [
                    "Look up Alice's first-seen relationship history (tool resolves the name), or clearly state the entity / observations were not found.",
                    'Do not fabricate relationship timestamps.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.entity_relationship_history',
                      criteria: [
                        'security.entity_relationship_history is called with an entityId referring to Alice (name or EUID).',
                        'The call prefers first-seen semantics (sortOrder asc and/or maxResults 1).',
                      ],
                    },
                  ],
                },
                metadata: { query_intent: 'Factual' },
              },
            ],
          },
        });
      }
    );
  }
);
