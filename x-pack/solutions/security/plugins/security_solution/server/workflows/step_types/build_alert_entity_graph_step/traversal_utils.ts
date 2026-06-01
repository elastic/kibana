/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EdgeAccumulator } from './types';
import type { ParentLinkResult } from './scoring';

/**
 * Merges newly discovered entities into the known set, respecting per-field limits.
 *
 * Returns only the truly new values (frontier) for the next expansion round.
 * The `known` map is mutated in place for efficiency.
 */
export const mergeEntities = (params: {
  known: Map<string, Set<string>>;
  added: Map<string, Set<string>>;
  maxEntitiesPerField: number;
}): Map<string, Set<string>> => {
  const { known, added, maxEntitiesPerField } = params;
  const frontier = new Map<string, Set<string>>();

  for (const [field, values] of added.entries()) {
    if (values.size) {
      const existing = known.get(field) ?? new Set<string>();
      const newValues = new Set<string>();

      for (const v of values) {
        if (existing.size >= maxEntitiesPerField) break;
        if (!existing.has(v)) {
          existing.add(v);
          newValues.add(v);
        }
      }

      known.set(field, existing);
      if (newValues.size) frontier.set(field, newValues);
    }
  }

  return frontier;
};

/**
 * Indexes an alert's entity values into the entity-to-alert-IDs lookup map.
 *
 * This enables efficient parent-link computation during traversal:
 * given a `field + value` pair, we can quickly find all alerts that share it.
 */
export const indexEntitiesForAlert = (params: {
  entityToAlertIds: Map<string, Set<string>>;
  alertId: string;
  entities: Map<string, Set<string>>;
}): void => {
  const { entityToAlertIds, alertId, entities } = params;

  for (const [field, values] of entities.entries()) {
    for (const v of values) {
      const key = `${field}\u0000${v}`;
      const set = entityToAlertIds.get(key) ?? new Set<string>();
      set.add(alertId);
      entityToAlertIds.set(key, set);
    }
  }
};

/**
 * Records traversal edges from a child alert to its matched parent alerts.
 *
 * If an edge between two alerts already exists, label scores are merged
 * (taking the max score per label).
 */
export const addTraversalEdges = (params: {
  edgesByKey: EdgeAccumulator;
  childId: string;
  parentLinks: Map<string, ParentLinkResult>;
}): void => {
  const { edgesByKey, childId, parentLinks } = params;

  for (const [parentId, match] of parentLinks.entries()) {
    const edgeKey = `${parentId}\u0000${childId}`;
    const edge = edgesByKey.get(edgeKey) ?? {
      from: parentId,
      to: childId,
      labelScores: new Map<string, number>(),
      score: 0,
    };
    for (const [label, score] of match.labelScores.entries()) {
      const prev = edge.labelScores.get(label) ?? 0;
      edge.labelScores.set(label, Math.max(prev, score));
    }
    edge.score = Array.from(edge.labelScores.values()).reduce((sum, s) => sum + s, 0);
    edgesByKey.set(edgeKey, edge);
  }
};
