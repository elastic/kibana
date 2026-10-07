/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantEventsMaintenanceStatus,
  SignificantEventsMaintenanceSummary,
} from './types';

/** Reads automation / rule counts from the maintenance status snapshot. */
export function getMaintenanceActivityCounts(
  status: SignificantEventsMaintenanceStatus
): { automationCount: number; ruleCount: number } {
  return getMaintenanceActivityCountsFromSummary(status.lastSummary);
}

export function getMaintenanceActivityCountsFromSummary(
  lastSummary: SignificantEventsMaintenanceSummary | undefined
): { automationCount: number; ruleCount: number } {
  return {
    automationCount: lastSummary?.workflowsDisabled ?? 0,
    ruleCount: lastSummary?.rulesDisabled ?? 0,
  };
}
