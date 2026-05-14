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
  SECURITY_MIGRATION_RESOURCES_LIST_TOOL_ID,
  SECURITY_MIGRATION_RESOURCE_UPSERT_TOOL_ID,
  SECURITY_MIGRATION_RESOURCE_REMOVE_TOOL_ID,
} from '../../tools';

export const AUTOMATIC_MIGRATION_CONTEXT_SKILL_ID = 'automatic-migration-context';

/**
 * Phase 2a of the `automatic-migration-context` skill.
 *
 * Provides the *pre-translation* surface: lets operators supply additional
 * documents, standardized rule naming conventions, articles, and lookup data
 * so the next translation pass produces higher-quality drafts. The Phase 2a
 * commit wires comprehensive content + the registry tools the chat agent
 * needs to discover existing context resources; tool handlers that *write*
 * resources (resource upsert / lookup attach) follow in a focused commit on
 * the same feature branch with explicit `confirmation` schemas.
 *
 * Registered behind `automaticMigrationSkillsEnabled` (default `false`).
 */
export const getAutomaticMigrationContextSkill = () =>
  defineSkillType({
    id: AUTOMATIC_MIGRATION_CONTEXT_SKILL_ID,
    name: AUTOMATIC_MIGRATION_CONTEXT_SKILL_ID,
    basePath: 'skills/security/rules',
    description:
      'Provide contextual enrichment for SIEM rule migration before translation runs. Use when the ' +
      'operator wants to upload supporting documents, register rule naming conventions, attach ' +
      'reference articles, or seed lookup data so the next translation pass produces a higher-quality ' +
      'draft rule. This skill is the pre-translation companion to automatic-migration-correction.',
    content: SKILL_CONTENT,
    getRegistryTools: () => [
      SECURITY_MIGRATION_RESOURCES_LIST_TOOL_ID,
      SECURITY_MIGRATION_RESOURCE_UPSERT_TOOL_ID,
      SECURITY_MIGRATION_RESOURCE_REMOVE_TOOL_ID,
      platformCoreTools.productDocumentation,
      SECURITY_LABS_SEARCH_TOOL_ID,
    ],
  });

const SKILL_CONTENT = `# Automatic Migration Context

## When to Use This Skill

Use this skill **before** a SIEM rule migration translation pass runs,
when the operator wants to inject context that will improve the upcoming
translation. Typical phrasing:

- "Upload our naming-convention doc to migration \`abc-123\`"
- "Register this Splunk → ES|QL mapping article as a resource"
- "Seed a lookup table mapping tenant ids to environment names"
- "Attach this PDF describing our index taxonomy before translation"
- "What context resources are attached to the upcoming migration?"
- "Remove the outdated index-mapping doc from migration \`abc-123\`"

**Triggers (intent):** the user is preparing a migration run and wants
to bias the translator with domain context. The query references a
migration by id and a *resource* (document, article, lookup, mapping
table) rather than an individual rule.

**Domain:** SIEM rule migration — specifically the **pre-translation
context phase**. Resources are scoped to a single \`migrationId\`; they
are consumed by the translator on the next run.

Do **NOT** use this skill for:

- Correcting an already-translated rule — use
  \`automatic-migration-correction\` (the post-translation companion).
- Creating a brand-new detection rule from scratch — use
  \`detection-rule-edit\`.
- Editing already-installed detection rules — use \`detection-rule-edit\`.
- Bulk uploading hundreds of resources programmatically — that is a
  backfill / import job, not an interactive chat skill.

## Process

When the user asks to manage migration context, follow this order:

1. **Identify the migration.** Ask for (or confirm) the \`migrationId\`.
   Refuse to proceed if it is missing — context resources are scoped to
   a specific migration; uploading "globally" is not supported.

2. **List existing resources first.** Before adding new context, call
   \`security.migration_resources_list\` with the \`migration_id\` (and
   optionally a \`type\` filter: \`macro\`, \`list\`, or \`lookup\`).
   Surface the resource ids, types, and names — this prevents duplicate
   uploads and helps the user understand the current state.

3. **Diagnose what's missing.** If the user describes a translation
   problem ("the translator keeps picking the wrong index pattern"),
   look at the existing resources and reason about whether a new
   context document would help, or whether the existing one is
   misconfigured. Use \`platform.core.product_documentation\` for the
   resource schema reference and
   \`security.security_labs_search\` for detection-engineering
   articles the operator may want to register.

4. **Validate before attaching.** Resources have a type (\`document\`,
   \`naming_convention\`, \`lookup\`, \`mapping\`) and a payload that
   must match that type's shape. Validate the user's input against the
   schema before calling the upsert endpoint — schema-level validation
   is mandatory, not advisory.

5. **Confirm destructive operations.** *Removing* or *replacing* an
   existing resource is destructive: the next translation run will see
   different context and may produce different output. Use
   \`security.migration_resource_upsert\` for creates / replacements and
   \`security.migration_resource_remove\` for deletes; both require
   \`confirm: true\` — the schema rejects calls without it. Never
   substitute prose for the structural gate.

6. **Report what landed.** After upsert, list the migration's
   resources again so the user can verify the change. Remind them the
   new context applies on the *next* translation run, not retroactively
   to already-translated rules.

## Examples

### Example 1: Upload a naming-convention document

User query: "Upload our standard tag naming convention as context to
migration \`abc-123\` so the translator stops emitting \`splunk_tag\`."

Steps:

1. Confirm the migration id and that it exists.
2. List existing resources — surface any prior \`naming_convention\`
   resources (the user may want to replace one instead of adding a
   second).
3. Validate the document shape: \`{ type: 'naming_convention', name,
   body, target_field }\`.
4. Show the user what is about to be uploaded (resource id,
   target_field, first ~200 chars of body).
5. After confirmation, upsert via the resources endpoint. Report the
   resource id and remind: "This applies on the next translation
   run."

### Example 2: Register a Security Labs article as context

User query: "Add the Security Labs article on Splunk-to-ESQL detection
patterns to migration \`abc-123\`."

Steps:

1. Use \`security.security_labs_search\` to find the article — quote
   the title, url, and a one-sentence summary back to the user so they
   confirm it's the right one.
2. Build the resource payload from the article metadata: \`{ type:
   'document', name, source_url, body }\`.
3. Confirm and upsert. Report the resource id.

### Example 3: Seed a tenant-id lookup table

User query: "Seed a lookup mapping tenant ids to environment names
(\`t1 → prod\`, \`t2 → stage\`, \`t3 → dev\`) for migration
\`abc-123\`."

Steps:

1. Validate the lookup payload as \`{ type: 'lookup', name,
   key_field, value_field, rows }\`.
2. Show the parsed rows back to the user (compact table).
3. Confirm and upsert.

### Example 4: Replace an outdated resource (destructive)

User query: "Replace the existing \`index_taxonomy\` document on
migration \`abc-123\` with this updated one."

Steps:

1. List existing resources; find the one(s) matching
   \`type=document, name=index_taxonomy\`.
2. Show the user *before* / *after* — what is being replaced, what
   replaces it.
3. **Use the \`confirmation\` field** to gate the replace — this is
   destructive (the prior resource's content is overwritten and the
   next translation pass will see different context).
4. After confirmation, upsert. Report the resource id and warn:
   "Rules translated *before* this change still reflect the old
   context; only the *next* translation run picks up the new
   version."

### Example 5: Refusal — wrong skill

User query: "Fix the ES|QL on the rule \`Suspicious PowerShell\` in
migration \`abc-123\`."

Response:

> That rule has already been translated — this skill only manages
> *pre-translation* context. The right tool is
> \`automatic-migration-correction\`. Want me to hand off?

## Guardrails

- **Migration scope is mandatory.** Every read / write requires a
  \`migrationId\`. Refuse to act if it is missing; ask first.
- **No global resources.** Resources are always migration-scoped. Refuse
  any request to "upload this everywhere".
- **Confirmation is structural, not prose.** Replace / remove
  operations MUST use the Agent Builder \`confirmation\` field. Prose
  "are you sure?" gating is not acceptable.
- **Schema-level validation.** Validate resource payloads against the
  type's schema before calling upsert. Surface the validation error
  verbatim if it fails.
- **RBAC.** Operators need the existing
  \`SIEM_MIGRATIONS_API_ACTION_ALL\` privilege; the route handler
  enforces this. The skill does not re-check privileges client-side.
- **New context applies on the next run.** Be explicit in the response
  that already-translated rules retain the old context — operators
  often misunderstand this.
- **No bulk import.** If the user asks "upload these 50 documents",
  refuse politely and direct them to the bulk import API; this skill
  is for one-resource-at-a-time interactive work.

## Response Format

For upload / attach turns:

1. One short sentence confirming the migration and the resource type.
2. The parsed / validated payload preview (compact — id, name, type,
   first ~200 chars of body, or a row count for lookups).
3. The confirmation prompt (rendered via the Agent Builder
   \`confirmation\` field for destructive operations).
4. After confirmation + persistence: a one-line confirmation with the
   resource id, plus the "applies on next translation run" reminder.

For list / diagnose turns:

1. The compact list of attached resources (id, type, name).
2. A one-sentence diagnosis if the user described a translation
   problem.
3. A proposed next step (which resource to add / replace) — do not
   take that step until the user confirms.

For refusal / hand-off turns:

1. One sentence naming why this skill does not apply.
2. The skill or workflow that does apply, by id.
3. Offer to hand off.`;
