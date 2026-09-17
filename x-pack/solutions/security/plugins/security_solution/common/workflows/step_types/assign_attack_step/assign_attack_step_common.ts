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
import {
  MAX_ATTACK_ID_LENGTH,
  MAX_WORKFLOW_MESSAGE_LENGTH,
  MAX_USER_ID_LENGTH,
} from '../common/constants';

export const AssignAttackStepId = 'security.assignAttack' as const;

const assigneesArraySchema = z.array(z.string().min(1).max(MAX_USER_ID_LENGTH));

const attackIdsBase = z.object({
  ids: z
    .union([
      z.string().min(1).max(MAX_ATTACK_ID_LENGTH),
      z.array(z.string().min(1).max(MAX_ATTACK_ID_LENGTH)).min(1),
    ])
    .describe('A single attack ID or a list of IDs to support bulk updates'),
  update_related_alerts: z.boolean().optional().default(false),
});

export const assignAttackInputSchema = z.union([
  attackIdsBase.extend({
    assignees_to_add: assigneesArraySchema.min(1).describe('A list of user IDs to assign'),
    assignees_to_remove: assigneesArraySchema
      .default([])
      .describe('A list of user IDs to unassign'),
  }),
  attackIdsBase.extend({
    assignees_to_add: assigneesArraySchema.default([]).describe('A list of user IDs to assign'),
    assignees_to_remove: assigneesArraySchema.min(1).describe('A list of user IDs to unassign'),
  }),
]);

export const assignAttackOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const assignAttackStepCommonDefinition: BaseStepDefinition<
  typeof assignAttackInputSchema,
  typeof assignAttackOutputSchema
> = {
  id: AssignAttackStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.assignAttack.label', {
    defaultMessage: 'Assign Attack',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.assignAttack.description', {
    defaultMessage: 'Assign or unassign users to one or multiple attacks.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: assignAttackInputSchema,
  outputSchema: assignAttackOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.assignAttack.documentation.details',
      {
        defaultMessage:
          'Updates the assignees of specified attacks. You can provide lists of user IDs to add or remove.',
      }
    ),
    examples: [
      `## Assign a user to an attack
\`\`\`yaml
- name: assign_attack
  type: security.assignAttack
  with:
    ids: "{{ variables.attack_id }}"
    assignees_to_add:
      - "user_id_1"
\`\`\``,
      `## Remove a user from multiple attacks
\`\`\`yaml
- name: unassign_attacks
  type: security.assignAttack
  with:
    ids:
      - "attack-1"
      - "attack-2"
    assignees_to_remove:
      - "user_id_2"
\`\`\``,
      `## Assign and remove users simultaneously
\`\`\`yaml
- name: update_attack_assignees
  type: security.assignAttack
  with:
    ids: "{{ variables.attack_id }}"
    assignees_to_add:
      - "user_id_1"
    assignees_to_remove:
      - "user_id_2"
\`\`\``,
    ],
  },
};
