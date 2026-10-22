/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActivityEntry,
  BaselineDecision,
  SignalOutcome,
  EngineSignal,
  EngineRunSummary,
} from '../../../common';

/** An activity entry before the recorder stamps the run and the time. */
export type ActivityInput = Omit<ActivityEntry, '@timestamp' | 'run_id'>;

/** Collects what one run did, for the activity log, the signals record and its summary. */
export interface IRunRecorder {
  readonly runId: string;
  readonly summary: EngineRunSummary;
  log(entry: ActivityInput): void;
  /** Records the one outcome a signal gets, and counts it. */
  recordSignal(signal: EngineSignal): void;
  countBaseline(decision: BaselineDecision): void;
  activity(): ActivityEntry[];
  signals(): EngineSignal[];
}

function emptyBaselineCounts(): Record<BaselineDecision, number> {
  return { above_normal: 0, background: 0, warming_up: 0, skipped: 0 };
}

export function createRunRecorder({
  runId,
  trigger,
  startedAt,
}: {
  runId: string;
  trigger: EngineRunSummary['trigger'];
  startedAt: string;
}): IRunRecorder {
  const entries: ActivityEntry[] = [];
  const signals: EngineSignal[] = [];
  const summary: EngineRunSummary = {
    run_id: runId,
    trigger,
    started_at: startedAt,
    finished_at: startedAt,
    strategies: [],
    signals: 0,
    baseline: emptyBaselineCounts(),
    outcomes: {},
    agent: { calls: 0, cooldown_skips: 0, rejected_answers: 0, failures: 0, tokens: 0 },
    transitions: [],
    conflicts: 0,
    open_events: 0,
  };

  return {
    runId,
    summary,
    log(entry) {
      entries.push({ ...entry, run_id: runId, '@timestamp': new Date().toISOString() });
    },
    recordSignal(signal) {
      signals.push(signal);
      const outcome: SignalOutcome = signal.outcome;
      summary.outcomes[outcome] = (summary.outcomes[outcome] ?? 0) + 1;
      summary.signals = signals.length;
    },
    countBaseline(decision) {
      summary.baseline[decision] += 1;
    },
    activity: () => entries,
    signals: () => signals,
  };
}
