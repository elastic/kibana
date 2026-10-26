/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface RuleMigrationSkillInfo {
  readonly id: string;
  /** What skill search matches on; also rendered into the sibling capability map. */
  readonly description: string;
}

/**
 * Single source of truth for every Automatic Rule Migration skill's id and description. Used by
 * the skill definitions, the shared capability map, tools and attachments, so they cannot drift.
 * Must not import skill or content modules (they import this file).
 */
export const RULE_MIGRATION_SKILLS = {
  SUMMARIZE: {
    id: 'automatic-migration-rules-summarize',
    description: `Summarize Automatic Rule Migration progress: list every rule migration with its status and rule counts, or drill into one migration's task progress, translation stats, and missing resources.

Use when the user asks "how are my rule migrations doing", wants an overview, asks about a specific rule migration by name, or asks which resources (macros, lookups, reference sets, watchlists) a migration is missing.

Read-only. Automatic Migration also covers dashboards — this skill handles rule migrations only.`,
  },
  START: {
    id: 'automatic-migration-rules-start-migration',
    description: `Start, reprocess, or resume an Automatic Rule Migration translation run. Mutating.

Resolves the inference endpoint (AI connector), runs a missing-resources pre-flight check before a fresh start, and picks the right request body (START vs REPROCESS vs RESUME) from the rule migration state.`,
  },
  STOP: {
    id: 'automatic-migration-rules-stop-migration',
    description: `Stop a running Automatic Rule Migration translation run. Mutating.

Resolves the migration by name and stops the run. Use when the user wants to pause a migration that is currently translating rules.`,
  },
  UPDATE: {
    id: 'automatic-migration-rules-update-migration',
    description: `Rename an Automatic Rule Migration. Mutating.

Prompts for the new name and applies the change. Use when the user wants to rename a migration.`,
  },
  DELETE: {
    id: 'automatic-migration-rules-delete-migration',
    description: `Permanently delete an Automatic Rule Migration and all its associated rule items and resources.

This action is destructive and irreversible. The skill resolves the migration by name, checks it is not currently running, then deletes it.`,
  },
  INSTALL: {
    id: 'automatic-migration-rules-install-rules',
    description:
      'Install translated rules from an Automatic Rule Migration into Elastic. Mutating. Resolves the installable count, confirms scope and enabled-default, and requires Rules: All privileges.',
  },
  UPDATE_TRANSLATED_RULE: {
    id: 'automatic-migration-rules-update-translated-rule',
    description: `Find and fix translated Automatic Migration rules that are not installed yet.

Use when a migrated rule:
- is missing an index pattern (\`[indexPattern]\` placeholder) or uses the wrong index pattern;
- has a wrong ES|QL query, unresolved \`[macro:…]\` / \`[lookup:…]\` placeholders, or wrong field names;
- was matched to the wrong prebuilt rule or the wrong integration.

Also use to list the rules in a migration that are missing an index pattern or need fixing, and let the user pick which to fix. Mutating: every fix is confirmed by the user.`,
  },
} as const satisfies Record<string, RuleMigrationSkillInfo>;
