/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { presetScheduleSchema } from '../../../common/automation_schedule';
import { MAX_RULE_NAMES } from '../../../common/automation_limits';

export const triggerRowSchema = lazySchema(() =>
  z.union([
    z.object({
      kind: z.literal('alert'),
      ruleNamePattern: z.string().max(1000).optional(),
      ruleNames: z.array(z.string().max(1000)).max(MAX_RULE_NAMES).optional(),
      ruleNameMatchMode: z.enum(['substring', 'regex']).optional(),
      alertStatus: z.enum(['active', 'inactive', 'any']).optional(),
      tags: z.array(z.string().max(500)).optional(),
    }),
    presetScheduleSchema.and(
      z.object({
        kind: z.literal('schedule'),
        scopeQuery: z.string().max(10000).optional(),
      })
    ),
    z
      .object({
        kind: z.literal('slack'),
        event: z.enum(['message']),
        channels: z.array(z.string().max(500)).max(100).optional(),
        users: z.array(z.string().max(500)).max(100).optional(),
        bots: z.array(z.string().max(500)).max(100).optional(),
        messageFilter: z.string().max(1000).optional(),
      })
      .refine(
        ({ channels, users, bots, messageFilter }) =>
          [...(channels ?? []), ...(users ?? []), ...(bots ?? []), messageFilter ?? ''].some(
            (value) => value.trim() !== ''
          ),
        { message: 'A Slack trigger needs at least one of channels, users, bots or messageFilter' }
      ),
  ])
);
