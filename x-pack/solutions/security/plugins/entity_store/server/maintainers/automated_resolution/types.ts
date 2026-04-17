/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';

export interface AutomatedResolutionState extends EntityMaintainerState {
  lastProcessedTimestamp: string | null;
  lastRun: {
    resolutionsCreated: number;
    skippedAmbiguousBuckets: number;
  } | null;
}

export interface EntityHit {
  entityId: string;
  namespace: string;
}

export interface MatchBucket {
  emailValue: string;
  unresolvedEntities: EntityHit[];
  existingTargetIds: string[];
}
