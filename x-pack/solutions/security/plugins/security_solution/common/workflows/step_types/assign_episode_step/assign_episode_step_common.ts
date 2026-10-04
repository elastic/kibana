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
  MAX_USER_ID_LENGTH,
  MAX_WORKFLOW_MESSAGE_LENGTH,
} from '../common/constants';

export const AssignEpisodeStepId = 'security.assignEpisode' as const;

const idString = z.string().min(1).max(MAX_ALERT_ID_LENGTH);

export const assignEpisodeInputSchema = z.object({
  group_hash: idString.describe('The episode series `group_hash`'),
  episode_id: idString.describe('The `episode.id` to assign'),
  assignee_uid: z
    .string()
    .min(1)
    .max(MAX_USER_ID_LENGTH)
    .nullable()
    .describe('The user profile uid to assign, or `null` to unassign'),
});

export const assignEpisodeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const assignEpisodeStepCommonDefinition: BaseStepDefinition<
  typeof assignEpisodeInputSchema,
  typeof assignEpisodeOutputSchema
> = {
  id: AssignEpisodeStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.assignEpisode.label', {
    defaultMessage: 'Assign Episode',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.assignEpisode.description', {
    defaultMessage: 'Set (or clear) the assignee of a v2 alert episode.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: assignEpisodeInputSchema,
  outputSchema: assignEpisodeOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.assignEpisode.documentation.details',
      {
        defaultMessage:
          'Appends an `assign` action to the v2 `.alert-actions` stream. Episode-scoped: the assignee is replaced with the provided user (or cleared when `assignee_uid` is `null`).',
      }
    ),
    examples: [
      `## Assign an episode to a user
\`\`\`yaml
- name: assign_episode
  type: security.assignEpisode
  with:
    group_hash: "{{ variables.group_hash }}"
    episode_id: "{{ variables.episode_id }}"
    assignee_uid: "{{ variables.user_uid }}"
\`\`\``,
      `## Unassign an episode
\`\`\`yaml
- name: unassign_episode
  type: security.assignEpisode
  with:
    group_hash: "{{ variables.group_hash }}"
    episode_id: "{{ variables.episode_id }}"
    assignee_uid: null
\`\`\``,
    ],
  },
};
