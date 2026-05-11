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
import { AlertAssignees } from '../../../api/detection_engine/model/set_alert_assignees_body.gen';
import { WORKFLOW_STEP_ID_ASSIGN_ATTACK } from '../../constants';

export const assignAttackInputSchema = z.object({
  attack_ids: z.array(z.string()).min(1).describe('The IDs of the attacks to update'),
  assignees: AlertAssignees.describe('The assignees to add or remove'),
  update_related_alerts: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to also update the alerts related to the specified attacks'),
});

export const assignAttackOutputSchema = z.object({
  success: z.boolean(),
});

export const assignAttackStepCommonDefinition: BaseStepDefinition<
  typeof assignAttackInputSchema,
  typeof assignAttackOutputSchema
> = {
  id: WORKFLOW_STEP_ID_ASSIGN_ATTACK,
  label: i18n.translate('xpack.securitySolution.workflows.steps.detections.assignAttack.label', {
    defaultMessage: 'Detections - Assign Attack',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.detections.assignAttack.description',
    {
      defaultMessage: 'Assign or unassign users to one or more attacks.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: assignAttackInputSchema,
  outputSchema: assignAttackOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.detections.assignAttack.documentation.details',
      {
        defaultMessage: 'Updates the assignees of the specified attacks.',
      }
    ),
    examples: [
      `## Assign attack
\`\`\`yaml
- name: assign_attack
  type: ${WORKFLOW_STEP_ID_ASSIGN_ATTACK}
  with:
    attack_ids: ["abc-123-def-456"]
    assignees:
      add: ["user-123"]
      remove: []
\`\`\``,
    ],
  },
};
