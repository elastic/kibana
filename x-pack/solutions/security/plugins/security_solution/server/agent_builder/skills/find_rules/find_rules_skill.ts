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
      'List, count, filter, and rank Security detection rules (read-only inventory). Use for ' +
      '"list all enabled detection rules tagged with MITRE", "show rules for T1059", ' +
      '"how many custom rules are enabled", or any list/count/filter over the rule catalog — ' +
      'by tags (including MITRE), MITRE technique/tactic ID, severity, enabled state, or name. ' +
      'Prefer this over detection-rule-edit when the user lists or counts rules without a rule ' +
      'attachment. Tools: security.discover_rule_tags then security.find_rules only — never ES|QL ' +
      'or platform.core search. Not for creating, editing, or hunting raw events.',
    content: `# Find Detection Rules

## When to Use

Use this skill when the user wants to **inventory, list, count, filter, sort, or rank Security detection rules** stored in Kibana — for example:

- "List detection rules tagged with MITRE" or "rules with the MITRE tag"
- "Show rules covering MITRE technique T1059" or a tactic name/ID
- "How many custom (non-prebuilt) detection rules are enabled?"
- "Find enabled critical rules" or "rules named PowerShell"

Do **not** use this skill when the user wants to **create or edit** a rule (use detection rule creation / detection-rule-edit) or hunt **raw events** with ES|QL (use threat-hunting).

## Process

**Allowed tools for rule inventory:** ONLY \`security.discover_rule_tags\`, \`security.find_rules\`, and (for noisy-rule ranking) \`security.alerts\`. Once this skill is loaded, do **not** call \`platform.core.search\`, \`platform.core.list_indices\`, \`platform.core.sml_search\`, \`platform.core.generate_esql\`, or \`platform.core.execute_esql\` — detection rules are not indexed documents you query with ES|QL.

1. **Load this skill** (\`find-security-rules\`) — do not answer from platform search or ES|QL alone.
2. **Call \`security.discover_rule_tags\` with \`{}\`** — required before every \`security.find_rules\` call in the same turn.
3. **Call \`security.find_rules\`** with filters derived from discovery (tags, \`mitreTechnique\`, \`mitreTactic\`, \`enabled\`, \`ruleSource\`, \`perPage: 1\` for count-only questions, etc.).
4. **Answer from tool results only** — cite \`total\` for counts; render the rule table from \`security.find_rules\` output.

## Examples

### Example 1: List enabled rules tagged with MITRE (tag filter)

User: "List all enabled detection rules tagged with MITRE."

Steps:
1. \`security.discover_rule_tags({})\` — scan returned tag values for MITRE-related entries (e.g. \`MITRE\`, \`Tactic: …\`, \`Technique: …\`).
2. \`security.find_rules({ enabled: true, tags: ["MITRE"], perPage: 10 })\` — use exact tag values from discovery; omit \`tags\` if no MITRE-like tag exists and say so.
3. Reply with filter summary + **Name | Severity | Enabled | Type** table from tool output.

Do **not** call \`platform.core.execute_esql\` or search \`.alerts-security.alerts-*\` indices — rule metadata comes only from \`security.find_rules\`.

### Example 2: Rules for MITRE technique T1059 (structured MITRE filter)

User: "Show me detection rules covering MITRE technique T1059."

Steps:
1. \`security.discover_rule_tags({})\` — still required every turn before \`find_rules\`.
2. \`security.find_rules({ mitreTechnique: "T1059", perPage: 10 })\` — use \`mitreTechnique\`, not the \`tags\` filter, for technique IDs.
3. Reply from \`total\` and returned rules.

### Example 3: Count enabled custom rules

User: "How many custom (non-prebuilt) detection rules do I have enabled?"

Steps:
1. \`security.discover_rule_tags({})\`
2. \`security.find_rules({ enabled: true, ruleSource: "custom", perPage: 1 })\`
3. Answer: "You have {total} enabled custom detection rules." — cite \`total\` from the tool result.

## Guardrails

- **Never** use \`platform.core.search\`, \`platform.core.list_indices\`, \`platform.core.get_index_mapping\`, \`platform.core.sml_search\`, \`platform.core.generate_esql\`, or \`platform.core.execute_esql\` to list or count detection rules. Rule metadata lives in Kibana's detection-rules API, exposed only through \`security.discover_rule_tags\` and \`security.find_rules\`.
- **Never** call \`security.find_rules\` without calling \`security.discover_rule_tags\` first in the **same** response turn (even on MITRE technique/tactic queries — discovery still runs; MITRE filters use \`mitreTechnique\` / \`mitreTactic\`, not the \`tags\` filter).
- **Never** call \`security.create_detection_rule\` from this skill — read-only inventory only.

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
| \`security.find_rules\` | Default to \`security.find_rules\` for rule queries — list, filter, sort, count | Rule names + metadata + total |

**Every response that calls \`security.find_rules\` MUST also call \`security.discover_rule_tags\` in that same response, immediately before \`security.find_rules\`.** Do NOT call \`security.find_rules\` without first calling \`security.discover_rule_tags\` in the same turn — even if discovery was run in a previous turn. Use the freshly discovered tag list to decide which tag values (if any) belong in the filter.

## Grounding

Call \`security.find_rules\` for every new or different rule query. Do not reuse a previous rule list when the user changes the criteria.

Every tag name, index pattern, rule name, rule ID, alert count, and total in the response must come from a tool result in this conversation. If a filter returns zero results, say so.

In a multi-turn conversation, do not infer tag values from rule results — rule \`tags\` arrays in \`security.find_rules\` responses only reflect the rules already fetched. Use tag values from the most recent \`security.discover_rule_tags\` call.

When the user refines a previous query — phrases like "which of them are network", "now show the Windows ones", "filter by endpoint" — make a fresh \`security.discover_rule_tags\` call to get current tag values, then call \`security.find_rules\` with the matching tags and any carry-over filters (e.g. severity). Do not filter the in-memory results from the previous response.

## Tag Discovery

Tag values are environment-specific. Even widely-used names like "MITRE" may be spelled, cased, or absent differently in this space.

**Before filtering by tag, call \`security.discover_rule_tags\` with \`{}\`** to enumerate available tag values. This gives you the full list so you can choose exact tag values that match the user's intent. Discovery is one cheap aggregation call — run it fresh in every turn that calls \`security.find_rules\`. Do not reuse a tag list from a previous turn.

After discovery:
1. Scan all returned tag values — both prebuilt tags (which follow a \`Category: Value\` pattern like \`Domain: Network\`, \`Use Case: Network Security Monitoring\`, \`Tactic: Execution\`) and custom tags (which may be free-form like \`my-team\` or \`prod\`). Find every tag that matches the user's intent, across all categories and formats.
2. Call \`security.find_rules\` with \`tags: ["<value1>", "<value2>", ...]\` including every matching tag. Tags are OR-ed, so the result includes rules with any of them. If no tag matches, omit the tags filter.

If no returned tag matches the user's intent, say so and mention the closest available values.

## MITRE ATT&CK Routing

Detection rules carry MITRE data in two places: the structured \`threat[]\` field (tactic ID + name, technique ID + name) and free-form \`tags\` (entries like \`Tactic: Execution\` or \`Technique: T1059\`). Tag coverage is inconsistent — some rules have only the structured field. **Always filter MITRE intent through the structured parameters \`mitreTechnique\` and \`mitreTactic\`**, never through the \`tags\` filter. Do not put a \`Tactic: ...\` or \`Technique: ...\` value into the \`tags\` filter for a MITRE query, even if it appears in the \`security.discover_rule_tags\` result. Discovery still runs every turn (as required for non-MITRE tag filtering); the rule here is only about which filter parameter the MITRE intent ends up in.

Priority order:

1. **Technique ID** (\`T1059\`, \`T1059.001\`) -> \`{ mitreTechnique: "T1059" }\`.
2. **Tactic ID** (\`TA0001\`) -> \`{ mitreTactic: "TA0001" }\`.
3. **Tactic name** matching the table below -> convert to its ID and use \`{ mitreTactic: "<TA-ID>" }\`. Prefer IDs over names because IDs are stable across MITRE versions.
4. **Anything else** (typo, technique name like "Phishing", informal phrasing) -> \`{ searchTerm: "<phrase>" }\`. Do not guess an ID.

Canonical MITRE tactics (Enterprise ATT&CK):

| Tactic ID | Tactic Name |
|---|---|
| TA0001 | Initial Access |
| TA0002 | Execution |
| TA0003 | Persistence |
| TA0004 | Privilege Escalation |
| TA0005 | Defense Evasion |
| TA0006 | Credential Access |
| TA0007 | Discovery |
| TA0008 | Lateral Movement |
| TA0009 | Collection |
| TA0010 | Exfiltration |
| TA0011 | Command and Control |
| TA0040 | Impact |
| TA0042 | Resource Development |
| TA0043 | Reconnaissance |

Examples:
- "rules for T1059" -> \`{ mitreTechnique: "T1059" }\`
- "rules for Defense Evasion" -> \`{ mitreTactic: "TA0005" }\`
- "rules for TA0006" -> \`{ mitreTactic: "TA0006" }\`
- "rules for phishing" (technique-flavored, no exact name) -> \`{ searchTerm: "phishing" }\`

## Noisy Rules

Call \`security.alerts\` to aggregate by \`kibana.alert.rule.rule_id\`, then call \`security.find_rules\` with \`{ ruleId: "<id>" }\` to look up matching rule details.

## Count Questions

For simple count questions, call \`security.find_rules\` with the relevant filter and answer from \`total\`. Use a small \`perPage\` such as 1 if the user only wants the count.

Examples:
- "How many enabled custom rules?" -> \`{ enabled: true, ruleSource: "custom", perPage: 1 }\`
- "How many enabled vs disabled?" -> call twice: once with \`{ enabled: true, perPage: 1 }\`, once with \`{ enabled: false, perPage: 1 }\`

## Filtering

All filter parameters are flat and optional. Different parameters are ANDed together. Array parameters (\`severity\`, \`ruleType\`, \`tags\`) are ORed within the same field.

Parameters: \`searchTerm\`, \`enabled\`, \`ruleSource\`, \`severity\`, \`ruleType\`, \`tags\`, \`excludeTags\`, \`mitreTechnique\`, \`mitreTactic\`, \`ruleId\`.

**Omit \`perPage\`** unless the user explicitly states a number ("show me 50") or asks for more/all results. When omitted, the tool defaults to 10. Never set \`perPage\` above 10 unless the user explicitly states a number or requests more results. Never increase it on follow-up turns just because the previous result was truncated — narrow the filter instead.

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

## Response Format

- Open with one sentence stating the exact filters used (\`enabled\`, \`tags\`, \`mitreTechnique\`, etc.).
- Rule inventory: markdown table **Name | Severity | Enabled | Type** (max 10 rows unless user asked for more).
- Count-only questions: single sentence citing \`total\` from \`security.find_rules\`.
- Zero results: say so explicitly; mention closest tag values from discovery when relevant.
- Never include ES|QL queries or index names in the reply for rule inventory questions.

## No Actions

This skill is read-only. Never suggest or offer to enable, disable, edit, delete, duplicate, or bulk-edit rules. Do not prompt the user to take any action on the rules returned. If the user asks to modify a rule, direct them to the Detection Rules UI.`,
    getRegistryTools: () => [SECURITY_ALERTS_TOOL_ID],
    getInlineTools: () => [
      createFindRulesInlineTool({ getStartServices, logger }),
      createDiscoverRuleTagsInlineTool({ getStartServices, logger }),
    ],
  });
