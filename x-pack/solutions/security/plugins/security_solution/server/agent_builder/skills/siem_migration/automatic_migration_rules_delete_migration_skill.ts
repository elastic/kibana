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
  SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID,
  SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID,
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

export const automaticMigrationRulesDeleteMigrationSkill = defineSkillType({
  id: RULE_MIGRATION_SKILLS.DELETE,
  name: 'automatic-migration-rules-delete-migration',
  basePath: 'skills/security/siem_migrations',
  description: `Permanently delete an Automatic Rule Migration and all its associated rule items and resources.

This action is irreversible. The skill resolves the migration by name, checks it is not currently running, and requires explicit user confirmation before deleting.`,
  content: `
# Delete an Automatic Rule Migration

## When to use this skill

- When the user wants to **permanently delete** a rule migration and all its translated rules.
- ${MIGRATION_TYPE_DISAMBIGUATION_BLOCK}

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${MIGRATION_NAME_DISAMBIGUATION_BLOCK}

## Available Tools

- \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` — resolve a migration name to its id
  and check whether it is currently running.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` — fetch stats for a single migration by id;
  also used as a pasted-id fallback (see Name→ID block).
- \`${SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID}\` — stop a running migration before deletion.
- \`${SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID}\` — permanently delete the migration and all its
  rule items. Destructive and irreversible; user confirmation is requested automatically.

## Workflow

1. **Resolve the migration** by name using \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` (Name→ID block).
   If the user pastes an id, verify it with \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`.
2. **Check status**: if the migration is currently \`running\`, do NOT call \`${SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID}\`.
   Echo the migration's **full name verbatim** (e.g. "Splunk Q1 Running"), then call
   \`${SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID}\` to stop it. Once stopped, proceed to step 3.
3. **Warn**: your response MUST use the word **irreversible** and MUST echo the migration's full
   name verbatim. Example: "I found 'Splunk Q1 Stopped'. This action is permanent and
   **irreversible** — all translated rule items will be deleted. There is no undo."
4. **Execute**: call \`${SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID}\` with the resolved migration id.
5. **Report**: confirm deletion by name (e.g. "Migration 'Splunk Q1 Stopped' has been deleted.").
   The tool returns \`{ ok: true, migration_id }\`; use the resolved name, not the id.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

To check progress before deciding to delete, route to **${RULE_MIGRATION_SKILLS.SUMMARIZE}**.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID,
    SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID,
  ],
});
