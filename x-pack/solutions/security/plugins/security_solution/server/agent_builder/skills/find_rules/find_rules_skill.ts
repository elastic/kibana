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
}: FindRulesSkillDeps): SkillDefinition<'find-rules', 'skills/security/rules'> =>
  defineSkillType({
    id: 'find-rules',
    name: 'find-rules',
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

This skill has two inline tools — pick the one that matches the user's intent:

| Tool | When to use | Returns |
|---|---|---|
| \`security.find_rules\` | List, filter, sort rules, answer simple total-count questions | Rule names + metadata + total |
| \`security.discover_rule_tags\` | Discover available tag values | Tag buckets + counts |

**Default to \`security.find_rules\`** for rule-list queries and simple total-count questions. Exception: before using any \`tags\` filter, call \`security.discover_rule_tags\` first and choose exact tag values from the result.

## Grounding

Call \`security.find_rules\` for every new or different rule query. Do not reuse a previous rule list when the user changes the criteria.

Every tag name, index pattern, rule name, rule ID, alert count, and total in the response must come from a tool result in this conversation. If a filter returns zero results, say so.

## Tag Discovery

Tag values are environment-specific. Even widely-used names like "MITRE" may be spelled, cased, or absent differently in this space.

Call \`security.discover_rule_tags\` before any tag-name or category filter. This includes explicit tag names like "MITRE" and vague category text such as "network rules", "endpoint rules", or "Windows rules".

Do NOT call \`security.discover_rule_tags\` when the user filters only by severity, enabled state, name, rule type, or MITRE ID. Those filters work directly — just pass them in \`security.find_rules\`.

Before filtering by tag:
1. Call \`security.discover_rule_tags\` with \`{}\` to list available tag values.
2. Choose exact tag values from the result.
3. Call \`security.find_rules\` with \`tags: ["<exact value>"]\`.

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

All filter parameters are flat and optional. Non-array parameters are ANDed together. Array parameters (\`severity\`, \`ruleType\`, \`tags\`) are ORed within the field.

Parameters: \`nameContains\`, \`enabled\`, \`ruleSource\`, \`severity\`, \`ruleType\`, \`tags\`, \`excludeTags\`, \`mitreTechnique\`, \`ruleId\`.

Examples:
- Enabled critical rules: \`{ enabled: true, severity: ["critical"] }\`
- Critical or high severity: \`{ severity: ["critical", "high"] }\`
- MITRE-tagged, exclude Custom: \`{ tags: ["MITRE"], excludeTags: ["Custom"] }\`
- Custom query rules: \`{ ruleSource: "custom", ruleType: ["query"] }\`

## Rendering

- \`security.find_rules\`: show **Name | Severity | Enabled | Type** by default. Add columns only when the user asks for them, sorted/filtered by them, or they are needed to explain the answer. Show at most 20 rows and say when more matches exist. For simple count questions, answer from \`total\`.
- \`security.discover_rule_tags\`: show **Value | Count**. If the user asked to list rules, follow tag discovery with a \`security.find_rules\` call using the discovered tag filter.
- Alert-volume rankings: show **Rule Name | Alert Count**.
- Sort: \`sortField: "severity"\` (or \`risk_score\`, \`updatedAt\`, etc.) + \`sortOrder: "desc"\`
- Top-N: \`perPage: N\`
- If \`truncated: true\`, mention that additional groups exist beyond the returned buckets.`,
    getRegistryTools: () => [SECURITY_ALERTS_TOOL_ID],
    getInlineTools: () => [
      createFindRulesInlineTool({ getStartServices, logger }),
      createDiscoverRuleTagsInlineTool({ getStartServices, logger }),
    ],
  });
