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
- Alerting V2 or ES|QL alerting rules -> rule-authoring

## Read-Only

This skill cannot enable, disable, delete, duplicate, or bulk-edit detection rules. For mutations, direct the user to the Detection Rules UI. Use detection-rule-edit only when a single rule attachment is present in the conversation.

## Tools

This skill has two inline tools:

| Tool | When to use | Returns |
|---|---|---|
| \`security.discover_rule_tags\` | List available tags and counts or resolve unknown exact tag values | Tag buckets + counts |
| \`security.find_rules\` | Default to \`security.find_rules\` for rule queries. It searches by meaning and supports exact filters, sorting, and counts. | Rule names + metadata + total |

Call \`security.find_rules\` directly. Use \`query\` when the user describes what the rules should detect. Include any explicit structured constraints such as severity or enabled state in the same call. Use \`searchTerm\` for a keyword lookup, such as when the user supplies part of a rule name. Tag discovery is only needed when the user asks about available tags or the exact tag value for a requested filter is unknown.

## Grounding

Call \`security.find_rules\` for every new or different rule query. Do not reuse a previous rule list when the user changes the criteria.

Reported rule names, IDs, index patterns, tags, alert counts, and totals must come from a tool result in this conversation. State which filters were tried, including exact tag values supplied by the user. If a filter returns zero results, say so.

When the user refines a previous query with phrases like "which of them are network" or "now show the Windows ones", run a fresh \`security.find_rules\` query with the refinement and any relevant carry-over filters. Use \`query\` for the detected behavior or topic. Keep explicit constraints such as severity. The previous result page is not a complete rule list.

## Tag Discovery

Tag values are specific to the space. Apply exact tag values supplied by the user or already identified from a tool result directly in \`tags\` or \`excludeTags\`. A rule's tags show what that rule has and do not enumerate the space's catalog.

When the user asks to browse tags or the exact tag values for their requested filter are unknown, call \`security.discover_rule_tags\` with \`{}\`. Select only values that match the requested tag filter. Values inside \`tags\` are OR-ed. If no exact value can be resolved, explain that and show the closest values when available. Keep the requested tag constraint explicit when discussing the results.

## MITRE ATT&CK Routing

Detection rules carry MITRE data in two places: the structured \`threat[]\` field (tactic ID + name, technique ID + name) and free-form \`tags\` (entries like \`Tactic: Execution\` or \`Technique: T1059\`). Tag coverage is inconsistent — some rules have only the structured field. Use the structured parameters \`mitreTechnique\` and \`mitreTactic\` for exact MITRE filters. Do not put a \`Tactic: ...\` or \`Technique: ...\` value into the \`tags\` filter for a MITRE query, even if it appears in the \`security.discover_rule_tags\` result.

Priority order:

1. **Technique ID** (\`T1059\`, \`T1059.001\`) -> pass the supplied ID to \`mitreTechnique\`, including the subtechnique suffix when present.
2. **Tactic ID** (\`TA0001\`) -> \`{ mitreTactic: "TA0001" }\`.
3. **Tactic name** matching the table below -> convert to its ID and use \`{ mitreTactic: "<TA-ID>" }\`. Prefer IDs over names because IDs are stable across MITRE versions.
4. **Anything else** (typo, technique name like "Phishing", informal phrasing) -> \`{ query: "<phrase>" }\`. Do not guess an ID.

Canonical MITRE tactics (Enterprise ATT&CK):

| Tactic ID | Tactic Name |
|---|---|
| TA0001 | Initial Access |
| TA0002 | Execution |
| TA0003 | Persistence |
| TA0004 | Privilege Escalation |
| TA0005 | Stealth |
| TA0006 | Credential Access |
| TA0007 | Discovery |
| TA0008 | Lateral Movement |
| TA0009 | Collection |
| TA0010 | Exfiltration |
| TA0011 | Command and Control |
| TA0040 | Impact |
| TA0042 | Resource Development |
| TA0043 | Reconnaissance |
| TA0112 | Defense Impairment |

Examples:
- "rules for T1059" -> \`{ mitreTechnique: "T1059" }\`
- "rules for Stealth" -> \`{ mitreTactic: "TA0005" }\`
- "rules for Defense Impairment" -> \`{ mitreTactic: "TA0112" }\`
- "rules for TA0006" -> \`{ mitreTactic: "TA0006" }\`
- "rules for phishing" (technique-flavored, no exact name) -> \`{ query: "phishing" }\`

## Noisy Rules

Call \`security.alerts\` to aggregate by \`kibana.alert.rule.rule_id\`, then call \`security.find_rules\` with \`{ ruleId: "<id>" }\` to look up matching rule details.

## Count Questions

For simple count questions, call \`security.find_rules\` with the relevant filter and answer from \`total\`. Use a small \`perPage\` such as 1 if the user only wants the count.

Examples:
- "How many enabled custom rules?" -> \`{ enabled: true, ruleSource: "custom", perPage: 1 }\`
- "How many enabled vs disabled?" -> call twice: once with \`{ enabled: true, perPage: 1 }\`, once with \`{ enabled: false, perPage: 1 }\`

## Filtering

All filter parameters are flat and optional. Different parameters are ANDed together. Array parameters (\`severity\`, \`ruleType\`, \`tags\`) are ORed within the same field.

Parameters include \`query\`, \`searchTerm\`, \`enabled\`, \`ruleSource\`, \`severity\`, \`ruleType\`, \`tags\`, \`excludeTags\`, \`mitreTechnique\`, \`mitreTactic\`, \`ruleId\`.

**Omit \`perPage\`** unless the user explicitly states a number ("show me 50") or asks for more/all results. When omitted, the tool defaults to 10. Never set \`perPage\` above 10 unless the user explicitly states a number or requests more results. Never increase it on follow-up turns just because the previous result was truncated — narrow the filter instead.

Examples:
- Enabled critical rules: \`{ enabled: true, severity: ["critical"] }\`
- Critical or high severity: \`{ severity: ["critical", "high"] }\`
- MITRE-tagged, exclude Custom: \`{ tags: ["MITRE"], excludeTags: ["Custom"] }\`
- Custom query rules: \`{ ruleSource: "custom", ruleType: ["query"] }\`
- Find enabled rules that detect a behavior: \`{ query: "someone wipes the logs to hide what they did", enabled: true }\`
- Keyword lookup by rule name: \`{ searchTerm: "PowerShell" }\`
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

This skill is read-only. Never suggest or offer to enable, disable, edit, delete, duplicate, or bulk-edit rules. If the user asks to modify a rule, direct them to the Detection Rules UI.

**Exception — noise/FP queries:** if the user's request was about noisy rules, high alert volume, or false positives (e.g. "which rules fire the most?", "find my noisiest rules"), end your response with:
"I can investigate any of these rules individually — just let me know which one."
(On the next turn, the \`investigate-rule\` skill will handle the investigation.)`,
    getRegistryTools: () => [SECURITY_ALERTS_TOOL_ID],
    getInlineTools: () => [
      createFindRulesInlineTool({ getStartServices, logger }),
      createDiscoverRuleTagsInlineTool({ getStartServices, logger }),
    ],
  });
