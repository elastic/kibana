/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
} from '../../tools/siem_migrations';
import {
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
} from './rules/content';
import { RULE_MIGRATION_SKILLS } from './rules/skill_catalog';

export const automaticMigrationRulesSummarizeSkill = defineSkillType({
  id: RULE_MIGRATION_SKILLS.SUMMARIZE.id,
  name: RULE_MIGRATION_SKILLS.SUMMARIZE.id,
  basePath: 'skills/security/siem_migrations',
  description: RULE_MIGRATION_SKILLS.SUMMARIZE.description,
  content: `
# When to use this skill

Use this skill when the user wants an **overview of Automatic Migrations** — the feature that
translates third-party (Sentinel, QRadar, Splunk) rules into Elastic detection rules. This skill
is read-only: it inspects and summarizes, it does not mutate.

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

## Available Tools

- \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` — list task-progress stats for every
  migration available to the user (id, name, vendor, status, pending/processing/completed/failed
  counts). Start here when the user has no specific migration in mind.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` — task-progress stats for ONE migration
  (id, name, status, per-state rule counts, last_execution). Also the pasted-id fallback (see
  Name→ID block). Returns an empty zero-shape when the migration has no items.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID}\` — translation stats for ONE
  migration: total, full/partial/untranslatable, installable, prebuilt, missing-index, failed.
  Returns an empty zero-shape when the migration has no items.
- \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` — list the rules in one migration with their
  translation result and status (projected fields only). Supports filtering and pagination.
- \`${SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID}\` — the resources (macros,
  lookups, reference sets, watchlists) a single migration (by id) is still missing, as
  \`{ name, type }\` items.
  The only source of truth for missing resources.

## Workflow

1. **Overview**: if the user asks for a summary with no migration in mind, call
   \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` and present the list.
2. **Drill in**: if the user names a migration, resolve the name to an id (Name→ID block) and call
   \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` for config and task progress, and
   \`${SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID}\` for translation breakdown, and
   \`${SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID}\` for missing resources (always).
3. **Rules**: if the user wants to see the rules inside a migration, call \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\`
   with the resolved id (page is zero-based).
4. **Missing resources**: always part of a single-migration summary — do not wait for the user to
   ask. Answer only from \`${SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID}\` — never
   infer missing resources from translation stats or per-rule translation results.

## Rendering

- **Overview**: a compact table — name, vendor, status, and a progress summary
  (completed/total). Rows are shown newest-first (matching the Kibana UI).
  Sorting can be requested via the \`sort_field\` parameter on the rules-list tool if the user
  asks for a different order within a migration's rules; the migrations overview cannot be sorted.
- **Single migration**: open with one sentence naming the migration. Show name, vendor, task status,
  and a counts breakdown (pending / processing / completed / failed; full / partial /
  untranslatable / installable). If \`last_execution\` is present (from \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`),
  show connector id, started_at, and any error.
- **Rules**: a table of original title, translated title (or "—"), translation result, status.
  State the page number and that more pages exist when \`total\` exceeds the rows shown.
- **Missing resources** (part of every single-migration summary): group by \`type\` and list every
  resource name under its type, with a count per type. An empty result means nothing is missing — say so. To resolve them, the user
  uploads the resources in the Automatic Migration UI and reprocesses the affected rules
  (\`${RULE_MIGRATION_SKILLS.START.id}\` skill).

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

## Grounding

Every id, status, and count you state must come from a tool result in this conversation. Never
invent a migration id or name. If a tool returns an empty zero-shape (no items), say so plainly
("this migration has no rules yet") rather than fabricating progress.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
    SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
  ],
});
