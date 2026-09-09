/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID,
} from '../../tools/siem_migrations';
import {
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
  MIGRATION_NAME_DISAMBIGUATION_BLOCK,
  MIGRATION_TYPE_DISAMBIGUATION_BLOCK,
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
} from './rules/content';

export const automaticMigrationRulesStartMigrationSkill = defineSkillType({
  id: 'automatic-migration-rules-start-migration',
  name: 'automatic-migration-rules-start-migration',
  basePath: 'skills/security/siem_migrations',
  description: `Start, reprocess, or resume an Automatic Rule Migration translation run.

Resolves the inference endpoint (AI connector), confirms the mutating action with the user, and picks the right request body (START vs REPROCESS vs RESUME) from the rule migration state.`,
  content: `
# Start / Reprocess / Resume an Automatic Rule Migration

## When to use this skill

- When user wants to **start**, **reprocess**, or **resume** an Automatic Rule Migration translation run.
- ${MIGRATION_TYPE_DISAMBIGUATION_BLOCK}

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${MIGRATION_NAME_DISAMBIGUATION_BLOCK}

## Available Tools

- \`security.siem_migration.get_all_rule_migration_stats\` — resolve a migration name to its id.
- \`security.siem_migration.get_rule_migration\` — fetch a single migration by id (name, created_by,
  created_at, last_execution) and verify a pasted id.
- \`security.siem_migration.get_rule_migration_stats\` — task status (ready / running / stopped /
  interrupted / finished) and per-state item counts. Returns an empty zero-shape for no items.
- \`security.siem_migration.get_rule_migration_translation_stats\` — translation counts (full /
  partial / untranslatable / installable / failed). Returns an empty zero-shape for no items.
- \`security.siem_migration.get_migration_rules\` — resolve rule **titles** to rule **item ids**
  for \`selection.ids\` (page is zero-based).
- \`security.siem_migration.start_rule_migration\` — the mutating action. See decision policy below.
- \`platform.core.list_inference_endpoints\` — list available inference endpoints (AI connectors)
  so the user can pick one.

## Workflow

1. **Resolve the migration**: get the migration id from the name (Name→ID block). If the user
   pastes an id, verify it with \`get_rule_migration\`.
2. **Inspect state**: call \`get_rule_migration_stats\` and \`get_rule_migration_translation_stats\`
   to read the task status and translation counts. Use the decision matrix below to pick the
   request body.
3. **Resolve the inference endpoint (AI connector)** (START and RESUME only): call
   \`list_inference_endpoints\`, present the options, and ALWAYS ask the user which inference
   endpoint (AI connector) to use. Never choose one automatically.
4. **Confirm**: state exactly what you will do (START / REPROCESS / RESUME), which rules are
   affected, and that it consumes connector credits. Wait for explicit confirmation.
5. **Execute**: call \`start_rule_migration\` with the body chosen in step 2.

## START vs REPROCESS vs RESUME Decision Matrix

If the \`status\` of the migration from \`get_rule_migration_stats\` and the translation counts from
\`get_rule_migration_translation_stats\`. Both are single-source — do not cross-reference counts
between them.

| Task status | items.pending | Translation counts | Action | Request body |
|---|---|---|---|---|
| \`ready\` | any | any | **START** (first run) | \`{ settings: { connector_id, skip_prebuilt_rules_matching } }\` |
| \`finished\` | 0 | \`rules.failed > 0\` | **REPROCESS failed** | \`{ settings: { connector_id, skip_prebuilt_rules_matching }, retry: "failed" }\` |
| \`finished\` | 0 | \`rules.success.result.partial > 0\` OR \`untranslatable > 0\` | **REPROCESS not_fully_translated** | \`{ settings: { connector_id, skip_prebuilt_rules_matching }, retry: "not_fully_translated" }\` |
| \`finished\` | 0 | User-selected rules, including rules with mixed statuses | **REPROCESS selected** | \`{ settings: { connector_id, skip_prebuilt_rules_matching }, retry: "selected", selection: { ids } }\` |
| \`finished\` | 0 | \`rules.success.installable > 0\` | Route to **install-automatic-migration-rules** (do not start) | — |
| \`stopped\` or \`interrupted\` | \`items.pending > 0\` | any | **RESUME** (continue the run) | \`{ settings: { connector_id } }\` (no \`retry\`, no \`selection\`) |
| \`running\` | any | any | Do nothing — tell the user it's already running | — |

### Notes on the matrix

#### START
- It is the first execution of a \`ready\` migration. complete \`settings\`  object is required and values must be confirmed with user.
- Ask user for both which inference endpoint (AI connector) they want to use and whether they want to skip prebuilt rules matching. No retry, no selection.

#### REPROCESS ( Also called retry)
- Re-runs a subset of rules. By default, reuse the connector and skip_prebuilt_rules_matching
  values from the last execution (available in \`last_execution\` from \`get_rule_migration_stats\`).
  Only ask the user if they explicitly want to change them.
- Pass \`retry: "failed"\` ONLY to retry only failed rules, or
  \`retry: "not_fully_translated"\` to retry partially translated rules. No selection.
- **REPROCESS a specific subset**: if the user names specific rules to re-run, resolve their
  **titles** to **rule item ids** via \`get_migration_rules\`. Use \`retry: "selected"\` with
  \`selection: { ids }\` when the requested subset contains mixed statuses; the status-wide
  \`failed\` and \`not_fully_translated\` filters cannot represent that selection. A \`selection\`
  WITHOUT \`retry: "selected"\` is a no-op — always pair them and include the required
  \`settings\` object.

#### RESUME
- **RESUME** continues a stopped/interrupted run that still has pending items. It uses the SAME
  body as START (\`{ settings: { connector_id } }\`, no \`retry\`, no \`selection\`). Confirmation of settings is not needed and MUST be same as Last execution values. But user should be informed that you are using values from the last run.

## Interpreting the start response

\`start_rule_migration\` returns \`{ started: boolean }\`:
- \`started: true\` — the task was started/resumed. Tell the user it runs asynchronously; they can
  re-check progress with the summarize skill.
- \`started: false\` — the task did not start (e.g. already running(\`status\` field in migration stats), or no matching items for the retry filter). Report this plainly and suggest re-inspecting the state.

## Before Starting

- Don't ask a question again if you have already got the answer from the user in previous steps. For example, if you have already asked for connector_id and skip_prebuilt_rules_matching, don't ask again.
- Show users complete all the parameters in form of table before running the tool in all cases i.e. START, REPROCESS and RESUME.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

If the user asks to install rules, delete a migration, or update an index
pattern, route them to the relevant sibling skill — this skill only starts/reprocesses/resumes.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
    SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID,
    platformCoreTools.listInferenceEndpoints,
  ],
});
