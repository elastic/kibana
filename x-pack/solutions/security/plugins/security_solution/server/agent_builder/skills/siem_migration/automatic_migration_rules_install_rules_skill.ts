/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { PLATFORM_FLEET_GET_INTEGRATION_DETAILS_TOOL_ID } from '@kbn/fleet-plugin/server';
import {
  SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_TRANSLATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GROUP_RULES_BY_INTEGRATIONS_TOOL_ID,
  SIEM_MIGRATION_INSTALL_RULE_MIGRATION_TOOL_ID,
} from '../../tools/siem_migrations';
import { SECURITY_BUILD_REDIRECT_URL_TOOL_ID } from '../../tools';
import {
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  MIGRATION_NAME_DISAMBIGUATION_BLOCK,
  MIGRATION_TYPE_DISAMBIGUATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
} from './shared/content';

export const automaticMigrationRulesInstallRulesSkill = defineSkillType({
  id: 'automatic-migration-rules-install-rules',
  name: 'automatic-migration-rules-install-rules',
  basePath: 'skills/security/siem_migrations',
  description:
    'Install translated rules from an Automatic Rule Migration into Elastic. Resolves the installable count, confirms scope and enabled-default, checks inferred Fleet integration readiness, and requires Rules: All privileges.',
  content: `
# Install Automatic Rule Migration Rules

## When to use this skill

- When the user wants to install fully translated rules from an Automatic Rule Migration.
- ${MIGRATION_TYPE_DISAMBIGUATION_BLOCK}

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${MIGRATION_NAME_DISAMBIGUATION_BLOCK}

## Available tools

- \`security.siem_migration.get_all_rule_migration_stats\` — resolve migration name to id.
- \`security.siem_migration.get_rule_migration_stats\` — verify a pasted id and inspect task state.
- \`security.siem_migration.get_rule_migration_translation_stats\` — authoritative installable and missing-index counts.
- \`security.siem_migration.get_migration_rules\` — resolve titles to internal item ids and retain up to 3 custom rules for the result sample.
- \`security.siem_migration.group_rules_by_integrations\` — migration-scoped integration groups with installed/not-installed rule counts. A multi-integration rule appears in every matching group.
- \`platform.fleet.get_integration_details\` — live package installation and integration enablement. It requires Fleet Integrations: Read and Agent Policies: Read.
- \`security.build_redirect_url\` — build space/base-path-safe Detection Rule links.
- \`security.siem_migration.install_migration_rules\` — install the selected or all installable rules.

## Workflow

1. Resolve the migration by name. If the user pasted an id, verify it with
   \`get_rule_migration_stats\`.
2. Call \`get_rule_migration_translation_stats\`. Use
   \`rules.success.installable\` as the authoritative confirmation count. Do not use translated
   total or preview row count.
3. Resolve the install scope:
   - Specific titles: call \`get_migration_rules\`, resolve every title to its migration item id,
     show the exact selection, and pass those ids to later grouping and installation calls.
   - All installable rules: omit ids when installing. The list endpoint forces
     \`isEligibleForTranslation: true\`, so any displayed list is illustrative and may omit
     non-translation-eligible but installable building-block rules.
4. Call \`group_rules_by_integrations\` with the migration id and the selected item ids when the
   scope is explicit; omit ids for all rules. Use \`not_installed_rules\` to identify integration
   requirements that remain relevant to installation. Report \`without_integrations\` separately.
   Present the results as a table:

   | Integration | Rules Impacted | Installed | Enabled |
   |---|---|---|---|
   | <id> | <total_rules> | ✅ / ❌ | ✅ / ❌ |

   Use ✅ when \`is_installed\` / \`is_enabled\` is true, ❌ when false. Add a row for
   "No integration" using \`without_integrations\` counts; leave Installed and Enabled blank for
   that row.
5. Call \`platform.fleet.get_integration_details\` once with the distinct integration ids from the
   groups. If the Fleet privilege check fails, explain that readiness could not be verified and
   recommend installing rules disabled. Do not invent readiness.
6. Present this pre-install checklist:
   - Migration and exact installable count resolved.
   - Install scope confirmed.
   - Rules: All requirement stated.
   - Missing-index count reviewed; non-zero means affected rules need review.
   - Inferred integrations checked, including package installed and integration enabled status.
   - Relevant data flow verified or its absence acknowledged.
7. Explain readiness precisely:
   - \`is_installed\` means the Fleet package is installed.
   - \`is_enabled\` means an enabled input exists in a configured package policy.
   - Without an enabled integration and active data flow, the rule will not receive relevant
     events to evaluate.
   - No inferred integrations does not prove readiness; remind the user to verify data ingestion.
8. Confirm enabled state with a multiple-choice question. Omitting \`enabled\` means false.
   \`enabled\` applies only to newly created rules; already-installed prebuilt matches are linked
   and are not re-enabled.
   - If a required package is not installed, do not proceed with \`enabled: true\`. Ask whether to
     install rules disabled or install/configure integrations first.
   - If a package is installed but its integration is not enabled, recommend disabled. Proceed
     enabled only after explicit reconfirmation that the rule may run without relevant data.
   - If readiness could not be checked, recommend disabled and require explicit reconfirmation
     before enabled installation.
9. State scope, authoritative count, enabled state, and integration readiness. Then call
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

| Rule | Required integrations | Integration readiness | View rule |
|---|---|---|---|

For a scoped install label it **Installed rules**; for an all-rules install label it
**Sample of installed rules**.
Tell the user they can ask about any specific rule they are interested in.

Then ask, as a multiple-choice question, whether the user wants to:
- View a specific rule.
- Explore other migrations.

## Errors and privileges

- Rules: All (edit) is required to install translated rules. Ask an administrator to grant
  Security > Detection Rules: All when missing.
- Fleet Integrations: Read and Agent Policies: Read are required for accurate integration-level
  enablement. A Fleet privilege error does not prevent disabled installation, but readiness must
  be reported as unknown.
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
    SIEM_MIGRATION_GROUP_RULES_BY_INTEGRATIONS_TOOL_ID,
    PLATFORM_FLEET_GET_INTEGRATION_DETAILS_TOOL_ID,
    SECURITY_BUILD_REDIRECT_URL_TOOL_ID,
    SIEM_MIGRATION_INSTALL_RULE_MIGRATION_TOOL_ID,
  ],
});
