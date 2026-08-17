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
  SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID,
} from '../../tools/siem_migrations';
import {
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
  MIGRATION_NAME_DISAMBIGUATION_BLOCK,
  MIGRATION_TYPE_DISAMBIGUATION_BLOCK,
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
} from './shared/content';

export const automaticMigrationRulesStopMigrationSkill = defineSkillType({
  id: 'automatic-migration-rules-stop-migration',
  name: 'automatic-migration-rules-stop-migration',
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

- \`security.siem_migration.get_all_rule_migration_stats\` — resolve a migration name to its id and
  check its current status.
- \`security.siem_migration.get_rule_migration\` — fetch a single migration by id; used as a
  pasted-id fallback (see Name→ID block).
- \`security.siem_migration.stop_rule_migration\` — stop the migration. Mutating; user confirmation
  is requested automatically before this tool executes.

## Workflow

1. **Resolve the migration** by name using \`get_all_rule_migration_stats\` (Name→ID block).
   If the user pastes an id, verify it with \`get_rule_migration\`.
2. **Check status**: if the migration is not currently \`running\`, tell the user — there is nothing
   to stop. Do NOT call \`stop_rule_migration\` on a non-running migration.
3. **Confirm**: state the migration name and that the running translation will be paused. The
   platform will prompt the user for confirmation before the tool executes.
4. **Execute**: call \`stop_rule_migration\` with the resolved migration id.
5. **Report**: show the returned \`{ stopped: boolean }\`. If \`stopped: false\`, tell the user the
   migration may have already finished or stopped on its own.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

To resume a stopped migration or check its progress, route the user to the
**automatic-migration-rules-start-migration** or **automatic-migration-rules-summarize** sibling skill.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
    SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID,
  ],
});
