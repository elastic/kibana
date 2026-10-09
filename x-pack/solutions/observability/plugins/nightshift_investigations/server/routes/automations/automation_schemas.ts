/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

// Request schemas shared by the create and update automation routes.

const triggerRowSchema = lazySchema(() =>
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('alert'),
      ruleNamePattern: z.string().max(1000).optional(),
      ruleNameMatchMode: z.enum(['substring', 'regex']).optional(),
      alertStatus: z.enum(['active', 'inactive', 'any']).optional(),
      tags: z.array(z.string().max(500)).optional(),
    }),
    z.object({
      kind: z.literal('schedule'),
      schedulePreset: z.enum(['hourly', 'daily', 'weekly', 'custom']).optional(),
      cronExpression: z.string().max(100).optional(),
      timezone: z.string().max(100).optional(),
      scopeQuery: z.string().max(10000).optional(),
    }),
    z.object({
      kind: z.literal('slack'),
      event: z.enum(['message']),
      channels: z.array(z.string().max(500)).max(100).optional(),
      users: z.array(z.string().max(500)).max(100).optional(),
      messageFilter: z.string().max(1000).optional(),
    }),
  ])
);

export const triggerSchema = lazySchema(() =>
  z.object({
    rows: z.array(triggerRowSchema).min(1),
  })
);

export const executionSchema = lazySchema(() =>
  z.object({
    promptTemplate: z.string().max(50000).optional(),
    reasoningMode: z.enum(['investigate', 'observe']).optional(),
    agentId: z.string().max(512).optional(),
    connectorId: z.string().max(512).optional(),
  })
);

export const completionSchema = lazySchema(() =>
  z.object({
    action: z.enum(['create_investigation', 'post_to_slack', 'silent']).optional(),
    targetMode: z.enum(['thread', 'channel', 'self']).optional(),
    destination: z.string().max(500).optional(),
  })
);

export const runtimeSchema = lazySchema(() =>
  z.object({
    dailyDispatchLimit: z.number().int().min(0).optional(),
    timeoutSeconds: z.number().int().min(1).optional(),
    dedupeWindowSeconds: z.number().int().min(0).optional(),
    overlapPolicy: z.enum(['drop', 'cancel_in_progress', 'queue']).optional(),
  })
);
