/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared request/response contract for the continuous-hunt status route
 * (`HUNT_STATUS_API_PATH`). Defined in `common/` so the server route and
 * the Intelligence Hub status strip consume the exact same shape.
 *
 * All data is derived from durable stores — the workflows execution
 * history (`.workflows-executions` / `.workflows-step-executions`), the
 * hunt findings index (`.kibana-threat-intel-hunt-findings`) and the
 * `feedback.last_hunted_at` stamps hunts write onto threat reports —
 * so the strip reflects what actually ran, not a synthetic countdown.
 */

/** Terminal workflow-execution statuses surfaced on `last_run.status`. */
export type HuntRunTerminalStatus = 'completed' | 'failed' | 'cancelled';

export interface HuntStatusCurrentRun {
  id: string;
  started_at: string;
  /** Step id of the most recently started (non-terminal) step, when known. */
  current_step_id?: string;
  /**
   * Report currently being hunted — taken from the active (or latest)
   * `run_hunt_orchestrator` step's resolved `input.body.report_id`.
   */
  current_report_id?: string;
  /**
   * `content.title` for `current_report_id` when the report is still
   * visible in the space. Prefer this in the strip headline.
   */
  current_report_title?: string;
  /**
   * 1-based index of the report currently in the orchestrator (from
   * foreach `stepExecutionIndex`). Prefer for "Report X of Y" copy.
   */
  current_report_index?: number;
  /** Orchestrator steps that reached a terminal state so far. */
  reports_completed: number;
  /**
   * How many reports this run plans to hunt — length of
   * `load_hunt_candidates` hits (not the ES match total).
   */
  reports_total?: number;
  /**
   * @deprecated Prefer `reports_completed` / `reports_total`. Kept so
   * older clients still render something; counts all terminal workflow
   * steps (including foreach wrappers), which overshoots across cycles.
   */
  completed_steps: number;
  /**
   * @deprecated Prefer `reports_total`. Previous completed run's raw
   * step-execution count — often wrong when candidate batch size differs.
   */
  expected_total_steps?: number;
}

export interface HuntStatusLastRun {
  id: string;
  status: HuntRunTerminalStatus;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  triggered_by?: string;
}

/**
 * Stats scoped to the last completed run's execution window.
 *
 * `new_findings` counts findings first written during the window — the
 * findings writer uses deterministic ids with `op_type: create`, so a
 * re-hunt that rediscovers known behaviors writes nothing and the cycle
 * correctly reads as quiet ("no new findings") rather than re-counting.
 */
export interface HuntStatusCycle {
  /** Reports whose `feedback.last_hunted_at` was stamped inside the window. */
  reports_hunted: number;
  /** Findings first persisted inside the window. */
  new_findings: number;
  /** Of `new_findings`, those with Tier 1 environment corroboration. */
  environment_hits: number;
}

export interface HuntStatusSchedule {
  /** Raw interval from the workflow's scheduled trigger, e.g. `"4h"`. */
  every: string | null;
  /**
   * True only when a scheduled-trigger execution actually fired within
   * the last two intervals — i.e. the cron is demonstrably armed. When
   * false the UI must not fabricate a countdown; it shows on-demand.
   */
  armed: boolean;
  /** Projected next fire time; only set when `armed` is true. */
  next_run_at: string | null;
}

export interface HuntStatusResponse {
  workflow_id: string;
  /** False when the hunt workflow isn't installed — strip renders empty state. */
  workflow_found: boolean;
  current_run: HuntStatusCurrentRun | null;
  last_run: HuntStatusLastRun | null;
  cycle: HuntStatusCycle | null;
  totals: {
    /** All findings visible in this space. */
    findings: number;
    /** Distinct reports those findings cover. */
    reports_with_findings: number;
  };
  /**
   * Hourly counts of findings written over the trailing 24h, oldest
   * bucket first. Always 24 entries; backs the strip's sparkline.
   */
  activity_24h: number[];
  schedule: HuntStatusSchedule;
}
