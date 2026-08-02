/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndPhaseStepStatus } from '@kbn/pnd-common';

import type { LifecycleRow } from '../../../lifecycle_view';

/**
 * The statuses that mean a live step is behind the loop rather than ahead of it.
 *
 * An answered gate is `completed`, whether a human or the auto-approver resumed it. *How* it was
 * passed is a different question — the record's answered-by line — never a second lifecycle status.
 *
 * `upstream` never counts, and it never needs to: the progress fraction is over the live rows only,
 * and an upstream row is not one. Counting it would claim PND did work Attack Discovery did.
 */
export const LIFECYCLE_PASSED_STATUSES: readonly PndPhaseStepStatus[] = ['completed'];

export interface LifecycleStatusCount {
  count: number;
  status: PndPhaseStepStatus;
}

export interface LifecycleSummary {
  /**
   * The gate the loop is parked on, or failing that the step currently executing — the one fact an
   * analyst opening the overlay wants first. `undefined` when the loop is neither parked nor
   * running, which is the ordinary state of a finished or a not-yet-started discovery alike.
   */
  currentStep?: LifecycleRow;
  /** Live rows whose status is in {@link LIFECYCLE_PASSED_STATUSES}. */
  passedLiveSteps: number;
  /** Every status present, most common first, ties broken by name so renders never reshuffle. */
  statusCounts: readonly LifecycleStatusCount[];
  /** Live rows in total, so {@link LifecycleSummary.passedLiveSteps} reads as a fraction. */
  totalLiveSteps: number;
  /** The distinct workflow runs the projection named, in first-seen order. */
  workflowRunIds: readonly string[];
}

const countStatuses = (rows: readonly LifecycleRow[]): LifecycleStatusCount[] =>
  [
    ...rows.reduce(
      (counts, { status }) => counts.set(status, (counts.get(status) ?? 0) + 1),
      new Map<PndPhaseStepStatus, number>()
    ),
  ]
    .map(([status, count]) => ({ count, status }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));

/**
 * What the Overview tab's summary says about one discovery, derived from the same rows the Lifecycle section
 * renders so the two can never disagree.
 *
 * Everything here is a **fraction of the live rows**, never of every row: the two `upstream` rows
 * record work Attack Discovery did before PND was invoked, and counting them would credit PND with
 * it — or, if they were counted as outstanding instead, would leave every healthy run permanently
 * short of done.
 */
export const summarizeLifecycle = (rows: readonly LifecycleRow[]): LifecycleSummary => {
  const liveRows = rows.filter(({ entry }) => entry.liveness === 'live');

  return {
    currentStep:
      rows.find(({ status }) => status === 'waiting_for_input') ??
      rows.find(({ status }) => status === 'running'),
    passedLiveSteps: liveRows.filter(({ status }) => LIFECYCLE_PASSED_STATUSES.includes(status))
      .length,
    statusCounts: countStatuses(rows),
    totalLiveSteps: liveRows.length,
    workflowRunIds: rows
      .flatMap(({ projection }) => (projection?.workflowRunId ? [projection.workflowRunId] : []))
      .filter((runId, index, all) => all.indexOf(runId) === index),
  };
};
