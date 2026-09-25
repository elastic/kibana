/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID,
  SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
} from '../../tools/siem_migrations';
import {
  AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK,
  AUTOMATIC_MIGRATION_NAVIGATION_BLOCK,
  NAME_NEVER_ID_BLOCK,
  MIGRATION_NAME_DISAMBIGUATION_BLOCK,
  AUTOMATIC_MIGRATION_GENERAL_GUIDELINES,
} from './rules/content';
import { RULE_MIGRATION_SKILLS } from './rules/skill_ids';

export const automaticMigrationRulesUpdateTranslatedRuleSkill = defineSkillType({
  id: RULE_MIGRATION_SKILLS.UPDATE_TRANSLATED_RULE,
  name: RULE_MIGRATION_SKILLS.UPDATE_TRANSLATED_RULE,
  basePath: 'skills/security/siem_migrations',
  description: `Fix one or more aspects of a specific SIEM migration translated rule: the ES|QL query, the prebuilt rule match, or the matched integration.

Use when the user reports that the translated rule is wrong — the query has errors, it was matched to the wrong prebuilt rule, or it was matched to the wrong integration.
Multiple aspects can be corrected in one call (e.g. a new ES|QL query together with a corrected integration).
Internally there are two write paths: (1) prebuilt rule match (optionally with integration_ids), (2) ES|QL query update (optionally with integration_ids). Integration is never written on its own.`,
  content: `
# When to use this skill

Use this skill when the user wants to **correct the translated version** of a specific
Automatic Migration rule. Three aspects can be updated:

1. **ES|QL query** — the translated query has syntax errors, produces wrong results, or needs refinement.
2. **Prebuilt rule match** — the rule was matched to the wrong Elastic prebuilt rule.
3. **Integration** — the rule was matched to the wrong Elastic integration.

Internally there are **two write paths**: (1) prebuilt rule match, (2) ES|QL query update. Both paths
accept an optional \`integration_ids\` field — whether the correction is an integration change or a
wrong-index-pattern fix, it is always expressed as a combined \`esql_query\` + \`integration_ids\` call.
Integration is never written on its own.

This skill is mutating: it writes the correction back to a single migration rule and requires user
confirmation before applying. If user asks to update multiple rules, take them one at a time and confirm each update.

**This skill applies only to rules that have not been installed yet.** A migration rule with
\`elastic_rule.id\` set has already been installed as a detection rule and is immutable from the
migration's perspective — no write path applies to it. Check for this after the mandatory rule
fetch (see Workflow) and stop if it is already installed.

${AUTOMATIC_MIGRATION_GENERAL_GUIDELINES}

${AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK}

${NAME_NEVER_ID_BLOCK}

${MIGRATION_NAME_DISAMBIGUATION_BLOCK}

## Available Tools

- \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` — Fetch the current rule details including
  the original query, vendor, current translated ES|QL, prebuilt rule match, integration ids,
  and any comments. Always fetch first to understand what needs fixing.
- \`${SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID}\` — Apply corrections to the translated rule.
  Requires user confirmation. Two mutually exclusive write paths:
  - **Path 1 — prebuilt rule match**: supply \`prebuilt_rule\` (object with \`id\` and \`title\`,
    both required). Optionally add \`integration_ids\` when the prebuilt rule relies on specific
    integrations; **omit it entirely** otherwise.
  - **Path 2 — ES|QL query update**: supply \`esql_query\` (validated automatically before
    applying). Optionally add \`integration_ids\` when the index pattern comes from specific
    integrations; **omit it entirely** otherwise.
  - \`integration_ids\` cannot be supplied without one of the above write paths.
  - \`comment\` (required): markdown explanation of every aspect updated in this call —
    appended to the rule's comment history and shown to the user in the rule details flyout.
    See *Writing the change comment* below.

## Workflow

1. **Fetch the rule first**: call \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` to retrieve the
   current state — original query, vendor, translated ES|QL, prebuilt rule match, integration ids,
   and any comments. Always do this before presenting options or asking questions.
2. **Stop if the rule is already installed.** If the fetched rule has \`elastic_rule.id\` set, do
   not present the correction options and do not call
   \`${SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID}\`. Explain that the rule has already been
   installed as a detection rule and can no longer be corrected through the migration. Stop there.
3. **Present options**: ask the user what they want to fix:
   - Fix **ES|QL query**
   - Fix **Prebuilt rule match**
   - Fix **Integration match**
3. Based on the user's selection, follow the appropriate sub-workflow below.

### Pre-built rule update workflow


1. Ready the Title, Description and query of the original rule.
2. Search for appropriate pre-built rule use cases using following strategies. It is mandatory to find rule uuid.
    a. Tool \`platform.core.product_documentation\`, if available, can be used to find correct prebuilt rule match.
    b. Use \`recommend-prebuilt-rules\` skill and its search instructions to find exact prebuilt rule UUIDs, titles and related integrations.
3. Once you have maximum of 5 candidates, show them to the user with a fit-gap analysis in a table and your recommendation.
4. Once the user confirms the pre-built rule, update the translated rule using \`${SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID}\`
   by supplying the \`prebuilt_rule\` object (both \`id\` and \`title\` are required).
5. Below is a concrete example of the tool call for a pre-built rule update. When the matched prebuilt rule also relies on specific integrations, you may combine
\`prebuilt_rule\` with \`integration_ids\` in the same call. **Omit \`integration_ids\` entirely** if the prebuilt rule does not rely on any specific integration — do not pass an empty array.

\`\`\`json
{
  "migration_id": "<migration_id>",
  "rule_id": "<rule_id>",
  "prebuilt_rule": {
    "id": "a2329f42-9a87-4e8c-9a4e-1b1e7d89f231",
    "title": "PowerShell Obfuscated Script Block"
  },
  "integration_ids": ["windows"],
  "comment": "**Prebuilt rule match updated** → \`PowerShell Obfuscated Script Block\`\\n\\nMatches the original detection logic for encoded PowerShell blocks. Updated integration to \`windows\` since that integration supplies the \`powershell.file.script_block_text\` field the prebuilt rule relies on."
}
\`\`\`


### ES|QL query update workflow

When user reports that the ESQL query is incorrect, then there can be two options:

1. The index pattern that query is using is incorrect or missing.
2. A query itself is incorrect because of presence of either some placeholders or incorrect field names.

Always ask user what exactly is wrong in the query. Once user reports follow below workflows.

#### Wrong / missing index pattern

A wrong or missing index pattern means the matched integration is also wrong. Follow the
**[Integration match update workflow](#integration-match-update-workflow)** — it covers finding
the correct integration via the EPM catalog APIs, fetching its \`docs/README.md\` for sample events
and field details, and rewriting both the query and the integration match in one call.


#### Wrong query with placeholders or incorrect field names

1. if the current query has macro or lookup placeholders
    (\`[macro:…]\`, \`[lookup:…]\`), ask the user whether to proceed without them.
    - If yes: remove the missing resource references from the proposed query.
    - If no: inform the user they can upload the missing resources and reprocess this rule again.
2. If user says that some of the field names are incorrect, your job is to find right field names for
   that particular index and fix the query.
   In case you are not able to find the correct field names, ask user which field names are incorrect
   and what field names they think it should be, and present your analysis.

Example tool call for a placeholder or field-name fix (query only). Note: the tool hard-rejects any
query still containing \`[macro:…]\`, \`[lookup:…]\`, or the missing-index-pattern placeholder, and
then validates the ES|QL syntax — so ensure all placeholders are resolved before calling.

\`\`\`json
{
  "migration_id": "<migration_id>",
  "rule_id": "<rule_id>",
  "esql_query": "FROM logs-windows.sysmon_operational-* | WHERE process.name == \"powershell.exe\" AND process.args LIKE \"*-EncodedCommand*\" | STATS count = COUNT() BY host.name",
  "comment": "**ES|QL query updated**\\n\\nRemoved the unresolvable \`[macro:sysmon_index]\` placeholder and replaced it with \`logs-windows.sysmon_operational-*\`. Renamed \`CommandLine\` → \`process.args\` and \`Image\` → \`process.name\` to match ECS field names used by the Elastic Windows integration. Detection logic unchanged: still alerts on PowerShell invocations with the \`-EncodedCommand\` flag."
}
\`\`\`

### Integration match update workflow

Use this when the user reports that the rule was matched to the wrong Elastic integration.
Changing the integration means the index pattern and field names change too, so the ES|QL query
**must always be rewritten** alongside the integration update — both are updated in one call.

1. Fetch the current rule using \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` to read the
   original rule's title, description, query, and currently matched integration(s).
2. Identify the correct integration:
    a. Derive the data source domain from the original rule's title, description, and vendor query.
    b. Search \`platform.core.product_documentation\` (if available) for integrations that ingest that data source.
    c. Use \`elastic-package-manager-epm.get-fleet-epm-packages\` to browse the full integration catalog
       and narrow down candidates by name or category.
    d. Use \`elastic-package-manager-epm.get-fleet-epm-packages-pkgname\` to retrieve the version and
       data stream details for each candidate integration.
    e. Use \`elastic-package-manager-epm.get-fleet-epm-packages-pkgname-pkgversion-filepath\` to fetch
       \`docs/README.md\` from the package — this contains sample events, index patterns, and field
       descriptions that are essential for rewriting the ES|QL query accurately.
3. Once you have the correct integration ID, use \`platform.core.product_documentation\` to:
    a. Look up the index patterns and field schema documented for that integration.
    b. Confirm which fields are available in the integration's data stream.
4. Rewrite the ES|QL query using the correct index pattern and field names from the mappings.
   Preserve the full detection logic of the original rule — do not drop conditions or thresholds.
5. Present the proposed new query and integration to the user. Provide a checklist of what was
   successfully mapped, what could not be mapped, and any assumptions made.
6. Once the user confirms, call \`${SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID}\` with both
   \`esql_query\` and \`integration_ids\` together. Never update just the integration without
   also updating the query.

Example tool call:

\`\`\`json
{
  "migration_id": "<migration_id>",
  "rule_id": "<rule_id>",
  "esql_query": "FROM logs-endpoint.events.process-* | WHERE process.name == \"powershell.exe\" AND process.args LIKE \"*-EncodedCommand*\" | STATS count = COUNT() BY host.name",
  "integration_ids": ["endpoint"],
  "comment": "**Integration match updated** → \`endpoint\`\\n\\nThe original rule reads Windows Sysmon process-creation events; the previously matched integration does not ship this data. The Elastic Endpoint integration supplies process-creation events as \`logs-endpoint.events.process-*\`.\\n\\n**ES|QL query updated**\\n\\nRewritten to use the \`endpoint\` index pattern. Mapped Sysmon fields \`Image\` → \`process.name\` and \`CommandLine\` → \`process.args\` using the Endpoint integration field mappings. Detection logic unchanged: still alerts on PowerShell invocations with the \`-EncodedCommand\` flag."
}
\`\`\`

## Writing the change comment

Every call to \`${SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID}\` must include a \`comment\`.
It is appended to the rule's comment history alongside the original translation reasoning, and shown
to the user in the rule details flyout — so write for that reader, not as a terse diff.

**Rules:**
- Lead each changed aspect with a bold heading.
- When one call changes several aspects, include one section per aspect in the same comment, separated by a blank line.
- State what was wrong and why the correction fixes it.
- Never restate the full query; it is already stored on the rule.
- Never send a placeholder such as "Updated the query."

**Examples by path:**

*ES|QL query fix:*
\`\`\`
**ES|QL query updated**

Replaced the placeholder index \`[macro:index]\` with \`logs-splunk.*\` and mapped the Splunk fields
\`src_ip\` → \`source.ip\` and \`dest_port\` → \`destination.port\`. Detection logic unchanged: still
alerts on more than 5 connections from a single source within 10 minutes.
\`\`\`

*Prebuilt rule match fix:*
\`\`\`
**Prebuilt rule match updated** → \`PowerShell Obfuscated Script Block\`

The original rule alerts on base64-encoded PowerShell script blocks, which this prebuilt rule covers
directly. The previous match keyed on the parent process instead and would have missed the
encoded-payload case.
\`\`\`

*Combined query + integration fix:* use both sections in one comment, separated by a blank line.
The query section explains the rewrite; the integration section explains why that index is now the
correct source. For example:
\`\`\`
**Integration match updated** → \`endpoint\`

The original rule reads Windows Sysmon process-creation events, which the Elastic Endpoint
integration supplies as \`logs-endpoint.events.process-*\`. The previously matched integration does
not ship process-creation data.

**ES|QL query updated**

Rewritten to use the \`endpoint\` index pattern. Mapped Sysmon fields \`Image\` → \`process.name\`
and \`CommandLine\` → \`process.args\`. Detection logic unchanged.
\`\`\`

## Constraints

- **Do not rely on querying the system for index existence or field mappings.** Migration rule
  indices typically do not exist in the system yet. If a system query returns nothing or fails,
  fall back immediately to \`platform.core.product_documentation\` as the authoritative source
  for index patterns and field names — do not retry or ask the user to wait.
- Never apply a query that still contains macro or lookup placeholders (\`[macro:…]\`,
  \`[lookup:…]\`) or the missing-index-pattern placeholder. Check missing resources first if such
  placeholders appear in the original.
- **\`esql_query\` and \`prebuilt_rule\` are mutually exclusive** write paths. If both are supplied the tool applies \`prebuilt_rule\` and ignores \`esql_query\`. Always supply exactly one.
- **Supplying \`esql_query\` for a rule that currently has a prebuilt match unmatches it** —
  \`prebuilt_rule_id\` is cleared and title/description revert to the original rule's values. Only
  do this when the user genuinely wants a custom translation instead of the prebuilt rule, and
  say so in the \`comment\`.
- **\`integration_ids\` cannot be supplied alone.** It must accompany either \`esql_query\` or \`prebuilt_rule\`.
- **Never call the tool for a rule with \`elastic_rule.id\` set.** Installed rules are immutable —
  say so and stop.
- Only propose ES|QL (query_language: esql). No other query languages are accepted by this tool.
- All ids, statuses, and query content must come from tool results — never invent them.
- Every call must include a \`comment\` explaining every aspect changed. Never send a placeholder,
  a bare "updated the query", or a restatement of the full query.

${AUTOMATIC_MIGRATION_NAVIGATION_BLOCK}
`,
  getRegistryTools: () => [
    SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
    SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID,
    SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
    platformCoreTools.productDocumentation,
  ],
});
