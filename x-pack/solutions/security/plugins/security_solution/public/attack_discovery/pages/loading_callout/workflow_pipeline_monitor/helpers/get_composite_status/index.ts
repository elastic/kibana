/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StepExecutionWithLink } from '../../../types';

/**
 * Determines the composite status for a group of sub-steps.
 * RUNNING if any child is running, COMPLETED when all are complete, FAILED if any failed.
 */
export const getCompositeStatus = (subSteps: StepExecutionWithLink[]): ExecutionStatus => {
  if (subSteps.length === 0) {
    return ExecutionStatus.PENDING;
  }

  if (subSteps.some((s) => s.status === ExecutionStatus.RUNNING)) {
    return ExecutionStatus.RUNNING;
  }

  if (subSteps.some((s) => s.status === ExecutionStatus.FAILED)) {
    return ExecutionStatus.FAILED;
  }

  if (subSteps.some((s) => s.status === ExecutionStatus.TIMED_OUT)) {
    return ExecutionStatus.TIMED_OUT;
  }

  if (subSteps.every((s) => s.status === ExecutionStatus.COMPLETED)) {
    return ExecutionStatus.COMPLETED;
  }

  if (subSteps.some((s) => s.status === ExecutionStatus.PENDING)) {
    return ExecutionStatus.PENDING;
  }

  return ExecutionStatus.RUNNING;
};
