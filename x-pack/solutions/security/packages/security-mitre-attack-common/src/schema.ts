/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const mitreFrameworkSchema = z.enum(['enterprise', 'mobile', 'ics', 'atlas']);

const mitreEntityBaseShape = {
  framework: mitreFrameworkSchema,
  versions: z.array(z.string().min(1)).min(1),
  id: z.string().min(1),
  name: z.string().min(1),
  reference: z.string().url(),
  description: z.string(),
} as const;

export const mitreTacticSchema = z.object({
  ...mitreEntityBaseShape,
  type: z.literal('tactic'),
});

export const mitreTechniqueSchema = z.object({
  ...mitreEntityBaseShape,
  type: z.literal('technique'),
  tactics: z.array(z.string().min(1)).min(1),
});

export const mitreSubtechniqueSchema = z.object({
  ...mitreEntityBaseShape,
  type: z.literal('subtechnique'),
  tactics: z.array(z.string().min(1)).min(1),
  techniqueId: z.string().min(1),
});

export const mitreEntitySchema = z.discriminatedUnion('type', [
  mitreTacticSchema,
  mitreTechniqueSchema,
  mitreSubtechniqueSchema,
]);

export const mitreAttackArtifactSchema = z.object({
  stamp: z.string().min(1),
  generatedAt: z.string().min(1),
  entities: z.array(mitreEntitySchema).min(1),
});

export const mitreAttackArtifactVersionSchema = z.object({
  stamp: z.string().min(1),
  generatedAt: z.string().min(1),
});
