/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { BRIEF_RANGES } from './constants';

/** Request body for generating a brief; the time window is computed server-side from `range`. */
export const generateBriefRequestBodySchema = lazySchema(() =>
  z.object({
    range: z.enum(BRIEF_RANGES),
    connectorId: z.string().min(1).max(256).optional(),
  })
);

export type GenerateBriefRequestBody = z.infer<typeof generateBriefRequestBodySchema>;
