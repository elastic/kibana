/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { SECURITY_RECOMMEND_RULES_TO_INSTALL_TOOL_ID } from '../../tools/recommend_rules_to_install_tool';

export const getRecommendRulesToInstallSkill = () =>
  defineSkillType({
    id: 'recommend-rules-to-install',
    name: 'recommend-rules-to-install',
    basePath: 'skills/security/rules',
    description:
      "Recommend which Elastic Security prebuilt detection rules to install on this Kibana deployment. Use when the user asks which prebuilt rules to install, what rules to enable, or for rule recommendations. Filters out rules that won't run on the customer's data (no matching indices or missing required fields), then picks a focused set with reasoning.",
    content: SKILL_CONTENT,
    getRegistryTools: () => [SECURITY_RECOMMEND_RULES_TO_INSTALL_TOOL_ID],
  });

const SKILL_CONTENT = `# Prebuilt Rule Install Recommendations

## When to Use This Skill

Use this skill when the user asks which Elastic Security prebuilt detection rules to install on their deployment. Trigger phrases include:

- "which rules should I install?"
- "what prebuilt rules do I install?"
- "recommend rules to install"
- "suggest detection rules for my setup"
- "what rules should I enable?"

This skill is for **install-time** recommendations. It does not edit, tune, or install rules — it only recommends.

## Process

### Step 1: Call the Tool

Invoke \`security.recommend_rules_to_install\` with no arguments. The tool returns a list of prebuilt rules that are:

1. **Installable** — present in the prebuilt rules package but not yet installed on this deployment.
2. **Runnable** — their index patterns match at least one real index in the deployment, and every required ECS field exists in those indices' mappings.

The tool also returns a \`stats\` object with counts of how many rules were filtered out and why.

### Step 2: Handle Empty Results

If \`installable_runnable_rules\` is empty, report this plainly. Use the \`stats\` object to explain why. Example:

> No runnable installable rules were found. 142 prebuilt rules are installable, but all were filtered out: 87 had no matching indices on this deployment, 41 were missing required fields, and 14 are rule types not supported by the v1 check (machine learning, ES|QL).

Stop after this — do not invent recommendations.

### Step 3: Pick a Focused Set

When the tool returns rules, pick **5 to 10** to recommend. Optimize for:

- **Severity coverage**: prefer \`critical\` and \`high\` rules over \`medium\` and \`low\`.
- **Attack technique diversity**: prefer a mix of MITRE tactics (look at \`tags\` for tactic names) rather than 5 rules all covering the same technique.
- **Foundational visibility**: prioritize rules whose required fields tie to common ECS sources the user clearly has data for (the runnability filter already proves the fields exist).

Do not recommend more than 10 rules in v1 — keep the list scannable.

### Step 4: Explain the Picks

For each recommended rule, give a one-sentence rationale tied to its purpose, severity, and tags.

Then add a short overall summary (2–3 sentences) explaining the *shape* of the recommendation — what tactics are covered, what's deliberately left out, and what the user might consider adding next.

## Response Format

Use this format exactly:

\`\`\`
**Recommended prebuilt rules to install (N):**

- **<Rule Name>** — <severity>, <rule type> — <one-sentence why>
- **<Rule Name>** — <severity>, <rule type> — <one-sentence why>
- ...

**Overall reasoning:** <2–3 sentences on the shape of the recommendation>

**Coverage summary:** Out of <total_installable> installable prebuilt rules, <total_returned> were runnable on this deployment. <filtered_no_matching_indices> had no matching indices, <filtered_missing_required_fields> were missing required fields, and <filtered_unsupported_for_v1> are rule types not yet supported by the v1 runnability check.
\`\`\`

## Guardrails

- **Source of truth**: only recommend rules that appear in the tool's \`installable_runnable_rules\` array. Never invent rule names, IDs, severities, or types.
- **No installs**: this skill recommends only. Do not call any install-related tools. Do not tell the user step-by-step *how* to install — they know.
- **No tuning advice**: do not propose changes to thresholds, queries, or schedules. That is a separate skill.
- **Tool errors**: if the tool returns an error result, surface the error message verbatim and stop. Do not guess.
- **No padding**: if fewer than 5 rules are returned, recommend all of them rather than padding with weaker candidates.
`;
