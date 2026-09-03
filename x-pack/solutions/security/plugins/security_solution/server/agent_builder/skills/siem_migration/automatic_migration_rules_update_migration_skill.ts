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

## Example Flows

| User intent | What to do |
|---|---|
| "Rename 'Splunk Q3' to 'Splunk Q3 - reviewed'" | Prompt if no new name provided → body \`{ name: 'Splunk Q3 - reviewed' }\` |

## Workflow

1. **Resolve the migration** by name using \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` (Name→ID block).
   If the user pastes an id, verify it with \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`.
2. **Gather the new name**: prompt ONLY if the user has not already supplied it.
3. **Execute**: echo the migration's **exact full name** and the new value, then call
   \`${SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID}\` with the resolved migration id and the new \`name\`.
4. **Report**: always echo the migration's full resolved name verbatim (e.g. "Migration 'Splunk Q3'
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
