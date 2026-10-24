/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCriticalityLevel } from './criticality_level';
import { normalizeModifierEntity } from '../utils/fetch_entities_by_ids';
import type { StoredRiskScore } from './base_store_lookup';
import type { RiskScoreModifierEntity } from './pipeline_types';

/** Entity store fields the resolution scoring query joins onto each target's score row. */
const TARGET_STORE_FIELDS = {
  engineType: 'entity.EngineMetadata.Type',
  criticality: 'asset.criticality',
  watchlists: 'entity.attributes.watchlists',
  level: 'entity.relationships.resolution.risk.calculated_level',
  score: 'entity.relationships.resolution.risk.calculated_score',
  scoreNorm: 'entity.relationships.resolution.risk.calculated_score_norm',
} as const;

export const RESOLUTION_TARGET_LOOKUP_FIELDS: string[] = Object.values(TARGET_STORE_FIELDS);

export interface ResolutionTargetLookup {
  /** The scored targets that exist in the store, with the fields their own modifiers read. */
  entities: Map<string, RiskScoreModifierEntity>;
  /** The resolution score each of those targets holds in the store. */
  storedScores: Map<string, StoredRiskScore>;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

/**
 * Reads the target fields the scoring query joined onto its rows. A target that isn't in the store
 * has every joined field null, including the engine type every store document has.
 */
export const readResolutionTargetLookup = (
  columns: Array<{ name: string }>,
  rows: unknown[][]
): ResolutionTargetLookup => {
  const positions = new Map(columns.map(({ name }, index) => [name, index]));
  const valueAt = (row: unknown[], field: string): unknown => {
    const position = positions.get(field);
    return position === undefined ? undefined : row[position];
  };

  const storeTargetId = (row: unknown[]): string | undefined => {
    const id = asString(valueAt(row, 'resolution_target_id'));
    return valueAt(row, TARGET_STORE_FIELDS.engineType) == null ? undefined : id;
  };

  const entities = new Map<string, RiskScoreModifierEntity>();
  const storedScores = new Map<string, StoredRiskScore>();
  for (const row of rows) {
    const id = storeTargetId(row);
    if (id !== undefined) {
      const entity = normalizeModifierEntity({
        entity: { id, attributes: { watchlists: valueAt(row, TARGET_STORE_FIELDS.watchlists) } },
        asset: { criticality: toCriticalityLevel(valueAt(row, TARGET_STORE_FIELDS.criticality)) },
      });
      if (entity) {
        entities.set(id, entity);
      }
      storedScores.set(id, {
        level: asString(valueAt(row, TARGET_STORE_FIELDS.level)),
        score: asNumber(valueAt(row, TARGET_STORE_FIELDS.score)),
        scoreNorm: asNumber(valueAt(row, TARGET_STORE_FIELDS.scoreNorm)),
      });
    }
  }
  return { entities, storedScores };
};
