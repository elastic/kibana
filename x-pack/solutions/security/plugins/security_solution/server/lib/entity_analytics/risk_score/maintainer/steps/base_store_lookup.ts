/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCriticalityLevel } from './criticality_level';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import { normalizeModifierEntity } from '../utils/fetch_entities_by_ids';
import type { RiskScoreModifierEntity } from './pipeline_types';

/** Entity store fields the base scoring query joins onto each score row. */
const STORE_FIELDS = {
  engineType: 'entity.EngineMetadata.Type',
  criticality: 'asset.criticality',
  watchlists: 'entity.attributes.watchlists',
  resolvedTo: 'entity.relationships.resolution.resolved_to',
  level: 'entity.risk.calculated_level',
  score: 'entity.risk.calculated_score',
  scoreNorm: 'entity.risk.calculated_score_norm',
} as const;

export const BASE_STORE_LOOKUP_FIELDS: string[] = Object.values(STORE_FIELDS);

/** The base score an entity holds in the store when the page is scored. */
export interface StoredRiskScore {
  level?: string;
  score?: number;
  scoreNorm?: number;
}

export interface BaseStoreLookup {
  /** The page's entities that exist in the store, with the fields their modifiers read. */
  entities: Map<string, RiskScoreModifierEntity>;
  storedScores: Map<string, StoredRiskScore>;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

/**
 * Reads the entity store fields the scoring query joined onto its rows. A row whose entity isn't
 * in the store has every joined field null, including the engine type every store document has.
 */
export const readBaseStoreLookup = (
  columns: Array<{ name: string }>,
  rows: unknown[][]
): BaseStoreLookup => {
  const positions = new Map(columns.map(({ name }, index) => [name, index]));
  const valueAt = (row: unknown[], field: string): unknown => {
    const position = positions.get(field);
    return position === undefined ? undefined : row[position];
  };

  const storeEntityId = (row: unknown[]): string | undefined => {
    const id = asString(valueAt(row, 'entity.id'));
    return valueAt(row, STORE_FIELDS.engineType) == null ? undefined : id;
  };

  const entities = new Map<string, RiskScoreModifierEntity>();
  const storedScores = new Map<string, StoredRiskScore>();
  for (const row of rows) {
    const id = storeEntityId(row);
    if (id !== undefined) {
      const entity = normalizeModifierEntity({
        entity: {
          id,
          attributes: { watchlists: valueAt(row, STORE_FIELDS.watchlists) },
          relationships: { resolution: { resolved_to: valueAt(row, STORE_FIELDS.resolvedTo) } },
        },
        asset: { criticality: toCriticalityLevel(valueAt(row, STORE_FIELDS.criticality)) },
      });
      if (entity) {
        entities.set(id, entity);
      }
      storedScores.set(id, {
        level: asString(valueAt(row, STORE_FIELDS.level)),
        score: asNumber(valueAt(row, STORE_FIELDS.score)),
        scoreNorm: asNumber(valueAt(row, STORE_FIELDS.scoreNorm)),
      });
    }
  }

  return { entities, storedScores };
};

/**
 * Whether the store already holds this base score, so writing it again would change nothing but
 * the document's timestamp. The store maps the scores as `float`, so a stored value equals the new
 * one rounded to single precision.
 */
export const isStoredScoreUnchanged = (
  score: Pick<
    EntityRiskScoreRecord,
    'calculated_level' | 'calculated_score' | 'calculated_score_norm'
  >,
  stored: StoredRiskScore | undefined
): boolean =>
  stored !== undefined &&
  stored.level === score.calculated_level &&
  stored.score === Math.fround(score.calculated_score) &&
  stored.scoreNorm === Math.fround(score.calculated_score_norm);
