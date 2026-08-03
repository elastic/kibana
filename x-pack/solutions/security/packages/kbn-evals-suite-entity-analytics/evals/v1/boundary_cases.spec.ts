/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';
import { evaluate } from '../../src/evaluate';

/**
 * Tier 3 negative/boundary prompts. The system cannot answer these; the AI must
 * clearly communicate the limitation rather than fabricate. No ES seeding required.
 */
evaluate.describe(
  'SIEM Entity Analytics - Boundary / Negative Cases',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('entity analytics boundary case questions', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics: boundary cases',
          description:
            'Prompts the system cannot answer; AI must gracefully decline or explain the limitation',
          examples: [
            {
              input: {
                question: 'Show users accessing sensitive data outside working hours',
              },
              output: {
                criteria: [
                  'Clearly communicate that working hours or sensitive data classification is not available or not defined in this environment.',
                  'Do not fabricate a list of users or a plausible-looking answer.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Which users accessed systems they never accessed before?',
              },
              output: {
                criteria: [
                  'Clearly communicate that historical baselining or first-time-access analysis is not implemented.',
                  'Do not fabricate user lists or access data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Show me the access timeline for this account',
              },
              output: {
                criteria: [
                  'Clearly communicate that a behavioral or access timeline is not available in this product.',
                  'Do not invent timeline data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Which users have similar patterns to this flagged account?',
              },
              output: {
                criteria: [
                  'Clearly communicate that peer group or similar-pattern analysis is not available.',
                  'Do not fabricate a list of similar users.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Show accounts accessing multiple critical systems in sequence',
              },
              output: {
                criteria: [
                  'Clearly communicate that sequence analysis or ordering of access across critical systems is not supported (or requires EQL).',
                  'Do not fabricate sequence or account data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Has this account established connections across departments?',
              },
              output: {
                criteria: [
                  'Clearly communicate that department data or cross-department connection analysis is not available in ECS.',
                  'Do not fabricate department or connection data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Are there patterns suggesting credential hopping?',
              },
              output: {
                criteria: [
                  'Clearly communicate that credential hopping detection or a dedicated ML job for it is not available.',
                  'Do not fabricate credential hopping or pattern data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Are accounts accessing data outside their department?',
              },
              output: {
                criteria: [
                  'Clearly communicate that department or data-access-by-department is not defined in ECS.',
                  'Do not fabricate department or access data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Has anyone gained new system privileges?',
              },
              output: {
                criteria: [
                  'Clearly communicate that privilege escalation data from integrations is not available.',
                  'Do not fabricate privilege or user data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Which users attempted to modify access rights?',
              },
              output: {
                criteria: [
                  'Clearly communicate that a defined query pattern for rights modification is not available.',
                  'Do not fabricate user or access-rights data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: "What did this user's profile look like back on March 15th?",
              },
              output: {
                criteria: [
                  'Clearly communicate that historical entity snapshot or point-in-time profile is not available.',
                  'Do not invent historical profile data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'How many compliant devices have we had each day this month?',
              },
              output: {
                criteria: [
                  'Clearly communicate that a compliant device concept or metric is not defined.',
                  'Do not fabricate device or compliance counts.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'When was the last time this account changed from inactive to active?',
              },
              output: {
                criteria: [
                  'Clearly communicate that inactive/active state tracking is not available in the entity store.',
                  'Do not fabricate state or timestamp data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Which accounts are behaving differently from their peer group?',
              },
              output: {
                criteria: [
                  'Clearly communicate that peer group analysis is not available.',
                  'Do not fabricate peer group or behavioral comparison data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Show me the behavioral timeline for this entity',
              },
              output: {
                criteria: [
                  'Clearly communicate that a behavioral timeline is not available in Kibana.',
                  'Do not invent timeline or behavioral data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Which users attempted password resets for other accounts?',
              },
              output: {
                criteria: [
                  'Clearly communicate that a defined query for password reset on behalf of others is not available.',
                  'Do not fabricate user or reset data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'When did this user last access this database?',
              },
              output: {
                criteria: [
                  'Clearly communicate that ECS has limited database fields or that this query is not supported.',
                  'Do not fabricate database or access data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Show me failed logins followed by successful ones',
              },
              output: {
                criteria: [
                  'Explicitly recommend EQL (Event Query Language) as the appropriate query type for sequence-based analysis.',
                  'Must NOT generate an ES|QL query to answer this; ES|QL cannot express event ordering or sequences.',
                  'Do not fabricate login or sequence data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: "Who's using admin credentials outside of change windows?",
              },
              output: {
                criteria: [
                  'Clearly communicate that a change window concept is not defined in ECS.',
                  'Do not fabricate admin or window data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'What systems did this user access after being terminated?',
              },
              output: {
                criteria: [
                  'Clearly communicate that termination date is not available in ECS.',
                  'Do not fabricate termination or access data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Which detection rules fired for user X in the last 7 days?',
              },
              output: {
                criteria: [
                  'Clearly communicate that a detection rules skill or dedicated tool is not registered, or that this capability is not available.',
                  'Do not fabricate rule or alert data from undefined skills.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'Show me entities that triggered critical-severity rules',
              },
              output: {
                criteria: [
                  'Clearly communicate that a rules skill or entity-by-rules capability is not available.',
                  'Do not fabricate entities or rule data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
            {
              input: {
                question: 'What rules are most commonly triggering across high-risk users?',
              },
              output: {
                criteria: [
                  'Clearly communicate that rules skill or cross-domain rules-plus-risk analysis is not supported.',
                  'Do not fabricate rules or ranking data.',
                ],
              },
              metadata: { query_intent: 'Boundary' },
            },
          ],
        },
      });
    });
  }
);
