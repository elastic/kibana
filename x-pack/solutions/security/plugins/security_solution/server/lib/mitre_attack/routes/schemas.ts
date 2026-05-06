/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { mitreFrameworkSchema } from '@kbn/security-mitre-attack-common';

export const getTacticsQuerySchema = z.object({
  framework: mitreFrameworkSchema.optional().default('enterprise'),
});

export const getTechniquesQuerySchema = z.object({
  framework: mitreFrameworkSchema.optional().default('enterprise'),
  tactic: z.string().min(1).optional(),
});

export const getSubtechniquesQuerySchema = z.object({
  framework: mitreFrameworkSchema.optional().default('enterprise'),
  technique: z.string().min(1).optional(),
});

export const getByIdParamsSchema = z.object({
  framework: mitreFrameworkSchema,
  id: z.string().min(1),
});

const entityTypeSchema = z.enum(['tactic', 'technique', 'subtechnique']);

export const searchQuerySchema = z.object({
  q: z.string().min(1),
  framework: mitreFrameworkSchema.optional(),
  types: z
    .union([entityTypeSchema, z.array(entityTypeSchema)])
    .optional()
    .transform((value) => (value == null ? undefined : Array.isArray(value) ? value : [value])),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});
