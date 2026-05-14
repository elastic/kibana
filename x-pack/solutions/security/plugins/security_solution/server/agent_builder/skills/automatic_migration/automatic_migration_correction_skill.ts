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
 * Phase 2a of the `automatic-migration-correction` skill.
 *
 * This factory wires the skill's content (5-section format mandated by
 * skill-conventions) and the registry tools the chat agent leans on when
 * polishing a translated rule. Inline tool handlers that read / write the
 * specific siem_migrations endpoints (`get_rules`, `update_rules`,
 * `upsert_resource`) land in a follow-up commit on the same feature branch;
 * they are deliberately scoped out here so this commit stays small and
 * passes the `prose-vs-primitive` + `anti-overengineering` self-checks.
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
and now wants to **polish a specific translated rule** through chat. Typical
phrasing:

- "Fix the ES|QL in the translated rule called 'Suspicious PowerShell'"
- "Remap the MITRE tactic on rule X to T1059.001"
- "The severity on the translated rule is too low — bump it to high"
- "Update the description / tags / risk score on the translated rule"
- "Re-run translation on this rule with my correction"
- "Why did the migration translator pick this index pattern?"

**Triggers (intent):** the user has already executed an automatic translation
(\`siem_migrations.rules.start\` or the bulk migration flow) and is now
iterating on the *output*. The query references a single translated rule by
name, id, or position in a migration; the desired change is bounded to that
rule's fields.

**Domain:** SIEM rule migration — specifically the **post-translation
correction phase**. Migration runs are identified by a \`migrationId\` UUID;
each run produces N translated rules each with their own id.

Do **NOT** use this skill for:

- Generating a brand-new detection rule from scratch — use
  \`detection-rule-edit\`.
- Providing migration *context* / *lookups* / *resources* before translation
  starts — use \`automatic-migration-context\` (the pre-translation
  companion).
- Bulk re-running the entire translation pass on hundreds of rules — that is
  a backfill / migration-orchestrator concern, not a chat skill.
- Editing already-installed detection rules in the live rules index — use
  \`detection-rule-edit\`. This skill only touches the **translated rule
  draft** that has not yet been installed.

## Process

When the user asks to correct a translated rule, follow this order:

1. **Identify the migration and rule.** Ask the user (or infer from
   context) the \`migrationId\` and the rule's display name or id. Do not
   guess — if more than one migration matches, ask which one.

2. **Read the current translated rule.** Use
   \`security.migration_translated_rules_search\` to find the rule by name
   if you only have a display name, then \`security.migration_translated_rule_get\`
   to fetch the full draft (query, severity, risk_score, description, tags,
   translation_result, status). Quote the relevant subset back to the user
   so they can confirm what they're correcting.

3. **Diagnose before editing.** If the user reports an ES|QL error, run
   the query through \`platform.core.generate_esql\` (or
   \`platform.core.execute_esql\` if the index is reachable) and surface
   the parser / runtime error verbatim before proposing a fix. Do not
   blindly rewrite ES|QL — the translator may have made a defensible
   choice the user wants to preserve.

4. **Look up domain knowledge when relevant.** Use
   \`security.security_labs_search\` for MITRE ATT&CK technique IDs,
   detection-engineering references, or query patterns the user is asking
   about by name. Use \`platform.core.product_documentation\` for the
   canonical Elastic rule field reference (severity scale, risk score
   ranges, schedule interval format, MITRE schema).

5. **Propose the corrected rule diff.** Show the user *before* / *after*
   for the fields you intend to change. Keep the diff scoped — never
   silently rewrite fields the user did not ask about. For ES|QL changes,
   include a one-sentence rationale referencing the diagnostic from
   step 3.

6. **Confirm before persisting.** Persisting a corrected rule into the
   migration draft is a destructive operation (overwrites the translator
   output for that rule). Use
   \`security.migration_translated_rule_update\` and pass
   \`confirm: true\` ONLY after the operator has explicitly approved the
   diff. The schema rejects calls without \`confirm: true\` — this is the
   structural contract, never substitute prose for it. The patch field
   accepts only \`query\`, \`severity\`, \`risk_score\`, \`description\`,
   \`tags\`; omitted fields are preserved.

7. **Report what landed.** After persistence, summarize the fields that
   changed and remind the user the rule still has to be installed via the
   migration install flow — this skill only edits the draft.

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

### Example 4: Refusal — wrong skill

User query: "Create a new rule that detects scheduled task creation on
Windows."

Response:

> This is a brand-new rule, not a correction of a translated rule. The
> right tool is \`detection-rule-edit\`. Want me to hand off?

Do not attempt to use this skill's tools to author from scratch — there
is no \`migrationId\` to scope the change to.

## Guardrails

- **Migration scope is mandatory.** Every read / write requires a
  \`migrationId\` and a rule identifier. Refuse to act if the user has not
  supplied both (or if a previous turn does not contain them); ask
  instead.
- **No bulk operations.** If the user asks "fix every translated rule
  with a query error", refuse politely — that's a backfill, not a
  per-rule correction. The right answer is to re-run the translator or
  open a follow-up migration.
- **Confirmation is structural, not prose.** Destructive operations
  (rule update, resource upsert) MUST use the Agent Builder
  \`confirmation\` field. Never substitute "Are you sure?" prose for the
  schema primitive.
- **RBAC.** Operators need the existing \`SIEM_MIGRATIONS_API_ACTION_ALL\`
  privilege; the route handler enforces this. The skill does not
  re-check privileges client-side.
- **ES|QL rewrites are diagnosed, not guessed.** If the user reports a
  query error, surface the parser / runtime error before proposing a
  fix. A "best-guess rewrite" with no diagnostic is a yellow flag —
  show the diagnostic first.
- **Don't touch installed rules.** This skill operates on the migration
  draft. Installed rules are out of scope; route those to
  \`detection-rule-edit\`.

## Response Format

For correction turns:

1. One short sentence confirming the migration + rule identified.
2. The diagnostic (for query / mapping issues), quoted from the tool
   output verbatim where possible.
3. The proposed diff — \`before\` / \`after\` on the *named* fields only.
4. A one-sentence rationale.
5. The confirmation prompt (rendered via the Agent Builder
   \`confirmation\` field, NOT free text).
6. After confirmation + persistence: a one-line confirmation of what
   landed, plus a reminder that the rule still has to be installed via
   the migration install flow.

For refusal / hand-off turns:

1. One sentence naming why this skill does not apply.
2. The skill or workflow that does apply, by id.
3. Offer to hand off.

Keep replies tight — no preamble, no apologies, no narration of the tool
calls. The user is looking at a UI that already shows the rule context.`;
