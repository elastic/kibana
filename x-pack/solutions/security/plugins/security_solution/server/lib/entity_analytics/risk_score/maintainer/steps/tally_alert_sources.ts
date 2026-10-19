/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedRiskScore } from './parse_esql_row';

export interface AlertSourceCount {
  /** Alerts of entities that exist in the entity store. */
  scored: number;
  /** Alerts of entities missing from the entity store. */
  unmatched: number;
}

export type AlertSourceCounts = Record<string, AlertSourceCount>;

/**
 * Counts alerts per source, split by whether their entity exists in the store.
 *
 * An entity's alerts are counted once for every source they came from, so an entity with alerts
 * from two sources adds its whole `alert_count` to both. Counts are exact for single-source entities.
 */
export const tallyAlertSources = (
  scores: ReadonlyArray<Pick<ParsedRiskScore, 'entity_id' | 'alert_count' | 'alert_sources'>>,
  entities: ReadonlyMap<string, unknown>
): AlertSourceCounts => {
  const counts: AlertSourceCounts = Object.create(null);
  for (const { entity_id: entityId, alert_count: alertCount, alert_sources: sources } of scores) {
    const key = entities.has(entityId) ? 'scored' : 'unmatched';
    for (const source of sources ?? []) {
      const entry = counts[source] ?? { scored: 0, unmatched: 0 };
      entry[key] += alertCount;
      counts[source] = entry;
    }
  }
  return counts;
};

export const mergeAlertSourceCounts = (
  target: AlertSourceCounts,
  addition: Readonly<AlertSourceCounts>
): void => {
  for (const [source, { scored, unmatched }] of Object.entries(addition)) {
    const entry = target[source] ?? { scored: 0, unmatched: 0 };
    entry.scored += scored;
    entry.unmatched += unmatched;
    target[source] = entry;
  }
};
