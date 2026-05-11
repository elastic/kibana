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
import { WORKFLOW_STEP_ID_SET_ATTACK_TAGS } from '../../constants';

export const setAttackTagsInputSchema = z.object({
  attack_ids: z.array(z.string()).min(1).describe('The IDs of the attacks to update'),
  tags: SetAlertTags.describe('The tags to add or remove'),
  update_related_alerts: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to also update the alerts related to the specified attacks'),
});

export const setAttackTagsOutputSchema = z.object({
  success: z.boolean(),
});

export const setAttackTagsStepCommonDefinition: BaseStepDefinition<
  typeof setAttackTagsInputSchema,
  typeof setAttackTagsOutputSchema
> = {
  id: WORKFLOW_STEP_ID_SET_ATTACK_TAGS,
  label: i18n.translate('xpack.securitySolution.workflows.steps.detections.setAttackTags.label', {
    defaultMessage: 'Detections - Set Attack Tags',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.detections.setAttackTags.description',
    {
      defaultMessage: 'Add or remove tags from one or more attacks.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: setAttackTagsInputSchema,
  outputSchema: setAttackTagsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.detections.setAttackTags.documentation.details',
      {
        defaultMessage: 'Updates the tags of the specified attacks.',
      }
    ),
    examples: [
      `## Set attack tags
\`\`\`yaml
- name: set_attack_tags
  type: ${WORKFLOW_STEP_ID_SET_ATTACK_TAGS}
  with:
    attack_ids: ["abc-123-def-456"]
    tags:
      tags_to_add: ["tag1", "tag2"]
      tags_to_remove: ["tag3"]
\`\`\``,
    ],
  },
};
