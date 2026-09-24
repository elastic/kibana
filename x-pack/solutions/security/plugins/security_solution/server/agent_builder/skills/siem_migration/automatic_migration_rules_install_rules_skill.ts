/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
  SIEM_MIGRATION_INSTALL_RULE_MIGRATION_TOOL_ID,
} from '../../tools/siem_migrations';
import { SECURITY_BUILD_REDIRECT_URL_TOOL_ID } from '../../tools';
import {
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  MIGRATION_NAME_DISAMBIGUATION_BLOCK,
  MIGRATION_STATE_FRESHNESS_BLOCK,
  MIGRATION_TYPE_DISAMBIGUATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
} from './rules/content';
import { RULE_MIGRATION_SKILLS } from './rules/skill_ids';

export const automaticMigrationRulesInstallRulesSkill = defineSkillType({
  id: RULE_MIGRATION_SKILLS.INSTALL,
  name: RULE_MIGRATION_SKILLS.INSTALL,
  basePath: 'skills/security/siem_migrations',
  description:
    'Install translated rules from an Automatic Rule Migration into Elastic. Resolves the installable count, confirms scope and enabled-default, and requires Rules: All privileges.',
  content: `
# Install Automatic Rule Migration Rules

## When to use this skill

- When the user wants to install fully translated rules from an Automatic Rule Migration.
- ${MIGRATION_TYPE_DISAMBIGUATION_BLOCK}

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${MIGRATION_NAME_DISAMBIGUATION_BLOCK}

${MIGRATION_STATE_FRESHNESS_BLOCK}

## Available tools

- \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` — resolve migration name to id.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` — verify a pasted id and inspect task state.
- \`${SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID}\` — authoritative installable and missing-index counts.
- \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` — resolve titles to internal item ids and retain up to 3 custom rules for the result sample.
- \`${SECURITY_BUILD_REDIRECT_URL_TOOL_ID}\` — build space/base-path-safe Detection Rule links.
- \`${SIEM_MIGRATION_INSTALL_RULE_MIGRATION_TOOL_ID}\` — install the selected or all installable rules.

## Workflow

1. Resolve the migration by name. If the user pasted an id, verify it with
   \`get_rule_migration_stats\`.
2. Call \`get_rule_migration_translation_stats\`. Use
   \`rules.success.installable\` as the authoritative confirmation count. Do not use translated
   total or preview row count.
3. Resolve the install scope:
   - Specific titles: call \`get_migration_rules\`, resolve every title to its migration item id,
     show the exact selection, and pass those ids to later installation calls.
   - All installable rules: **do not pass \`ids\` at all** — omit the field entirely. Never pass
     \`ids: []\`; an empty array matches zero documents. The list endpoint forces
     \`isEligibleForTranslation: true\`, so any displayed list is illustrative and may omit
     non-translation-eligible but installable building-block rules.
4. Present this pre-install checklist:
   - Migration and exact installable count resolved.
   - Install scope confirmed.
   - Rules: All requirement stated.
   - Missing-index count reviewed; non-zero means affected rules need review.
5. Confirm enabled state with a multiple-choice question. Omitting \`enabled\` means false.
   \`enabled\` applies only to newly created rules; already-installed prebuilt matches are linked
   and are not re-enabled.
6. State scope, authoritative count, and enabled state. Then call
   \`install_migration_rules\`; its own confirmation prompt is mandatory.

## Interpreting installation

\`{ installed: N }\` means **processed N rules**. It includes newly created rules and linked
already-installed prebuilt matches. Never say "installed N new rules."

After success:
1. Confirm: "**N rules have been installed.**"
2. Call \`get_migration_rules\` for the installed scope:
   - **Scoped install** (user selected specific rules): pass the item ids. Show all returned
     records that contain \`elastic_rule.id\` — do not cap them.
   - **All-rules install**: omit ids. Keep up to 5 records that contain \`elastic_rule.id\`.
3. For each record, call \`security.build_redirect_url\` with exactly
   \`/app/security/rules/id/<URL-encoded elastic_rule.id>\`. Use the returned URL unchanged.
4. Render:

| Rule | View rule |
|---|---|

For a scoped install label it **Installed rules**; for an all-rules install label it
**Sample of installed rules**.
Tell the user they can ask about any specific rule they are interested in.

Then ask, as a multiple-choice question, whether the user wants to:
- View a specific rule.
- Explore other migrations.

## Errors and privileges

- Rules: All (edit) is required to install translated rules. Ask an administrator to grant
  Security > Detection Rules: All when missing.
- Explain API errors plainly and do not claim installation succeeded.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}

Rule item ids are internal. They are not migration ids or installed Elastic rule ids, and must
never be requested from or displayed to the user.
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
    SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
    SIEM_MIGRATION_INSTALL_RULE_MIGRATION_TOOL_ID,
  ],
});
