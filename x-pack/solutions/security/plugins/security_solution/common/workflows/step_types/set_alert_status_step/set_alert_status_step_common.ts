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
import { WORKFLOW_STEP_ID_SET_ALERT_STATUS } from '../../constants';

export const setAlertStatusInputSchema = z.object({
  alert_ids: z.array(z.string()).min(1).describe('The IDs of the alerts to update'),
  status: AlertStatus.describe('The status to set'),
  reason: z
    .string()
    .optional()
    .describe('The reason for closing the alert (only applicable if status is "closed")'),
});

export const setAlertStatusOutputSchema = z.object({
  success: z.boolean(),
});

export const setAlertStatusStepCommonDefinition: BaseStepDefinition<
  typeof setAlertStatusInputSchema,
  typeof setAlertStatusOutputSchema
> = {
  id: WORKFLOW_STEP_ID_SET_ALERT_STATUS,
  label: i18n.translate('xpack.securitySolution.workflows.steps.detections.setAlertStatus.label', {
    defaultMessage: 'Detections - Set Alert Status',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.detections.setAlertStatus.description',
    {
      defaultMessage: 'Set the workflow status of one or more alerts.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: setAlertStatusInputSchema,
  outputSchema: setAlertStatusOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.detections.setAlertStatus.documentation.details',
      {
        defaultMessage: 'Updates the workflow status of the specified alerts.',
      }
    ),
    examples: [
      `## Set alert status
\`\`\`yaml
- name: set_alert_status
  type: ${WORKFLOW_STEP_ID_SET_ALERT_STATUS}
  with:
    alert_ids: ["abc-123-def-456"]
    status: "in-progress"
\`\`\``,
    ],
  },
};
