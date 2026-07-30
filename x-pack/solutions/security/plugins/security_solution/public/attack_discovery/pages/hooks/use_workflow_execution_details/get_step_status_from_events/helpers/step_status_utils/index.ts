/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StepStatus } from '../..';

export type StatusesTuple = Readonly<[ExecutionStatus, ExecutionStatus, ExecutionStatus]>;

export type StepIndex = 0 | 1 | 2;

export const toStepStatus = (statuses: StatusesTuple): StepStatus => {
  return {
    alertRetrieval: statuses[0],
    generation: statuses[1],
    validation: statuses[2],
  };
};

export const hasRunningStep = (statuses: ReadonlyArray<ExecutionStatus>): boolean => {
  return statuses.includes(ExecutionStatus.RUNNING);
};

export const getFirstIndex = (
  statuses: ReadonlyArray<ExecutionStatus>,
  status: ExecutionStatus
): StepIndex | null => {
  const index = statuses.findIndex((current) => current === status);

  if (index < 0) {
    return null;
  }

  if (index === 0 || index === 1 || index === 2) {
    return index;
  }

  return null;
};

export const updateAtIndex = (
  statuses: StatusesTuple,
  index: StepIndex,
  next: ExecutionStatus
): [ExecutionStatus, ExecutionStatus, ExecutionStatus] => {
  return statuses.map((status, i) => {
    if (i === index) {
      return next;
    }

    return status;
  }) as [ExecutionStatus, ExecutionStatus, ExecutionStatus];
};
