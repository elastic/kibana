/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { investigationNotificationDestinationSchema } from '../../../common';

export const automationCompletionInputSchema = z.object({
  action: z.enum(['create_investigation', 'post_to_slack', 'silent']).optional(),
  targetMode: z.enum(['thread', 'channel', 'self']).optional(),
  destination: z.string().max(500).optional(),
  connectorId: investigationNotificationDestinationSchema.shape.connector_id.optional(),
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
