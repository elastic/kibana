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
  SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID,
} from '../../tools/siem_migrations';
import {
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
  MIGRATION_NAME_DISAMBIGUATION_BLOCK,
  MIGRATION_TYPE_DISAMBIGUATION_BLOCK,
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
} from './shared/content';

export const automaticMigrationRulesDeleteMigrationSkill = defineSkillType({
  id: 'automatic-migration-rules-delete-migration',
  name: 'automatic-migration-rules-delete-migration',
  basePath: 'skills/security/siem_migrations',
  description: `Permanently delete an Automatic Rule Migration and all its associated rule items.

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

- \`security.siem_migration.get_all_rule_migration_stats\` — resolve a migration name to its id
  and check whether it is currently running.
- \`security.siem_migration.get_rule_migration\` — fetch a single migration by id; used as a
  pasted-id fallback (see Name→ID block).
- \`security.siem_migration.delete_rule_migration\` — permanently delete the migration and all its
  rule items. Destructive and irreversible; user confirmation is requested automatically.

## Workflow

1. **Resolve the migration** by name using \`get_all_rule_migration_stats\` (Name→ID block).
   If the user pastes an id, verify it with \`get_rule_migration\`.
2. **Check status**: if the migration is currently \`running\`, do NOT delete it — inform the user
   and ask them to stop it first. Route to the **automatic-migration-rules-stop-migration** skill.
3. **Warn**: explain that this action is **permanent and irreversible** — all translated rule items
   will be deleted along with the migration record. There is no undo.
4. **Confirm**: state the migration name and the destructive nature of the action. The platform
   will prompt for confirmation before the tool executes.
5. **Execute**: call \`delete_rule_migration\` with the resolved migration id.
6. **Report**: confirm deletion by name (e.g. "Migration 'Splunk Q3' has been deleted."). The
   tool returns \`{ ok: true, migration_id }\`; use the name you resolved, not the id.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

To stop a running migration before deleting, route to **automatic-migration-rules-stop-migration**.
To check progress before deciding to delete, route to **automatic-migration-rules-summarize**.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
    SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID,
  ],
});
