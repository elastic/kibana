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

export const automaticMigrationRulesStopMigrationSkill = defineSkillType({
  id: 'automatic-migration-rules-stop-migration',
  name: RULE_MIGRATION_SKILLS.STOP,
  basePath: 'skills/security/siem_migrations',
  description: `Stop a running Automatic Rule Migration translation run.

Resolves the migration by name, confirms the action with the user, and stops the run. Use when the user wants to pause a migration that is currently translating rules.`,
  content: `
# Stop an Automatic Rule Migration

## When to use this skill

- When the user wants to **stop** a currently running Automatic Rule Migration.
- ${MIGRATION_TYPE_DISAMBIGUATION_BLOCK}

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${MIGRATION_NAME_DISAMBIGUATION_BLOCK}

## Available Tools

- \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` — resolve a migration name to its id and
  check its current status.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` — fetch stats for a single migration by id;
  also used as a pasted-id fallback (see Name→ID block).
- \`${SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID}\` — stop the migration. Mutating; user confirmation
  is requested automatically before this tool executes.

## Workflow

1. **Resolve the migration** by name using \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` (Name→ID block).
   If the user pastes an id, verify it with \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`.
2. **Check status**: if the migration is not currently \`running\`, tell the user — there is nothing
   to stop. Do NOT call \`${SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID}\` on a non-running migration.
3. **Confirm**: state the migration name and that the running translation will be paused. The
   platform will prompt the user for confirmation before the tool executes.
4. **Execute**: call \`${SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID}\` with the resolved migration id.
5. **Report**: show the returned \`{ stopped: boolean }\`. If \`stopped: false\`, tell the user the
   migration may have already finished or stopped on its own.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

To resume a stopped migration or check its progress, route the user to the
**${RULE_MIGRATION_SKILLS.START}** or **${RULE_MIGRATION_SKILLS.SUMMARIZE}** sibling skill.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID,
  ],
});
