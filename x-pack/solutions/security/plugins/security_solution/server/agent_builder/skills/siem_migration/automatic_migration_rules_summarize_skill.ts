/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
} from '../../tools/siem_migrations';
import {
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
} from './rules/content';

export const automaticMigrationRulesSummarizeSkill = defineSkillType({
  id: 'automatic-migration-rules-summarize',
  name: 'automatic-migration-rules-summarize',
  basePath: 'skills/security/siem_migrations',
  description: `Summarize Automatic Rule Migration progress: list every rule migration with its status and rule counts, or drill into one migration's task progress and translation stats.

Use when the user asks "how are my rule migrations doing", wants an overview, or asks about a specific rule migration by name.

Read-only. Automatic Migration also covers dashboards — this skill handles rule migrations only.`,
  content: `
# When to use this skill

Use this skill when the user wants an **overview of Automatic Migrations** — the feature that
translates third-party (Sentinel, QRadar, Splunk) rules into Elastic detection rules. This skill
is read-only: it inspects and summarizes, it does not mutate.

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

## Available Tools

- \`security.siem_migration.get_all_rule_migration_stats\` — list task-progress stats for every
  migration available to the user (id, name, vendor, status, pending/processing/completed/failed
  counts). Start here when the user has no specific migration in mind.
- \`security.siem_migration.get_rule_migration\` — fetch a single migration by id: name, created_by,
  created_at, last_execution. Also the pasted-id fallback (see Name→ID block).
- \`security.siem_migration.get_rule_migration_stats\` — task-progress stats for ONE migration
  (status + per-state rule counts). Returns an empty zero-shape when the migration has no items.
- \`security.siem_migration.get_rule_migration_translation_stats\` — translation stats for ONE
  migration: total, full/partial/untranslatable, installable, prebuilt, missing-index, failed.
  Returns an empty zero-shape when the migration has no items.
- \`security.siem_migration.get_migration_rules\` — list the rules in one migration with their
  translation result and status (projected fields only). Supports filtering and pagination.

## Workflow

1. **Overview**: if the user asks for a summary with no migration in mind, call
   \`get_all_rule_migration_stats\` and present the list.
2. **Drill in**: if the user names a migration, resolve the name to an id (Name→ID block) and call
   \`get_rule_migration\` for its config, \`get_rule_migration_stats\` for task progress, and
   \`get_rule_migration_translation_stats\` for translation breakdown.
3. **Rules**: if the user wants to see the rules inside a migration, call \`get_migration_rules\`
   with the resolved id (page is zero-based).

## Rendering

- **Overview**: a compact table — name, vendor, status, and a progress summary
  (completed/total). Sort by last-updated descending unless the user asks otherwise.
- **Single migration**: open with one sentence naming the migration. Show name, vendor, task status,
  and a counts breakdown (pending / processing / completed / failed; full / partial /
  untranslatable / installable). If \`last_execution\` is present (from \`get_rule_migration_stats\`),
  show connector id, started_at, and any error.
- **Rules**: a table of original title, translated title (or "—"), translation result, status.
  State the page number and that more pages exist when \`total\` exceeds the rows shown.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

## Grounding

Every id, status, and count you state must come from a tool result in this conversation. Never
invent a migration id or name. If a tool returns an empty zero-shape (no items), say so plainly
("this migration has no rules yet") rather than fabricating progress.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  ],
});
