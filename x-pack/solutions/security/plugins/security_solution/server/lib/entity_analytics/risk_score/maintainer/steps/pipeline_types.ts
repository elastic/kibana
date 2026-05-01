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
 * Raw entity-store `_source` shape for fields the modifier pipeline reads.
 *
 * `watchlists` and `resolved_to` are typed as `unknown` because the entity
 * store's `_source` is not strictly typed at the boundary — values can arrive
 * as strings, arrays, or missing entirely. `normalizeModifierEntity`
 * (`maintainer/utils/fetch_entities_by_ids.ts`) is the single boundary that
 * converts this loose shape into the strict `RiskScoreModifierEntity`.
 *
 * Keep this type loose — only widen the boundary, never the normalized output.
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
