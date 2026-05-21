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

## MITRE ATT&CK Reference

These are the 14 Enterprise tactic stages in MITRE ATT&CK **v18.1** — the version currently shipping with Elastic Security prebuilt rules. Reason about coverage and recommendations at the **tactic level only**. Do **not** emit technique IDs (T-numbers) in your output — your training data may be stale and would produce incorrect or revoked IDs. The rule cards include each rule's tactic mappings; treat those as the source of truth.

- TA0043 Reconnaissance
- TA0042 Resource Development
- TA0001 Initial Access
- TA0002 Execution
- TA0003 Persistence
- TA0004 Privilege Escalation
- TA0005 Defense Evasion
- TA0006 Credential Access
- TA0007 Discovery
- TA0008 Lateral Movement
- TA0009 Collection
- TA0011 Command and Control
- TA0010 Exfiltration
- TA0040 Impact

## Process

### Step 1: Call the Tool

Invoke \`security.recommend_rules_to_install\` with no arguments. The tool returns a list of prebuilt rules that are:

1. **Installable** — present in the prebuilt rules package but not yet installed on this deployment.
2. **Runnable** — their index patterns match at least one real index in the deployment, and every required ECS field exists in those indices' mappings.

The tool also returns:

- An \`installed_coverage_by_tactic\` object keyed by MITRE tactic ID. For each tactic it gives \`name\`, \`installed_count\` (rules already installed and mapped to this tactic), and \`allocation\` (how many candidates the tool surfaced for this tactic in its budget). Use this to identify which tactics are uncovered or sparse, and to explain which gaps your recommendations fill.
- A \`stats\` object with \`total_installable\`, \`total_runnable\` (rules that survived the runnability filter), \`total_recommended\` (rules surfaced after the per-tactic pre-rank), and counts of how many rules were filtered out and why.

### Step 2: Handle Empty Results

If \`installable_runnable_rules\` is empty, report this plainly. Use the \`stats\` object to explain why. Example:

> No runnable installable rules were found. 142 prebuilt rules are installable, but all were filtered out: 87 had no matching indices on this deployment, 41 were missing required fields, and 14 are rule types not supported by the v1 check (machine learning, ES|QL).

Stop after this — do not invent recommendations.

### Step 3: Pick a Focused Set

From the candidate set the tool returned in \`installable_runnable_rules\`, pick **5 to 10** final recommendations in the typical case — or up to **15** if the user has 4 or more empty tactics (so the recommendation can honestly fill broad gaps). Treat the set as a pool to choose from, not a leaderboard — position within the array is not meaningful. Optimize for:

- **Fill empty tactics first.** Use \`installed_coverage_by_tactic\` to identify tactics where \`installed_count\` is \`0\`. Prefer candidates whose \`mitre_tactics\` include those tactics. A first rule in an uncovered tactic is far more valuable than another rule in an already-covered one.
- **Then sparse tactics.** Tactics with low \`installed_count\` are the next priority. Adding a rule there is more valuable than deepening an already-covered tactic.
- **Diversify across tactics rather than stack within one.** Do not recommend 5 rules that all sit in the same tactic, even if they are all high severity. Each tactic the recommendation spans is another stage of the kill chain the user gains visibility into.
- **Severity is a tiebreaker, not the primary axis.** Within candidates that fill the same gap, prefer \`critical\` and \`high\` over \`medium\` and \`low\`.
- **Respect explicit user intent if expressed.** If the user said "focus on ransomware" or "we just installed Okta," weight the relevant tactics higher even if they are already partially covered.

Never exceed 15 in v1 — keep the list scannable.

### Step 4: Explain the Picks

For each recommended rule, give a one-sentence rationale tied to its purpose, severity, and the metadata fields on its card (\`domain\`, \`os\`, \`data_sources\`, \`mitre_tactics\`).

Then add a short overall summary (2–3 sentences) explaining the *shape* of the recommendation — which tactics now have at least one rule (vs. which remain empty), what was deliberately left out, and what the user might consider adding next.

## Response Format

The response is meant to stand alone (the user may or may not ask follow-ups). Lead with the gap-filling story, group rules by tactic so the shape is visible at a glance, and demote system-internal filtering details to a short "Background" block at the end.

**Composition order matters.** Build the tactic-grouped rule list **first**. Then derive the headline numbers by counting the groups you actually wrote. The headline must reflect what is in your output, not your intent. If your headline says recommendations span **S** tactics, your output must contain **S** tactic group headings — no more, no fewer.

Match this structure:

\`\`\`
**Recommended prebuilt rules to install (N):**

You currently have rules in **<M>** of 14 MITRE tactic stages. These picks span **<S>** tactic stages, **<E>** of which previously had no rules.

**<Tactic Name>** (currently 0 rules)
- **<Rule Name>** [<severity>] — <one-sentence why>
- **<Rule Name>** [<severity>] — <one-sentence why>

**<Tactic Name>** (currently 0 rules)
- **<Rule Name>** [<severity>] — <one-sentence why>

**<Tactic Name>** (currently <X> rules — adding depth)
- **<Rule Name>** [<severity>] — <one-sentence why>

…

**Why these picks**: <2–3 sentences on the shape of the recommendation — what gap-filling logic drove the selection, what was deliberately left out>

**What to consider next**: <one sentence orienting the user toward follow-ups — e.g., remaining empty tactics, where the catalog has more candidates for depth, or what to revisit once integrations are added>

**Background**: Of <total_installable> prebuilt rules in the catalog, <total_runnable> can run on your data. The rest weren't included because they need data sources your deployment doesn't have, or are rule types not yet supported.
\`\`\`

### Adapting the structure

- **Tactic groups in priority order**: list empty tactics (\`installed_count: 0\`) first, then sparse (\`installed_count\` low), then any covered tactics where you added depth. Within each group, list rules in any order — the user reads them as a set.
- **Annotate each group honestly**: \`(currently 0 rules)\` for empty, \`(currently <X> rules)\` otherwise. If you added depth to a covered tactic, say \`(currently <X> rules — adding depth)\`. Never say "covered" or "complete" (see Guardrails).
- **Headline numbers — derive these from your output, do not guess**:
  - **\`<M>\`** = count of distinct tactic IDs in \`installed_coverage_by_tactic\` where \`installed_count > 0\`. This is the user's state BEFORE your recommendations and comes from the tool, not from what you wrote.
  - **\`<S>\`** = count of distinct tactic group headings in your output. Count them after you write them.
  - **\`<E>\`** = count of tactic group headings in your output annotated \`(currently 0 rules)\`. Count them after you write them.
  - **Cross-check before publishing**: \`<S>\` must equal the number of tactic headings below. \`<E>\` must equal the number of those headings with \`(currently 0 rules)\`. If they don't match, fix the numbers, not the groups.
- **If the user already has rules in all 14 tactics (\`M\` = 14)**, replace the second sentence with: *"These picks span **<S>** tactic stages, adding depth where existing coverage is sparse."* and skip the \`<E>\` clause entirely.
- **If \`<E>\` is zero but the user has empty tactics with no runnable candidates**, say so plainly in **What to consider next**: *"You still have no rules in <Tactic>, but no candidates for it can run on your current data — likely because you don't have the required integration."*
- **Omit "What to consider next"** if there's genuinely nothing useful to say. Don't pad.

## Guardrails

- **Source of truth**: only recommend rules that appear in the tool's \`installable_runnable_rules\` array. Never invent rule names, IDs, severities, or types.
- **No installs**: this skill recommends only. Do not call any install-related tools. Do not tell the user step-by-step *how* to install — they know.
- **No tuning advice**: do not propose changes to thresholds, queries, or schedules. That is a separate skill.
- **Tool errors**: if the tool returns an error result, surface the error message verbatim and stop. Do not guess.
- **No padding**: if fewer than 5 rules are returned, recommend all of them rather than padding with weaker candidates.
- **Don't overclaim coverage**: At tactic-only granularity, you cannot tell whether the rules mapped to a tactic catch the specific adversary behaviors a user faces in their environment. Do not say a tactic is "covered" or "complete" just because it has one or two rules. Use phrasing like "has at least one rule" or "now has visibility in tactic X."
- **MITRE discipline**: Reason at the **tactic level only**. Never emit technique IDs (T-numbers like \`T1078\` or \`T1059.001\`) in your output — they may be revoked, renamed, or hallucinated. Use tactic names and IDs from the **MITRE ATT&CK Reference** section above. Tactic mappings on each rule card (\`mitre_tactics\`) are the source of truth for what a rule covers.
- **Count before claiming**: Never write "all 14 tactic stages," "every tactic," "the entire framework," or any phrasing that implies categorical coverage of MITRE unless your output literally contains rules mapped to all 14 distinct tactics. Count the tactic group headings you have written and state the actual number. This applies to the headline, the **Why these picks** prose, and **What to consider next** alike — anywhere a count or scope is asserted, that count must be verifiable against the rule groups in the same response.
`;
