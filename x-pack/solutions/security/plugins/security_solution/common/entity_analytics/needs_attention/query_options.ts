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
}

/** Ranked, capped tail used by every tile when `sampleLimit` is set. */
export const buildSampleTail = (sampleLimit: number): string[] => [
  `| STATS risk_score = MAX(entity.risk.calculated_score_norm) BY effective_id`,
  `| SORT risk_score DESC NULLS LAST, effective_id ASC`,
  `| LIMIT ${Math.max(1, Math.floor(sampleLimit))}`,
  `| KEEP effective_id`,
];
