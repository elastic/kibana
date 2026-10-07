/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import type { SignificantEventsMaintenanceStatus } from '@kbn/significant-events-plugin/common';
import { getMaintenanceActivityCounts } from '@kbn/significant-events-plugin/common';

/**
 * Uses maintenance snapshot counts as-is while paused. After resume the API
 * zeros `lastSummary` disabled counts even though deployment inventory is
 * unchanged; keep the last paused snapshot for display until a new pause refresh.
 */
export function useMaintenanceActivityCounts(
  status: SignificantEventsMaintenanceStatus | undefined
): { automationCount: number; ruleCount: number } {
  const preservedCounts = useRef({ automationCount: 0, ruleCount: 0 });

  if (!status) {
    return { automationCount: 0, ruleCount: 0 };
  }

  const counts = getMaintenanceActivityCounts(status);

  if (status.state === 'paused') {
    preservedCounts.current = counts;
    return counts;
  }

  if (preservedCounts.current.automationCount > 0 || preservedCounts.current.ruleCount > 0) {
    return preservedCounts.current;
  }

  return counts;
}
