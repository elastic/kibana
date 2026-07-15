/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { AlertTag } from '../../../api/model/alert.gen';
import { MAX_ATTACK_ID_LENGTH, MAX_WORKFLOW_MESSAGE_LENGTH } from '../common/constants';

export const SetAttackTagsStepId = 'security.setAttackTags' as const;

const tagsArray = z.array(AlertTag);

const attackIdsBase = z.object({
  ids: z
    .union([
      z.string().min(1).max(MAX_ATTACK_ID_LENGTH),
      z.array(z.string().min(1).max(MAX_ATTACK_ID_LENGTH)).min(1),
    ])
    .describe('A single attack ID or a list of IDs to support bulk updates'),
  update_related_alerts: z.boolean().optional().default(false),
});

// `z.union` (not `.refine`) so the "at least one tags array" constraint lowers to JSON Schema
// `anyOf` and surfaces in the editor — a top-level `.refine` is unwrapped before JSON Schema
// generation. Follow-up: elastic/security-team#17984.
export const setAttackTagsInputSchema = z.union([
  attackIdsBase.extend({
    tags_to_add: tagsArray.min(1).describe('Tags to add to the specified attacks'),
    tags_to_remove: tagsArray.default([]).describe('Tags to remove from the specified attacks'),
  }),
  attackIdsBase.extend({
    tags_to_add: tagsArray.default([]).describe('Tags to add to the specified attacks'),
    tags_to_remove: tagsArray.min(1).describe('Tags to remove from the specified attacks'),
  }),
]);

export const setAttackTagsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const setAttackTagsStepCommonDefinition: BaseStepDefinition<
  typeof setAttackTagsInputSchema,
  typeof setAttackTagsOutputSchema
> = {
  id: SetAttackTagsStepId,
  stability: 'tech_preview',
  label: i18n.translate('xpack.securitySolution.workflows.steps.setAttackTags.label', {
    defaultMessage: 'Set Attack Tags',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.setAttackTags.description', {
    defaultMessage: 'Add or remove tags on one or multiple attacks.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: setAttackTagsInputSchema,
  outputSchema: setAttackTagsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.setAttackTags.documentation.details',
      {
        defaultMessage:
          'Adds and/or removes tags on the specified attacks. Existing tags are preserved unless explicitly listed in tags_to_remove. At least one of tags_to_add or tags_to_remove must be provided.',
      }
    ),
    examples: [
      `## Add tags to an attack
\`\`\`yaml
- name: tag_attack
  type: security.setAttackTags
  with:
    ids: "{{ variables.attack_id }}"
    tags_to_add:
      - "triaged"
      - "needs-review"
\`\`\``,
      `## Add and remove tags on multiple attacks with related alerts update
\`\`\`yaml
- name: retag_attacks
  type: security.setAttackTags
  with:
    ids:
      - "attack-1"
      - "attack-2"
    tags_to_add:
      - "escalated"
    tags_to_remove:
      - "needs-review"
    update_related_alerts: true
\`\`\``,
    ],
  },
};
