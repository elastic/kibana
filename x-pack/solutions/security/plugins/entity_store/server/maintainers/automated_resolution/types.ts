/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';

export interface AutomatedResolutionState extends EntityMaintainerState {
  lastProcessedTimestamp: string | null;
  totalResolutionsCreated: number;
  lastRun: {
    newValuesScanned: number;
    matchGroupsFound: number;
    resolutionsCreated: number;
    skippedAmbiguousBuckets: number;
    timestamp: string;
  } | null;
}

export interface EntityHit {
  id: string;
  source: string;
}

export interface MatchBucket {
  key: string;
  unresolved: EntityHit[];
  existingTargetIds: string[];
}
