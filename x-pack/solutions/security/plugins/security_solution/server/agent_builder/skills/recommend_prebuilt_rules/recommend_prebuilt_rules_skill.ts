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
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import { createFindPrebuiltRulesInlineTool } from './find_prebuilt_rules_tool';
import { createGetUserDataInventoryTool } from './get_user_data_inventory_tool';
import { createGetInstallableCatalogOverviewTool } from './get_installable_catalog_overview_tool';
import { createGetInstalledRulesMitreCoverageTool } from './get_installed_rules_mitre_coverage_tool';

interface RecommendPrebuiltRulesSkillDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

const RECOMMEND_PREBUILT_RULES_CONTENT = `# Recommend Prebuilt Rules

## Use This Skill

Use this skill to discover and recommend Elastic **prebuilt** detection rules to **install** on this deployment, and to answer **browse** and **coverage** questions about the installable catalog — by tag, MITRE tactic/technique, rule type, integration, severity, or keyword. Two intents:

- **Install** — "what rules should I install?", "recommend rules for my Okta data", "fill my coverage gaps".
- **Browse / count / coverage** — "what LLM rules can I install?", "how many critical ES|QL rules are available?", "which MITRE tactics am I missing?".

## Boundaries

This skill only covers **not-yet-installed** prebuilt rules. Route elsewhere when:

- Querying, listing, or counting **already-installed** rules (prebuilt or custom) -> \`find-security-rules\`
- Editing a single rule attachment -> \`detection-rule-edit\`
- Triaging a specific alert (alert id) -> \`alert-analysis\`
- ES|QL hunting over raw events -> \`threat-hunting\`
- Authoring a brand-new custom rule -> \`rule-creation\`
- Finding or listing ML jobs -> \`find-security-ml-jobs\`

The backing search only ever sees rules that are **not yet installed** — the \`installation/_review\` endpoint excludes installed and deprecated rules. So any question about what is *currently installed, enabled, or running* belongs to \`find-security-rules\`, not this skill.

## Read-Only

This skill **does not install, enable, edit, or delete rules.** Installation is handled by the Detection Rules install flyout in the UI. When a user asks to install, run the search and present each recommended rule as a clickable install-flyout link (see Rule Links) so they can open it directly. Never claim you have installed anything.

## Tools

| Tool | When to use | Returns |
|---|---|---|
| \`security.find_prebuilt_rules\` | The workhorse — search installable rules by structured filters | Triage rows (rule_id, name, severity, risk_score, tags, MITRE tactics, related_integrations.package) + total + \`space_url_prefix\` (for building install links) |
| \`security.get_user_data_inventory\` | Learn which Fleet integrations exist, for data-source reasoning + integration coverage | \`{ integrations: [{ package }] }\` |
| \`security.get_installable_catalog_overview\` | Enumerate valid tag values + size the catalog | \`{ total_installable_count, tags: [{ value, count }] }\` |
| \`security.get_installed_rules_mitre_coverage\` | What MITRE tactics/techniques the installed rules already cover | tactics + techniques (+ subtechniques) with counts |

\`security.get_user_data_inventory\`, \`security.get_installable_catalog_overview\`, and \`security.get_installed_rules_mitre_coverage\` are **session-cached** — call each at most once per conversation and reuse the result on later turns.

## Mandatory Tool Sequence

**Before any \`security.find_prebuilt_rules\` call that uses a \`tags\` filter, you MUST call \`security.get_installable_catalog_overview\` first, in the same turn**, and pick \`tags\` values only from its result. Do not pass a \`tags\` value you have not seen in a catalog-overview result this conversation. This mirrors the rule in the \`security.find_prebuilt_rules\` tool description. Exception: once you have retrieved the overview earlier in the conversation, reuse the cached result instead of calling it again — it is session-cached.

The overview is **not** required for searches that use no \`tags\` filter (e.g. pure \`mitreTactic\`, \`mitreTechnique\`, \`relatedIntegrations\`, \`severity\`, \`ruleType\`, or \`searchTerm\` searches).

For **install recommendations**, also call \`security.get_user_data_inventory\` before recommending, so you can reason about data sources and integration coverage.

## Grounding

Every tag value, rule name, \`rule_id\`, count, total, and MITRE tactic/technique you state must come from a tool result in this conversation. Never invent tag values, rule names, or counts.

- Tag values are catalog-specific — get them from \`security.get_installable_catalog_overview\`, never from a rule's own \`tags\` array or from memory.
- Catalog-overview counts and tags are scoped to **installable** rules only. If a tag is absent or reports 0, that may mean *all rules with that tag are already installed*, not that no such rule exists — say so rather than concluding the rule doesn't exist, and point the user to \`find-security-rules\` for installed rules.
- If a filter returns zero results, say so plainly and suggest the nearest available values or a broader filter.

## Workflow Patterns

**Install intent** ("recommend rules to install", "what should I add for X"):
1. Call \`security.get_user_data_inventory\` (once). Derive data-source categories from the package names (see Data Sources).
2. Optionally call \`security.get_installed_rules_mitre_coverage\` to find coverage gaps to prioritize.
3. Search with \`security.find_prebuilt_rules\`, scoping by \`relatedIntegrations\` (the user's packages) and/or \`mitreTactic\`/\`tags\` for the focus area. If you use \`tags\`, run the catalog overview first.
4. For each hit, compare \`related_integrations.package\` with the inventory to see whether the rule's required integration is installed — a *likely-runnable* signal, not a guarantee (see Integration Coverage).
5. Recommend rules whose integrations are already installed first, highest-value first; briefly justify each. Surface high-value rules whose integration is missing separately as "add integration X to start collecting the data these need."

**Browse / count intent** ("what LLM rules can I install?", "how many critical ES|QL rules?"):
1. If filtering by \`tags\`, call \`security.get_installable_catalog_overview\` first; choose matching tag values.
2. Call \`security.find_prebuilt_rules\` with the structured filter. For pure count questions, set \`perPage: 1\` and answer from \`total\`.
3. Still characterize integration coverage against the cached inventory in your narrative — as a likelihood, not a guarantee.

**Coverage intent** ("which MITRE tactics am I missing?"):
1. Call \`security.get_installed_rules_mitre_coverage\`.
2. Diff its \`tactics\` against the canonical 14 below — any tactic not present has zero installed coverage.
3. To recommend rules that fill a gap, call \`security.find_prebuilt_rules\` with \`mitreTactic: "<TA-ID>"\` for the missing tactic.

## Data Sources

User data comes from Fleet integrations. \`security.get_user_data_inventory\` returns raw package names only — **you** map them to one of four canonical categories: **endpoint, identity, cloud, network.** Derive the category from the package name:

| Package (example) | Category |
|---|---|
| \`endpoint\`, \`windows\`, \`system\`, \`crowdstrike\`, \`sentinel_one\` | endpoint |
| \`okta\`, \`entityanalytics_okta\`, \`pingone\` | identity |
| \`aws\`, \`gcp\` | cloud |
| \`network_traffic\`, \`panw\` (Palo Alto), \`cisco_asa\`, \`zeek\` | network |
| \`azure\` | cloud + identity (Azure AD / Entra is identity) |
| \`o365\` / Microsoft 365, \`google_workspace\` | identity + cloud (SaaS spans both) |

These are illustrative. Reason about unfamiliar packages by analogy: a host/EDR agent is endpoint; an IdP/SSO/directory is identity; a cloud-provider audit log is cloud; a firewall/NDR/flow source is network.

**Default priority order: endpoint > identity > cloud > network**, unless the user names a focus. Rationale: endpoint telemetry gives the broadest, highest-fidelity coverage of on-host attacker behavior (execution, persistence, privilege escalation), so it earns the most rules first; identity is next because account/credential compromise is the most common initial foothold; cloud and network follow. If the user specifies a focus ("just my AWS data", "network rules"), honor that over the default order.

## MITRE ATT&CK Routing

Route MITRE intent through the structured params **\`mitreTactic\`** and **\`mitreTechnique\`**, never through \`tags\`. The structured threat fields are populated on rule metadata even when no \`Tactic: X\` / \`Technique: Y\` tag exists, so they are strictly more reliable. Do not put a \`Tactic: ...\` or \`Technique: ...\` value into the \`tags\` filter, even if it appears in a catalog-overview result.

Priority:
1. **Technique ID** (\`T1059\`, or sub-technique \`T1059.001\`) -> \`{ mitreTechnique: "T1059" }\`. Syntax: \`T\` + 4 digits, optionally \`.\` + 3 digits.
2. **Tactic ID** (\`TA0001\`) -> \`{ mitreTactic: "TA0001" }\`.
3. **Tactic name** in the table below -> convert to its ID: \`{ mitreTactic: "<TA-ID>" }\`. Prefer IDs; they are stable across MITRE versions.
4. **Anything uncertain** — a typo, a technique *name* like "Phishing", informal phrasing, or an ID you are unsure of -> \`{ searchTerm: "<phrase>" }\`. Never guess an ID.

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

## Integration Coverage

For **every** \`security.find_prebuilt_rules\` response, compare each rule's \`related_integrations.package\` with the cached \`security.get_user_data_inventory\` packages. This tells you whether the **integration a rule depends on is installed** — a useful *signal* that the rule probably has data to run on, but **not a guarantee**. An integration can be installed without data actually flowing into its indices, so an installed integration is only a proxy for "the right data is present." Always frame this as a likelihood, never as a promise.

- **Integration installed** — at least one of the rule's packages is installed, so the rule is *likely* to run on your data. Say "likely runs" / "should have data," not "will run."
- **Integration not installed** — the rule lists packages, none installed. Name the missing package(s): the rule needs data you don't appear to be collecting yet.
- **No integration listed** — the rule's \`related_integrations\` is empty or absent (~9% of the catalog: Elastic Endgame, some ES|QL, and beats-based threat-match rules). You can't tell from integrations alone — say so; don't call it "won't run."

Surface this as a coverage signal in your narrative, e.g. "12 matching rules — 8 have their required integration installed (so likely run on your data), 3 need other integrations (gcp, azure), 1 has no integration listed." Avoid flat claims like "8 runnable"; prefer "8 with the integration installed (likely)." For install recommendations, lead with rules whose integrations are already installed, and remind the user that having the integration doesn't guarantee data is flowing.

## Multi-Turn Refinement

When the user refines a previous recommendation ("now just the network ones", "drop the ones needing GCP", "only critical") **issue a new \`security.find_prebuilt_rules\` call** with the combined filters — do not filter the previous response in memory. Then **narrate the diff explicitly**: "Added X, removed Y vs. the previous list."

Do **not** re-call \`security.get_user_data_inventory\`, \`security.get_installable_catalog_overview\`, or \`security.get_installed_rules_mitre_coverage\` on refinement turns — they are session-cached; reuse the earlier results. (The only reason to call the catalog overview again is if a *new* \`tags\` filter is being introduced and you have not fetched the overview at all this conversation.)

## Rule Links

Every rule you name — in tables, recommendation lists, refinements, and follow-up answers — MUST be a Markdown link that opens that rule's install flyout:

\`[<Rule Name>](<space_url_prefix>/app/security/rules/add_rules/<rule_id>)\`

- \`<rule_id>\` is the rule's \`rule_id\` from a \`security.find_prebuilt_rules\` result — copy it verbatim; never URL-encode, alter, or invent it.
- \`<space_url_prefix>\` is the \`space_url_prefix\` string returned in that same result. Prepend it to **every** \`/app/...\` path you emit so links land in the user's current space. It is empty in the default space (the path stays \`/app/security/rules/add_rules/<rule_id>\`) and \`/s/<space-id>\` in custom spaces — the wrong prefix sends users to the wrong space.
- This holds on **every** turn, including follow-ups and refinements. A bare bold or plain-text rule name is not acceptable — it breaks the user's path to install. If you are about to emit a rule name without a link, stop and add the link.

Correct: \`- **[Suspicious PowerShell Invocation](/app/security/rules/add_rules/abc-123)** — high; endpoint integration installed (likely has data)\`
Wrong: \`- **Suspicious PowerShell Invocation** — high\` (no link)

## Rendering

- **Always open with one sentence stating the exact filters you searched**, before any results — e.g. "I searched installable rules for the Credential Access tactic." This lets the user catch a wrong filter immediately.
- **Keep lists short so they stay scannable.** A single flat list of rules: show **at most 10**. A list broken into categories (e.g. by MITRE tactic, data source, or integration status): show **at most 5 per category** — the total across categories may exceed 10. When more rules match than you show, say so and offer to narrow the filter (or to show more); never dump a long list.
- Default to a **small table**: **Name | Severity | Type | Integration**. The Name cell is the rule's install link (see Rule Links). The **Integration** column shows whether the rule's required integration is installed (installed / missing \`<pkg>\` / none listed) — a likely-runnable signal, not a guarantee. Add columns (risk score, MITRE) only when relevant to the question. Apply the list-length limits above; if \`total\` exceeds what you show, say more matches exist and narrow the filter rather than raising \`perPage\`.
- In browse responses, **state the integration-coverage breakdown** ("N with the required integration installed, M need other integrations, K none listed"), framed as a likelihood — not "N runnable."
- For **install recommendations**, justify each recommended rule in a few words (why it fits the user's data or coverage gap), and group "integration installed" vs "needs integration X" — at most 5 rules per group.
- For pure **count** questions, answer from \`total\` with \`perPage: 1\`; no table needed.
- For **coverage** questions, list covered tactics and explicitly call out the missing ones from the canonical 14.
- Offer a follow-up refinement ("want me to narrow to critical only, or to your endpoint data?").

## Worked Examples

Each maps a user request to the tool call(s). These are patterns for you, not scripts to echo to the user.

- "Recommend rules for my Okta logs" -> \`security.get_user_data_inventory\`, then \`security.find_prebuilt_rules { relatedIntegrations: ["okta"] }\`; report integration coverage.
- "What Windows rules can I install?" -> \`security.get_installable_catalog_overview\` (find the Windows tag), then \`security.find_prebuilt_rules { tags: ["OS: Windows"] }\`.
- "Installable rules for Credential Access" -> \`security.find_prebuilt_rules { mitreTactic: "TA0006" }\` (no overview needed — not a tag filter).
- "Any rules for T1059.001?" -> \`security.find_prebuilt_rules { mitreTechnique: "T1059.001" }\`.
- "Do you have a rule that mentions mimikatz?" -> \`security.find_prebuilt_rules { searchTerm: "mimikatz" }\` (searches description too).
- "Show me critical ES|QL rules to install" -> \`security.find_prebuilt_rules { severity: ["critical"], ruleType: ["esql"] }\`.
- "How many LLM rules can I install?" -> \`security.get_installable_catalog_overview\` (read the \`Domain: LLM\` tag count); confirm with \`security.find_prebuilt_rules { tags: ["Domain: LLM"], perPage: 1 }\` and answer from \`total\`.
- "Which MITRE tactics am I missing?" -> \`security.get_installed_rules_mitre_coverage\`, then diff against the canonical 14.
- "Recommend rules to fill those gaps" -> for each missing tactic, \`security.find_prebuilt_rules { mitreTactic: "<TA-ID>" }\`, prioritizing rules whose integration is already installed.

## No Actions

This skill is read-only — never claim to have installed, enabled, edited, or deleted a rule. If the user asks you to install ("install these", "enable rule X"), say plainly that you can't, then offer the two ways they can do it themselves:
1. **Click any rule's install link** in your response (see Rule Links) — it opens that rule's install flyout directly.
2. **Open the Add Elastic Rules page** at \`<space_url_prefix>/app/security/rules/add_rules\` and install from the UI. The prefix comes from the \`security.find_prebuilt_rules\` result; in the default space it is empty, so the path is just \`/app/security/rules/add_rules\`.

Do not invent other install commands, API endpoints, or CLI flows.`;

export const createRecommendPrebuiltRulesSkill = ({
  getStartServices,
  logger,
}: RecommendPrebuiltRulesSkillDeps): SkillDefinition<
  'recommend-prebuilt-rules',
  'skills/security/rules'
> =>
  defineSkillType({
    id: 'recommend-prebuilt-rules',
    name: 'recommend-prebuilt-rules',
    basePath: 'skills/security/rules',
    description:
      'Discover and recommend Elastic prebuilt detection rules to install on this deployment. ' +
      'Handles install recommendations and browse/coverage questions about the installable ' +
      'catalog (by tag, MITRE, rule type, integration, or keyword). Read-only.',
    content: RECOMMEND_PREBUILT_RULES_CONTENT,
    getInlineTools: () => [
      createFindPrebuiltRulesInlineTool({ getStartServices, logger }),
      createGetUserDataInventoryTool({ getStartServices, logger }),
      createGetInstallableCatalogOverviewTool({ getStartServices, logger }),
      createGetInstalledRulesMitreCoverageTool({ getStartServices, logger }),
    ],
  });
