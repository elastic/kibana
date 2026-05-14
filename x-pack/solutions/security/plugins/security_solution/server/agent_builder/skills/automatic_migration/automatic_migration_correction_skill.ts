/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import {
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_MIGRATION_TRANSLATED_RULES_SEARCH_TOOL_ID,
  SECURITY_MIGRATION_TRANSLATED_RULE_GET_TOOL_ID,
  SECURITY_MIGRATION_TRANSLATED_RULE_UPDATE_TOOL_ID,
} from '../../tools';

export const AUTOMATIC_MIGRATION_CORRECTION_SKILL_ID = 'automatic-migration-correction';

/**
 * `automatic-migration-correction` skill — chat-driven polishing of one
 * or more rules produced by an automatic SIEM rule migration.
 *
 * Supports BOTH single-rule edits and bulk edits in the same call: the
 * `migration_translated_rule_update` tool accepts an array of per-rule
 * patches, capped at 50 entries, with ONE structural confirmation
 * covering the batch. ES|QL queries are re-validated on save —
 * `translation_result` flips to `full` / `partial` / `untranslatable`
 * automatically based on `parseEsqlQuery` output.
 *
 * Registered behind `automaticMigrationSkillsEnabled` (default `false`).
 */
export const getAutomaticMigrationCorrectionSkill = () =>
  defineSkillType({
    id: AUTOMATIC_MIGRATION_CORRECTION_SKILL_ID,
    name: AUTOMATIC_MIGRATION_CORRECTION_SKILL_ID,
    basePath: 'skills/security/rules',
    description:
      'Correct and refine automatically translated SIEM detection rules during migration workflows. ' +
      'Use after an automatic translation has produced a draft rule, when the operator wants to repair ' +
      'ES|QL syntax errors, remap MITRE ATT&CK fields, adjust severity / risk score, or otherwise improve ' +
      'the translation through chat before persisting the rule. This skill is the chat-driven companion ' +
      'to the bulk automatic translation pass — it does not generate brand-new rules from scratch.',
    content: SKILL_CONTENT,
    getRegistryTools: () => [
      SECURITY_MIGRATION_TRANSLATED_RULES_SEARCH_TOOL_ID,
      SECURITY_MIGRATION_TRANSLATED_RULE_GET_TOOL_ID,
      SECURITY_MIGRATION_TRANSLATED_RULE_UPDATE_TOOL_ID,
      platformCoreTools.generateEsql,
      SECURITY_LABS_SEARCH_TOOL_ID,
    ],
  });

const SKILL_CONTENT = `# Automatic Migration Correction

## When to Use This Skill

Use this skill when the user has run the automatic SIEM rule translation pass
and now wants to **polish one or more translated rules** through chat —
single-rule corrections or bulk corrections across a related set. Typical
phrasing:

- "Fix the ES|QL in the translated rule called 'Suspicious PowerShell'"
- "Remap the MITRE tactic on rule X to T1059.001"
- "The severity on the translated rule is too low — bump it to high"
- "Update the description / severity / risk score on the translated rule"
- "Fix every translated rule in migration \`abc-123\` that has a query error"
- "Bump severity to high on all the credential-theft rules in this migration"
- "Replace the \`splunk_tag\` field reference with \`tags.normalized\` in the
  query of every rule that has it"
- "Why did the migration translator pick this index pattern?"

**Triggers (intent):** the user has already executed an automatic translation
(\`siem_migrations.rules.start\` or the bulk migration flow) and is now
iterating on the *output*. The query references one or more translated
rules in a specific migration; the desired changes are bounded to those
rules' fields. Bulk corrections are supported in batches of up to 50 rules
per confirmation — for wider sweeps the agent splits the batch and surfaces
each preview before the next confirmation.

**Domain:** SIEM rule migration — specifically the **post-translation
correction phase**. Migration runs are identified by a \`migrationId\` UUID;
each run produces N translated rules each with their own id.

Do **NOT** use this skill for:

- Generating a brand-new detection rule from scratch — use
  \`detection-rule-edit\`.
- Providing migration *context* / *lookups* / *resources* before translation
  starts — use \`automatic-migration-context\` (the pre-translation
  companion).
- Re-running the LLM translator on a migration end-to-end — that is a
  migration-orchestrator concern. To re-translate specific rules after
  a correction, POST
  \`/internal/siem_migrations/rules/{migration_id}/start\` with
  \`retry: 'selected'\` and \`selection.ids: [...]\`. This skill applies
  field-level corrections; it does not re-invoke the translator.
- Editing already-installed detection rules in the live rules index — use
  \`detection-rule-edit\`. This skill only touches the **translated rule
  draft** that has not yet been installed.

## Process

When the user asks to correct one or more translated rules, follow this
order:

1. **Identify the migration and the rule set.** Ask the user (or infer
   from context) the \`migrationId\` and which rules are in scope. For
   single-rule corrections, the rule's display name or id. For bulk
   corrections, the *predicate* describing the set ("every rule with a
   query error", "all credential-theft rules", "rules tagged
   \`splunk_tag\`"). Do not guess — if more than one migration matches,
   ask which one.

2. **Read the current translated rules.** Use
   \`security.migration_translated_rules_search\` to enumerate the rules
   matching the predicate, then \`security.migration_translated_rule_get\`
   to fetch the full draft of each one in scope (query, severity,
   risk_score, description, threat\\[\\], translation_result, status). Quote
   the relevant subset back to the user so they can confirm the scope.

3. **Diagnose before editing.** If the user reports an ES|QL error, run
   the query through \`platform.core.generate_esql\` (or
   \`platform.core.execute_esql\` if the index is reachable) and surface
   the parser / runtime error verbatim before proposing a fix. Do not
   blindly rewrite ES|QL — the translator may have made a defensible
   choice the user wants to preserve. For bulk corrections, diagnose at
   least 2–3 representative rules in the set before applying a uniform
   fix; if the diagnostics diverge, surface that and ask whether to
   handle each rule individually.

4. **Look up domain knowledge when relevant.** Use
   \`security.security_labs_search\` for MITRE ATT&CK technique IDs,
   detection-engineering references, or query patterns the user is
   asking about by name. Use \`platform.core.product_documentation\`
   for the canonical Elastic rule field reference (severity scale, risk
   score ranges, schedule interval format, MITRE schema).

5. **Propose the corrected diff.** Show the user *before* / *after* for
   the fields you intend to change. For a single rule, a compact field
   list is enough; for a bulk batch, surface a *per-rule table*
   (\`rule_id\`, \`name\`, fields changing, before/after values) plus a
   one-line summary of the count and the shared rationale. Keep the
   diff scoped — never silently rewrite fields the user did not ask
   about. For ES|QL changes, include a one-sentence rationale
   referencing the diagnostic from step 3.

6. **Confirm before persisting (single confirmation per batch).**
   Persisting corrected rules into the migration draft is destructive
   (overwrites the translator output for every rule listed). Use
   \`security.migration_translated_rule_update\` with the \`updates\`
   array (1–50 entries; one entry per rule, each with its own
   \`patch\`) and pass \`confirm: true\` ONLY after the operator has
   explicitly approved the diff for the entire batch. The schema
   rejects calls without \`confirm: true\` — this is the structural
   contract; never substitute prose for it. The patch on each entry
   accepts only \`query\`, \`severity\`, \`risk_score\`, \`description\`;
   omitted fields are preserved. The migration model does not carry rule
   tags — for tag changes the operator should first install the rule and
   then edit it via the regular detection-engine surface. If the batch
   would exceed 50 rules, split it into 50-rule chunks and re-confirm
   before each chunk.

7. **Report what landed and what didn't.** The tool returns a
   per-rule summary (\`succeeded\`, \`failed\`, \`per_rule\` with the
   updated fields and the recomputed \`translation_result\`). For
   single-rule turns: one-line confirmation. For batches: a compact
   tally ("48 / 50 succeeded; 2 failed with these reasons") plus the
   failures. ES|QL re-validation runs on save — surface the new
   \`translation_result\` so the user knows whether the corrected
   query parses cleanly. Always remind the user that updated rules
   still have to be **installed** via the migration install flow; this
   skill only edits the draft. If the operator wants the translator
   re-invoked on the corrected rules (e.g. the patch changed the
   context the LLM would have used), surface the
   \`POST /internal/siem_migrations/rules/{migration_id}/start\` with
   \`retry: 'selected'\` follow-up as a hand-off — this skill does not
   trigger LLM re-translation directly.

## Examples

### Example 1: ES|QL syntax fix on a translated rule

User query: "The translated rule 'PowerShell EncodedCommand' has a broken
ES|QL query. Fix it."

Steps:

1. Confirm the migration: "Which migration is this in? I see two recent
   ones — \`Splunk → ES|QL 2024-Q4\` and \`QRadar pilot\`."
2. Read the rule's current \`query\`. Run it through
   \`platform.core.generate_esql\` to surface the parser error
   (e.g. \`error: unknown function 'rex'\`).
3. Diagnose: "The translator emitted a Splunk \`rex\` call, which has no
   ES|QL equivalent. The intent is a regex extraction on
   \`process.command_line\`."
4. Propose the rewrite — show the diff, name the trade-off (ES|QL
   \`GROK\` vs \`DISSECT\`), and ask for confirmation.
5. After the user confirms, invoke the update with
   \`confirm: true\` and report what landed.

### Example 2: MITRE remapping

User query: "Add T1059.001 to the threat mapping on the rule \`Suspicious
PowerShell\` in migration \`abc-123\`."

Steps:

1. Read the rule's current \`threat\` array.
2. Look up T1059.001 in
   \`platform.core.product_documentation\` (or
   \`security.security_labs_search\`) — confirm the parent technique
   T1059 (Command and Scripting Interpreter) is present; if not, add it
   too, since ATT&CK schema requires the parent for any sub-technique.
3. Show the *before* / *after* on \`threat[].technique[].subtechnique\`
   only — do not touch \`severity\`, \`risk_score\`, \`query\`, etc.
4. Confirm and persist.

### Example 3: Severity + risk-score adjustment

User query: "This translated rule is high severity, not medium. Update
it."

Steps:

1. Read \`severity\` and \`risk_score\` — quote them back.
2. Reference the Elastic severity scale (via product documentation): the
   recommended risk-score band for \`high\` is 73–99. If the existing
   risk score is 50 (matching the translator's \`medium\` default), ask
   the user whether to also bump risk_score to land mid-band (e.g. 80).
3. Show the diff (\`severity: medium → high\`,
   \`risk_score: 50 → 80\`) and confirm before persisting.

### Example 4: Bulk correction — uniform fix across N rules

User query: "Fix every translated rule in migration \`abc-123\` whose
query has a parser error — they all use the Splunk \`rex\` macro that
the translator left in."

Steps:

1. Confirm the migration id.
2. Use \`security.migration_translated_rules_search\` with no name
   filter to enumerate the rules; for each hit whose
   \`translation_result\` is \`partial\` and whose
   \`elastic_rule.query\` contains \`rex\`, fetch the full draft with
   \`security.migration_translated_rule_get\`. Cap the working set at
   50 — if the migration has more matches, surface that count and ask
   whether to proceed in 50-rule chunks.
3. Diagnose on 2–3 representative rules: parse each via
   \`platform.core.generate_esql\` and confirm the parser error is the
   same (\`unknown function 'rex'\`) and the rewrite shape is the
   same (\`rex field=X "(?<g>...)"\` → \`GROK X "%{...:g}"\`). If
   diagnostics diverge across the set, abort the bulk path and surface
   the divergence — fall back to single-rule corrections.
4. Surface a per-rule diff table to the operator:

   | rule_id | name | before (query excerpt) | after (query excerpt) |
   | --- | --- | --- | --- |
   | r-1 | PowerShell EncodedCommand | \`... \\\` rex ...\` | \`... \\\` GROK ...\` |
   | r-2 | Suspicious WMIC          | \`... \\\` rex ...\` | \`... \\\` GROK ...\` |
   | … | … | … | … |

   Plus a one-line summary: *"48 rules selected, uniform GROK rewrite,
   same rationale."*
5. After ONE structural confirmation covering the batch, invoke
   \`security.migration_translated_rule_update\` with
   \`updates: [{ rule_id, patch: { query: <rewrite> } }, …]\` and
   \`confirm: true\`.
6. Report the per-rule tally returned by the tool. ES|QL re-validation
   ran on save — \`translation_result\` should now be \`full\` for the
   succeeded entries. Remind: *"Updated rules still need to be installed
   via the migration install flow. If you want the LLM translator to
   re-run on these (so it picks up the corrected context for downstream
   rules in the same migration), use the retry-selected start
   endpoint."*

### Example 5: Refusal — wrong skill

User query: "Create a new rule that detects scheduled task creation on
Windows."

Response:

> This is a brand-new rule, not a correction of a translated rule. The
> right tool is \`detection-rule-edit\`. Want me to hand off?

Do not attempt to use this skill's tools to author from scratch — there
is no \`migrationId\` to scope the change to.

## Guardrails

- **Migration scope is mandatory.** Every read / write requires a
  \`migrationId\` and at least one rule identifier. Refuse to act if
  the user has not supplied both (or if a previous turn does not
  contain them); ask instead.
- **Bulk corrections require batch preview + ONE structural confirm.**
  Bulk is supported (epic success criterion #1: "Bulk edit rules via a
  chat experience") but the agent MUST surface the impacted-rule list
  AND a diff preview AND a one-line summary of the shared rationale
  before invoking the update. ONE \`confirm: true\` covers the entire
  batch; partial confirmations are not a thing here. Hard cap is 50
  rules per call — wider sweeps must be split with re-confirmation
  before each chunk.
- **Bulk requires uniform diagnosis.** Before applying a uniform fix
  to N rules, diagnose 2–3 representative rules in the set. If
  diagnostics diverge (different parser errors, different intents),
  abort the bulk path and fall back to single-rule corrections.
  Silently applying a rewrite that's right for some rules and wrong
  for others is the foot-gun this rule prevents.
- **Confirmation is structural, not prose.** Destructive operations
  MUST use the Agent Builder \`confirm: true\` schema primitive.
  Never substitute "Are you sure?" prose for the schema gate.
- **RBAC.** Operators need the existing
  \`SIEM_MIGRATIONS_API_ACTION_ALL\` privilege; the migration routes
  enforce this. Note: this skill currently writes directly to the
  translated-rules index via \`esClient\` and does NOT route through
  \`PATCH /internal/siem_migrations/rules/{migration_id}/rules\`
  middleware (\`withLicense\`, \`withExistingMigration\`,
  \`logUpdateRules\` audit). See the "Known Limitations" section in
  \`automatic_migration/README.md\` — the route delegation is
  scheduled follow-up work.
- **ES|QL rewrites are diagnosed, not guessed.** If the user reports
  a query error, surface the parser / runtime error before proposing
  a fix. A "best-guess rewrite" with no diagnostic is a yellow flag
  — show the diagnostic first.
- **ES|QL is re-validated on save.** The handler invokes
  \`parseEsqlQuery\` for any patched \`query\` and writes
  \`translation_result\` (\`full\` / \`partial\` / \`untranslatable\`)
  alongside the update. The agent should surface the new
  \`translation_result\` in the post-confirmation report so the user
  sees whether the corrected query actually parses.
- **Re-translation is a separate operation.** This skill applies
  field-level corrections. To re-run the LLM translator on corrected
  rules, hand off to the retry-selected start endpoint
  (\`POST /internal/siem_migrations/rules/{migration_id}/start\` with
  \`retry: 'selected'\` and \`selection.ids: [...]\`).
- **Don't touch installed rules.** This skill operates on the
  migration draft. Installed rules are out of scope; route those to
  \`detection-rule-edit\`.

## Response Format

For **single-rule** correction turns:

1. One short sentence confirming the migration + rule identified.
2. The diagnostic (for query / mapping issues), quoted from the tool
   output verbatim where possible.
3. The proposed diff — \`before\` / \`after\` on the *named* fields
   only.
4. A one-sentence rationale.
5. The confirmation request (the agent invokes the update tool with
   \`confirm: true\` only after the operator approves; the schema
   primitive IS the gate — no free-text "Are you sure?" prose).
6. After confirmation + persistence: a one-line confirmation of what
   landed, including the new \`translation_result\` if the patch
   touched \`query\`. Reminder that the rule still has to be installed
   via the migration install flow.

For **bulk** correction turns:

1. One short sentence confirming the migration + the predicate
   ("48 rules in migration \`abc-123\` matching \`translation_result =
   partial\` AND query contains \`rex\`").
2. The shared diagnostic + rewrite shape, quoted from
   \`platform.core.generate_esql\` (or equivalent) on a representative
   rule. Surface any divergence across the set or abort the bulk path.
3. A per-rule diff table (\`rule_id\`, \`name\`, fields changing,
   before/after excerpts). Truncate long values; do not paper over
   divergence.
4. A one-line summary of the count and the shared rationale.
5. The confirmation request covers the whole batch; the agent invokes
   the update tool with the full \`updates\` array and a single
   \`confirm: true\`.
6. After persistence: a compact tally ("48 / 50 succeeded; 2 failed"),
   the failures broken out with the \`error\` strings the tool
   returned, and the recomputed \`translation_result\` distribution for
   the patched queries. Reminder: rules still need installing; for
   re-translation, hand off to the retry-selected start endpoint.

For **refusal / hand-off** turns:

1. One sentence naming why this skill does not apply.
2. The skill or workflow that does apply, by id.
3. Offer to hand off.

Keep replies tight — no preamble, no apologies, no narration of the tool
calls. The user is looking at a UI that already shows the rule context.`;
