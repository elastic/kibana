/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TriageAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  riskScore: number;
  /** Alert creation time, epoch milliseconds. */
  timestamp: number;
  status: string;
  tags: readonly string[];
}

export interface RuleAllocation {
  ruleId: string;
  ruleName: string;
  alerts: readonly TriageAlert[];
}

export type SweepSkipReason =
  | 'none'
  | 'tm_behind'
  | 'tm_unknown'
  | 'live_batches_unreadable'
  | 'in_flight_ceiling'
  | 'nothing_pending';

export type HeadroomResult =
  | { status: 'ok'; inFlight: number; slots: number }
  | { status: 'behind'; lagMs: number }
  | { status: 'unknown' };

export interface SweepNumbers {
  pendingAlerts: number;
  staleAlerts: number;
  claimedAlerts: number;
  reclaimedAlerts: number;
  liveBatches: number;
  plannedBatches: number;
  plannedAlerts: number;
  sweepBudget: number;
  plannedCost: number;
}

export interface SweepPlan {
  skipReason: SweepSkipReason;
  batches: readonly RuleAllocation[];
  /** Alerts to tag `az:triage_stale`. */
  staleAlertIds: readonly string[];
  /** Alerts whose claim and execution tags are removed because their batch is no longer live. */
  reclaimAlertIds: readonly string[];
  numbers: SweepNumbers;
}
