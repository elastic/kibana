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

export const SetEpisodeStatusStepId = 'security.setEpisodeStatus' as const;

const idString = z.string().min(1).max(MAX_ALERT_ID_LENGTH);

export const setEpisodeStatusInputSchema = z.object({
  group_hash: idString.describe('The episode series `group_hash`'),
  episode_id: idString.describe('The `episode.id` (used for acknowledge / unacknowledge)'),
  status: z
    .enum(['acknowledged', 'unacknowledged', 'resolved', 'unresolved'])
    .describe('The new episode status'),
  reason: z
    .string()
    .max(MAX_WORKFLOW_MESSAGE_LENGTH)
    .optional()
    .describe('Optional reason recorded when resolving / reopening'),
});

export const setEpisodeStatusOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().max(MAX_WORKFLOW_MESSAGE_LENGTH).optional(),
});

export const setEpisodeStatusStepCommonDefinition: BaseStepDefinition<
  typeof setEpisodeStatusInputSchema,
  typeof setEpisodeStatusOutputSchema
> = {
  id: SetEpisodeStatusStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.setEpisodeStatus.label', {
    defaultMessage: 'Set Episode Status',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.steps.setEpisodeStatus.description', {
    defaultMessage: 'Acknowledge, unacknowledge, resolve, or reopen a v2 alert episode.',
  }),
  category: StepCategory.KibanaSecurity,
  inputSchema: setEpisodeStatusInputSchema,
  outputSchema: setEpisodeStatusOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.setEpisodeStatus.documentation.details',
      {
        defaultMessage:
          'Appends a status action to the v2 `.alert-actions` stream. `acknowledged` / `unacknowledged` target the episode; `resolved` / `unresolved` target the whole series.',
      }
    ),
    examples: [
      `## Acknowledge an episode
\`\`\`yaml
- name: ack_episode
  type: security.setEpisodeStatus
  with:
    group_hash: "{{ variables.group_hash }}"
    episode_id: "{{ variables.episode_id }}"
    status: "acknowledged"
\`\`\``,
      `## Resolve an episode
\`\`\`yaml
- name: resolve_episode
  type: security.setEpisodeStatus
  with:
    group_hash: "{{ variables.group_hash }}"
    episode_id: "{{ variables.episode_id }}"
    status: "resolved"
    reason: "Handled by automation"
\`\`\``,
    ],
  },
};
