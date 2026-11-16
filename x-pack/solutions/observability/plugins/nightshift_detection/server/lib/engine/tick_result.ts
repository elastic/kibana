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
  skipped_minutes: number;
  notes: string[];
  /** Set when the strategy failed or ran out of time; its watermark did not move. */
  error?: string;
}

/** What a tick did. */
export type TickResult =
  | { run_id: string; status: 'completed'; strategies: StrategyRunResult[] }
  | { run_id: string; status: 'busy'; held_by: string; strategies: [] }
  | { run_id: string; status: 'unavailable'; strategies: [] };
