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
} from '../../tools';

const WORKFLOW_EXECUTE_STEP_TOOL_ID = 'platform.workflows.workflow_execute_step';

export const AUTOMATIC_MIGRATION_CORRECTION_SKILL_ID = 'automatic-migration-correction';

/**
 * `automatic-migration-correction` skill — chat-driven polishing of one
 * or more rules produced by an automatic SIEM rule migration.
 *
 * Supports BOTH single-rule edits and bulk edits in the same call:
 * `workflow_execute_step` with `kibana.request` targets the canonical
 * migration PATCH route, capped at 50 entries per call, with the
 * platform's HITL dialog gating execution. ES|QL queries are
 * re-validated on save — `translation_result` flips to `full` /
 * `partial` / `untranslatable` automatically based on `parseEsqlQuery`
 * output.
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
      WORKFLOW_EXECUTE_STEP_TOOL_ID,
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

6. **Persist via workflow_execute_step + kibana.request.**
   Persisting corrected rules into the migration draft is destructive
   (overwrites the translator output for every rule listed). Use
   \`platform.workflows.workflow_execute_step\` with an inline YAML
   block targeting the internal migration PATCH route (see "Update
   Rules API" section below). The platform gates this call with a
   user confirmation dialog (HITL) — the user sees what will be sent
   and approves or rejects. Always populate \`confirmation_body\` with
   a Markdown preview of the impacted rules, the fields changing, and
   a one-line diff summary. Each entry in the body array accepts
   \`id\` (the rule's ES \`_id\`), optional \`elastic_rule\` partial
   (\`query\`, \`severity\`, \`risk_score\`, \`description\`, \`title\`);
   omitted fields are preserved. The migration model does not carry rule
   tags — for tag changes the operator should first install the rule and
   then edit it via the regular detection-engine surface. If the batch
   would exceed 50 rules, split it into 50-rule chunks and re-confirm
   before each chunk.

7. **Report what landed and what didn't.** The route returns
   \`{ updated: true }\` on success or a 400 with an error message
   on failure. For single-rule turns: one-line confirmation. For
   batches: confirm the batch succeeded. ES|QL re-validation runs
   on save (the route uses the same
   \`transformToInternalUpdateRuleMigrationData\` helper that invokes
   \`convertEsqlQueryToTranslationResult\`) — the \`translation_result\`
   flips to \`full\` / \`partial\` / \`untranslatable\` automatically.
   Always remind the user that updated rules still have to be
   **installed** via the migration install flow; this skill only edits
   the draft. If the operator wants the translator re-invoked on the
   corrected rules, surface the
   \`POST /internal/siem_migrations/rules/{migration_id}/start\` with
   \`retry: 'selected'\` follow-up as a hand-off.

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
5. After the user confirms, invoke \`workflow_execute_step\` with
   the PATCH route YAML and report what landed.

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
5. After ONE user confirmation (the HITL dialog from
   \`workflow_execute_step\`) covering the batch, invoke the PATCH
   route via the "Update Rules API" YAML shape below with the full
   body array.
6. Report the outcome. ES|QL re-validation
   ran on save — \`translation_result\` should now be \`full\` for
   corrected queries. Remind: *"Updated rules still need to be installed
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
- **Bulk corrections require batch preview + HITL confirmation.**
  Bulk is supported (epic success criterion #1: "Bulk edit rules via a
  chat experience") but the agent MUST surface the impacted-rule list
  AND a diff preview AND a one-line summary of the shared rationale
  in the \`confirmation_body\` field before invoking
  \`workflow_execute_step\`. The platform's HITL dialog is the gate —
  the user sees the confirmation_body and approves or rejects. Hard
  cap is 50 rules per call — wider sweeps must be split with
  re-confirmation before each chunk.
- **Bulk requires uniform diagnosis.** Before applying a uniform fix
  to N rules, diagnose 2–3 representative rules in the set. If
  diagnostics diverge (different parser errors, different intents),
  abort the bulk path and fall back to single-rule corrections.
  Silently applying a rewrite that's right for some rules and wrong
  for others is the foot-gun this rule prevents.
- **Confirmation is platform-gated (HITL), not prose.** Destructive
  operations route through \`workflow_execute_step\` which triggers the
  platform's user confirmation dialog. Never substitute "Are you
  sure?" prose — the HITL dialog IS the gate. Always populate
  \`confirmation_body\` with a Markdown summary of the side effects.
- **RBAC.** Operators need the existing
  \`SIEM_MIGRATIONS_API_ACTION_ALL\` privilege; the migration routes
  enforce this. Writes route through
  \`PATCH /internal/siem_migrations/rules/{migration_id}/rules\` which applies
  \`withLicense\`, \`withExistingMigration\`, and audit logging
  middleware — all enforcement is server-side.
- **ES|QL rewrites are diagnosed, not guessed.** If the user reports
  a query error, surface the parser / runtime error before proposing
  a fix. A "best-guess rewrite" with no diagnostic is a yellow flag
  — show the diagnostic first.
- **ES|QL is re-validated on save.** The route's
  \`transformToInternalUpdateRuleMigrationData\` helper invokes
  \`parseEsqlQuery\` for any patched \`query\` and writes
  \`translation_result\` (\`full\` / \`partial\` / \`untranslatable\`)
  alongside the update. After the write, re-read the rule with
  \`security.migration_translated_rule_get\` to surface the new
  \`translation_result\` to the user.
- **Re-translation is a separate operation.** This skill applies
  field-level corrections. To re-run the LLM translator on corrected
  rules, hand off to the retry-selected start endpoint
  (\`POST /internal/siem_migrations/rules/{migration_id}/start\` with
  \`retry: 'selected'\` and \`selection.ids: [...]\`).
- **Don't touch installed rules.** This skill operates on the
  migration draft. Installed rules are out of scope; route those to
  \`detection-rule-edit\`.

## Update Rules API (write via workflow_execute_step)

Use this exact \`workflow_execute_step\` call shape to persist rule corrections.
The route applies license checks, migration-existence validation, audit logging,
and ES|QL re-validation (via \`transformToInternalUpdateRuleMigrationData\`) on
the server. The HITL dialog gates execution.

\`\`\`
tool_id: platform.workflows.workflow_execute_step
params:
  stepName: update_translated_rules
  confirmation_body: |
    Update <N> translated rule(s) in migration \`<migration-id>\`:
    - <rule-name-1>: <fields changing>
    - <rule-name-2>: <fields changing>
    This overwrites the prior translator output for each listed rule.
  yaml: |
    version: "1"
    name: migration_rule_update
    triggers:
      - type: manual
    steps:
      - name: update_translated_rules
        type: kibana.request
        with:
          method: PATCH
          path: /internal/siem_migrations/rules/<migration-id>/rules
          headers:
            elastic-api-version: "1"
          body:
            - id: "<rule-es-doc-id>"
              elastic_rule:
                query: "<corrected ES|QL>"
                severity: "high"
                risk_score: 80
                description: "<updated description>"
\`\`\`

Body is an array of \`{ id, elastic_rule? }\` objects. Only include fields
being changed in \`elastic_rule\` — omitted fields are preserved. Cap at
50 entries per call.

## Response Format

For **single-rule** correction turns:

1. One short sentence confirming the migration + rule identified.
2. The diagnostic (for query / mapping issues), quoted from the tool
   output verbatim where possible.
3. The proposed diff — \`before\` / \`after\` on the *named* fields
   only.
4. A one-sentence rationale.
5. The confirmation is handled by the platform HITL dialog
   (triggered by \`workflow_execute_step\` for the unsafe
   \`kibana.request\` step type). The \`confirmation_body\` you provide
   is shown to the user.
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
5. The confirmation request covers the whole batch via the platform
   HITL dialog (the \`confirmation_body\` you set is what the user sees).
6. After persistence: a compact tally ("48 / 50 succeeded; 2 failed"),
   the failures broken out with error strings, and the recomputed
   \`translation_result\` distribution for the patched queries.
   Reminder: rules still need installing; for re-translation, hand off
   to the retry-selected start endpoint.

For **refusal / hand-off** turns:

1. One sentence naming why this skill does not apply.
2. The skill or workflow that does apply, by id.
3. Offer to hand off.

Keep replies tight — no preamble, no apologies, no narration of the tool
calls. The user is looking at a UI that already shows the rule context.`;
