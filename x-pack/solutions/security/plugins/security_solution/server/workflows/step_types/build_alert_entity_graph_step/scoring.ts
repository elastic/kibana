/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldToEntityLabel } from './entity_utils';
import type { AliasMap } from './alias_utils';
import type { ScoringConfig } from './types';

export interface ParentLinkResult {
  labels: Set<string>;
  /** Per-label scores (label = top-level field segment, e.g. `user.name` -> `user`). */
  labelScores: Map<string, number>;
  score: number;
}

/**
 * Computes which parent alerts a child alert links to, based on shared entity values.
 *
 * For each entity field on the child, finds parent alerts that share those values
 * (including via alias fields), and computes a score per label. Only parents
 * whose total score meets `scoring.minEntityScore` are returned.
 */
export const computeParentLinks = (params: {
  entityToAlertIds: Map<string, Set<string>>;
  parentCandidates: Set<string>;
  childEntities: Map<string, Set<string>>;
  aliasesByField: AliasMap;
  scoring: ScoringConfig;
}): Map<string, ParentLinkResult> => {
  const { entityToAlertIds, parentCandidates, childEntities, aliasesByField, scoring } = params;

  const parents = new Map<string, ParentLinkResult>();

  for (const [field, values] of childEntities.entries()) {
    const label = fieldToEntityLabel(field);
    const fieldScore = scoring.entityFieldScores.get(field) ?? scoring.defaultScorePerField;
    const aliases = aliasesByField.get(field) ?? [];

    // Build the list of fields to match against (the field itself + its aliases).
    const matchFields: Array<{ field: string; score: number }> = [{ field, score: fieldScore }];
    for (const alias of aliases) {
      if (alias?.field && alias.field !== field) {
        const aliasScore =
          (typeof alias.score === 'number' && Number.isFinite(alias.score)
            ? alias.score
            : undefined) ??
          scoring.entityFieldScores.get(alias.field) ??
          scoring.defaultScorePerField;
        matchFields.push({ field: alias.field, score: aliasScore });
      }
    }

    for (const v of values) {
      for (const matchField of matchFields) {
        const key = `${matchField.field}\u0000${v}`;
        const neighbors = entityToAlertIds.get(key);
        if (neighbors) {
          for (const neighborId of neighbors) {
            if (parentCandidates.has(neighborId)) {
              const entry = parents.get(neighborId) ?? {
                labels: new Set<string>(),
                labelScores: new Map<string, number>(),
                score: 0,
              };
              entry.labels.add(label);
              const prev = entry.labelScores.get(label) ?? 0;
              entry.labelScores.set(label, Math.max(prev, matchField.score));
              parents.set(neighborId, entry);
            }
          }
        }
      }
    }
  }

  // Filter out parents that don't meet the minimum score threshold.
  const filtered = new Map<string, ParentLinkResult>();
  for (const [parentId, match] of parents.entries()) {
    const score = Array.from(match.labelScores.values()).reduce((sum, s) => sum + s, 0);
    match.score = score;
    if (score >= scoring.minEntityScore) {
      filtered.set(parentId, match);
    }
  }

  return filtered;
};
