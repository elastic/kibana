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
import { MAX_ALERT_ID_LENGTH, MAX_WORKFLOW_MESSAGE_LENGTH } from '../common/constants';

export const SetAlertTagsStepId = 'security.setAlertTags' as const;

const tagsArray = z.array(AlertTag).default([]);

export const setAlertTagsInputSchema = z
  .object({
    alert_ids: z
      .union([
        z.string().min(1).max(MAX_ALERT_ID_LENGTH),
        z.array(z.string().min(1).max(MAX_ALERT_ID_LENGTH)).min(1),
      ])
      .describe('A single alert ID or a list of IDs to support bulk updates'),
    tags_to_add: tagsArray.describe('Tags to add to the specified alerts'),
    tags_to_remove: tagsArray.describe('Tags to remove from the specified alerts'),
  })
  .refine((value) => value.tags_to_add.length > 0 || value.tags_to_remove.length > 0, {
    message: 'At least one of tags_to_add or tags_to_remove must be a non-empty array',
    path: ['tags_to_add'],
  });

export const setAlertTagsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const setAlertTagsStepCommonDefinition: BaseStepDefinition<
  typeof setAlertTagsInputSchema,
  typeof setAlertTagsOutputSchema
> = {
  id: SetAlertTagsStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.setAlertTags.label', {
    defaultMessage: 'Set Alert Tags',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.setAlertTags.description', {
    defaultMessage: 'Add or remove tags on one or multiple alerts.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: setAlertTagsInputSchema,
  outputSchema: setAlertTagsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.setAlertTags.documentation.details',
      {
        defaultMessage:
          'Adds and/or removes tags on the specified alerts. Existing tags are preserved unless explicitly listed in tags_to_remove. At least one of tags_to_add or tags_to_remove must be provided.',
      }
    ),
    examples: [
      `## Add tags to an alert
\`\`\`yaml
- name: tag_alert
  type: security.setAlertTags
  with:
    alert_ids: "{{ variables.alert_id }}"
    tags_to_add:
      - "triaged"
      - "needs-review"
\`\`\``,
      `## Add and remove tags on multiple alerts
\`\`\`yaml
- name: retag_alerts
  type: security.setAlertTags
  with:
    alert_ids:
      - "alert-1"
      - "alert-2"
    tags_to_add:
      - "escalated"
    tags_to_remove:
      - "needs-review"
\`\`\``,
    ],
  },
};
