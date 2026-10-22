/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaselineDecision, SignalOutcome } from './signals';
import type { EngineEventStatus } from './events';
import type { SignalStrategyId, StrategyMode } from './strategies';

/** Per-strategy result of one run. */
export interface StrategyRunSummary {
  strategy: SignalStrategyId;
  mode: StrategyMode;
  /** Buckets this run evaluated for the strategy, oldest first. */
  buckets: number;
  /** End of the last bucket evaluated, after this run. */
  watermark?: string;
  observations: number;
  looked_off: number;
  duration_ms: number;
  /** Minutes skipped because the engine was behind by more than it catches up. */
  skipped_minutes?: number;
  /** Set when reading stopped at the per-run cap; the rest is read on the next run. */
  truncated?: boolean;
  error?: string;
}

/** Why a run did nothing. */
export type RunSkipReason = 'busy' | 'nothing_settled' | 'disabled';

/** What one engine run did, step by step. */
export interface EngineRunSummary {
  run_id: string;
  /** What started the run: the schedule, a person, or a backtest. */
  trigger: 'schedule' | 'manual' | 'backtest';
  started_at: string;
  finished_at: string;
  /** First and last bucket the run evaluated, across strategies. */
  bucket_start?: string;
  bucket_end?: string;
  /** Set when the run did nothing, with the reason. */
  skipped?: string;
  skip_reason?: RunSkipReason;
  /** True when the run stopped early to stay inside its time budget. */
  budget_exhausted?: boolean;
  strategies: StrategyRunSummary[];
  signals: number;
  baseline: Record<BaselineDecision, number>;
  outcomes: Partial<Record<SignalOutcome, number>>;
  agent: {
    calls: number;
    cooldown_skips: number;
    /** Decisions the heuristic made because the model had no budget left in the run. */
    heuristic_when_busy?: number;
    rejected_answers: number;
    failures: number;
    /** Model tokens spent in this run, prompt plus completion. */
    tokens: number;
    /** List-price cost of this run's model calls in USD; null when the model has no known price. */
    cost_usd?: number | null;
    /** Price key of the model, such as `anthropic-claude-4.6-sonnet`. */
    model?: string;
  };
  transitions: Array<{ event_id: string; from: EngineEventStatus | 'none'; to: EngineEventStatus }>;
  /** Events another writer changed during the run; their changes wait for the next run. */
  conflicts: number;
  open_events: number;
  /** Set when the run failed as a whole. */
  error?: string;
}

/** Where each strategy has got to, and how far behind real time the engine is. */
export interface EngineProgress {
  /** End of the last evaluated bucket, per strategy. */
  watermarks: Partial<Record<SignalStrategyId, string>>;
  last_run_at?: string;
  last_success_at?: string;
  consecutive_failures: number;
  last_error?: string;
}
