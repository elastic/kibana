/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { PndPhaseStepStatus } from '@kbn/pnd-common';

/**
 * Project a Workflows engine {@link ExecutionStatus} for a single **step** execution onto the
 * closed {@link PndPhaseStepStatus} enum the four-phase projection exposes. The engine carries more
 * in-progress states than the flyout needs, so every non-terminal state that is not an input wait
 * folds to `running`; a cancelled or engine-`skipped` step folds to `skipped`; a timeout folds to
 * `failed`. An unrecognised status of a step that has an execution record fails safe to `running`
 * rather than being mislabelled as a terminal outcome — a `not_started` status is reserved for a
 * live catalog step that has **no** execution record at all (handled by the caller).
 */
export const mapStepStatus = (status: ExecutionStatus | string | undefined): PndPhaseStepStatus => {
  switch (status) {
    case ExecutionStatus.WAITING_FOR_INPUT:
      return 'waiting_for_input';
    case ExecutionStatus.COMPLETED:
      return 'completed';
    case ExecutionStatus.FAILED:
      return 'failed';
    case ExecutionStatus.TIMED_OUT:
      return 'failed';
    case ExecutionStatus.CANCELLED:
      return 'skipped';
    case ExecutionStatus.SKIPPED:
      return 'skipped';
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
