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
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID,
  SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
} from '../../tools/siem_migrations';
import {
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
  MIGRATION_NAME_DISAMBIGUATION_BLOCK,
  MIGRATION_TYPE_DISAMBIGUATION_BLOCK,
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
  MIGRATION_STATE_FRESHNESS_BLOCK,
} from './rules/content';
import { RULE_MIGRATION_SKILLS } from './rules/skill_ids';

export const automaticMigrationRulesStartMigrationSkill = defineSkillType({
  id: RULE_MIGRATION_SKILLS.START,
  name: RULE_MIGRATION_SKILLS.START,
  basePath: 'skills/security/siem_migrations',
  description: `Start, reprocess, or resume an Automatic Rule Migration translation run.

Resolves the inference endpoint (AI connector) and picks the right request body (START vs REPROCESS vs RESUME) from the rule migration state.`,
  content: `
# Start / Reprocess / Resume an Automatic Rule Migration

## When to use this skill

- When user wants to **start**, **reprocess**, or **resume** an Automatic Rule Migration translation run.
- ${MIGRATION_TYPE_DISAMBIGUATION_BLOCK}

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${MIGRATION_STATE_FRESHNESS_BLOCK}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${MIGRATION_NAME_DISAMBIGUATION_BLOCK}

## Available Tools

- \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` — resolve a migration name to its id.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` — task status (ready / running / stopped /
  interrupted / finished) and per-state item counts. Returns an empty zero-shape for no items.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID}\` — translation counts (full /
  partial / untranslatable / installable / failed). Returns an empty zero-shape for no items.
- \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` — resolve rule **titles** to rule **item ids**
  for \`selection.ids\` (page is zero-based).
- \`${SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID}\` — list resources the migration
  is still missing (macros, lookups, reference sets, watchlists). Used as a pre-flight check on
  fresh STARTs and REPROCESS (see Pre-flight section below).
- \`${SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID}\` — the mutating action. See decision policy below.
- \`${platformCoreTools.listInferenceEndpoints}\` — list available inference endpoints (AI connectors)
  so the user can pick one.


## Vendor-specific resource terminology

  When displaying missing resources, use the vocabulary the user already knows for their vendor.
  The migration's \`vendor\` is in the \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` response.

  | Vendor | Internal \`type\` values | Display name for the user |
  |---|---|---|
  | \`splunk\` | \`macro\` | Macro |
  | \`splunk\` | \`lookup\` | Lookup |
  | \`qradar\` | \`lookup\`| Reference Set |
  | \`microsoft-sentinel\` | \`lookup\` | Watchlist |

  Example output for a Splunk migration with missing resources:

  > The following resources are missing. Rules that reference them may fail to translate or produce partial results:
  >
  > - **Macros (2):** \`my_macro\`, \`another_macro\`
> - **Lookups (1):** \`threat_intel_lookup\`
  >
  > You can upload them in the Automatic Migration UI, or start now and reprocess affected rules afterward.

  Example output for a QRadar migration:

  > The following resources are missing:
  >
  > - **Reference Sets (3):** \`threat_ip_list\`, \`blocked_domains\`, \`geo_exceptions\`
  >
> You can upload them in the Automatic Migration UI, or start now and reprocess affected rules afterward.

## Pre-Flight Checks

**Rules:**
1. **Missing resources comes first** — resolve the missing-resources question before asking about the connector or skip-prebuilt setting. Once the user has answered the missing-resources question, the connector and skip-prebuilt questions can be asked together.
2. **Ask each question at most once per run** — while setting up a single run, if the user has
   already answered one of these questions, treat it as answered and move on. Never re-ask
   within that run.
3. Treat these pre-flight questions as a todo list for **the run you are setting up right now**.
   The list is not conversation-wide: start it fresh whenever the user names a different
   migration, asks for a different action (START / REPROCESS / RESUME), or asks for another run
   after one has already been executed. Do not carry answers from a previous run into a new one.
4. **Rules 2 and 3 govern questions only — never tool reads.** They let you reuse *the user's
   answer*. They never let you reuse *a tool result*. Status, item counts, translation counts and
   missing resources are all re-read every time, per the freshness rules above.

### Pre-flight: Missing Resources

- Applicable only for **fresh START** (task status \`ready\`) and **REPROCESS**. Skip entirely on **RESUME**.
- **Always call \`${SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID}\` fresh** before starting or
  reprocessing. This call is unconditional — the user may have uploaded resources since you last
  checked, so an earlier result is never a substitute, no matter how recent it feels.

> **Already answered**: if the user already chose how to proceed with missing resources for
> *this* run, do not ask again — but still make the call, and tell them if the picture changed
> (e.g. the resources they were warned about are now present).

- **Empty array** → no missing resources; proceed silently to the next pre-flight check.
- **Non-empty array** → group the results by \`type\` and show the user a summary, for example:

  > The following resources are missing and rules that reference them may fail to translate or
  > produce partial results:
  >
  > - **Macros (2):** \`my_macro\`, \`another_macro\`
  > - **Lookups (1):** \`threat_intel_lookup\`
  >
  > You can upload missing resources in the Automatic Migration UI before starting, or start now
  > and reprocess the affected rules after uploading. Which would you prefer?

  Do **not** block the user — they may still confirm and start with missing resources.
  - If they want to proceed, continue to Connector Selection.
  - If they want to upload first, direct them to **LaunchPad → Manage Automatic Migrations**.

### Pre-flight: Connector Selection

> **Skip if already answered (the user's answer only)** — if the user has already chosen a
> connector for the run you are setting up, use that choice directly without calling
> \`${platformCoreTools.listInferenceEndpoints}\` again. Ask again for a different migration, a
> different action, or a later run. This never licenses reusing migration state you read earlier.

- Applicable for **fresh START** only. For **REPROCESS** and **RESUME**, skip this check and reuse
  the connector from \`last_execution.connector_id\` in \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`.
  Re-prompt only if the user explicitly requests a different connector.

Call \`${platformCoreTools.listInferenceEndpoints}\` and present the options as a multiple-choice question. Do **not** choose one automatically.

### Pre-flight: Skip Prebuilt Rules Matching

> **Skip if already answered (the user's answer only)** — if the user has already stated their
> preference for the run you are setting up, use it directly. Ask again for a different migration,
> a different action, or a later run. This never licenses reusing migration state you read earlier.

- Applicable for **fresh START** only. For **REPROCESS** and **RESUME**, skip this check and reuse
  the value from \`last_execution.skip_prebuilt_rules_matching\` in \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`.
  Re-prompt only if the user explicitly requests a change.

## Workflow

1. **Resolve the migration**: get the migration id from the name (Name→ID block). If the user
   pastes an id, verify it with \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`.
2. **Inspect state (unconditional)**: call \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` — and
   \`${SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID}\` when the decision matrix needs
   translation counts. This call is unconditional: make it for every request, including a follow-up
   such as "try again", "run it again", or "retry" on a migration you already inspected. Then use
   the decision matrix.
3. **Pre-flight checks** — for each check (missing resources → connector → skip-prebuilt), first
   verify the todo list if all question are answered. If not,  **Only ask unanswered questions.**
   If all are already answered, proceed directly to step 4.
4. **Report**: state exactly what you will do (START / REPROCESS / RESUME), which rules are
   affected, and that it consumes connector credits. Show the complete request body in a table before proceeding.
5. **Re-check immediately before executing**: call \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`
   again here — after the step-4 report, not before it — so it is the last action ahead of the
   mutating call.
   - **Unchanged** → go straight to step 6 in this same reply. Do not ask anything further; the
     step-4 report already told the user what you are about to do.
   - **Changed** (now \`running\` or \`finished\`, or \`items.pending\` is 0) → do **not** call
     \`${SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID}\`. Tell the user exactly what changed and
     re-run the decision matrix. If the new state needs their decision, ask — and then repeat this
     step after they answer, because their reply reopens the window.
6. **Execute**: call \`${SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID}\`.

## START vs REPROCESS vs RESUME Decision Matrix

If the \`status\` of the migration from \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` and the translation counts from
\`${SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID}\`. Both are single-source — do not cross-reference counts
between them.

| Task status | items.pending | Translation counts | Action | Request body |
|---|---|---|---|---|
| \`ready\` | any | any | **START** (first run) | \`{ settings: { connector_id, skip_prebuilt_rules_matching } }\` |
| \`finished\` | 0 | \`rules.failed > 0\` | **REPROCESS failed** | \`{ settings: { connector_id, skip_prebuilt_rules_matching }, retry: "failed" }\` |
| \`finished\` | 0 | \`rules.success.result.partial > 0\` OR \`untranslatable > 0\` | **REPROCESS not_fully_translated** | \`{ settings: { connector_id, skip_prebuilt_rules_matching }, retry: "not_fully_translated" }\` |
| \`finished\` | 0 | User-selected rules, including rules with mixed statuses | **REPROCESS selected** | \`{ settings: { connector_id, skip_prebuilt_rules_matching }, retry: "selected", selection: { ids } }\` |
| \`finished\` | 0 | \`rules.success.installable > 0\` | Tell the user their rules are ready to install and direct them to **LaunchPad → Manage Automatic Migrations** in the UI (do not start) | — |
| \`stopped\` or \`interrupted\` | \`items.pending + items.processing > 0\` | any | **RESUME** (continue the run) | \`{ settings: { connector_id } }\` (no \`retry\`, no \`selection\`) |
| \`running\` | any | any | Tell the user it is already running and route to **${RULE_MIGRATION_SKILLS.SUMMARIZE}** for progress on **this migration only** | — |

### Notes on the matrix

#### START
- It is the first execution of a \`ready\` migration. complete \`settings\`  object is required and values must be confirmed with user.

#### REPROCESS ( Also called retry)
- Re-runs a subset of rules. By default, reuse the connector and skip_prebuilt_rules_matching
  values from the last execution (available in \`last_execution\` from \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`).
  Only ask the user if they explicitly want to change them.
- Pass \`retry: "failed"\` ONLY to retry only failed rules, or
  \`retry: "not_fully_translated"\` to retry partially translated rules. No selection.
- **REPROCESS a specific subset**: if the user names specific rules to re-run, resolve their
  **titles** to **rule item ids** via \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\`. Use \`retry: "selected"\` with
  \`selection: { ids }\` when the requested subset contains mixed statuses; the status-wide
  \`failed\` and \`not_fully_translated\` filters cannot represent that selection. A \`selection\`
  WITHOUT \`retry: "selected"\` is a no-op — always pair them and include the required
  \`settings\` object.

**Step-by-step for REPROCESS selected:**
1. \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` → migration id.
2. \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` with \`{ migration_id, search_term: '<partial title>' }\` (paginate if
   total > per_page) → collect the \`id\` field for every title the user named.
   - **Title not found**: tell the user which titles did not match and ask them to clarify.
     Never silently drop a rule the user named.
   - **Cross-migration rules**: \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` filters by
     \`migration_id\`, so only rules in the resolved migration are eligible. If the user names rules
     that are not in it, say so rather than reprocessing a silently-narrowed subset.
3. \`${SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID}\` — run the same missing-resources
   pre-flight as for a regular REPROCESS. Show the result and apply the Pre-flight: Missing
   Resources decision above. Do not skip this step.
4. \`${SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID}\` with:
   \`{ settings: { connector_id, skip_prebuilt_rules_matching }, retry: "selected", selection: { ids: [<id1>, <id2>] } }\`
5. Report the count of rules reprocessed; confirm it is running **asynchronously**.

Never skip step 2 — you must resolve titles to item ids; titles are not accepted by the tool.

#### RESUME
- **RESUME** continues a stopped/interrupted run that still has pending items. It uses the SAME
  body as START (\`{ settings: { connector_id } }\`, no \`retry\`, no \`selection\`). Confirmation of settings is not needed and MUST be same as Last execution values. But user should be informed that you are using values from the last run.

## Interpreting the start response

\`${SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID}\` returns \`{ started: boolean }\`:
- \`started: true\` — the task was started/resumed. Your response MUST include the word
  **asynchronously** (e.g. "The migration is running asynchronously"). Direct the user to the
  \`${RULE_MIGRATION_SKILLS.SUMMARIZE}\` skill to track progress.
- \`started: false\` — the task did not start. Do **not** speculate about why — never blame ELSER,
  semantic search, the connector, or the migration "still resetting after a previous failure".
  Instead, call \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\`, then act on the status it
  returns: re-run the decision matrix, report the live state via the
  \`${RULE_MIGRATION_SKILLS.SUMMARIZE}\` skill, and tell the user what you found. If the migration
  has already finished, say so plainly — do not describe it as a failure.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

If the user asks to delete a migration, route them to the **${RULE_MIGRATION_SKILLS.DELETE}** sibling skill — this skill only starts/reprocesses/resumes.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
    SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
    SIEM_MIGRATION_START_RULE_MIGRATION_TOOL_ID,
    platformCoreTools.listInferenceEndpoints,
  ],
});
