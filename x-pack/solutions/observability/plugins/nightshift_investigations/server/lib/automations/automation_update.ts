/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { automationCompletionSchema, promptTemplateSchema } from './schemas';
import { triggerRowSchema } from '../../routes/automations/trigger_row_schema';

export const automationUpdateSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).nullable().optional(),
    tags: z.array(z.string().max(32)).max(50).optional(),
    isEnabled: z.boolean().optional(),
    trigger: z.object({ rows: z.array(triggerRowSchema).min(1).max(100) }).optional(),
    execution: z
      .object({
        promptTemplate: promptTemplateSchema.nullable().optional(),
        reasoningMode: z.enum(['investigate', 'observe']).optional(),
        agentId: z.string().max(512).optional(),
        connectorId: z.string().max(512).optional(),
      })
      .optional(),
    completions: z.array(automationCompletionSchema).max(10).optional(),
    runtime: z
      .object({
        dailyDispatchLimit: z.number().int().min(1).nullable().optional(),
        timeoutSeconds: z.number().int().min(1).optional(),
        dedupeWindowSeconds: z.number().int().min(0).optional(),
        overlapPolicy: z.enum(['drop', 'cancel_in_progress', 'queue']).optional(),
      })
      .optional(),
  })
);

export type AutomationUpdate = z.infer<typeof automationUpdateSchema>;
