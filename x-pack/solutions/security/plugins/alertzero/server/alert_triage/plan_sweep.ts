/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSweepBudget } from './allocate_budget';
import { TAG_CHUNK_SIZE, TRIAGE_EXEC_TAG_PREFIX, TRIAGE_PENDING_TAG } from './constants';
import { getExecutionIds, planBatches } from './plan_batches';
import { selectPendingAlerts } from './select_pending_alerts';
import type { HeadroomResult, SweepNumbers, SweepPlan, TriageAlert } from './types';

const HOUR_MS = 60 * 60 * 1000;

export interface TagAlertsParams {
  alertIds: string[];
  add: string[];
  remove: string[];
}

export interface SweepPorts {
  readHeadroom: () => Promise<HeadroomResult>;
  fetchAlerts: () => Promise<TriageAlert[]>;
  /** Undefined when the live batches could not be read. */
  listLiveExecutionIds: () => Promise<ReadonlySet<string> | undefined>;
  tagAlerts: (params: TagAlertsParams) => Promise<void>;
}

export interface SweepConfig {
  now: number;
  budgetPerHour: number;
  intervalMinutes: number;
  lookbackHours: number;
  analysisTagPrefix: string;
}

const EMPTY_NUMBERS: SweepNumbers = {
  pendingAlerts: 0,
  staleAlerts: 0,
  claimedAlerts: 0,
  reclaimedAlerts: 0,
  liveBatches: 0,
  plannedBatches: 0,
  plannedAlerts: 0,
  sweepBudget: 0,
  plannedCost: 0,
};

const chunk = <T>(items: readonly T[]): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += TAG_CHUNK_SIZE) {
    chunks.push(items.slice(i, i + TAG_CHUNK_SIZE));
  }
  return chunks;
};

export const tagInChunks = async (
  tagAlerts: SweepPorts['tagAlerts'],
  { alertIds, add, remove }: TagAlertsParams
): Promise<void> => {
  for (const ids of chunk(alertIds)) {
    await tagAlerts({ alertIds: ids, add, remove });
  }
};

/** Removes the claim and each alert's own execution tags, grouped so equal tag sets share a call. */
const releaseClaims = async (
  tagAlerts: SweepPorts['tagAlerts'],
  alerts: readonly TriageAlert[]
): Promise<void> => {
  const byTags = new Map<string, TriageAlert[]>();
  for (const alert of alerts) {
    const remove = [
      TRIAGE_PENDING_TAG,
      ...getExecutionIds(alert).map((id) => `${TRIAGE_EXEC_TAG_PREFIX}${id}`),
    ];
    const key = remove.join('\n');
    byTags.set(key, [...(byTags.get(key) ?? []), alert]);
  }
  for (const [key, group] of byTags) {
    await tagInChunks(tagAlerts, {
      alertIds: group.map(({ id }) => id),
      add: [],
      remove: key.split('\n'),
    });
  }
};

/**
 * One sweep's planning pass: checks headroom, reclaims dead claims, picks the batches and claims
 * their alerts with `az:triage_pending`. Starting the batches and recording their execution ids is
 * the caller's job. The sweep is the only writer of claims in a space, so no claim is contended.
 */
export const planSweep = async (ports: SweepPorts, config: SweepConfig): Promise<SweepPlan> => {
  const sweepBudget = getSweepBudget(config.budgetPerHour, config.intervalMinutes);
  const skipped = (skipReason: SweepPlan['skipReason']): SweepPlan => ({
    skipReason,
    batches: [],
    staleAlertIds: [],
    reclaimAlertIds: [],
    numbers: { ...EMPTY_NUMBERS, sweepBudget },
  });

  const headroom = await ports.readHeadroom();
  if (headroom.status === 'behind') return skipped('tm_behind');
  if (headroom.status === 'unknown') return skipped('tm_unknown');

  const [alerts, liveExecutionIds] = await Promise.all([
    ports.fetchAlerts(),
    ports.listLiveExecutionIds(),
  ]);
  const selected = selectPendingAlerts({
    alerts,
    now: config.now,
    lookbackHours: config.lookbackHours,
    analysisTagPrefix: config.analysisTagPrefix,
  });
  const plan = planBatches({
    pending: selected.pending,
    claimed: selected.claimed,
    liveExecutionIds,
    headroomSlots: headroom.slots,
    budget: sweepBudget,
    lookbackCutoff: config.now - config.lookbackHours * HOUR_MS,
  });

  const reclaimIds = new Set(plan.reclaimAlertIds);
  await releaseClaims(
    ports.tagAlerts,
    selected.claimed.filter(({ id }) => reclaimIds.has(id))
  );
  await tagInChunks(ports.tagAlerts, {
    alertIds: plan.batches.flatMap(({ alerts: batchAlerts }) => batchAlerts.map(({ id }) => id)),
    add: [TRIAGE_PENDING_TAG],
    remove: [],
  });

  const staleAlertIds = [...selected.stale.map(({ id }) => id), ...plan.staleAlertIds];
  return {
    skipReason: plan.skipReason,
    batches: plan.batches,
    staleAlertIds,
    reclaimAlertIds: plan.reclaimAlertIds,
    numbers: {
      pendingAlerts: selected.pending.length,
      staleAlerts: staleAlertIds.length,
      claimedAlerts: selected.claimed.length,
      reclaimedAlerts: plan.reclaimAlertIds.length,
      liveBatches: plan.liveBatches,
      plannedBatches: plan.batches.length,
      plannedAlerts: plan.batches.reduce((sum, { alerts: a }) => sum + a.length, 0),
      sweepBudget,
      plannedCost: plan.plannedCost,
    },
  };
};
