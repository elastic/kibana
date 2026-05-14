/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const AUTOMATIC_MIGRATION_CORRECTION_SKILL_ID = 'automatic-migration-correction';

/**
 * Phase 1 stub for the `automatic-migration-correction` skill.
 *
 * This factory currently advertises zero registry tools and zero inline tools.
 * Phase 2 attaches the correction tool handlers (rule retrieval, ES|QL repair,
 * MITRE remapping, persistence-with-confirmation). The `content` body and
 * `getRegistryTools` are intentionally minimal here so the skill registers and
 * validates while the tool surface is being built out.
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
      'the translation through chat before persisting the rule.',
    content: SKILL_CONTENT,
    getRegistryTools: () => [],
  });

const SKILL_CONTENT = `# Automatic Migration Correction (Phase 1 placeholder)

## When to Use This Skill

Use this skill when the user wants to **correct or improve** an automatically translated
SIEM detection rule after migration. Typical phrasing:

- "Fix the ES|QL in this translated rule"
- "Remap the MITRE tactic on rule X to T1059"
- "Bump the severity on the translated rule to high"
- "Update the rule description / tags after translation"

Do **not** use this skill for:

- Generating a brand-new rule from natural language — use \`detection-rule-edit\`.
- Providing migration *context* (lookup documents, naming conventions, articles) ahead
  of the translation pass — use \`automatic-migration-context\`.

## Status

**Phase 1 stub.** Tool handlers (rule retrieval, ES|QL repair, MITRE remapping, persistence
with explicit operator confirmation) land in Phase 2.

Until Phase 2 lands, this skill is registered behind the
\`automaticMigrationSkillsEnabled\` experimental feature flag (default: \`false\`) and
exposes no callable tools.`;
