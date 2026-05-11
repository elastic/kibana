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
import { AlertStatus } from '../../../api/model/alert.gen';
import { WORKFLOW_STEP_ID_SET_ATTACK_STATUS } from '../../constants';

export const setAttackStatusInputSchema = z.object({
  attack_ids: z.array(z.string()).min(1).describe('The IDs of the attacks to update'),
  status: AlertStatus.describe('The status to set'),
  reason: z
    .string()
    .optional()
    .describe('The reason for closing the attack (only applicable if status is "closed")'),
  update_related_alerts: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to also update the alerts related to the specified attacks'),
});

export const setAttackStatusOutputSchema = z.object({
  success: z.boolean(),
});

export const setAttackStatusStepCommonDefinition: BaseStepDefinition<
  typeof setAttackStatusInputSchema,
  typeof setAttackStatusOutputSchema
> = {
  id: WORKFLOW_STEP_ID_SET_ATTACK_STATUS,
  label: i18n.translate('xpack.securitySolution.workflows.steps.detections.setAttackStatus.label', {
    defaultMessage: 'Detections - Set Attack Status',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.detections.setAttackStatus.description',
    {
      defaultMessage: 'Set the workflow status of one or more attacks.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: setAttackStatusInputSchema,
  outputSchema: setAttackStatusOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.detections.setAttackStatus.documentation.details',
      {
        defaultMessage: 'Updates the workflow status of the specified attacks.',
      }
    ),
    examples: [
      `## Set attack status
\`\`\`yaml
- name: set_attack_status
  type: ${WORKFLOW_STEP_ID_SET_ATTACK_STATUS}
  with:
    attack_ids: ["abc-123-def-456"]
    status: "in-progress"
\`\`\``,
    ],
  },
};
