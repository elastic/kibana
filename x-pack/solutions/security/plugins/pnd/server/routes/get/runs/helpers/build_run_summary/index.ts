/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndRunStatus } from '@kbn/pnd-common';

/** Upper bound on the composed summary, matching the `PndRun.summary` contract (`max(4096)`). */
export const RUN_SUMMARY_MAX_LENGTH = 4096;

export interface BuildRunSummaryParams {
  /** Attack Discovery alert id the run was triggered for; empty when uncorrelated. */
  correlationId: string;
  /** Number of HITL gates currently awaiting a human decision on this run. */
  pendingGateCount: number;
  /** Failure/cancellation reason when terminal and unsuccessful. */
  reason?: string;
  /** Closed run status. */
  status: PndRunStatus;
}

/**
 * Compose a best-effort, human-readable headline for a run card, server-side. PND has no per-run
 * count fields to hand the client the way Attack Discovery 2.0 ships alert/connector counts, so
 * (mirroring AD's `RAN_SUCCESSFULLY_VIA_WITH_SUMMARY` shape) the sentence is assembled here from the
 * run's status, its correlated discovery, its pending-gate count and any failure reason. The result
 * is clamped to {@link RUN_SUMMARY_MAX_LENGTH} so it always satisfies the `PndRun.summary` bound.
 */
export const buildRunSummary = ({
  correlationId,
  pendingGateCount,
  reason,
  status,
}: BuildRunSummaryParams): string => {
  const forDiscovery = correlationId ? ` for Attack Discovery ${correlationId}` : '';

  const sentence = (() => {
    switch (status) {
      case 'succeeded':
        return `Ran successfully${forDiscovery}.`;
      case 'running':
        return `Running${forDiscovery}.`;
      case 'waiting_for_input':
        return pendingGateCount > 0
          ? `Waiting on ${pendingGateCount} human decision${
              pendingGateCount === 1 ? '' : 's'
            }${forDiscovery}.`
          : `Waiting for input${forDiscovery}.`;
      case 'failed':
        return reason ? `Run failed${forDiscovery}: ${reason}` : `Run failed${forDiscovery}.`;
      case 'cancelled':
        return `Run was cancelled${forDiscovery}.`;
      case 'timed_out':
        return `Run timed out${forDiscovery}.`;
    }
  })();

  return sentence.slice(0, RUN_SUMMARY_MAX_LENGTH);
};
