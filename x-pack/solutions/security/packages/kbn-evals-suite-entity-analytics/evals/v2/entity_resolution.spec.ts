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
  linkEntitiesForResolution,
  setResolutionRuleEnabled,
} from '../../src/setup_helpers';

/**
 * entity-resolution skill — tool routing evals for entity resolution.
 *
 * These specs validate that the `manage-resolution` skill correctly routes:
 * - inspecting a resolution group (security.get_resolution_group)
 * - linking / unlinking entities (security.link_entities / security.unlink_entities)
 * - enumerating and toggling the managed resolution rules (security.list_resolution_rules,
 *   security.enable_resolution_rule, security.disable_resolution_rule)
 */

// Fresh, never-linked pair — used by the link-flow eval. Mirrors the skill's own example flow.
const LINK_TARGET_EUID = 'user:jsmith123';
const LINK_ALIAS_EUID = 'user:jsmith.contractor';

// Pre-linked in beforeAll — used by the inspect eval.
const INSPECT_TARGET_EUID = 'user:alice.hr';
const INSPECT_ALIAS_EUID = 'user:alice.contractor';

// Pre-linked in beforeAll — used by the unlink-flow eval.
const UNLINK_TARGET_EUID = 'user:bob.admin';
const UNLINK_ALIAS_EUID = 'user:bob.temp';

const DISABLE_TEST_RULE_ID = 'windows_sid_bridge';
const ENABLE_TEST_RULE_ID = 'email_exact_match';

evaluate.describe(
  'SIEM Entity Analytics V2 Skill - Entity Resolution',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate.beforeAll(async ({ log, esClient, supertest }) => {
      await installEntityStoreV2AndWait({ supertest, log });

      await bulkIndexEntities({
        esClient,
        entities: [
          { euid: LINK_TARGET_EUID },
          { euid: LINK_ALIAS_EUID },
          { euid: INSPECT_TARGET_EUID },
          { euid: INSPECT_ALIAS_EUID },
          { euid: UNLINK_TARGET_EUID },
          { euid: UNLINK_ALIAS_EUID },
        ],
      });

      await linkEntitiesForResolution({
        supertest,
        targetId: INSPECT_TARGET_EUID,
        entityIds: [INSPECT_ALIAS_EUID],
      });
      await linkEntitiesForResolution({
        supertest,
        targetId: UNLINK_TARGET_EUID,
        entityIds: [UNLINK_ALIAS_EUID],
      });

      // Pin rule state so the enable/disable questions are unambiguous for the agent
      // regardless of what a prior run left behind.
      await setResolutionRuleEnabled({ supertest, ruleId: DISABLE_TEST_RULE_ID, enabled: true });
      await setResolutionRuleEnabled({ supertest, ruleId: ENABLE_TEST_RULE_ID, enabled: false });
    });

    evaluate.afterAll(async ({ log, supertest }) => {
      try {
        // Restore default-enabled state for both managed rules pinned in beforeAll.
        await setResolutionRuleEnabled({ supertest, ruleId: DISABLE_TEST_RULE_ID, enabled: true });
        await setResolutionRuleEnabled({ supertest, ruleId: ENABLE_TEST_RULE_ID, enabled: true });
      } catch (err) {
        log.warning(`Resolution rule cleanup failed during teardown: ${(err as Error).message}`);
      }
      await deleteEntityEngines({ supertest, log });
    });

    evaluate('entity resolution: inspect a resolution group', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: inspect resolution group',
          description:
            'Questions asking who/what an entity is resolved with route to security.get_resolution_group',
          examples: [
            {
              input: {
                question: `Who is ${INSPECT_TARGET_EUID} resolved with?`,
              },
              output: {
                criteria: [
                  `Call security.get_resolution_group to look up the group for ${INSPECT_TARGET_EUID}.`,
                  `State that ${INSPECT_ALIAS_EUID} is linked as an alias of ${INSPECT_TARGET_EUID} (the group has 2 members).`,
                  'This is read-only — no confirmation prompt and no mutating tool call.',
                ],
                toolCalls: [
                  {
                    id: 'security.get_resolution_group',
                    criteria: [
                      `The tool is called with entityId "${INSPECT_TARGET_EUID}" (or the equivalent bare name).`,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Resolution Inspect' },
            },
          ],
        },
      });
    });

    evaluate('entity resolution: link entities flow', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: link entities',
          description:
            'Questions asking to merge/link entities together route to security.link_entities with a HITL confirmation',
          examples: [
            {
              input: {
                question: `These two are the same user — merge ${LINK_ALIAS_EUID} into ${LINK_TARGET_EUID}.`,
              },
              output: {
                criteria: [
                  `Call security.link_entities with ${LINK_TARGET_EUID} as the target and ${LINK_ALIAS_EUID} as the entity to link.`,
                  'Surface the confirmation step (the tool is HITL-gated) rather than claiming the merge already happened.',
                ],
                toolCalls: [
                  {
                    id: 'security.link_entities',
                    criteria: [
                      `The tool is called with targetId "${LINK_TARGET_EUID}" and entityIds containing "${LINK_ALIAS_EUID}".`,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Resolution Link' },
            },
          ],
        },
      });
    });

    evaluate('entity resolution: unlink entities flow', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: unlink entities',
          description:
            'Questions asking to unlink/unmerge/split entities route to security.unlink_entities with a HITL confirmation',
          examples: [
            {
              input: {
                question: `Unlink ${UNLINK_ALIAS_EUID} from its resolution group.`,
              },
              output: {
                criteria: [
                  `Call security.unlink_entities with ${UNLINK_ALIAS_EUID} in entityIds.`,
                  'Surface the confirmation step rather than claiming the unlink already happened.',
                ],
                toolCalls: [
                  {
                    id: 'security.unlink_entities',
                    criteria: [
                      `The tool is called with entityIds containing exactly ["${UNLINK_ALIAS_EUID}"].`,
                    ],
                  },
                ],
              },
              metadata: { query_intent: 'Resolution Unlink' },
            },
          ],
        },
      });
    });

    evaluate('entity resolution: enumerate resolution rules', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'entity-analytics-v2: enumerate resolution rules',
          description:
            'Questions enumerating the managed resolution rules route to security.list_resolution_rules',
          examples: [
            {
              input: {
                question: 'What resolution rules do we have, and which are enabled?',
              },
              output: {
                criteria: [
                  'List the managed resolution rules with their id, a short description, and enabled state (a markdown table is fine).',
                  'Do not fabricate rule ids or descriptions not returned by the tool.',
                ],
                toolCalls: [
                  {
                    id: 'security.list_resolution_rules',
                    criteria: ['The tool is called with no arguments.'],
                  },
                ],
              },
              metadata: { query_intent: 'Resolution Rules Enumerate' },
            },
          ],
        },
      });
    });

    evaluate(
      'entity resolution: enable / disable resolution rule flows',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'entity-analytics-v2: enable / disable resolution rule',
            description:
              'Questions asking to enable/disable a named resolution rule route to the matching mutation tool with a HITL confirmation. Listing rules is covered by the enumerate example; these examples do not require another list call.',
            examples: [
              {
                input: {
                  question: 'Disable the Windows SID bridge resolution rule.',
                },
                output: {
                  criteria: [
                    `Call security.disable_resolution_rule with ruleId "${DISABLE_TEST_RULE_ID}".`,
                    'Surface the confirmation step rather than claiming the rule was already disabled.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.disable_resolution_rule',
                      criteria: [`The tool is called with ruleId "${DISABLE_TEST_RULE_ID}".`],
                    },
                  ],
                },
                metadata: { query_intent: 'Resolution Rule Disable' },
              },
              {
                input: {
                  question: 'Turn on the email exact-match resolution rule.',
                },
                output: {
                  criteria: [
                    `Call security.enable_resolution_rule with ruleId "${ENABLE_TEST_RULE_ID}".`,
                    'Surface the confirmation step rather than claiming the rule was already enabled.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.enable_resolution_rule',
                      criteria: [`The tool is called with ruleId "${ENABLE_TEST_RULE_ID}".`],
                    },
                  ],
                },
                metadata: { query_intent: 'Resolution Rule Enable' },
              },
            ],
          },
        });
      }
    );
  }
);
