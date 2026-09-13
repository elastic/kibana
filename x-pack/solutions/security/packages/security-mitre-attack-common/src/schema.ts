/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

// -------------------------------------------------------------------------
// TypeScript domain model
// -------------------------------------------------------------------------

export type MitreFramework = 'enterprise';
export type MitreEntityType = 'tactic' | 'technique' | 'subtechnique';

interface MitreEntityBase {
  framework: MitreFramework;
  framework_version: string;
  id: string;
  name: string;
  reference: string;
  description: string;
  revoked: boolean;
  superseded_by_id?: string[];
  deprecated: boolean;
}

export interface MitreTactic extends MitreEntityBase {
  type: 'tactic';
  position: number;
}

export interface MitreTechnique extends MitreEntityBase {
  type: 'technique';
  tactic_ids: string[];
}

export interface MitreSubtechnique extends MitreEntityBase {
  type: 'subtechnique';
  tactic_ids: string[];
  technique_id: string;
}

export type MitreEntity = MitreTactic | MitreTechnique | MitreSubtechnique;

// -------------------------------------------------------------------------
// Zod schemas
// -------------------------------------------------------------------------

const mitreFrameworkSchema = z.enum(['enterprise']);

const mitreEntityBaseSchema = z.object({
  framework: mitreFrameworkSchema,
  framework_version: z.string().min(1),
  id: z.string().min(1),
  name: z.string().min(1),
  reference: z.string().min(1),
  description: z.string(),
  revoked: z.boolean(),
  superseded_by_id: z.array(z.string()).optional(),
  deprecated: z.boolean(),
});

const mitreTacticSchema = mitreEntityBaseSchema.extend({
  type: z.literal('tactic'),
  position: z.number().int().nonnegative(),
});

const mitreTechniqueSchema = mitreEntityBaseSchema.extend({
  type: z.literal('technique'),
  tactic_ids: z.array(z.string()),
});

const mitreSubtechniqueSchema = mitreEntityBaseSchema.extend({
  type: z.literal('subtechnique'),
  tactic_ids: z.array(z.string()),
  technique_id: z.string().min(1),
});

export const mitreEntitySchema = z.discriminatedUnion('type', [
  mitreTacticSchema,
  mitreTechniqueSchema,
  mitreSubtechniqueSchema,
]);

/** Validates the full artifact file content: a flat array of self-describing entities. */
export const mitreEntitiesSchema = z.array(mitreEntitySchema);
