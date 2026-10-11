/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_RULE_NAMES } from '../../../common/automation_limits';

export const triggerRowSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('alert'),
    ruleNamePattern: z.string().max(1000).optional(),
    ruleNames: z.array(z.string().max(1000)).max(MAX_RULE_NAMES).optional(),
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
]);
