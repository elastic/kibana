/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceSummary } from './types';

export interface MaintenanceActivityCounts {
  automationsDisabled: number;
  rulesDisabled: number;
}

export const getMaintenanceActivityCounts = (
  summary?: SignificantEventsMaintenanceSummary
): MaintenanceActivityCounts => ({
  automationsDisabled: summary?.workflowsDisabled ?? 0,
  rulesDisabled: summary?.rulesDisabled ?? 0,
});
