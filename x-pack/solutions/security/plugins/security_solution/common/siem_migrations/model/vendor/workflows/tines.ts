/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const TinesAgentSchema = lazySchema(() =>
  z
    .object({
      type: z.string().min(1).max(256),
      name: z.string().min(1).max(1024),
      guid: z.string().min(1).max(256),
      disabled: z.boolean().optional(),
      description: z.string().max(10000).nullable().optional(),
      options: z.record(z.string().max(256), z.unknown()).optional(),
    })
    .passthrough()
);

export const TinesLinkSchema = lazySchema(() =>
  z
    .object({
      source: z.number().int().nonnegative(),
      receiver: z.number().int().nonnegative(),
    })
    .passthrough()
);

export const TinesStoryExportSchema = lazySchema(() =>
  z
    .object({
      name: z.string().min(1).max(1024),
      // Real Tines exports often set description to null rather than omitting it.
      description: z.string().max(10000).nullable().optional(),
      guid: z.string().max(256).optional(),
      tags: z.array(z.string().max(256)).max(100).optional(),
      agents: z.array(TinesAgentSchema).min(1).max(5000),
      links: z.array(TinesLinkSchema).max(20000).optional(),
    })
    .passthrough()
);
