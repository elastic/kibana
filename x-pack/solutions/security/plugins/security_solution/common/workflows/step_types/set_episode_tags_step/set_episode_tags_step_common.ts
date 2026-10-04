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
import { MAX_ALERT_ID_LENGTH, MAX_WORKFLOW_MESSAGE_LENGTH } from '../common/constants';

export const SetEpisodeTagsStepId = 'security.setEpisodeTags' as const;

export const setEpisodeTagsInputSchema = z.object({
  group_hash: z
    .string()
    .min(1)
    .max(MAX_ALERT_ID_LENGTH)
    .describe('The episode series `group_hash` (tags are series-scoped)'),
  tags: z
    .array(z.string().min(1))
    .describe('The full set of tags for the series (replaces any existing tags)'),
});

export const setEpisodeTagsOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const setEpisodeTagsStepCommonDefinition: BaseStepDefinition<
  typeof setEpisodeTagsInputSchema,
  typeof setEpisodeTagsOutputSchema
> = {
  id: SetEpisodeTagsStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.setEpisodeTags.label', {
    defaultMessage: 'Set Episode Tags',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.setEpisodeTags.description', {
    defaultMessage: 'Set the tags on a v2 alert episode series.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: setEpisodeTagsInputSchema,
  outputSchema: setEpisodeTagsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.setEpisodeTags.documentation.details',
      {
        defaultMessage:
          'Appends a `tag` action to the v2 `.alert-actions` stream. Tags are series-scoped and replace the current set (the v2 model stores the full tag set, not a delta).',
      }
    ),
    examples: [
      `## Set tags on an episode series
\`\`\`yaml
- name: tag_episode
  type: security.setEpisodeTags
  with:
    group_hash: "{{ variables.group_hash }}"
    tags:
      - "triaged"
      - "needs-review"
\`\`\``,
    ],
  },
};
