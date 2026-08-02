/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { PndRunStatus } from '@kbn/pnd-common';

/**
 * Project a Workflows engine {@link ExecutionStatus} onto the **closed** {@link PndRunStatus}
 * enum the runs list exposes (route-contract decision: `PndRun.status` is a closed enum, never a
 * raw passthrough string). The engine carries more in-progress states than the run card needs, so
 * every non-terminal state that is not an input wait folds to `running`, and a `skipped` execution
 * (a whole-workflow skip) folds to `cancelled`. An unrecognised status fails safe to `running`
 * rather than being mislabelled as a terminal outcome.
 */
export const mapRunStatus = (status: ExecutionStatus | string | undefined): PndRunStatus => {
  switch (status) {
    case ExecutionStatus.WAITING_FOR_INPUT:
      return 'waiting_for_input';
    case ExecutionStatus.COMPLETED:
      return 'succeeded';
    case ExecutionStatus.FAILED:
      return 'failed';
    case ExecutionStatus.CANCELLED:
      return 'cancelled';
    case ExecutionStatus.TIMED_OUT:
      return 'timed_out';
    case ExecutionStatus.SKIPPED:
      return 'cancelled';
    case ExecutionStatus.PENDING:
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_CHILD:
    case ExecutionStatus.RUNNING:
    case ExecutionStatus.QUEUED:
      return 'running';
    default:
      return 'running';
  }
};

/**
 * PND run statuses that are terminal — the run has stopped and an `endedAt`/`reason` may apply.
 */
export const TERMINAL_PND_RUN_STATUSES: readonly PndRunStatus[] = [
  'succeeded',
  'failed',
  'cancelled',
  'timed_out',
];

/** Whether a {@link PndRunStatus} is terminal (stopped) rather than still in-flight. */
export const isTerminalRunStatus = (status: PndRunStatus): boolean =>
  TERMINAL_PND_RUN_STATUSES.includes(status);

/** PND run statuses that are terminal **and** not a success — the only states carrying a `reason`. */
export const isUnsuccessfulTerminalRunStatus = (status: PndRunStatus): boolean =>
  isTerminalRunStatus(status) && status !== 'succeeded';
