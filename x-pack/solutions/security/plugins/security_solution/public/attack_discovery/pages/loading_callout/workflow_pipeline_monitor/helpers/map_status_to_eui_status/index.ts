/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiStepProps } from '@elastic/eui';
import { ExecutionStatus } from '@kbn/workflows';

export const mapStatusToEuiStatus = (status: ExecutionStatus): EuiStepProps['status'] => {
  switch (status) {
    case ExecutionStatus.PENDING:
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
      return 'incomplete';
    case ExecutionStatus.RUNNING:
      return 'loading';
    case ExecutionStatus.COMPLETED:
      return 'complete';
    case ExecutionStatus.FAILED:
    case ExecutionStatus.TIMED_OUT:
      return 'danger';
    case ExecutionStatus.CANCELLED:
    case ExecutionStatus.SKIPPED:
      return 'disabled';
    default:
      return 'incomplete';
  }
};
