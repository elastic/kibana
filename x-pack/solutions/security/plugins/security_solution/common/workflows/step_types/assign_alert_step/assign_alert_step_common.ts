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
import { WORKFLOW_STEP_ID_ASSIGN_ALERT } from '../../constants';

export const assignAlertInputSchema = z.object({
  alert_ids: z.array(z.string()).min(1).describe('The IDs of the alerts to update'),
  assignees: AlertAssignees.describe('The assignees to add or remove'),
});

export const assignAlertOutputSchema = z.object({
  success: z.boolean(),
});

export const assignAlertStepCommonDefinition: BaseStepDefinition<
  typeof assignAlertInputSchema,
  typeof assignAlertOutputSchema
> = {
  id: WORKFLOW_STEP_ID_ASSIGN_ALERT,
  label: i18n.translate('xpack.securitySolution.workflows.steps.detections.assignAlert.label', {
    defaultMessage: 'Detections - Assign Alert',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.detections.assignAlert.description',
    {
      defaultMessage: 'Assign or unassign users to one or more alerts.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: assignAlertInputSchema,
  outputSchema: assignAlertOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.detections.assignAlert.documentation.details',
      {
        defaultMessage: 'Updates the assignees of the specified alerts.',
      }
    ),
    examples: [
      `## Assign alert
\`\`\`yaml
- name: assign_alert
  type: ${WORKFLOW_STEP_ID_ASSIGN_ALERT}
  with:
    alert_ids: ["abc-123-def-456"]
    assignees:
      add: ["user-123"]
      remove: []
\`\`\``,
    ],
  },
};
