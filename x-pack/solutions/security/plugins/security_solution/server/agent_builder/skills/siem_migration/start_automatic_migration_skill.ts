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
  AUTOMATIC_MIGRATION_CAPABILITIES_BLOCK,
  NAME_NEVER_ID_BLOCK,
  TYPE_DISAMBIGUATION_BLOCK,
} from './shared/content';

export const startAutomaticMigrationSkill = defineSkillType({
  id: 'start-automatic-migration',
  name: 'start-automatic-migration',
  basePath: 'skills/security/siem_migrations',
  description:
    'Start, reprocess, or resume an Automatic Rule Migration translation run. Resolves the AI ' +
    'connector, confirms the mutating action with the user, and picks the right request body ' +
    '(START vs REPROCESS vs RESUME) from the rule migration state. Mutating — always confirm ' +
    'first. (Automatic Migration also covers dashboards; this skill handles rule migrations only.)',
  content: `
# Start / Reprocess / Resume an Automatic Migration

Use this skill when the user wants to **run** an Automatic Migration translation — the feature
that translates third-party (Sentinel, QRadar, Splunk) rules into Elastic detection rules. This
skill is **mutating**: it consumes AI connector credits and changes migration state. Always
confirm with the user before calling the start tool.

${AUTOMATIC_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${TYPE_DISAMBIGUATION_BLOCK}

## Available Tools

- \`security.siem_migration.get_all_rule_migration_stats\` — resolve a migration name to its id.
- \`security.siem_migration.get_rule_migration\` — inspect a migration's config (connector, index
  pattern, task status) and verify a pasted id.
- \`security.siem_migration.get_rule_migration_stats\` — task status (ready / running / stopped /
  interrupted / finished) and per-state item counts. Returns an empty zero-shape for no items.
- \`security.siem_migration.get_rule_migration_translation_stats\` — translation counts (full /
  partial / untranslatable / installable / failed). Returns an empty zero-shape for no items.
- \`security.siem_migration.get_migration_rules\` — resolve rule **titles** to rule **item ids**
  for \`selection.ids\` (page is zero-based).
- \`security.siem_migration.start_rule_migration\` — the mutating action. See decision policy below.
- \`platform.core.list_ai_connectors\` — list available AI connectors so the user can pick one.

## Workflow

1. **Resolve the migration**: get the migration id from the name (Name→ID block). If the user
   pastes an id, verify it with \`get_rule_migration\`.
2. **Inspect state**: call \`get_rule_migration_stats\` and \`get_rule_migration_translation_stats\`
   to read the task status and translation counts. Use the decision matrix below to pick the
   request body.
3. **Resolve the connector** (START and RESUME only): call \`list_ai_connectors\`, present the
   options, and ALWAYS ask the user which connector to use. Never choose one automatically.
4. **Confirm**: state exactly what you will do (START / REPROCESS / RESUME), which rules are
   affected, and that it consumes connector credits. Wait for explicit confirmation.
5. **Execute**: call \`start_rule_migration\` with the body chosen in step 2.

## START vs REPROCESS vs RESUME Decision Matrix

Read \`status\` from \`get_rule_migration_stats\` and the translation counts from
\`get_rule_migration_translation_stats\`. Both are single-source — do not cross-reference counts
between them.

| Task status | items.pending | Translation counts | Action | Request body |
|---|---|---|---|---|
| \`ready\` | any | any | **START** (first run) | \`{ settings: { connector_id } }\` |
| \`finished\` | 0 | \`rules.failed > 0\` | **REPROCESS failed** | \`{ retry: "failed" }\` |
| \`finished\` | 0 | \`rules.success.result.partial > 0\` OR \`untranslatable > 0\` | **REPROCESS not_fully_translated** | \`{ retry: "not_fully_translated" }\` |
| \`finished\` | 0 | \`rules.success.installable > 0\` | Route to **install-automatic-migration-rules** (do not start) | — |
| \`stopped\` or \`interrupted\` | \`items.pending > 0\` | any | **RESUME** (continue the run) | \`{ settings: { connector_id } }\` (no \`retry\`, no \`selection\`) |
| \`running\` | any | any | Do nothing — tell the user it's already running | — |

### Notes on the matrix

- **START** is the first execution of a \`ready\` migration. \`settings.connector_id\` is required.
  Optionally pass \`settings.skip_prebuilt_rules_matching\` if the user asks to skip prebuilt matches.
- **REPROCESS** re-runs a subset of rules. Pass \`retry: "failed"\` to retry only failed rules, or
  \`retry: "not_fully_translated"\` to retry partial + untranslatable rules. Matching items are
  reset to \`pending\` before the task starts. \`retry: "not_fully_translated"\` has a wider blast
  radius than \`retry: "failed"\` — state which one you are using in the confirmation.
- **REPROCESS a specific subset**: if the user names specific rules to re-run, resolve their
  **titles** to **rule item ids** via \`get_migration_rules\` and pass \`selection: { ids }\`. A
  \`selection\` WITHOUT \`retry: "selected"\` is a no-op — always pair \`selection\` with
  \`retry: "selected"\`. Do not set \`connector_id\` on a reprocess unless the user explicitly asks
  to change it.
- **RESUME** continues a stopped/interrupted run that still has pending items. It uses the SAME
  body as START (\`{ settings: { connector_id } }\`, no \`retry\`, no \`selection\`). Confirm the
  connector with the user first.
- **Install is a different skill**: a \`finished\` migration with \`installable > 0\` rules is ready
  to install, not to start. Route the user to **install-automatic-migration-rules**.

## Interpreting the start response

\`start_rule_migration\` returns \`{ started: boolean }\`:
- \`started: true\` — the task was started/resumed. Tell the user it runs asynchronously; they can
  re-check progress with the summarize skill.
- \`started: false\` — the task did not start (e.g. already running, or no matching items for the
  retry filter). Report this plainly and suggest re-inspecting the state.

## No Silent Mutations

Never start, reprocess, or resume without explicit user confirmation AND a user-chosen connector
id (for START/RESUME). If the user asks to install rules, delete a migration, or update an index
pattern, route them to the relevant sibling skill — this skill only starts/reprocesses/resumes.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
    SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID,
    platformCoreTools.listAiConnectors,
  ],
});
