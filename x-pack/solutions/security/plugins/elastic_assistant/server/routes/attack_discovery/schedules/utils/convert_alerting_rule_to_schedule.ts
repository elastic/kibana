/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import {
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleParams,
} from '@kbn/elastic-assistant-common';
import { createScheduleExecutionSummary } from './create_schedule_execution_summary';

export const convertAlertingRuleToSchedule = (
  rule: SanitizedRule<AttackDiscoveryScheduleParams>
): AttackDiscoverySchedule => {
  const {
    id,
    name,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
    enabled,
    params,
    schedule,
    actions,
    systemActions,
  } = rule;
  return {
    id,
    name,
    createdBy: createdBy ?? 'elastic',
    updatedBy: updatedBy ?? 'elastic',
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    enabled,
    params,
    schedule,
    actions: [...actions, ...(systemActions ?? [])],
    lastExecution: createScheduleExecutionSummary(rule),
  };
};
