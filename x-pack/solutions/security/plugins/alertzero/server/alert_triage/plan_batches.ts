/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allocateBudget } from './allocate_budget';
import { IN_FLIGHT_CEILING, TRIAGE_EXEC_TAG_PREFIX } from './constants';
import type { RuleAllocation, SweepSkipReason, TriageAlert } from './types';

export const getExecutionIds = (alert: TriageAlert): string[] =>
  alert.tags
    .filter((tag) => tag.startsWith(TRIAGE_EXEC_TAG_PREFIX))
    .map((tag) => tag.slice(TRIAGE_EXEC_TAG_PREFIX.length));

export interface PlanBatchesParams {
  pending: readonly TriageAlert[];
  claimed: readonly TriageAlert[];
  /** Ids of the batch executions that are running or queued, or undefined if they could not be read. */
  liveExecutionIds: ReadonlySet<string> | undefined;
  /** Free in-flight slots according to headroom. */
  headroomSlots: number;
  budget: number;
  /** Alerts created before this (epoch ms) are outside the look-back and are not planned. */
  lookbackCutoff: number;
}

export interface BatchPlan {
  skipReason: SweepSkipReason;
  batches: RuleAllocation[];
  reclaimAlertIds: string[];
  liveBatches: number;
  plannedCost: number;
}

/**
 * Decides which rules get a batch. A claimed alert links its rule to a batch through its
 * `az:triage_exec:<id>` tag, so a rule is live if any of its claimed alerts names a live execution.
 * A claim whose batch is gone, or that never recorded one, is reclaimed and the alert re-planned.
 * Nothing is reclaimed when the live list could not be read, because every claim would look stale.
 */
export const planBatches = ({
  pending,
  claimed,
  liveExecutionIds,
  headroomSlots,
  budget,
  lookbackCutoff,
}: PlanBatchesParams): BatchPlan => {
  if (liveExecutionIds === undefined) {
    return {
      skipReason: 'live_batches_unreadable',
      batches: [],
      reclaimAlertIds: [],
      liveBatches: 0,
      plannedCost: 0,
    };
  }

  const liveRuleIds = new Set<string>();
  const reclaimAlertIds: string[] = [];
  const reclaimedInWindow: TriageAlert[] = [];
  for (const alert of claimed) {
    if (getExecutionIds(alert).some((id) => liveExecutionIds.has(id))) {
      liveRuleIds.add(alert.ruleId);
      continue;
    }
    reclaimAlertIds.push(alert.id);
    if (alert.timestamp >= lookbackCutoff) reclaimedInWindow.push(alert);
  }

  const base = {
    reclaimAlertIds,
    liveBatches: liveExecutionIds.size,
    batches: [],
    plannedCost: 0,
  };

  const maxBatches = Math.min(headroomSlots, IN_FLIGHT_CEILING - liveExecutionIds.size);
  if (maxBatches <= 0) {
    return { ...base, skipReason: 'in_flight_ceiling' };
  }

  const candidates = [...pending, ...reclaimedInWindow].filter(
    ({ ruleId }) => !liveRuleIds.has(ruleId)
  );
  if (candidates.length === 0) {
    return { ...base, skipReason: 'nothing_pending' };
  }

  const { batches, cost } = allocateBudget({ alerts: candidates, budget, maxBatches });
  return {
    ...base,
    skipReason: batches.length === 0 ? 'nothing_pending' : 'none',
    batches,
    plannedCost: cost,
  };
};
