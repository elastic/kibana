/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const formatAlertsLabel = (count: number, approximate: boolean): string => {
  const base = i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.workflowPipelineMonitor.alertsCountBadge',
    {
      defaultMessage: '{count}{approx} {count, plural, one {alert} other {alerts}}',
      values: { approx: approximate ? '+' : '', count },
    }
  );

  return base;
};

/** Returns a badge label like "75 alerts" for a single workflow, or null if count is unknown */
export const getAlertsCountBadgeLabel = (count: number | null): string | null => {
  if (count == null) {
    return null;
  }

  return formatAlertsLabel(count, false);
};

/** Returns a combined badge label like "75 alerts" or "75+ alerts", or null if no numeric counts */
export const getCombinedAlertsCountBadgeLabel = (counts: (number | null)[]): string | null => {
  const numericCounts = counts.filter((c): c is number => c != null);

  if (numericCounts.length === 0) {
    return null;
  }

  const total = numericCounts.reduce((sum, c) => sum + c, 0);
  const hasUnknown = counts.some((c) => c == null);

  return formatAlertsLabel(total, hasUnknown);
};
