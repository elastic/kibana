/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const AUTOMATIC_MIGRATION_CONTEXT_SKILL_ID = 'automatic-migration-context';

/**
 * Phase 1 stub for the `automatic-migration-context` skill.
 *
 * The context skill is the *pre-translation* surface: it lets operators supply
 * additional documents, standardized rule naming conventions, articles, and
 * lookup data so the translation pass produces higher-quality output. Phase 3
 * wires the underlying `siem_migrations` resources endpoints into the
 * Agent Builder via `workflow_execute_step` (so no inline HTTP wrappers).
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
      'draft rule.',
    content: SKILL_CONTENT,
    getRegistryTools: () => [],
  });

const SKILL_CONTENT = `# Automatic Migration Context (Phase 1 placeholder)

## When to Use This Skill

Use this skill **before** a translation runs, when the operator wants to improve
the upcoming translation by providing context. Typical phrasing:

- "Upload these naming-convention docs for the upcoming migration"
- "Register this rule-template article as context"
- "Seed a lookup table for tenant IDs before translating"
- "Attach this PDF describing our index taxonomy"

Do **not** use this skill for:

- Editing rules that have already been translated — use
  \`automatic-migration-correction\`.
- Creating a single new detection rule from scratch — use \`detection-rule-edit\`.

## Status

**Phase 1 stub.** Tool handlers (resource upload, naming-convention registry,
lookup-table attach, document indexing) land in Phase 3.

Until Phase 3 lands, this skill is registered behind the
\`automaticMigrationSkillsEnabled\` experimental feature flag (default: \`false\`)
and exposes no callable tools.`;
