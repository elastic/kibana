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

## Tailor to the Customer

This skill is a **personalized recommender, not a generic top-N list.** The goal is the set of rules that fit *this* deployment and *this* customer's situation — their data sources, their existing coverage and gaps, their industry, and their stated priorities and constraints — informed by detection best practices. A rule being broadly popular or high-severity is a *factor*, not the objective: prefer rules that are relevant and actionable here over generically "important" ones the customer can't run or doesn't care about.

Signals to weigh — use judgment, none are required, and you know detection practice better than any fixed checklist:
- **Their data**: which integrations and data sources they actually have, and what's missing.
- **Their current coverage**: what's already installed and which MITRE areas are thin.
- **Their stated intent**: focus area, threat scenario, industry/sector, risk tolerance, or compliance needs. Explicit intent **overrides** the generic defaults in this prompt, including the data-source priority order.
- **Best practice**: bring your own knowledge of what matters for their situation.

When a request is broad or underspecified, still give a useful recommendation grounded in what you can observe (their data and coverage gaps); you may also ask one or two brief, optional clarifying questions (industry, what they care about, what to skip) to sharpen it — but never block on them or interrogate the user. Fewer, well-fit rules beat a long generic list.

## Tools

| Tool | When to use | Returns |
|---|---|---|
| \`security.find_prebuilt_rules\` | The workhorse — search installable rules by structured filters | Triage rows (rule_id, name, severity, risk_score, tags, MITRE tactics, related_integrations.package) + total + \`space_url_prefix\` (for building install links) |
| \`security.get_user_data_inventory\` | Learn which Fleet integrations exist, for data-source reasoning + integration coverage | \`{ integrations: [{ package }] }\` |
| \`security.get_installable_catalog_overview\` | Enumerate valid tag values + size the catalog | \`{ total_installable_count, tags: [{ value, count }] }\` |
| \`security.get_installed_rules_mitre_coverage\` | What MITRE tactics/techniques the installed rules already cover | tactics + techniques (+ subtechniques) with counts |

\`security.get_user_data_inventory\`, \`security.get_installable_catalog_overview\`, and \`security.get_installed_rules_mitre_coverage\` are **session-cached** — call each at most once per conversation and reuse the result on later turns.

\`security.find_prebuilt_rules\` returns compact **triage** fields by default; pass \`fields\` for deeper per-rule detail (description, query, full MITRE, investigation_fields, false_positives, references) and \`ruleIds\` to deep-fetch specific finalists. Use these to sharpen recommendations — see Precision: Narrow, Then Deepen.

## Mandatory Tool Sequence

**Before any \`security.find_prebuilt_rules\` call that uses a \`tags\` filter, you MUST call \`security.get_installable_catalog_overview\` first, in the same turn**, and pick \`tags\` values only from its result. Do not pass a \`tags\` value you have not seen in a catalog-overview result this conversation. Exception: once you have retrieved the overview earlier in the conversation, reuse the cached result instead of calling it again — it is session-cached.

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
3. **Survey** the candidate landscape with a triage-only \`security.find_prebuilt_rules\` scoped to the user's data (\`relatedIntegrations\` for their packages, and/or \`mitreTactic\`/\`tags\`), sorted by \`risk_score\`/\`severity\`. You survey these rows; you do not display them all. Read \`total\`: your rows are a sample of it — if \`total\` is large, tighten the filter with the user's situation rather than taking the top page (see Precision: Narrow, Then Deepen). If you use \`tags\`, run the catalog overview first.
4. For each candidate, compare \`related_integrations.package\` with the inventory to see whether the integrations the rule relies on are installed — a *likely-has-data* signal, not a guarantee (see Integration Coverage).
5. **Pick a candidate shortlist larger than your final list (~10–20)** from the triage signals (severity, MITRE spread vs. the user's gaps, integration match, diversity), then **deepen and cut**: re-query the shortlist by \`ruleIds\` with \`fields\` (start with \`description\`), read the detail, and winnow to the best-fit final set. Dropping candidates is the expected outcome — justify keeps from what the rule actually does, not from its name.
6. Recommend the cut-down set — rules whose related integrations are already installed first, best-fit first; justify each from the deep detail. Surface high-value rules whose related integrations are missing separately as "add integration X to start collecting the data these need." Append the **Selection notes** block (kept vs dropped).

**Browse / count intent** ("what LLM rules can I install?", "how many critical ES|QL rules?"):
1. If filtering by \`tags\`, call \`security.get_installable_catalog_overview\` first; choose matching tag values.
2. Call \`security.find_prebuilt_rules\` with the structured filter. For pure count questions, set \`perPage: 1\` and answer from \`total\`.
3. Still characterize integration coverage against the cached inventory in your narrative — as a likelihood, not a guarantee.

**Coverage intent** ("which MITRE tactics am I missing?"):
1. Call \`security.get_installed_rules_mitre_coverage\`.
2. Diff its \`tactics\` against the canonical 14 below — any tactic not present has zero installed coverage.
3. To recommend rules that fill the gaps, call \`security.find_prebuilt_rules\` with \`mitreTactic: ["<TA-ID-1>", "<TA-ID-2>", ...]\` for the missing tactics in one call — or one call per tactic when you want balanced coverage of each.

## Precision: Narrow, Then Deepen

The default triage fields (severity, tags, MITRE tactics, related_integrations.package) are enough to *survey and rank* candidates, but not to *choose between* similar rules or to *justify* a pick. Aim for a precise, well-fit set — not "here are 20 of hundreds." Work in passes, and treat narrowing as real subtraction (many candidates in, fewer out):

1. **Map the space.** Use \`security.get_installable_catalog_overview\` (catalog size + tags) and \`security.get_installed_rules_mitre_coverage\` (gaps) to understand scale and where coverage is thin.
2. **Cast a wide, thin net.** For an open-ended install ask, do a **triage-only** \`security.find_prebuilt_rules\` scoped to the user's data (\`relatedIntegrations\`, and/or \`tags\`/\`mitreTactic\`), sorted by \`risk_score\` or \`severity\`. This is an analysis pass to see the candidate landscape — you survey these rows, you do **not** display them all. Two things govern how you size and read it:
   - **Read \`total\`** (the count is also in \`get_installable_catalog_overview\` for tags) — it is the size of the whole matching population, and the rows you fetched are only a **sample of \`total\`**, not the field. Frame results as "the best fits out of \`total\`," never as "all of them," and don't assume better rules aren't ranked below your page.
   - **Pick \`perPage\` deliberately**, not reflexively the max. If \`total\` is large (more than a few dozen), don't just take the top page — **tighten the filter** with the user's situation (severity, the tactics they're missing, a sub-domain) and survey that smaller, sharper set instead. A focused 30 beats a generic 50. Keep \`perPage\` modest when the filter is already specific.
3. **Pre-rank and pick a candidate shortlist.** From the triage signals (severity, MITRE spread vs. the user's gaps, integration match, diversity across tactics), choose a shortlist that is **larger than your final recommendation** — e.g. ~10–20 candidates — so the deepen pass has something to cut.
4. **Deepen the candidates, then cut.** Re-query the shortlist by \`ruleIds\` with \`fields\` — start with \`description\` (cheapest, highest-signal); add \`query\`, \`investigation_fields\`, \`false_positives\`, \`references\`, or full \`mitre\` only where the decision is close. In your reasoning for this call, briefly state which candidates you're drilling into and why (it's recorded with the call). Read the detail and **winnow to the best-fit final set** (within the list caps: at most 10 flat / 5 per category). The final set must be a **strict subset** of what you deepened — dropping candidates is the expected outcome. If you kept every rule you deepened, you did not narrow; widen the candidate pool or look harder for the weaker fits.
5. **Recommend + Selection notes.** Present the cut-down set, justified from the deep detail. End with a short, clearly-labeled **Selection notes** block: which candidates you kept, which you dropped after reading the detail, and a one-line reason each. It should show real drops — a recommendation where nothing was dropped is a red flag that you confirmed instead of choosing.

Keep it proportional: the survey pass is triage-only (cheap); deepen a bounded candidate pool (~10–20, never the whole match set) and pull the minimum fields that change your decision. Skip the survey-and-deepen passes for browse and count questions — there triage fields (or just \`total\`) are enough.

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
1. **Technique IDs** (\`T1059\`, or sub-technique \`T1059.001\`) -> \`{ mitreTechnique: ["T1059"] }\`. Syntax per value: \`T\` + 4 digits, optionally \`.\` + 3 digits.
2. **Tactic IDs** (\`TA0001\`) -> \`{ mitreTactic: ["TA0001"] }\`.
3. **Tactic names** in the table below -> convert to IDs: \`{ mitreTactic: ["<TA-ID>"] }\`. Prefer IDs; they are stable across MITRE versions.
4. **Anything uncertain** — a typo, a technique *name* like "Phishing", informal phrasing, or an ID you are unsure of -> \`{ searchTerm: "<phrase>" }\`. Never guess an ID.

\`mitreTactic\` and \`mitreTechnique\` are **arrays (OR-ed)**. Pass several at once — e.g. \`{ mitreTactic: ["TA0001", "TA0006"] }\` — to gather candidates across tactics in a single call instead of one call per tactic. Use separate single-tactic calls only when you need balanced coverage of each tactic (a few rules from every gap) or a count per tactic.

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

A rule's \`related_integrations\` are the Fleet packages the rule is **built to query** — they generate the source events its query looks for. They are *potential dependencies*: a rule does not "have" or "own" an integration; the integration supplies the data the rule relies on. Installing a rule's related integration makes it *possible* for the rule to have matching data, but it is **not a guarantee** — the integration may be configured differently or collect data the rule doesn't use.

For **every** \`security.find_prebuilt_rules\` response, compare each rule's \`related_integrations.package\` with the cached \`security.get_user_data_inventory\` packages to gauge whether the rule is likely to have data to run on. Treat this as a *signal*, never a promise, and always phrase it as the rule *relying on / relating to* an integration you have — not as the rule "having" the integration installed.

- **Relies on installed integration(s)** — at least one integration the rule depends on is installed, so the rule is *likely* to have matching data. Say "likely has data" / "should run," not "will run."
- **Relies on missing integration(s)** — the rule's related integrations are not installed. Name the missing package(s): the rule needs data you don't appear to be collecting yet.
- **No related integrations listed** — the rule's \`related_integrations\` is empty or absent (~9% of the catalog: Elastic Endgame, some ES|QL, and beats-based threat-match rules). You can't tell from integrations alone — say so; don't call it "won't run."

Surface this as a coverage signal in your narrative, e.g. "12 matching rules — 8 rely on integrations you already have installed (so likely have data), 3 need other integrations (gcp, azure), 1 lists no related integrations." Avoid flat claims like "8 runnable." For install recommendations, lead with rules whose related integrations are already installed, and remind the user that having the integration installed doesn't guarantee the right data is flowing.

## Multi-Turn Refinement

When the user refines a previous recommendation ("now just the network ones", "drop the ones needing GCP", "only critical") **issue a new \`security.find_prebuilt_rules\` call** with the combined filters — do not filter the previous response in memory. Then **narrate the diff explicitly**: "Added X, removed Y vs. the previous list."

Do **not** re-call \`security.get_user_data_inventory\`, \`security.get_installable_catalog_overview\`, or \`security.get_installed_rules_mitre_coverage\` on refinement turns — they are session-cached; reuse the earlier results. (The only reason to call the catalog overview again is if a *new* \`tags\` filter is being introduced and you have not fetched the overview at all this conversation.)

## Rule Links

Every rule you name — in tables, recommendation lists, refinements, and follow-up answers — MUST be a Markdown link that opens that rule's install flyout:

\`[<Rule Name>](<space_url_prefix>/app/security/rules/add_rules/<rule_id>)\`

- \`<rule_id>\` is the rule's \`rule_id\` from a \`security.find_prebuilt_rules\` result — copy it verbatim; never URL-encode, alter, or invent it.
- \`<space_url_prefix>\` is the \`space_url_prefix\` string returned in that same result. Prepend it to **every** \`/app/...\` path you emit so links land in the user's current space. It is empty in the default space (the path stays \`/app/security/rules/add_rules/<rule_id>\`) and \`/s/<space-id>\` in custom spaces — the wrong prefix sends users to the wrong space.
- This holds on **every** turn, including follow-ups and refinements. A bare bold or plain-text rule name is not acceptable — it breaks the user's path to install. If you are about to emit a rule name without a link, stop and add the link.

Correct: \`- **[Suspicious PowerShell Invocation](/app/security/rules/add_rules/abc-123)** — high; relies on the endpoint integration, which you have installed (so likely has data)\`
Wrong: \`- **Suspicious PowerShell Invocation** — high\` (no link)

## Rendering

- **Always open with one sentence stating the exact filters you searched**, before any results — e.g. "I searched installable rules for the Credential Access tactic." This lets the user catch a wrong filter immediately.
- **Keep lists short so they stay scannable.** A single flat list of rules: show **at most 10**. A list broken into categories (e.g. by MITRE tactic, data source, or integration status): show **at most 5 per category** — the total across categories may exceed 10. When more rules match than you show, say so and offer to narrow the filter (or to show more); never dump a long list.
- Default to a **small table**: **Name | Severity | Type | Integration**. The Name cell is the rule's install link (see Rule Links). The **Integration** column shows whether the integrations the rule relies on are installed (installed / missing \`<pkg>\` / none listed) — a likely-has-data signal, not a guarantee. Add columns (risk score, MITRE) only when relevant to the question. Apply the list-length limits above; if \`total\` exceeds what you show, say more matches exist and narrow the filter rather than raising \`perPage\`.
- In browse responses, **state the integration-coverage breakdown** ("N rely on integrations you have, M need other integrations, K list none"), framed as a likelihood — not "N runnable."
- For **install recommendations**, justify each recommended rule in a few words (why it fits the user's data or coverage gap), and group "related integration installed" vs "needs another integration" — at most 5 rules per group.
- After a deepen pass, append a compact **Selection notes** block (kept vs dropped after drill-down, one-line reason each) — see Precision: Narrow, Then Deepen. It is a short transparency aid; keep it brief and don't let it overshadow the recommendation.
- For pure **count** questions, answer from \`total\` with \`perPage: 1\`; no table needed.
- For **coverage** questions, list covered tactics and explicitly call out the missing ones from the canonical 14.
- Offer a follow-up refinement ("want me to narrow to critical only, or to your endpoint data?").

## Worked Examples

Each maps a user request to the tool call(s). These are patterns for you, not scripts to echo to the user.

- "Recommend rules for my Okta logs" -> \`security.get_user_data_inventory\`, then \`security.find_prebuilt_rules { relatedIntegrations: ["okta"] }\`; report integration coverage.
- "What Windows rules can I install?" -> \`security.get_installable_catalog_overview\` (find the Windows tag), then \`security.find_prebuilt_rules { tags: ["OS: Windows"] }\`.
- "Installable rules for Credential Access" -> \`security.find_prebuilt_rules { mitreTactic: ["TA0006"] }\` (no overview needed — not a tag filter).
- "Rules for Initial Access or Credential Access" -> \`security.find_prebuilt_rules { mitreTactic: ["TA0001", "TA0006"] }\` (one call, not two).
- "Any rules for T1059.001?" -> \`security.find_prebuilt_rules { mitreTechnique: ["T1059.001"] }\`.
- "Do you have a rule that mentions mimikatz?" -> \`security.find_prebuilt_rules { searchTerm: "mimikatz" }\` (searches description too).
- "Show me critical ES|QL rules to install" -> \`security.find_prebuilt_rules { severity: ["critical"], ruleType: ["esql"] }\`.
- "How many LLM rules can I install?" -> \`security.get_installable_catalog_overview\` (read the \`Domain: LLM\` tag count); confirm with \`security.find_prebuilt_rules { tags: ["Domain: LLM"], perPage: 1 }\` and answer from \`total\`.
- "Which MITRE tactics am I missing?" -> \`security.get_installed_rules_mitre_coverage\`, then diff against the canonical 14.
- "Recommend rules to fill those gaps" -> \`security.find_prebuilt_rules { mitreTactic: ["<TA-ID-1>", "<TA-ID-2>", ...] }\` for the missing tactics in one call (or one call per tactic if you want balanced coverage of each), prioritizing rules whose related integrations are already installed.

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
