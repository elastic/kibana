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
  /** Weight applied during scoring (0.0–1.0) */
  readonly weight: number;
}

/** Contract every pluggable observation module must satisfy. */
export interface ObservationModule {
  readonly config: ObservationModuleConfig;
  isEnabled(): boolean;
  collect(entities: readonly ObservationEntity[]): Promise<Observation[]>;
}
