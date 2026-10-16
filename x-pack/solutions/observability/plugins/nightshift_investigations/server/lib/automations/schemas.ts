/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { investigationNotificationDestinationSchema } from '../../../common';

/**
 * The prompt template is sent to the investigation step as its `message`, which the step limits to
 * 10,000 characters. A Slack-triggered run appends up to SLACK_MESSAGE_TEXT_LIMIT characters of the
 * message plus a short heading, so the template has to leave room for both.
 */
export const MAX_PROMPT_TEMPLATE_LENGTH = 5000;

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

export const automationCompletionSchema = automationCompletionInputSchema.superRefine(
  (completion, context) => {
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
  }
);
