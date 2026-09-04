/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MitreFramework,
  MitreEntityType,
  MitreTactic,
  MitreTechnique,
  MitreSubtechnique,
} from './schema';

/** Whether to include only active entities or all (including revoked / deprecated). */
export type MitreEntityStatus = 'active' | 'all';

/** Entities grouped by type but without the containing framework metadata. */
export interface MitreEntityBuckets {
  tactics: MitreTactic[];
  techniques: MitreTechnique[];
  subtechniques: MitreSubtechnique[];
}

/** Full result of a list operation: buckets plus the resolved framework / version. */
export interface MitreEntityCollection extends MitreEntityBuckets {
  framework: MitreFramework;
  /**
   * Resolved framework version. Absent when the index holds no data for the
   * requested framework
   */
  frameworkVersion?: string;
}

/** Parameters for list(). */
export interface MitreListParams {
  /** Defaults to 'enterprise'. */
  framework?: MitreFramework;
  /** Defaults to the latest version present in the index. */
  frameworkVersion?: string;
  /** Restrict results to these entity types. Omit to include all types. */
  types?: MitreEntityType[];
  /** Defaults to 'active' (revoked and deprecated entities excluded). */
  status?: MitreEntityStatus;
}
