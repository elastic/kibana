/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Shared types for the maintainer scoring runtime path. */

import type { AssetCriticalityLevel } from '@kbn/entity-store/common';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';

/** Minimal entity fields required for modifier application. */
export interface RiskScoreModifierEntity {
  entity?: {
    id?: string;
    attributes?: {
      watchlists?: string[];
    };
    relationships?: {
      resolution?: {
        resolved_to?: string;
      };
    };
  };
  asset?: {
    criticality?: AssetCriticalityLevel | null;
  };
}

/**
 * Loose entity-store `_source` boundary shape. `unknown` fields are variably
 * typed; `normalizeModifierEntity` is the single normalizer to the strict
 * `RiskScoreModifierEntity`. Keep this type loose — only widen at the boundary.
 */
export interface EntityStoreModifierSource {
  entity?: {
    id?: string;
    attributes?: { watchlists?: unknown };
    relationships?: { resolution?: { resolved_to?: unknown } };
  };
  asset?: RiskScoreModifierEntity['asset'] | null;
}

/** Shared scored page shape used across scoring loops. */
export interface ScoredEntityPage {
  entityIds: string[];
  scores: EntityRiskScoreRecord[];
  entities: Map<string, RiskScoreModifierEntity>;
}

/** Common summary fields returned by scorer modules. */
export interface StepResult {
  pagesProcessed: number;
  scoresWritten: number;
}

/** Phase 2 scoring summary with optional skip reason. */
export interface ResolutionStepResult extends StepResult {
  skippedReason?: 'lookup_empty';
}
