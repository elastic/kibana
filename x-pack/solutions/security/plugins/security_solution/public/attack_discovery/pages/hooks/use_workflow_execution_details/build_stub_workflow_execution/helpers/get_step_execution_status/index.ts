/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import { getStepStatusFromEvents } from '../../../get_step_status_from_events';

const FIRST_STEP_ID = 'retrieve_alerts';

export const getStepExecutionStatus = ({
  eventActions,
  fallbackStatus,
  stepId,
}: {
  eventActions: string[] | null | undefined;
  fallbackStatus: ExecutionStatus;
  stepId: string;
}): ExecutionStatus => {
  if (!eventActions || eventActions.length === 0) {
    if (fallbackStatus === ExecutionStatus.RUNNING) {
      return stepId === FIRST_STEP_ID ? ExecutionStatus.RUNNING : ExecutionStatus.PENDING;
    }

    return fallbackStatus;
  }

  const stepStatus = getStepStatusFromEvents(eventActions);

  if (stepId === 'retrieve_alerts') {
    return stepStatus.alertRetrieval;
  }

  if (stepId === 'generate_discoveries') {
    return stepStatus.generation;
  }

  if (stepId === 'validate_discoveries') {
    return stepStatus.validation;
  }

  return fallbackStatus;
};
