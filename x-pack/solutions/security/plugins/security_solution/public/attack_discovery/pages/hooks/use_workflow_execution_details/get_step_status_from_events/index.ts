/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import { applyEventAction } from './helpers/apply_event_action';
import { toStepStatus } from './helpers/step_status_utils';
import type { StatusesTuple } from './helpers/step_status_utils';

export interface StepStatus {
  alertRetrieval: ExecutionStatus;
  generation: ExecutionStatus;
  validation: ExecutionStatus;
}

const DEFAULT_STATUSES: StatusesTuple = [
  ExecutionStatus.PENDING,
  ExecutionStatus.PENDING,
  ExecutionStatus.PENDING,
];

/**
 * Infers the status of each Attack Discovery workflow step based on the observed list of
 * workflow `event.action` values.
 *
 * The workflow execution engine emits generic step lifecycle actions (e.g. `step-start`,
 * `step-complete`, `step-fail`). This helper maps them onto the Attack Discovery pipeline's
 * three linear steps in order:
 *
 * 1. Alert retrieval
 * 2. Generation
 * 3. Validation
 */
export const getStepStatusFromEvents = (eventActions: string[]): StepStatus => {
  const statuses = eventActions.reduce<[ExecutionStatus, ExecutionStatus, ExecutionStatus]>(
    (current, eventAction) => applyEventAction(current, eventAction),
    [...DEFAULT_STATUSES]
  );

  return toStepStatus(statuses);
};
