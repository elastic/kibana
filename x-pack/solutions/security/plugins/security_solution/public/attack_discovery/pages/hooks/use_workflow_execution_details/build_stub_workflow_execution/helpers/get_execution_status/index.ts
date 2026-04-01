/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import type { AttackDiscoveryGenerationStatus } from '../..';

export const getExecutionStatus = (
  status: AttackDiscoveryGenerationStatus | undefined
): ExecutionStatus => {
  switch (status) {
    case 'failed':
      return ExecutionStatus.FAILED;
    case 'canceled':
      return ExecutionStatus.CANCELLED;
    case 'dismissed':
      return ExecutionStatus.CANCELLED;
    case 'succeeded':
      return ExecutionStatus.COMPLETED;
    case 'started':
      return ExecutionStatus.RUNNING;
    default:
      return ExecutionStatus.PENDING;
  }
};
