/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observation } from '../../../../../common/entity_analytics/lead_generation';

/** Entity reference passed to observation modules. */
export interface ObservationEntity {
  readonly record: Record<string, unknown>;
  readonly type: string;
  readonly name: string;
}

/** Static metadata for an observation module. */
export interface ObservationModuleConfig {
  readonly id: string;
  readonly name: string;
  /** Execution order — higher values execute first */
  readonly priority: number;
  /** Optional weight for the weighted scoring engine */
  readonly weight?: number;
}

/** Contract every pluggable observation module must satisfy. */
export interface ObservationModule {
  readonly config: ObservationModuleConfig;
  isEnabled(): boolean;
  collect(entities: readonly ObservationEntity[]): Promise<Observation[]>;
}

/**
 * Shape of an Elasticsearch terms aggregation bucket for alert summaries.
 * Shared by the behavioral analysis module and the entity enricher.
 */
export interface AlertBucket {
  readonly key: string;
  readonly doc_count: number;
  readonly severity_breakdown: {
    readonly buckets: ReadonlyArray<{ key: string; doc_count: number }>;
  };
  readonly distinct_rules: { readonly buckets: ReadonlyArray<{ key: string; doc_count: number }> };
  readonly max_risk_score?: { readonly value: number | null };
  readonly top_alerts: {
    readonly hits: {
      readonly hits: ReadonlyArray<{ _id: string; fields?: Record<string, unknown[]> }>;
    };
  };
}

const hasRequiredBucketShape = (b: unknown): b is AlertBucket =>
  typeof b === 'object' &&
  b !== null &&
  typeof (b as Record<string, unknown>).key === 'string' &&
  typeof (b as Record<string, unknown>).doc_count === 'number';

export const parseAlertBuckets = (agg: unknown): AlertBucket[] => {
  const raw = (agg as Record<string, unknown> | undefined)?.buckets;
  if (!Array.isArray(raw)) return [];
  return raw.filter(hasRequiredBucketShape);
};
