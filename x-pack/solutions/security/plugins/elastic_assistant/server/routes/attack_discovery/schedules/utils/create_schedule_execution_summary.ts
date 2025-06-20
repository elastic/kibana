/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import {
  AttackDiscoveryScheduleExecution,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';

export const createScheduleExecutionSummary = (
  rule: SanitizedRule<AttackDiscoveryScheduleParams>
): AttackDiscoveryScheduleExecution | undefined => {
  const { executionStatus } = rule;
  if (executionStatus.status === 'pending') {
    return undefined;
  }
  return {
    date: executionStatus.lastExecutionDate.toISOString(),
    status: executionStatus.status,
    duration: executionStatus.lastDuration,
    message: executionStatus.error?.message ?? executionStatus.warning?.message ?? '',
  };
};
