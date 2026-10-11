/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_COST,
  BATCH_OVERHEAD_COST,
  IN_FLIGHT_CEILING,
  TRIAGE_EXEC_TAG_PREFIX,
  TRIAGE_PENDING_TAG,
} from './constants';
import { getExecutionIds, planBatches, type PlanBatchesParams } from './plan_batches';
import { HOUR_MS, NOW, makeAlert, makeAlerts } from './test_helpers';

const LOOKBACK_CUTOFF = NOW - 24 * HOUR_MS;

const claimedBy = (executionId: string | undefined, ruleId: string) =>
  makeAlert({
    ruleId,
    tags: [TRIAGE_PENDING_TAG, ...(executionId ? [`${TRIAGE_EXEC_TAG_PREFIX}${executionId}`] : [])],
  });

const plan = (overrides: Partial<PlanBatchesParams> = {}) =>
  planBatches({
    pending: [],
    claimed: [],
    liveExecutionIds: new Set(),
    headroomSlots: IN_FLIGHT_CEILING,
    budget: 1_000,
    lookbackCutoff: LOOKBACK_CUTOFF,
    ...overrides,
  });

describe('getExecutionIds', () => {
  it('reads the execution ids off the execution tags and ignores every other tag', () => {
    const alert = makeAlert({
      tags: [
        TRIAGE_PENDING_TAG,
        `${TRIAGE_EXEC_TAG_PREFIX}exec-1`,
        'unrelated',
        `${TRIAGE_EXEC_TAG_PREFIX}exec-2`,
      ],
    });

    expect(getExecutionIds(alert)).toEqual(['exec-1', 'exec-2']);
  });

  it('returns nothing for an alert that never recorded an execution', () => {
    expect(getExecutionIds(makeAlert({ tags: [TRIAGE_PENDING_TAG] }))).toEqual([]);
  });
});

describe('planBatches', () => {
  describe('when the live batches cannot be read', () => {
    it('plans and reclaims nothing, because every claim would look stale', () => {
      const result = plan({
        liveExecutionIds: undefined,
        pending: makeAlerts(3, { ruleId: 'rule-a' }),
        claimed: [claimedBy('exec-1', 'rule-b')],
      });

      expect(result).toEqual({
        skipReason: 'live_batches_unreadable',
        batches: [],
        reclaimAlertIds: [],
        liveBatches: 0,
        plannedCost: 0,
      });
    });
  });

  describe('linking claimed alerts to live batches', () => {
    it('does not plan a second batch for a rule whose claimed alert names a live execution', () => {
      const result = plan({
        liveExecutionIds: new Set(['exec-1']),
        claimed: [claimedBy('exec-1', 'busy')],
        pending: [...makeAlerts(5, { ruleId: 'busy' }), ...makeAlerts(2, { ruleId: 'quiet' })],
      });

      expect(result.batches.map(({ ruleId }) => ruleId)).toEqual(['quiet']);
      expect(result.reclaimAlertIds).toEqual([]);
      expect(result.liveBatches).toBe(1);
    });

    it('treats a rule as live when only one of its claimed alerts names a live execution', () => {
      const result = plan({
        liveExecutionIds: new Set(['exec-live']),
        claimed: [claimedBy('exec-gone', 'rule-a'), claimedBy('exec-live', 'rule-a')],
        pending: makeAlerts(3, { ruleId: 'rule-a' }),
      });

      expect(result.batches).toEqual([]);
      expect(result.skipReason).toBe('nothing_pending');
    });

    it('reclaims a claim whose batch is gone and plans its rule again', () => {
      const stale = claimedBy('exec-gone', 'rule-a');

      const result = plan({ claimed: [stale] });

      expect(result.reclaimAlertIds).toEqual([stale.id]);
      expect(result.batches.map(({ ruleId }) => ruleId)).toEqual(['rule-a']);
      expect(result.batches[0].alerts).toEqual([stale]);
    });

    it('reclaims a claim that never recorded an execution, as after a crash between claim and start', () => {
      const orphan = claimedBy(undefined, 'rule-a');

      const result = plan({ claimed: [orphan] });

      expect(result.reclaimAlertIds).toEqual([orphan.id]);
      expect(result.batches[0].alerts).toEqual([orphan]);
    });

    it('releases a stale claim that aged out of the look-back without planning it again', () => {
      const agedOut = makeAlert({
        ruleId: 'rule-a',
        timestamp: LOOKBACK_CUTOFF - 1,
        tags: [TRIAGE_PENDING_TAG],
      });

      const result = plan({ claimed: [agedOut] });

      expect(result.reclaimAlertIds).toEqual([agedOut.id]);
      expect(result.batches).toEqual([]);
      expect(result.skipReason).toBe('nothing_pending');
    });

    it('plans a stale claim exactly at the look-back cutoff', () => {
      const atCutoff = makeAlert({
        ruleId: 'rule-a',
        timestamp: LOOKBACK_CUTOFF,
        tags: [TRIAGE_PENDING_TAG],
      });

      const result = plan({ claimed: [atCutoff] });

      expect(result.batches[0].alerts).toEqual([atCutoff]);
    });
  });

  describe('capacity', () => {
    it('serves no more rules than the free in-flight slots', () => {
      const pending = ['a', 'b', 'c', 'd'].flatMap((ruleId) => makeAlerts(2, { ruleId }));

      const result = plan({ pending, headroomSlots: 2 });

      expect(result.batches).toHaveLength(2);
    });

    it('counts live batches against the in-flight ceiling even when headroom reports more slots', () => {
      const live = new Set(Array.from({ length: IN_FLIGHT_CEILING - 1 }, (_, i) => `exec-${i}`));
      const pending = ['a', 'b', 'c'].flatMap((ruleId) => makeAlerts(2, { ruleId }));

      const result = plan({ liveExecutionIds: live, pending, headroomSlots: IN_FLIGHT_CEILING });

      expect(result.batches).toHaveLength(1);
      expect(result.liveBatches).toBe(IN_FLIGHT_CEILING - 1);
    });

    it('reports in_flight_ceiling and still reclaims dead claims when no slot is free', () => {
      const live = new Set(Array.from({ length: IN_FLIGHT_CEILING }, (_, i) => `exec-${i}`));
      const stale = claimedBy('exec-gone', 'rule-a');

      const result = plan({
        liveExecutionIds: live,
        claimed: [stale],
        pending: makeAlerts(3, { ruleId: 'rule-b' }),
      });

      expect(result.skipReason).toBe('in_flight_ceiling');
      expect(result.batches).toEqual([]);
      expect(result.reclaimAlertIds).toEqual([stale.id]);
      expect(result.liveBatches).toBe(IN_FLIGHT_CEILING);
    });

    it('reports in_flight_ceiling when headroom has no free slot', () => {
      const result = plan({ headroomSlots: 0, pending: makeAlerts(3) });

      expect(result.skipReason).toBe('in_flight_ceiling');
      expect(result.batches).toEqual([]);
    });
  });

  describe('outcome', () => {
    it('reports nothing_pending when no alert needs triage', () => {
      expect(plan()).toEqual(
        expect.objectContaining({ skipReason: 'nothing_pending', batches: [], plannedCost: 0 })
      );
    });

    it('reports budget_too_small, not an empty queue, when the budget cannot fund even one batch', () => {
      const result = plan({
        pending: makeAlerts(3),
        budget: BATCH_OVERHEAD_COST + ALERT_COST - 1,
      });

      expect(result.skipReason).toBe('budget_too_small');
      expect(result.batches).toEqual([]);
      expect(result.plannedCost).toBe(0);
    });

    it('reports none with the cost of the planned batches, never above the budget', () => {
      const result = plan({
        pending: [...makeAlerts(10, { ruleId: 'a' }), ...makeAlerts(10, { ruleId: 'b' })],
        budget: 30,
      });

      const alerts = result.batches.reduce((sum, batch) => sum + batch.alerts.length, 0);
      expect(result.skipReason).toBe('none');
      expect(result.plannedCost).toBe(
        result.batches.length * BATCH_OVERHEAD_COST + alerts * ALERT_COST
      );
      expect(result.plannedCost).toBeLessThanOrEqual(30);
    });
  });
});
