/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepExecutionWithLink } from '../../../types';

/**
 * Calculates the execution time in milliseconds for a step.
 *
 * For completed steps, prefers `executionTimeMs` from the API.
 * Falls back to calculating from `startedAt` and `finishedAt` timestamps
 * if `executionTimeMs` is not available (handles API inconsistencies).
 */
export const getStepExecutionTime = (step: StepExecutionWithLink): number | undefined => {
  if (step.executionTimeMs != null && step.executionTimeMs > 0) {
    return step.executionTimeMs;
  }

  if (step.startedAt && step.finishedAt) {
    const startTime = new Date(step.startedAt).getTime();
    const endTime = new Date(step.finishedAt).getTime();

    if (!Number.isNaN(startTime) && !Number.isNaN(endTime)) {
      const duration = endTime - startTime;

      return duration > 0 ? duration : undefined;
    }
  }

  return undefined;
};
