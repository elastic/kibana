/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { SECURITY_ALERTS_TOOL_ID } from '../../tools';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import { createFindRulesInlineTool } from './find_rules_tool';
import { createDiscoverRuleTagsInlineTool } from './discover_rule_tags_tool';

interface FindRulesSkillDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

export const createFindRulesSkill = ({
  getStartServices,
  logger,
}: FindRulesSkillDeps): SkillDefinition<'find-security-rules', 'skills/security/rules'> =>
  defineSkillType({
    id: 'find-security-rules',
    name: 'find-security-rules',
    basePath: 'skills/security/rules',
    description:
      'Discover, list, rank, and count Security detection rules. ' +
      'Filter by tags, MITRE technique, severity, rule type, name, or enabled state. ' +
      'Read-only.',
    content: `# Find Detection Rules

## Use This Skill

Use this skill to list, count, sort, or rank multiple Security detection rules.

## Boundaries

- Specific alert triage (alert id) -> alert-analysis
- Create or edit a single rule attachment -> detection-rule-edit
- ES|QL hunting over events -> threat-hunting
- Alerting V2 or ES|QL alerting rules -> rule-management

## Read-Only

This skill cannot enable, disable, delete, duplicate, or bulk-edit detection rules. For mutations, direct the user to the Detection Rules UI. Use detection-rule-edit only when a single rule attachment is present in the conversation.

## Tools

This skill has two inline tools:

| Tool | When to use | Returns |
|---|---|---|
| \`security.discover_rule_tags\` | **Always call this first** — gets available tag values for reasoning | Tag buckets + counts |
| \`security.find_rules\` | List, filter, sort, count rules — call after discovery | Rule names + metadata + total |

**Always call \`security.discover_rule_tags\` before \`security.find_rules\`.** Use the discovered tag list to decide which tag values (if any) belong in the filter. On the first turn, run discovery then immediately run \`security.find_rules\`. On follow-up turns, the tag list is already in the transcript — skip re-calling discovery and go straight to \`security.find_rules\`.

## Grounding

Call \`security.find_rules\` for every new or different rule query. Do not reuse a previous rule list when the user changes the criteria.

Every tag name, index pattern, rule name, rule ID, alert count, and total in the response must come from a tool result in this conversation. If a filter returns zero results, say so.

In a multi-turn conversation, do not infer tag values from rule results — rule \`tags\` arrays in \`security.find_rules\` responses only reflect the rules already fetched. Use the canonical tag list from the \`security.discover_rule_tags\` result earlier in this conversation.

When the user refines a previous query — phrases like "which of them are network", "now show the Windows ones", "filter by endpoint" — make a fresh \`security.find_rules\` call combining the matching tag from the existing discovery result with any carry-over filters (e.g. severity). Do not filter the in-memory results from the previous response.

## Tag Discovery

Tag values are environment-specific. Even widely-used names like "MITRE" may be spelled, cased, or absent differently in this space.

**Always call \`security.discover_rule_tags\` before your first \`security.find_rules\` call in a conversation.** This gives you the full list of available tag values so you can reason about which (if any) match the user's intent and include them as a \`tags\` filter. Discovery is one cheap aggregation call.

Once \`security.discover_rule_tags\` has been called in this conversation, the tag list is in the transcript — do not call it again. Use the result from the transcript for all subsequent \`security.find_rules\` calls.

After discovery:
1. Scan all returned tag values — both prebuilt tags (which follow a \`Category: Value\` pattern like \`Domain: Network\`, \`Use Case: Network Security Monitoring\`, \`Tactic: Execution\`) and custom tags (which may be free-form like \`my-team\` or \`prod\`). Find every tag that matches the user's intent, across all categories and formats.
2. Call \`security.find_rules\` with \`tags: ["<value1>", "<value2>", ...]\` including every matching tag. Tags are OR-ed, so the result includes rules with any of them. If no tag matches, omit the tags filter.

If no returned tag matches the user's intent, say so and mention the closest available values.

Structured MITRE IDs are exempt: use \`{ mitreTechnique: "T1059" }\` directly in \`security.find_rules\`.

## Noisy Rules

Call \`security.alerts\` to aggregate by \`kibana.alert.rule.rule_id\`, then call \`security.find_rules\` with \`{ ruleId: "<id>" }\` to look up matching rule details.

## Count Questions

For simple count questions, call \`security.find_rules\` with the relevant filter and answer from \`total\`. Use a small \`perPage\` such as 1 if the user only wants the count.

Examples:
- "How many enabled custom rules?" -> \`{ enabled: true, ruleSource: "custom", perPage: 1 }\`
- "How many enabled vs disabled?" -> call twice: once with \`{ enabled: true, perPage: 1 }\`, once with \`{ enabled: false, perPage: 1 }\`

## Filtering

All filter parameters are flat and optional. Different parameters are ANDed together. Array parameters (\`severity\`, \`ruleType\`, \`tags\`) are ORed within the same field.

Parameters: \`searchTerm\`, \`enabled\`, \`ruleSource\`, \`severity\`, \`ruleType\`, \`tags\`, \`excludeTags\`, \`mitreTechnique\`, \`ruleId\`.

**Omit \`perPage\`** unless the user explicitly states a number ("show me 50") or asks for more/all results. When omitted, the tool defaults to 10. Never set it on follow-up turns just because the previous result was truncated — narrow the filter instead.

Examples:
- Enabled critical rules: \`{ enabled: true, severity: ["critical"] }\`
- Critical or high severity: \`{ severity: ["critical", "high"] }\`
- MITRE-tagged, exclude Custom: \`{ tags: ["MITRE"], excludeTags: ["Custom"] }\`
- Custom query rules: \`{ ruleSource: "custom", ruleType: ["query"] }\`
- Text search: \`{ searchTerm: "PowerShell" }\`
- Highest-risk enabled rules: \`{ enabled: true, sortField: "risk_score", sortOrder: "desc", perPage: 5 }\`

## Rendering

- **Always** open your reply with one sentence describing the exact filters used, before showing any results. Example: "I searched for low-severity rules." This is required so the user can spot and correct a wrong filter immediately.
- \`security.find_rules\`: show **Name | Severity | Enabled | Type** by default. Add columns only when the user asks for them, sorted/filtered by them, or they are needed to explain the answer. Show at most 10 rows by default; use a higher \`perPage\` only when the user explicitly asks for more. Say when more matches exist. For simple count questions, answer from \`total\`.
- \`security.discover_rule_tags\`: show **Value | Count**. If the user asked to list rules, follow tag discovery with a \`security.find_rules\` call using the discovered tag filter.
- Alert-volume rankings: show **Rule Name | Alert Count**.
- Sort: \`sortField: "severity"\` (or \`risk_score\`, \`updatedAt\`, etc.) + \`sortOrder: "desc"\`
- Top-N: \`perPage: N\`
- If \`truncated: true\`, mention that additional groups exist beyond the returned buckets.

## No Actions

This skill is read-only. Never suggest or offer to enable, disable, edit, delete, duplicate, or bulk-edit rules. Do not prompt the user to take any action on the rules returned. If the user asks to modify a rule, direct them to the Detection Rules UI.`,
    getRegistryTools: () => [SECURITY_ALERTS_TOOL_ID],
    getInlineTools: () => [
      createFindRulesInlineTool({ getStartServices, logger }),
      createDiscoverRuleTagsInlineTool({ getStartServices, logger }),
    ],
  });
