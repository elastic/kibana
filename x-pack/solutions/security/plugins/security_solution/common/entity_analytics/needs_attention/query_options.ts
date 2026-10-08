/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TileCountQueryOptions {
  /**
   * When false the count queries drop `VALUES(...)`, so the response never carries an unbounded
   * entity id list. Defaults to true (the browser tiles need the ids).
   */
  includeIds?: boolean;
  /**
   * When set, the query ends with a ranked sample instead of counts: golden (resolved) entity ids
   * ordered by normalised risk score then id, capped to this many rows. Output column is
   * `effective_id`.
   */
  sampleLimit?: number;
  /**
   * Risk movers only. `'boundary'` (default) compares the score now with the last score at or before
   * the window start, so it needs risk history reaching back past the window. `'earliest'` compares
   * with the first score inside the window, which still finds movers when history is shorter.
   */
  riskMoversBaseline?: 'boundary' | 'earliest';
}

/** Ranked, capped tail used by every tile when `sampleLimit` is set. */
export const buildSampleTail = (sampleLimit: number): string[] => [
  // Golden entities keep their risk under resolution risk; others under entity.risk.
  `| STATS risk_score = MAX(COALESCE(\`entity.relationships.resolution.risk.calculated_score_norm\`, entity.risk.calculated_score_norm)) BY effective_id`,
  `| SORT risk_score DESC NULLS LAST, effective_id ASC`,
  `| LIMIT ${Math.max(1, Math.floor(sampleLimit))}`,
  `| KEEP effective_id`,
];
