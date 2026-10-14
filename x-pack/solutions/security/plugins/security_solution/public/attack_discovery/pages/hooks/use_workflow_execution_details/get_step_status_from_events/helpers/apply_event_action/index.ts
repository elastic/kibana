/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { StatusesTuple } from '../step_status_utils';
import { getFirstIndex, hasRunningStep, updateAtIndex } from '../step_status_utils';

const STEP_COMPLETE_ACTION = 'step-complete';
const STEP_FAIL_ACTION = 'step-fail';
const STEP_START_ACTION = 'step-start';

export const applyStepStart = (
  statuses: StatusesTuple
): [ExecutionStatus, ExecutionStatus, ExecutionStatus] => {
  if (hasRunningStep(statuses)) {
    return [...statuses];
  }

  const pendingIndex = getFirstIndex(statuses, ExecutionStatus.PENDING);
  if (pendingIndex == null) {
    return [...statuses];
  }

  return updateAtIndex(statuses, pendingIndex, ExecutionStatus.RUNNING);
};

export const applyStepTerminal = (
  statuses: StatusesTuple,
  nextTerminalStatus: ExecutionStatus.COMPLETED | ExecutionStatus.FAILED
): [ExecutionStatus, ExecutionStatus, ExecutionStatus] => {
  const runningIndex = getFirstIndex(statuses, ExecutionStatus.RUNNING);
  if (runningIndex != null) {
    return updateAtIndex(statuses, runningIndex, nextTerminalStatus);
  }

  const pendingIndex = getFirstIndex(statuses, ExecutionStatus.PENDING);
  if (pendingIndex != null) {
    return updateAtIndex(statuses, pendingIndex, nextTerminalStatus);
  }

  return [...statuses];
};

export const applyEventAction = (
  statuses: StatusesTuple,
  eventAction: string
): [ExecutionStatus, ExecutionStatus, ExecutionStatus] => {
  if (eventAction === STEP_START_ACTION) {
    return applyStepStart(statuses);
  }

  if (eventAction === STEP_COMPLETE_ACTION) {
    return applyStepTerminal(statuses, ExecutionStatus.COMPLETED);
  }

  if (eventAction === STEP_FAIL_ACTION) {
    return applyStepTerminal(statuses, ExecutionStatus.FAILED);
  }

  return [...statuses];
};
