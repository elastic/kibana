/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../evaluate';
import { AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME } from '../../src/skills/evaluate_dataset';

/**
 * Baseline eval suite for the `automatic-migration-context` skill.
 *
 * The context skill is the *pre-translation* surface. Its scope is managing
 * migration resources (macros, lists, lookups), gating destructive ops on a
 * structural `confirm: true`, and explaining that new context applies only on
 * the next translation run — not retroactively.
 */
evaluate.describe('Automatic Migration Skills: Context', { tag: tags.stateful.classic }, () => {
  evaluate.beforeAll(async ({ skillsChatClient, log }) => {
    try {
      await skillsChatClient.converse({ message: 'hello' });
    } catch (e) {
      log.warning(`Warmup failed: ${e}`);
    }
  });

  /* --------------------------------------------------------------------- */
  /*  Scenario 1: List existing resources                                  */
  /* --------------------------------------------------------------------- */

  evaluate('list resources for a migration', async ({ evaluateSkillsDataset }) => {
    await evaluateSkillsDataset({
      skillName: AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME,
      dataset: {
        name: 'security: automatic-migration-context-list',
        description:
          'Operator asks what context is currently attached to a migration. The agent should call security.migration_resources_list and surface the resources in a compact list with id, type, and name.',
        examples: [
          {
            input: {
              question:
                'What context resources are currently attached to migration aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa?',
            },
            output: {
              criteria: [
                'The response calls security.migration_resources_list with the supplied migration_id.',
                'The response surfaces a compact list of resources (id, type, name) rather than dumping the full content of each.',
                'The response does NOT modify any resource (no upsert / remove invocation).',
              ],
            },
            metadata: {
              tool_sequence: ['security.migration_resources_list'],
            },
          },
        ],
      },
    });
  });

  /* --------------------------------------------------------------------- */
  /*  Scenario 2: Upsert naming convention (happy path)                    */
  /* --------------------------------------------------------------------- */

  evaluate('upsert a naming-convention macro', async ({ evaluateSkillsDataset }) => {
    await evaluateSkillsDataset({
      skillName: AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME,
      dataset: {
        name: 'security: automatic-migration-context-upsert-macro',
        description:
          'Operator wants to add a macro defining the standard tag naming convention so the next translation pass stops emitting `splunk_tag`. The agent should list existing resources first to avoid duplicates, validate the payload, surface what is about to be written, and gate on confirmation.',
        examples: [
          {
            input: {
              question:
                'On migration bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb, add a macro called "tag_naming_convention" with content `replace splunk_tag with tags.elastic_normalized` so the translator stops emitting splunk_tag.',
            },
            output: {
              criteria: [
                'The response calls security.migration_resources_list FIRST to check for a pre-existing resource with the same (type, name).',
                'Before invoking the upsert tool, the response shows the payload preview (type=macro, name="tag_naming_convention", first ~200 chars of content).',
                'The response either pauses for confirmation OR passes `confirm: true` only because the user has explicitly approved the diff in the prior turn — never as a default.',
                'After persistence, the response surfaces the "applies on the NEXT translation run" reminder verbatim or in clear paraphrase.',
              ],
            },
            metadata: {
              tool_sequence: [
                'security.migration_resources_list',
                'security.migration_resource_upsert',
              ],
            },
          },
        ],
      },
    });
  });

  /* --------------------------------------------------------------------- */
  /*  Scenario 3: Replace an existing resource (destructive)               */
  /* --------------------------------------------------------------------- */

  evaluate('replace an outdated resource', async ({ evaluateSkillsDataset }) => {
    await evaluateSkillsDataset({
      skillName: AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME,
      dataset: {
        name: 'security: automatic-migration-context-replace',
        description:
          'Operator asks to replace an existing `index_taxonomy` document with an updated one. The agent must surface that this is a REPLACEMENT (overwrites prior content), show the diff, and gate on confirmation. The "rules translated before this change retain the OLD context" semantics must be called out explicitly.',
        examples: [
          {
            input: {
              question:
                'On migration cccccccc-cccc-cccc-cccc-cccccccccccc, replace the existing macro called "index_taxonomy" with new content `logs-* -> elastic.logs.normalized.*`.',
            },
            output: {
              criteria: [
                'The response identifies the operation as a REPLACEMENT (matching `(migration_id, type, name)` already exists).',
                'The response shows the before/after content of the resource explicitly before invoking the upsert tool.',
                'The response either pauses for confirmation OR passes `confirm: true` only because the user has explicitly approved the diff in the prior turn.',
                'The response calls out that previously translated rules retain the OLD context — only the next translation run picks up the new version.',
              ],
            },
            metadata: {
              tool_sequence: [
                'security.migration_resources_list',
                'security.migration_resource_upsert',
              ],
            },
          },
        ],
      },
    });
  });

  /* --------------------------------------------------------------------- */
  /*  Scenario 4: Remove a resource (destructive)                          */
  /* --------------------------------------------------------------------- */

  evaluate('remove a resource', async ({ evaluateSkillsDataset }) => {
    await evaluateSkillsDataset({
      skillName: AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME,
      dataset: {
        name: 'security: automatic-migration-context-remove',
        description:
          'Operator asks to remove an outdated lookup from a migration. The agent must confirm the resource exists, surface what is about to be deleted, and gate on confirmation.',
        examples: [
          {
            input: {
              question:
                'Remove the outdated lookup called "tenant_id_map" from migration dddddddd-dddd-dddd-dddd-dddddddddddd.',
            },
            output: {
              criteria: [
                'The response calls security.migration_resources_list (or relies on a recent listing in context) to confirm the resource exists before issuing the delete.',
                'Before invoking the remove tool, the response surfaces the resource identity (type=lookup, name="tenant_id_map", first ~200 chars of content if available).',
                'The response pauses for confirmation before invoking security.migration_resource_remove.',
              ],
            },
            metadata: {
              tool_sequence: [
                'security.migration_resources_list',
                'security.migration_resource_remove',
              ],
            },
          },
        ],
      },
    });
  });

  /* --------------------------------------------------------------------- */
  /*  Scenario 5: DISTRACTOR — correction request after translation         */
  /* --------------------------------------------------------------------- */

  evaluate(
    'distractor: correction request (post-translation)',
    async ({ evaluateSkillsDataset }) => {
      await evaluateSkillsDataset({
        skillName: AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME,
        dataset: {
          name: 'security: automatic-migration-context-distractor-correction',
          description:
            'Operator asks to fix a rule that has already been translated. The context skill is *pre*-translation; that ask belongs to automatic-migration-correction.',
          examples: [
            {
              input: {
                question:
                  'Fix the ES|QL on the translated rule called "Suspicious PowerShell" in migration eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee.',
              },
              output: {
                criteria: [
                  'The response identifies that the rule has already been translated, so this is a post-translation correction, NOT context.',
                  'The response either refuses politely and references `automatic-migration-correction`, or offers to hand off.',
                  "The response does NOT invoke any of the context skill's resource tools.",
                ],
              },
              metadata: {
                distractor: true,
              },
            },
          ],
        },
      });
    }
  );

  /* --------------------------------------------------------------------- */
  /*  Scenario 6: DISTRACTOR — bulk upload                                  */
  /* --------------------------------------------------------------------- */

  evaluate('distractor: bulk import 50 resources', async ({ evaluateSkillsDataset }) => {
    await evaluateSkillsDataset({
      skillName: AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME,
      dataset: {
        name: 'security: automatic-migration-context-distractor-bulk',
        description:
          'Operator asks to bulk import 50 resources at once. The chat skill is for one-at-a-time interactive work; bulk imports belong to a backfill API. The agent must refuse politely.',
        examples: [
          {
            input: {
              question:
                'I have 50 macros to upload to migration ffffffff-ffff-ffff-ffff-ffffffffffff. Please upload all of them in one go from this zip.',
            },
            output: {
              criteria: [
                'The response refuses the bulk import politely.',
                'The response names the chat-skill scope ("one resource at a time" / "interactive work") as the reason.',
                'The response either points to a bulk-import API OR offers to start with one resource interactively.',
              ],
            },
            metadata: {
              distractor: true,
            },
          },
        ],
      },
    });
  });

  /* --------------------------------------------------------------------- */
  /*  Scenario 7: DISTRACTOR — global resource                              */
  /* --------------------------------------------------------------------- */

  evaluate('distractor: global resource', async ({ evaluateSkillsDataset }) => {
    await evaluateSkillsDataset({
      skillName: AUTOMATIC_MIGRATION_CONTEXT_SKILL_NAME,
      dataset: {
        name: 'security: automatic-migration-context-distractor-global',
        description:
          'Operator asks to upload a resource "globally" (across all migrations). Resources are always scoped to a single migration; the agent must refuse the global framing and ask for a specific migration_id.',
        examples: [
          {
            input: {
              question: 'Upload this naming-convention macro globally so every migration uses it.',
            },
            output: {
              criteria: [
                'The response refuses the "global" framing and explains that resources are migration-scoped.',
                'The response asks for a specific migration_id rather than guessing or proceeding.',
                'The response does NOT invoke security.migration_resource_upsert without a migration_id.',
              ],
            },
            metadata: {
              distractor: true,
            },
          },
        ],
      },
    });
  });
});
