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

/** Counts alerts per source, split by whether their entity exists in the store. */
export const buildSourceCountsResult = (
  scores: ReadonlyArray<Pick<ParsedRiskScore, 'entity_id' | 'source_alert_counts'>>,
  entities: ReadonlyMap<string, unknown>
): AlertSourceCounts => {
  const counts: AlertSourceCounts = Object.create(null);
  for (const { entity_id: entityId, source_alert_counts: sources } of scores) {
    const key = entities.has(entityId) ? 'scored' : 'unmatched';
    for (const { source, alerts } of sources ?? []) {
      const entry = counts[source] ?? { scored: 0, unmatched: 0 };
      entry[key] += alerts;
      counts[source] = entry;
    }
  }
  return counts;
};

/** Adds two sets of counts into a new one, leaving both inputs unchanged. */
export const mergeAlertSourceCounts = (
  current: Readonly<AlertSourceCounts>,
  addition: Readonly<AlertSourceCounts>
): AlertSourceCounts => {
  const merged: AlertSourceCounts = Object.assign(Object.create(null), current);
  for (const [source, { scored, unmatched }] of Object.entries(addition)) {
    const entry = merged[source] ?? { scored: 0, unmatched: 0 };
    merged[source] = { scored: entry.scored + scored, unmatched: entry.unmatched + unmatched };
  }
  return merged;
};
