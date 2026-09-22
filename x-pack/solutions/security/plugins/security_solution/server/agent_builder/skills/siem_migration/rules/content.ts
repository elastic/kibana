/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
  SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID,
  SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
} from '../../../tools/siem_migrations';
import { RULE_MIGRATION_SKILLS } from './skill_ids';

/**
 * Shared content blocks for the Automatic Migration sibling skills.
 *
 * These are single-source constants imported by every sibling skill so the wording stays
 * consistent and there is no drift across skills (and no duplicated tokens bloating each
 * skill). Each block is injected into a skill's `content` via template literal.
 *
 * User-facing naming uses "Automatic Migration" (not "SIEM migration"). Internal tool ids and
 * paths remain `siem_migration*` — they are never shown to the user.
 */

/**
 * Capability map of all Automatic Migration sibling skills. Injected into every skill so the
 * agent can route the user to the right sibling (and give an overview when asked "what can you
 * do"). This is the single source of truth — do not duplicate the list per skill.
 */
export const AUTOMATIC_RULE_MIGRATION_CAPABILITIES_BLOCK = `
## Automatic Rule Migration Capabilities (sibling skills)

Automatic Rule Migration is split across sibling skills. This skill handles one workflow; the others
are available when the user's request shifts. Cross-references are advisory — naming a sibling
does not auto-load its tools, the user must move to that workflow.

- **${RULE_MIGRATION_SKILLS.SUMMARIZE}** — Overview of all migrations: list every migration with its
  status and rule counts. Use when the user asks "how are my migrations doing" or wants a summary.
- **${RULE_MIGRATION_SKILLS.START}** — Start, reprocess, or resume a migration's translation run.
  Resolves the AI connector, checks for missing resources before starting,
  and picks START vs REPROCESS vs RESUME.
- **${RULE_MIGRATION_SKILLS.STOP}** — Stop a running migration (mutating).
- **${RULE_MIGRATION_SKILLS.UPDATE}** — Rename a migration (mutating).
- **${RULE_MIGRATION_SKILLS.DELETE}** — Permanently delete a migration and all its rule items (destructive, irreversible).
`;

/**
 * Name→ID resolution policy. The agent owns the resolution; the user works with names. Three
 * kinds of ids exist (migration id, rule item id, connector id) — only the last is ever shown
 * to the user (and only when they must pick one).
 */
export const NAME_NEVER_ID_BLOCK = `
## Migration Identity: Name, Never Ask for an ID

The user knows migrations by **name**, not by id. You own the name→id resolution.

**Always present migrations to the user by name.** In every response — tables, lists, prose,
JSON examples — use the migration **name**, never the migration **id**. The only exceptions:
(a) the user explicitly asks for the id, or (b) same-name disambiguation reached the last-resort
step below. Never show migration ids in table headers, column values, or example payloads; use
the name instead and resolve it to the id internally when calling tools.

1. Resolve a user-provided migration **name** to its **migration id** by calling
   \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` and matching on the \`name\` field.
2. If two migrations share the same name, disambiguate using the hierarchy in
   "Disambiguating Same-Name Migrations" below before acting.
3. Only if every disambiguating attribute still collides, surface the **full migration id** as a
   last resort — present the tied migrations in a numbered list and ask the user to pick by number.
   Never ask the user to type or paste an id voluntarily; this is the fallback, not the default.
4. **Pasted-id fallback**: \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` only returns migrations that have at
   least one eligible rule item. A migration with zero eligible items (or only non-eligible
   items) is invisible to name resolution. If the user pastes a migration id directly (e.g. copied
   from the UI), verify it with \`${SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID}\` before acting on it (stats returns the same fields plus status/counts, using fewer tokens).
5. **Rule item ids**: some actions (install specific rules, reprocess a subset) need a **rule item
   id**, in addition to the migration id. Resolve a user-provided rule **title** to its item id by calling
   \`${SIEM_MIGRATION_GET_MIGRATION_RULES_TOOL_ID}\` and matching on the original or translated title.
   Never ask the user for a rule item id; always work from the title.
`;

/**
 * Collision-handling hierarchy for same-name migrations. Vendor-first, then status, then
 * creation date, then full id as last resort.
 */
export const MIGRATION_NAME_DISAMBIGUATION_BLOCK = `
## Disambiguating Same-Name Migrations

When two or more migrations share the same name, disambiguate in this order (stop at the first
attribute that separates them):

1. **Vendor** — Splunk vs QRadar vs Sentinel (from \`${SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID}\` \`vendor\`).
2. **Status** — ready / running / stopped / interrupted / finished.
3. **Created date** — \`created_at\`, newest first.
4. **Full migration id** — last resort. Present the still-tied migrations as a numbered list
   (number — name — vendor — status — created date — full id) and ask the user to pick by number.
   Do not ask the user to type the id.
`;

export const AUTOMATIC_MIGRATION_NAVIGATION_BLOCK = `
## Navigation

The Automatic Migration feature is accessible via **LaunchPad → Manage Automatic Migrations** in the
Kibana UI. When directing the user to the UI (e.g. to upload rules or create a new migration), always
reference this path. Do not invent or guess alternative navigation paths.
`;

export const MIGRATION_TYPE_DISAMBIGUATION_BLOCK = `
Automatic Migrations are of 2 types:
- **Rule Migration** — translates third-party (Sentinel, QRadar, Splunk) rules into Elastic detection rules. This is the most common type and the one that uses the Automatic Migration sibling skills.
- **Dashboard Migration** — translates third-party dashboards into Elastic dashboards. This type is not supported today.

This skill only supports **Rule Migrations**.  IF user has not specified the migration type, ask them to clarify if they are talking about Dashboard or Rule Migration.  If they say Dashboard, tell them that this skill only supports Rule Migrations and that Dashboard Migrations are not supported today.  If they say Rule Migration, continue with the workflow.

`;

export const AUTOMATIC_MIGRATION_GENERAL_GUIDELINES = `
## General Guidelines

- EVERY question with finite defined answers (For example yes, no) MUST be presented as a multiple choice question.
- Detection Rules is different from Automatic Rule Migration or SIEM Rule Migration. You must not confuse between them. This skill is ONLY about Automatic Rule Migration and NOT for Detection Rules.
- When responding to the user, highlight important information in code segments(\`\`) or code blocks in case of multiline (\`\`\`) or bold text (**).  For example, migration name, rule titles, statuses, counts, queries, prebuilt rule Id or integration ID. Do not do highlighting in the table.
`;

/**
 * Freshness contract for server-state reads. Injected into every mutating sibling skill.
 *
 * Two orthogonal rules:
 *  1. Answers carry over — within one run only, not conversation-wide.
 *  2. Tool reads never carry over — adjacency (read is the last action) is the only safe gate.
 *
 * The block is intentionally phrased without referencing any platform-internal marker format
 * (e.g. "[Sent: …]") so it remains correct if the message formatting changes.
 */
export const MIGRATION_STATE_FRESHNESS_BLOCK = `
## Server State Must Be Re-Read, Not Remembered

Two different things can be "already known", and they follow opposite rules.

**The user's answers carry over — within one run.** Once the user has answered a pre-flight
question for the run you are setting up — which connector, whether to skip prebuilt matching,
whether to proceed despite missing resources — do not ask it again while setting up that same
run. The answers belong to that one attempt, not to the conversation. Ask them again from
scratch whenever the user asks for a different migration, a different action, or another run
after one has already been executed.

**Tool reads never carry over.** Migration state is server data you do not own. Between your
read and your next action, the user can start or stop a migration from the Kibana UI, upload
the macros and lookups you reported as missing, or let a run finish. None of that appears in
this conversation.

### Two rules for reads

**1. Read immediately before you act.** Before any mutating call, the state read must be the last
action you took. Server state can go stale in the time between your read and your next action.

**2. Read again for every new request.** Anything you read before the user's latest request is
stale, no matter what it said. A follow-up like "try again", "run it again", or "retry" is a new
request: re-read before acting on it.

Both rules apply to migration task status, item counts, translation counts, and missing resources alike.

Never write or think "I already have the migration details from an earlier check" or "the
migration is still \`ready\` from my earlier check". Judge a read by *when you made it*, never by
how confident the value feels.
`;
