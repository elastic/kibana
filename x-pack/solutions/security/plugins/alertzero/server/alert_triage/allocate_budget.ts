/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_COST,
  ALERT_SEVERITIES,
  BATCH_ALERT_CAP,
  BATCH_OVERHEAD_COST,
  MIN_ALERTS_PER_RULE,
  TRIAGE_CACHE_CONFIRM_TAG_PREFIX,
} from './constants';
import type { RuleAllocation, TriageAlert } from './types';

/** The hourly budget scaled to one sweep, so changing the interval keeps the hourly total. */
export const getSweepBudget = (budgetPerHour: number, intervalMinutes: number): number =>
  Math.floor((budgetPerHour * intervalMinutes) / 60);

/** The batch dimension: the rule, plus the detection when the rule overrides its alerts' names. */
export const getBatchKey = ({ ruleId, detection }: TriageAlert): string =>
  detection ? `${ruleId}\u0000${detection}` : ruleId;

/** Risk descending, then oldest first, then id so equal alerts order the same way every time. */
const compareAlerts = (a: TriageAlert, b: TriageAlert): number =>
  b.riskScore - a.riskScore || a.timestamp - b.timestamp || a.id.localeCompare(b.id);

export interface AllocateBudgetParams {
  alerts: readonly TriageAlert[];
  budget: number;
  /** Most rules served, which is the free in-flight slots. */
  maxBatches: number;
  /** The flag `alertzero.triageSeverityFirst`: a rule with a high or critical alert takes a full batch in the first pass. */
  severityFirst?: boolean;
}

const URGENT_SEVERITY_RANK = ALERT_SEVERITIES.indexOf('high');
const isUrgent = (ruleAlerts: readonly TriageAlert[]): boolean =>
  ruleAlerts.some(
    ({ severity }) =>
      ALERT_SEVERITIES.indexOf(severity as (typeof ALERT_SEVERITIES)[number]) >=
      URGENT_SEVERITY_RANK
  );

const confirmsCache = ({ tags }: TriageAlert): boolean =>
  tags.some((tag) => tag.startsWith(TRIAGE_CACHE_CONFIRM_TAG_PREFIX));

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
 *
 * With `severityFirst`, the rules with a high or critical alert come first in pass 1 and take up to `BATCH_ALERT_CAP`, so a
 * busy urgent rule is not held to the share of the quiet lower-severity rules. Within each group the order stays the same.
 *
 * A rule with an alert tagged `az:cache_confirm:` comes next in pass 1 (after the urgent rules, before the rest), and that alert is
 * first in its batch, so its verdict can confirm a pending cache record. Its share stays `MIN_ALERTS_PER_RULE`.
 */
export const allocateBudget = ({
  alerts,
  budget,
  maxBatches,
  severityFirst = false,
}: AllocateBudgetParams): BudgetAllocation => {
  const byRule = new Map<string, TriageAlert[]>();
  for (const alert of alerts) {
    const key = getBatchKey(alert);
    byRule.set(key, [...(byRule.get(key) ?? []), alert]);
  }
  const byUrgency = [...byRule.entries()]
    .map(([key, ruleAlerts]) => {
      const byRisk = [...ruleAlerts].sort(compareAlerts);
      const confirm = byRisk.filter(confirmsCache);
      const firstShare = severityFirst && isUrgent(byRisk) ? BATCH_ALERT_CAP : MIN_ALERTS_PER_RULE;
      return {
        key,
        ruleId: byRisk[0].ruleId,
        ruleName: byRisk[0].ruleName,
        top: byRisk[0],
        alerts: [...confirm, ...byRisk.filter((alert) => !confirmsCache(alert))],
        firstShare,
        confirms: confirm.length > 0,
      };
    })
    .sort((a, b) => compareAlerts(a.top, b.top) || a.key.localeCompare(b.key));
  const isFull = ({ firstShare }: { firstShare: number }) => firstShare === BATCH_ALERT_CAP;
  const rules = [
    ...byUrgency.filter(isFull),
    ...byUrgency.filter((rule) => !isFull(rule) && rule.confirms),
    ...byUrgency.filter((rule) => !isFull(rule) && !rule.confirms),
  ];

  const served: Array<{ ruleId: string; ruleName: string; alerts: TriageAlert[]; take: number }> =
    [];
  let remaining = budget;

  for (const { firstShare, top, confirms, ...rule } of rules) {
    if (served.length >= maxBatches || remaining < BATCH_OVERHEAD_COST + ALERT_COST) break;
    const affordable = Math.floor((remaining - BATCH_OVERHEAD_COST) / ALERT_COST);
    const take = Math.min(firstShare, BATCH_ALERT_CAP, rule.alerts.length, affordable);
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
