/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { MigrationId } from '../tools/siem_migrations/common/schemas';
import {
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
  SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID,
} from '../tools/siem_migrations';
import { RULE_MIGRATION_SKILLS } from '../skills/siem_migration/rules/skill_ids';

const ruleMigrationItemsDataSchema = z.object({
  migration_id: MigrationId,
  rule_ids: z.array(z.string().min(1).max(256)).max(200).default([]),
  attachmentLabel: z.string().max(500).optional(),
});

type RuleMigrationItemsAttachmentData = z.infer<typeof ruleMigrationItemsDataSchema>;

export const createRuleMigrationItemsAttachmentType = (): AttachmentTypeDefinition => {
  return {
    id: SecurityAgentBuilderAttachments.ruleMigrationItems,
    validate: (input) => {
      const parseResult = ruleMigrationItemsDataSchema.safeParse(input);
      if (parseResult.success) {
        return { valid: true, data: parseResult.data };
      }
      return { valid: false, error: parseResult.error.message };
    },
    format: (attachment: Attachment<string, unknown>) => {
      const { migration_id: migrationId, rule_ids: ruleIds } =
        attachment.data as RuleMigrationItemsAttachmentData;
      return {
        getRepresentation: () => ({
          type: 'text' as const,
          value:
            ruleIds.length > 0
              ? `Migration ID: ${migrationId}\nRule IDs (${ruleIds.length}): ${ruleIds.join(', ')}`
              : `Migration ID: ${migrationId} (all rules in migration)`,
        }),
      };
    },
    getTools: () => [
      SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
      SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
      SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
      SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
      SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID,
    ],
    getAgentDescription: () =>
      `
## Migration Rule Context

This attachment provides one or more SIEM migration rule items for focused review or editing.
The payload contains the migration id and the specific rule ids.

## Available Tools

- \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` — Rule details: original query, vendor,
  translation result, translated ES|QL, comments. Filter by the attached rule ids.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` — Task-progress stats for the migration
  (status, pending / processing / completed / failed counts).
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID}\` — Translation breakdown
  (full / partial / untranslatable / missing index / failed).
- \`${SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID}\` — Resources (macros, lookups,
  reference sets, watchlists) still missing. Check before proposing an ES|QL fix that
  references external resources.
- \`${SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID}\` — Update one or more aspects of the
  translated rule: ES|QL query, prebuilt rule match, or integration. Mutating — requires user
  confirmation. For ES|QL: validates automatically; retry on error before prompting the user.
  Requires a \`comment\` field explaining every aspect changed — it is appended to the rule's
  comment history and shown to the user in the rule details flyout.

## Available Skills (sibling workflows)

- \`${RULE_MIGRATION_SKILLS.UPDATE_TRANSLATED_RULE}\` — Guided correction of a translated rule:
  fix the query, prebuilt rule match, or integration → confirm → apply.
- \`${RULE_MIGRATION_SKILLS.SUMMARIZE}\` — Overview of all migrations (status, rule counts).
  Switch to this skill when the user shifts from individual rules to broader migration management.
- \`${RULE_MIGRATION_SKILLS.START}\` — Start, reprocess, or resume a migration's translation run.
- \`${RULE_MIGRATION_SKILLS.STOP}\` — Stop a running migration.
- \`${RULE_MIGRATION_SKILLS.UPDATE}\` — Rename a migration.
- \`${RULE_MIGRATION_SKILLS.DELETE}\` — Permanently delete a migration and all its rule items.

## Approach

1. You can directly route to skill \`${RULE_MIGRATION_SKILLS.UPDATE_TRANSLATED_RULE}\` and in case user requests something else, you can
switch to sibling workflows/skills
`.trim(),
  };
};
