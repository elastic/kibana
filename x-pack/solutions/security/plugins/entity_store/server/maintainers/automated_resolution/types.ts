/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityMaintainerState } from '../../tasks/entity_maintainers/types';
import type { Stage0RuleId } from './rules_config';

export interface PerRuleState extends EntityMaintainerState {
  lastProcessedTimestamp: string | null;
  lastRun: {
    resolutionsCreated: number;
    skippedAmbiguousBuckets: number;
  } | null;
}

/**
 * Stage-0 state shape — one watermark + lastRun stats per rule.
 *
 * 9.4 persisted `{ lastProcessedTimestamp, lastRun }` at top level (S1 only).
 * `migrateAutomatedResolutionState` transparently upgrades that on first run.
 */
export interface AutomatedResolutionState extends EntityMaintainerState {
  rules: Record<Stage0RuleId, PerRuleState>;
}

export interface EntityHit {
  entityId: string;
  namespace: string;
}

export interface MatchBucket {
  matchValue: string;
  unresolvedEntities: EntityHit[];
  existingTargetIds: string[];
}
