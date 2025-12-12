/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityEcs } from '@kbn/securitysolution-ecs/src/entity';

interface EngineMetadata {
  Type: 'container' | 'user' | 'host' | 'service' | 'generic';
}

export interface GenericEntityRecord {
  '@timestamp': Date;
  entity: {
    EngineMetadata: EngineMetadata;
  } & EntityEcs;
  asset: {
    criticality: 'low_impact' | 'medium_impact' | 'high_impact' | 'extreme_impact' | 'unassigned';
  };
  labels: Record<string, string>;
  tags: string[];
  [key: string]: unknown;
}
