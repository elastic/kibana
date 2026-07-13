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
  MAX_ALERT_ID_LENGTH,
  MAX_WORKFLOW_MESSAGE_LENGTH,
  MAX_USER_ID_LENGTH,
} from '../common/constants';

export const AssignAlertStepId = 'security.assignAlert' as const;

const assigneesArraySchema = z.array(z.string().min(1).max(MAX_USER_ID_LENGTH));

const alertIdsBase = z.object({
  alert_ids: z
    .union([
      z.string().min(1).max(MAX_ALERT_ID_LENGTH),
      z.array(z.string().min(1).max(MAX_ALERT_ID_LENGTH)).min(1),
    ])
    .describe('A single alert ID or a list of IDs to support bulk updates'),
});

// `z.union` (not `.refine`) so the "at least one assignees array" constraint lowers to JSON Schema
// `anyOf` and surfaces in the editor — a top-level `.refine` is unwrapped before JSON Schema
// generation. Follow-up: elastic/security-team#17984.
export const assignAlertInputSchema = z.union([
  alertIdsBase.extend({
    assignees_to_add: assigneesArraySchema.min(1).describe('A list of user IDs to assign'),
    assignees_to_remove: assigneesArraySchema
      .default([])
      .describe('A list of user IDs to unassign'),
  }),
  alertIdsBase.extend({
    assignees_to_add: assigneesArraySchema.default([]).describe('A list of user IDs to assign'),
    assignees_to_remove: assigneesArraySchema.min(1).describe('A list of user IDs to unassign'),
  }),
]);

export const assignAlertOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const assignAlertStepCommonDefinition: BaseStepDefinition<
  typeof assignAlertInputSchema,
  typeof assignAlertOutputSchema
> = {
  id: AssignAlertStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.assignAlert.label', {
    defaultMessage: 'Assign Alert',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.assignAlert.description', {
    defaultMessage: 'Assign or unassign users to one or multiple alerts.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: assignAlertInputSchema,
  outputSchema: assignAlertOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.assignAlert.documentation.details',
      {
        defaultMessage:
          'Updates the assignees of specified alerts. You can provide lists of user IDs to add or remove.',
      }
    ),
    examples: [
      `## Assign a user to an alert
\`\`\`yaml
- name: assign_alert
  type: security.assignAlert
  with:
    alert_ids: "{{ variables.alert_id }}"
    assignees_to_add:
      - "user_id_1"
\`\`\``,
      `## Remove a user from multiple alerts
\`\`\`yaml
- name: unassign_alerts
  type: security.assignAlert
  with:
    alert_ids:
      - "alert-1"
      - "alert-2"
    assignees_to_remove:
      - "user_id_2"
\`\`\``,
      `## Assign and remove users simultaneously
\`\`\`yaml
- name: update_alert_assignees
  type: security.assignAlert
  with:
    alert_ids: "{{ variables.alert_id }}"
    assignees_to_add:
      - "user_id_1"
    assignees_to_remove:
      - "user_id_2"
\`\`\``,
    ],
  },
};
