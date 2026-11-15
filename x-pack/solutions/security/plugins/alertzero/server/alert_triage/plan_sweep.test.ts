/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IN_FLIGHT_CEILING } from './constants';
import { planSweep, tagInChunks, type SweepPorts } from './plan_sweep';
import { NOW, HOUR_MS, makeAlert, makeAlerts } from './test_helpers';
import type { HeadroomResult, TriageAlert } from './types';

const OK: HeadroomResult = { status: 'ok', inFlight: 0, slots: IN_FLIGHT_CEILING };

const setup = ({
  alerts = [],
  live = new Set<string>(),
  headroom = OK,
  agedOut = 0,
  budgetPerHour = 600,
}: {
  alerts?: TriageAlert[];
  live?: ReadonlySet<string> | 'unreadable';
  headroom?: HeadroomResult;
  agedOut?: number | 'fails';
  budgetPerHour?: number;
} = {}) => {
  const tagAlerts = jest.fn().mockResolvedValue(undefined);
  const ports: SweepPorts = {
    readHeadroom: async () => headroom,
    fetchAlerts: async () => alerts,
    countAgedOutAlerts: async () => {
      if (agedOut === 'fails') throw new Error('count failed');
      return agedOut;
    },
    listLiveExecutionIds: async () => (live === 'unreadable' ? undefined : live),
    tagAlerts,
  };
  const run = () =>
    planSweep(ports, {
      now: NOW,
      budgetPerHour,
      intervalMinutes: 10,
      lookbackHours: 24,
      analysisTagPrefix: 'ai-triage',
    });
  return { run, tagAlerts };
};

const claimed = (ruleId: string, executionId?: string) =>
  makeAlert({
    ruleId,
    tags: ['az:triage_pending', ...(executionId ? [`az:triage_exec:${executionId}`] : [])],
  });

describe('planSweep', () => {
  it('tells two live batches apart by their execution tags and plans a third rule with none', async () => {
    const alerts = [
      claimed('rule-a', 'exec-1'),
      claimed('rule-b', 'exec-2'),
      ...makeAlerts(3, { ruleId: 'rule-a' }),
      ...makeAlerts(3, { ruleId: 'rule-b' }),
      ...makeAlerts(3, { ruleId: 'rule-c' }),
    ];
    const { run } = setup({ alerts, live: new Set(['exec-1', 'exec-2']) });

    const plan = await run();

    expect(plan.skipReason).toBe('none');
    expect(plan.batches.map(({ ruleId }) => ruleId)).toEqual(['rule-c']);
    expect(plan.reclaimAlertIds).toEqual([]);
  });

  it.each([
    ['its execution is skipped or gone', 'exec-gone'],
    ['it never recorded an execution', undefined],
  ])('reclaims a claim when %s, removing both tags, and re-plans the alert', async (_, execId) => {
    const stuck = claimed('rule-a', execId);
    const { run, tagAlerts } = setup({ alerts: [stuck], live: new Set(['exec-other']) });

    const plan = await run();

    expect(plan.reclaimAlertIds).toEqual([stuck.id]);
    expect(tagAlerts).toHaveBeenCalledWith({
      alertIds: [stuck.id],
      add: [],
      remove: ['az:triage_pending', ...(execId ? [`az:triage_exec:${execId}`] : [])],
    });
    expect(plan.batches.map(({ ruleId }) => ruleId)).toEqual(['rule-a']);
  });

  it('claims the planned alerts with the pending tag', async () => {
    const fresh = makeAlerts(2);
    const { run, tagAlerts } = setup({ alerts: fresh });

    await run();

    expect(tagAlerts).toHaveBeenCalledWith({
      alertIds: fresh.map(({ id }) => id),
      add: ['az:triage_pending'],
      remove: [],
    });
  });

  describe('skip reasons', () => {
    it('tm_behind and writes nothing', async () => {
      const { run, tagAlerts } = setup({
        alerts: makeAlerts(3),
        headroom: { status: 'behind', lagMs: 999_999 },
      });

      expect((await run()).skipReason).toBe('tm_behind');
      expect(tagAlerts).not.toHaveBeenCalled();
    });

    it('tm_unknown and writes nothing', async () => {
      const { run, tagAlerts } = setup({ alerts: makeAlerts(3), headroom: { status: 'unknown' } });

      expect((await run()).skipReason).toBe('tm_unknown');
      expect(tagAlerts).not.toHaveBeenCalled();
    });

    it('live_batches_unreadable, reclaiming nothing even though every claim looks stale', async () => {
      const { run, tagAlerts } = setup({
        alerts: [claimed('rule-a', 'exec-1'), ...makeAlerts(2)],
        live: 'unreadable',
      });

      const plan = await run();

      expect(plan.skipReason).toBe('live_batches_unreadable');
      expect(plan.reclaimAlertIds).toEqual([]);
      expect(tagAlerts).not.toHaveBeenCalled();
    });

    it('in_flight_ceiling when the live batches fill every slot', async () => {
      const live = new Set(Array.from({ length: IN_FLIGHT_CEILING }, (_, i) => `exec-${i}`));
      const { run } = setup({ alerts: makeAlerts(3), live });

      expect((await run()).skipReason).toBe('in_flight_ceiling');
    });

    it('budget_too_small when pending alerts exist but a sweep cannot fund one batch, claiming nothing', async () => {
      // 30 units an hour in 10-minute sweeps is 5 units, one short of the cheapest batch (6).
      const { run, tagAlerts } = setup({ alerts: makeAlerts(3), budgetPerHour: 30 });

      const plan = await run();

      expect(plan.skipReason).toBe('budget_too_small');
      expect(plan.numbers.pendingAlerts).toBe(3);
      expect(tagAlerts).not.toHaveBeenCalled();
    });

    it('nothing_pending when no alert needs triage', async () => {
      const { run } = setup({ alerts: [makeAlert({ tags: ['az:false_positive'] })] });

      expect((await run()).skipReason).toBe('nothing_pending');
    });

    it('none when batches are planned', async () => {
      const { run } = setup({ alerts: makeAlerts(3) });

      expect((await run()).skipReason).toBe('none');
    });
  });

  it('reports the planning numbers so an idle sweep can be told from a blocked one', async () => {
    const { run } = setup({
      alerts: makeAlerts(4),
    });

    const { numbers } = await run();

    expect(numbers).toEqual(
      expect.objectContaining({
        pendingAlerts: 4,
        plannedBatches: 1,
        plannedAlerts: 4,
        sweepBudget: 100,
      })
    );
  });

  describe('aged-out count', () => {
    it('reports how many alerts aged out unserved, without writing anything for them', async () => {
      const { run, tagAlerts } = setup({ alerts: [], agedOut: 42 });

      const { numbers } = await run();

      expect(numbers.agedOutAlerts).toBe(42);
      expect(tagAlerts).not.toHaveBeenCalled();
    });

    it('reports it on a sweep that Task Manager blocked, so a blocked sweep still shows the backlog', async () => {
      const { run } = setup({ headroom: { status: 'behind', lagMs: 999_999 }, agedOut: 7 });

      const plan = await run();

      expect(plan.skipReason).toBe('tm_behind');
      expect(plan.numbers.agedOutAlerts).toBe(7);
    });

    it('leaves the number out, and still plans, when the count fails', async () => {
      const { run } = setup({ alerts: makeAlerts(2), agedOut: 'fails' });

      const plan = await run();

      expect(plan.skipReason).toBe('none');
      expect(plan.numbers.agedOutAlerts).toBeUndefined();
    });
  });

  it('does not plan or tag an alert older than the look-back', async () => {
    const old = makeAlert({ timestamp: NOW - 48 * HOUR_MS });
    const { run, tagAlerts } = setup({ alerts: [old] });

    const plan = await run();

    expect(plan.skipReason).toBe('nothing_pending');
    expect(tagAlerts).not.toHaveBeenCalled();
  });

  it('releases the claim on an alert that aged out of the look-back while claimed, without re-planning it', async () => {
    const old = makeAlert({ timestamp: NOW - 48 * HOUR_MS, tags: ['az:triage_pending'] });
    const { run, tagAlerts } = setup({ alerts: [old] });

    const plan = await run();

    expect(plan.reclaimAlertIds).toEqual([old.id]);
    expect(plan.batches).toEqual([]);
    expect(tagAlerts).toHaveBeenCalledWith({
      alertIds: [old.id],
      add: [],
      remove: ['az:triage_pending'],
    });
  });
});

describe('tagInChunks', () => {
  it('splits a large update into bounded calls', async () => {
    const tagAlerts = jest.fn().mockResolvedValue(undefined);

    await tagInChunks(tagAlerts, {
      alertIds: Array.from({ length: 1200 }, (_, i) => `a-${i}`),
      add: ['x'],
      remove: [],
    });

    expect(tagAlerts.mock.calls.map(([{ alertIds }]) => alertIds.length)).toEqual([500, 500, 200]);
  });

  it('makes no call for an empty list', async () => {
    const tagAlerts = jest.fn();

    await tagInChunks(tagAlerts, { alertIds: [], add: ['x'], remove: [] });

    expect(tagAlerts).not.toHaveBeenCalled();
  });
});
