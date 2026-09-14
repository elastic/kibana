/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ArrayFromString } from '@kbn/zod-helpers';
import type { MitreFramework, MitreTactic, MitreTechnique, MitreSubtechnique } from './schema';

// -------------------------------------------------------------------------
// Summary types (description omitted for list responses)
// -------------------------------------------------------------------------

export type MitreTacticSummary = Omit<MitreTactic, 'description'>;
export type MitreTechniqueSummary = Omit<MitreTechnique, 'description'>;
export type MitreSubtechniqueSummary = Omit<MitreSubtechnique, 'description'>;
export type MitreEntitySummary =
  | MitreTacticSummary
  | MitreTechniqueSummary
  | MitreSubtechniqueSummary;

export interface MitreEntitySummaryBuckets {
  tactics: MitreTacticSummary[];
  techniques: MitreTechniqueSummary[];
  subtechniques: MitreSubtechniqueSummary[];
}

// -------------------------------------------------------------------------
// Request query schema
// -------------------------------------------------------------------------

/** Zod schema for the GET /internal/mitre/entities request query parameters. */
export const GetMitreEntitiesRequestQuery = z.object({
  /** MITRE framework to query. Currently only 'enterprise' is supported. */
  framework: z.enum(['enterprise']).optional().default('enterprise'),
  /** Pin results to a specific framework version. Defaults to the latest indexed version. */
  framework_version: z.string().min(1).max(32).optional(),
  /**
   * Restrict results to these entity types. Accepts a comma-separated string or an array.
   * Omit to include all types. Between 1 and 3 types when provided.
   */
  types: ArrayFromString(z.enum(['tactic', 'technique', 'subtechnique']))
    .refine((arr) => arr.length >= 1 && arr.length <= 3, {
      message: 'Between 1 and 3 entity types are allowed',
    })
    .optional(),
  /** Whether to include revoked and deprecated entities. Defaults to 'active'. */
  status: z.enum(['active', 'all']).optional().default('active'),
});

export type GetMitreEntitiesRequestQueryInput = z.input<typeof GetMitreEntitiesRequestQuery>;
export type GetMitreEntitiesRequestQueryOutput = z.output<typeof GetMitreEntitiesRequestQuery>;

// -------------------------------------------------------------------------
// Response type
// -------------------------------------------------------------------------

/** Response body for GET /internal/mitre/entities. */
export interface GetMitreEntitiesResponse extends MitreEntitySummaryBuckets {
  framework: MitreFramework;
  /**
   * Resolved framework version. Absent when the index holds no data for the requested
   * framework, mirroring MitreEntityCollection.frameworkVersion optionality.
   */
  framework_version?: string;
}
