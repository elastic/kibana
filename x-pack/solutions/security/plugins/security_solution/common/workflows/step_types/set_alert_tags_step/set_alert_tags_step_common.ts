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
import { SetAlertTags } from '../../../api/detection_engine/model/set_alert_tags_body.gen';
import { WORKFLOW_STEP_ID_SET_ALERT_TAGS } from '../../constants';

export const setAlertTagsInputSchema = z.object({
  alert_ids: z.array(z.string()).min(1).describe('The IDs of the alerts to update'),
  tags: SetAlertTags.describe('The tags to add or remove'),
});

export const setAlertTagsOutputSchema = z.object({
  success: z.boolean(),
});

export const setAlertTagsStepCommonDefinition: BaseStepDefinition<
  typeof setAlertTagsInputSchema,
  typeof setAlertTagsOutputSchema
> = {
  id: WORKFLOW_STEP_ID_SET_ALERT_TAGS,
  label: i18n.translate('xpack.securitySolution.workflows.steps.detections.setAlertTags.label', {
    defaultMessage: 'Detections - Set Alert Tags',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.detections.setAlertTags.description',
    {
      defaultMessage: 'Add or remove tags from one or more alerts.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: setAlertTagsInputSchema,
  outputSchema: setAlertTagsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.detections.setAlertTags.documentation.details',
      {
        defaultMessage: 'Updates the tags of the specified alerts.',
      }
    ),
    examples: [
      `## Set alert tags
\`\`\`yaml
- name: set_alert_tags
  type: ${WORKFLOW_STEP_ID_SET_ALERT_TAGS}
  with:
    alert_ids: ["abc-123-def-456"]
    tags:
      tags_to_add: ["tag1", "tag2"]
      tags_to_remove: ["tag3"]
\`\`\``,
    ],
  },
};
