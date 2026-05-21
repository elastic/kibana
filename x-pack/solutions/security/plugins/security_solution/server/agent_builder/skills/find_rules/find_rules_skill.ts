/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { SECURITY_ALERTS_TOOL_ID } from '../../tools';
import { DETECTION_RULES_API_KNOWLEDGE } from '../detection_rules_api_knowledge';

const WORKFLOW_EXECUTE_STEP_TOOL_ID = `${internalNamespaces.workflows}.workflow_execute_step`;

export const findRulesSkill = defineSkillType({
  id: 'find-rules',
  name: 'find-rules',
  basePath: 'skills/security/rules',
  description:
    'Discover, list, rank, group, and count Security detection rules across the rule inventory. ' +
    'Browse rules by tags (with tag discovery), MITRE technique/tactic, severity, rule type, ' +
    'risk score range, name substring, source index pattern, or enabled state. ' +
    'Rank rules by alert volume to identify noisy detections. ' +
    "Read-only and scoped to MULTI-rule discovery — for individual rule actions or other rule-engine queries see the appropriate sibling skills documented in this skill's content.",
  referencedContent: [
    {
      name: 'detection-rules-api',
      relativePath: '.',
      content: DETECTION_RULES_API_KNOWLEDGE,
    },
  ],
  content: `# Find Detection Rules

## When to Use This Skill

Use this skill when the user asks to **list or rank multiple Security detection rules** by:
- Metadata: tags, enabled state, rule type, severity, name pattern, risk score, MITRE technique/tactic, index pattern
- Alert volume: which rules are noisy / produced the most alerts

## Do NOT Use When

- The user is triaging a specific alert (alert id) — that's alert-analysis
- The user wants to create or edit a **single** rule via the rule attachment in chat — that's detection-rule-edit
- The user wants a proactive ES|QL hunt for suspicious activity — that's threat-hunting
- The user is asking about alerting V2 (ES|QL alerts) rules — that's rule-management

## ⚠️ Action Limitations — Read-Only Skill

This skill **only reads** detection rules. The following actions are **not supported** by any tool currently available to the agent:

- Bulk enable / disable rules
- Bulk delete rules
- Bulk duplicate rules
- Modifying tags, severity, schedule, or any other field on an existing rule that is not loaded into the chat as a rule attachment
- Running bulk actions against the detection engine API

If the user asks for any of these after seeing a rule list (e.g. "now enable all of them", "disable these", "change the severity on these to high"):

1. **Do NOT** invoke other tools hoping one will work.
2. **Do NOT** spawn a sub-agent to retry.
3. **Do NOT** look for a connector to call the Kibana API.
4. **Do** respond plainly: explain that bulk rule mutation is not available in chat yet, and direct the user to **Security → Rules → Detection Rules** in the UI (Bulk actions → Enable/Disable/Delete) or the \`POST /api/detection_engine/rules/_bulk_action\` endpoint, including the rule IDs from the listing for convenience.

Single-rule edits via an existing **rule attachment in this chat** are still routed to detection-rule-edit — that path is supported.

## 🚫 Grounding — Never Invent Values

Every tag name, index pattern, rule name, rule ID, alert count, or total in your response must come from a tool result earlier in this conversation. Do not fill in plausible-looking values from prior knowledge, do not round counts ("about 50" when the tool said 47), do not add an "and also" rule that was not in the result set, and do not echo a rule UUID you have not seen in a tool result.

If a filter returns zero results, say so. Do not list rules from memory or from a previous turn's result set.

## 🏷️ Tag Discovery — ALWAYS Discover Before Filtering by Tag (No Exceptions)

Tag values are environment-specific and you cannot know the canonical strings in this space from prior knowledge — even widely-used names like "MITRE" may be spelled, cased, or absent differently here.

**Whenever any tag filter is involved — whether the user named the tag string directly ("rules tagged MITRE"), referenced a category ("endpoint rules"), or described semantic intent ("anything about network security") — you MUST:**

1. **First** call \`workflow_execute_step\` with a \`kibana.request\` step to \`GET /api/detection_engine/tags\` to enumerate the actual tag values in this space.
2. **Read the returned tag list.** Pick the exact strings whose meaning matches the user's intent.
3. **Then** call \`workflow_execute_step\` again with a \`kibana.request\` step to \`GET /api/detection_engine/rules/_find\` with \`filter: "alert.attributes.tags: \\"<exact value>\\""\`.

Do not skip discovery, even when the user's wording looks like a known tag. If the tag list contains no match, tell the user plainly and offer the closest available values — do not invent one.

Exception — **structured MITRE IDs** (\`T####\`, \`T####.###\`, \`TA####\`): filter directly with \`alert.attributes.params.threat.technique.id: "T1059"\` — no discovery needed. The format is canonical and schema-enforced.

## Process

All API details — step YAML, endpoints, KQL filter patterns, response shape — are in the **[detection-rules-api]** referenced content. Read it before building any step.

### 1. Find rules

Use \`workflow_execute_step\` with a \`kibana.request\` step. See [detection-rules-api] for the exact YAML and KQL filter syntax.

### 2. Alert volume ranking ("noisiest rules")

1. Call \`security.alerts\` to aggregate by \`kibana.alert.rule.uuid\` (NOT by name — names are not unique).
2. For each top UUID, call \`workflow_execute_step\` with the UUID lookup from [detection-rules-api] to resolve names + metadata.

### 3. Render the result

**Rule lists** — default columns: **Name | Severity | Enabled | Type**.
Add a column only when the user filtered by, sorted by, or explicitly asked for that field.
Show at most 20 rows. If \`total\` exceeds what is shown, append "Showing 20 of N matching rules."

**Tag discovery** — flat list of tag strings. Show them and ask which to filter by.

**Alert-volume rankings** — **Rule Name | Alert Count**, sorted descending.`,
  getRegistryTools: () => [WORKFLOW_EXECUTE_STEP_TOOL_ID, SECURITY_ALERTS_TOOL_ID],
});
