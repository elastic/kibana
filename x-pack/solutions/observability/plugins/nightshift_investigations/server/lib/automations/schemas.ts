/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  investigationNotificationDestinationSchema,
  MAX_AUTOMATION_INSTRUCTIONS_LENGTH,
} from '../../../common';
import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from './generate_workflow_yaml';

// Keep operator guidance bounded independently of trigger evidence in the final agent message.
export const MAX_PROMPT_TEMPLATE_LENGTH = MAX_AUTOMATION_INSTRUCTIONS_LENGTH;

export const promptTemplateSchema = z.string().max(MAX_PROMPT_TEMPLATE_LENGTH);

export const automationCompletionInputSchema = z.object({
  action: z.enum(['create_investigation', 'post_to_slack', 'silent']).optional(),
  targetMode: z.enum(['thread', 'channel', 'self']).optional(),
  destination: z.string().max(500).optional(),
  connectorId: investigationNotificationDestinationSchema.shape.connector_id.optional(),
});

export const automationCompletionUpdateSchema = automationCompletionInputSchema.extend({
  action: automationCompletionInputSchema.shape.action.nullable(),
  targetMode: automationCompletionInputSchema.shape.targetMode.nullable(),
  destination: automationCompletionInputSchema.shape.destination.nullable(),
  connectorId: automationCompletionInputSchema.shape.connectorId.nullable(),
});

const SLACK_USER_OR_DM_ID_PATTERN = /^[UWD][A-Z0-9]+$/;

export const automationCompletionSchema = lazySchema(() =>
  automationCompletionInputSchema.superRefine((completion, context) => {
    if (
      completion.action === 'post_to_slack' &&
      completion.targetMode === 'channel' &&
      !completion.destination?.trim()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['destination'],
        message: 'A Slack channel destination is required',
      });
    }
  })
);

export const savedAutomationCompletionSchema = lazySchema(() =>
  automationCompletionSchema.superRefine((completion, context) => {
    if (
      completion.action === 'post_to_slack' &&
      completion.targetMode === 'channel' &&
      (completion.connectorId ?? ELASTIC_APPS_SLACK_CONNECTOR_ID) ===
        ELASTIC_APPS_SLACK_CONNECTOR_ID &&
      SLACK_USER_OR_DM_ID_PATTERN.test(completion.destination?.trim() ?? '')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['destination'],
        message: 'The Elastic Slack App can only post to channels, not users',
      });
    }
  })
);
