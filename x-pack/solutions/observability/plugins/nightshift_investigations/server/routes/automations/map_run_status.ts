/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

export type AutomationRunStatus = 'succeeded' | 'running' | 'failed' | 'skipped';

export const mapRunStatus = (status: ExecutionStatus): AutomationRunStatus => {
  if (status === ExecutionStatus.COMPLETED) return 'succeeded';
  if (status === ExecutionStatus.SKIPPED) return 'skipped';
  if (
    status === ExecutionStatus.PENDING ||
    status === ExecutionStatus.WAITING ||
    status === ExecutionStatus.WAITING_FOR_INPUT ||
    status === ExecutionStatus.WAITING_FOR_CHILD ||
    status === ExecutionStatus.RUNNING ||
    status === ExecutionStatus.QUEUED
  ) {
    return 'running';
  }
  return 'failed';
};
