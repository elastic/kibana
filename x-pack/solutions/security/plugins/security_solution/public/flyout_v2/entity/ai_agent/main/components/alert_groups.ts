/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentAlert } from '../../../../../entity_analytics/components/ai_security/types';

const SEVERITY_ORDER: readonly string[] = ['critical', 'high', 'medium', 'low'];

/** Alerts that share a rule name. */
export interface AlertGroup {
  readonly key: string;
  readonly ruleName?: string;
  readonly count: number;
  /** The highest severity in the group. */
  readonly severity?: string;
  /** The group opens this alert, and shows its process and status. */
  readonly newest: AgentAlert;
}

const severityRank = (severity: string | undefined): number => {
  const rank = SEVERITY_ORDER.indexOf(severity?.toLowerCase() ?? '');
  return rank === -1 ? SEVERITY_ORDER.length : rank;
};

/** Groups alerts by rule, worst severity first, then the newest alert first. */
export const groupAlertsByRule = (alerts: readonly AgentAlert[]): AlertGroup[] => {
  const groups = new Map<string, AlertGroup>();
  for (const alert of alerts) {
    const key = alert.ruleName ?? alert.id;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        key,
        ruleName: alert.ruleName,
        count: 1,
        severity: alert.severity,
        newest: alert,
      });
    } else {
      groups.set(key, {
        ...group,
        count: group.count + 1,
        severity:
          severityRank(alert.severity) < severityRank(group.severity)
            ? alert.severity
            : group.severity,
        newest: alert.timestamp > group.newest.timestamp ? alert : group.newest,
      });
    }
  }
  return [...groups.values()].sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      b.newest.timestamp.localeCompare(a.newest.timestamp)
  );
};

/** Alert counts per severity in a fixed order (critical, high, medium, low), then any others. */
export const countBySeverity = (
  alerts: readonly AgentAlert[]
): ReadonlyArray<readonly [string, number]> => {
  const counts = new Map<string, number>();
  for (const alert of alerts) {
    const severity = alert.severity?.toLowerCase() ?? 'unknown';
    counts.set(severity, (counts.get(severity) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => severityRank(a) - severityRank(b));
};
