/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

export const AesopSkillDiffStepId = 'security.aesopSkillDiff' as const;

// Skill content is capped at 65000 characters before it is stored as a KI.
export const AESOP_SKILL_DIFF_MAX_CONTENT = 100_000;

export const aesopSkillDiffInputSchema = lazySchema(() =>
  z.object({
    skill_id: z.string().min(1).max(128).describe('Skill the diff is for; names the diff files'),
    current_content: z
      .string()
      .max(AESOP_SKILL_DIFF_MAX_CONTENT)
      .describe('Content of the skill as shipped'),
    proposed_content: z
      .string()
      .max(AESOP_SKILL_DIFF_MAX_CONTENT)
      .describe('Content AESOP proposes instead'),
    context_lines: z
      .number()
      .int()
      .min(0)
      .max(20)
      .default(3)
      .describe('Unchanged lines shown around each change'),
  })
);

export const aesopSkillDiffOutputSchema = lazySchema(() =>
  z.object({
    diff: z.string().describe('Unified diff from the current to the proposed content'),
    lines_added: z.number().int(),
    lines_removed: z.number().int(),
    changed: z.boolean().describe('False when the two contents are identical'),
  })
);

export const aesopSkillDiffStepCommonDefinition: BaseStepDefinition<
  typeof aesopSkillDiffInputSchema,
  typeof aesopSkillDiffOutputSchema
> = {
  id: AesopSkillDiffStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.aesopSkillDiff.label', {
    defaultMessage: 'Diff AESOP skill content',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.aesopSkillDiff.description', {
    defaultMessage:
      'Returns a unified diff between a skill’s current content and the content AESOP proposes, for the team that owns the skill.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: aesopSkillDiffInputSchema,
  outputSchema: aesopSkillDiffOutputSchema,
  stability: 'tech_preview',
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.aesopSkillDiff.documentation.details',
      {
        defaultMessage:
          'A built-in skill is read-only, so AESOP cannot deploy a better variant of it. This step renders the change as a unified diff of the file skills/SKILL_ID.md, old and new, that the owning team can review and apply in its own code.',
      }
    ),
    examples: [
      `## Diff the approved winner against the shipped skill
\`\`\`yaml
- name: shipped_diff
  type: security.aesopSkillDiff
  with:
    skill_id: "{{ variables.target_skill_id }}"
    current_content: "\${{ steps.get_live_skill.output.content }}"
    proposed_content: "\${{ variables.winner_content }}"
\`\`\``,
    ],
  },
};
