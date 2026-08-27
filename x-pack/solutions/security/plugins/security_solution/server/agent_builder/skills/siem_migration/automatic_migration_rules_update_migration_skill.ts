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
  SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID,
} from '../../tools/siem_migrations';
import {
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
  MIGRATION_NAME_DISAMBIGUATION_BLOCK,
  MIGRATION_TYPE_DISAMBIGUATION_BLOCK,
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
} from './rules/content';
import { RULE_MIGRATION_SKILLS } from './rules/skill_ids';

export const automaticMigrationRulesUpdateMigrationSkill = defineSkillType({
  id: RULE_MIGRATION_SKILLS.UPDATE,
  name: RULE_MIGRATION_SKILLS.UPDATE,
  basePath: 'skills/security/siem_migrations',
  description: `Rename an Automatic Rule Migration.

Prompts for the new name and applies the change. Use when the user wants to rename a migration.`,
  content: `
# Update an Automatic Rule Migration

## When to use this skill

- When the user wants to **rename** a migration.
- ${MIGRATION_TYPE_DISAMBIGUATION_BLOCK}

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${MIGRATION_NAME_DISAMBIGUATION_BLOCK}

## Available Tools

- \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` — resolve a migration name to its id.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` — fetch stats for a single migration by id;
  also used as a pasted-id fallback (see Name→ID block).
- \`${SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID}\` — update \`name\` only. Mutating.

## Scope Limit — What This Skill Can and Cannot Update

This skill calls \`PATCH /{migration_id}\` to update the migration's **name** only:
- ✅ Rename the migration: changes the display name everywhere.
- ❌ **Change the default index pattern** — not supported by this skill. Direct the user to the
  Automatic Migration UI (**LaunchPad → Manage Automatic Migrations**).
- ❌ **Rewriting \`MISSING_INDEX_PATTERN_PLACEHOLDER\` in already-translated rule queries** — that
  is a separate operation accessible only via the Automatic Migration UI, not through Agent Builder.

If the user asks about index patterns (changing the migration's default or replacing the placeholder
in translated rules), explain the distinction and direct them to the Automatic Migration UI.
Do NOT call \`${SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID}\` for those requests.

## Example Flows

| User intent | What to do |
|---|---|
| "Rename 'Splunk Q3' to 'Splunk Q3 - reviewed'" | Prompt if no new name provided → body \`{ name: 'Splunk Q3 - reviewed' }\` |
| "Fix the index patterns in the translated rules for my Splunk Q3 migration" | Scope-limit: explain this is UI-only, route to Automatic Migration UI |

## Workflow

1. **Resolve the migration** by name using \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` (Name→ID block).
   If the user pastes an id, verify it with \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`.
2. **Gather the new name**: prompt ONLY if the user has not already supplied it.
3. **Scope check**: if the user's intent is to change an index pattern or rewrite placeholder
   patterns in translated rules, route them to the Automatic Migration UI and stop — do not call
   the update tool.
4. **Execute**: echo the migration's **exact full name** and the new value, then call
   \`${SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID}\` with the resolved migration id and the new \`name\`.
5. **Report**: always echo the migration's full resolved name verbatim (e.g. "Migration 'Splunk Q3'
   has been renamed to 'Splunk Q3 - reviewed'"). The tool returns only \`{ ok: true, migration_id }\`;
   use the name from step 1, never the id.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

To check migration progress, route the user to the **${RULE_MIGRATION_SKILLS.SUMMARIZE}** skill.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID,
  ],
});
