/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What one strategy did in a tick. */
export interface StrategyRunResult {
  id: string;
  /** The window the strategy covered, `[from, to)` in epoch milliseconds. */
  from: number;
  to: number;
  /** Signals written. */
  signals: number;
  /**
   * Minutes before `from` the strategy never read: it was too far behind, or the tick skipped the
   * backlog.
   */
  skipped_minutes: number;
  notes: string[];
  /** Set when the strategy failed or ran out of time; its generator state did not move. */
  error?: string;
}

/** What a tick did. */
export type TickResult =
  | { run_id: string; status: 'completed'; strategies: StrategyRunResult[] }
  | { run_id: string; status: 'busy'; strategies: [] }
  | { run_id: string; status: 'unavailable'; strategies: [] };
