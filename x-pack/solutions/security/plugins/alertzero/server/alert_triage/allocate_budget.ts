/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_COST, BATCH_ALERT_CAP, BATCH_OVERHEAD_COST, MIN_ALERTS_PER_RULE } from './constants';
import type { RuleAllocation, TriageAlert } from './types';

/** The hourly budget scaled to one sweep, so changing the interval keeps the hourly total. */
export const getSweepBudget = (budgetPerHour: number, intervalMinutes: number): number =>
  Math.floor((budgetPerHour * intervalMinutes) / 60);

/** Risk descending, then oldest first, then id so equal alerts order the same way every time. */
const compareAlerts = (a: TriageAlert, b: TriageAlert): number =>
  b.riskScore - a.riskScore || a.timestamp - b.timestamp || a.id.localeCompare(b.id);

export interface AllocateBudgetParams {
  alerts: readonly TriageAlert[];
  budget: number;
  /** Most rules served, which is the free in-flight slots. */
  maxBatches: number;
}

export interface BudgetAllocation {
  batches: RuleAllocation[];
  cost: number;
}

/**
 * Fair split of a sweep's budget across rules, one batch per rule.
 *
 * Pass 1 gives each served rule up to `MIN_ALERTS_PER_RULE`, most urgent rule first, so a rule with
 * a large backlog cannot starve the quiet ones. Pass 2 tops the served rules up round-robin, one
 * alert at a time, until each reaches `BATCH_ALERT_CAP` or the budget runs out.
 */
export const allocateBudget = ({
  alerts,
  budget,
  maxBatches,
}: AllocateBudgetParams): BudgetAllocation => {
  const byRule = new Map<string, TriageAlert[]>();
  for (const alert of alerts) {
    byRule.set(alert.ruleId, [...(byRule.get(alert.ruleId) ?? []), alert]);
  }
  const rules = [...byRule.entries()]
    .map(([ruleId, ruleAlerts]) => {
      const sorted = [...ruleAlerts].sort(compareAlerts);
      return { ruleId, ruleName: sorted[0].ruleName, alerts: sorted };
    })
    .sort((a, b) => compareAlerts(a.alerts[0], b.alerts[0]) || a.ruleId.localeCompare(b.ruleId));

  const served: Array<{ ruleId: string; ruleName: string; alerts: TriageAlert[]; take: number }> =
    [];
  let remaining = budget;

  for (const rule of rules) {
    if (served.length >= maxBatches || remaining < BATCH_OVERHEAD_COST + ALERT_COST) break;
    const affordable = Math.floor((remaining - BATCH_OVERHEAD_COST) / ALERT_COST);
    const take = Math.min(MIN_ALERTS_PER_RULE, BATCH_ALERT_CAP, rule.alerts.length, affordable);
    served.push({ ...rule, take });
    remaining -= BATCH_OVERHEAD_COST + take * ALERT_COST;
  }

  let grew = true;
  while (grew && remaining >= ALERT_COST) {
    grew = false;
    for (const entry of served) {
      if (remaining < ALERT_COST) break;
      if (entry.take < Math.min(BATCH_ALERT_CAP, entry.alerts.length)) {
        entry.take += 1;
        remaining -= ALERT_COST;
        grew = true;
      }
    }
  }

  return {
    batches: served.map(({ ruleId, ruleName, alerts: ruleAlerts, take }) => ({
      ruleId,
      ruleName,
      alerts: ruleAlerts.slice(0, take),
    })),
    cost: budget - remaining,
  };
};
