/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Re-score ARCHIVED watch executions against the current evaluator code.
 *
 * Three of the bugs found while building this suite were in the measurement,
 * not the watch: the verdicts on disk were already correct and a full cell run
 * (~12 minutes) was spent only to re-observe them. Replay closes that loop in
 * seconds by reading `.workflows-executions` and running the same
 * `summarizeDiscrimination` the live suite uses.
 *
 * It deliberately CANNOT validate watch behaviour changes -- it replays fixed
 * outputs. Use it to verify evaluator/metric changes; use a live cell run to
 * verify the watch.
 *
 *   node scripts/replay_outcomes.js --es http://elastic:changeme@localhost:9220
 *   node scripts/replay_outcomes.js --file ./outcomes.json
 */

import { summarizeDiscrimination } from '../src/evaluators';
import type { GateOutcome } from '../src/evaluators';
import { DEEP_WATCH_GOLDEN_ROWS } from '../src/golden_dataset';

interface ArchivedExecution {
  id?: string;
  context?: { output?: { isIncident?: boolean; gate?: string } };
  output?: { isIncident?: boolean; gate?: string };
  /** The alert id the run was started for, used to map back to a golden row. */
  goldenId?: string;
}

/**
 * Map archived executions onto golden rows. Executions are matched by the
 * golden id recorded on the run; unmatched executions are reported rather than
 * silently dropped, because a silent drop is how a partial run masquerades as
 * a complete one.
 */
export const outcomesFromExecutions = (
  executions: ArchivedExecution[]
): { outcomes: GateOutcome[]; unmatched: number } => {
  const outcomes: GateOutcome[] = [];
  let unmatched = 0;

  for (const execution of executions) {
    const output = execution.context?.output ?? execution.output ?? {};
    const row = DEEP_WATCH_GOLDEN_ROWS.find((r) => r.id === execution.goldenId);
    if (!row) {
      unmatched += 1;
      continue;
    }
    outcomes.push({
      id: row.id,
      expectedIncident: row.expectedIncident,
      actualIncident: output.isIncident === true,
      gate: output.gate ?? 'unknown',
    });
  }

  return { outcomes, unmatched };
};

/**
 * Replay a set of archived executions and return the discrimination report
 * plus a human-readable verdict line.
 */
export const replay = (
  executions: ArchivedExecution[]
): { report: ReturnType<typeof summarizeDiscrimination>; unmatched: number } => {
  const { outcomes, unmatched } = outcomesFromExecutions(executions);
  return { report: summarizeDiscrimination(outcomes), unmatched };
};
