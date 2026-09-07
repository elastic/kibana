/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { isTerminalStatus } from '@kbn/workflows/types/utils';

export const getAggregatedStatus = (executions: WorkflowExecutionDto[]): ExecutionStatus => {
  const statuses = executions.map((execution) => execution.status);

  if (statuses.length === 0) {
    return ExecutionStatus.PENDING;
  }

  if (statuses.some((status) => !isTerminalStatus(status))) {
    return ExecutionStatus.RUNNING;
  }

  if (statuses.some((status) => status === ExecutionStatus.FAILED)) {
    return ExecutionStatus.FAILED;
  }

  if (statuses.some((status) => status === ExecutionStatus.CANCELLED)) {
    return ExecutionStatus.CANCELLED;
  }

  if (statuses.some((status) => status === ExecutionStatus.TIMED_OUT)) {
    return ExecutionStatus.TIMED_OUT;
  }

  if (statuses.some((status) => status === ExecutionStatus.SKIPPED)) {
    return ExecutionStatus.SKIPPED;
  }

  if (statuses.every((status) => status === ExecutionStatus.COMPLETED)) {
    return ExecutionStatus.COMPLETED;
  }

  return ExecutionStatus.RUNNING;
};
