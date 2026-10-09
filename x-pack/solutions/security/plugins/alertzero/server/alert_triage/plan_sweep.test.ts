/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IN_FLIGHT_CEILING } from './constants';
import { planSweep, type SweepPorts } from './plan_sweep';
import { NOW, HOUR_MS, makeAlert, makeAlerts } from './test_helpers';
import type { HeadroomResult, TriageAlert } from './types';

const OK: HeadroomResult = { status: 'ok', inFlight: 0, slots: IN_FLIGHT_CEILING };

const setup = ({
  alerts = [],
  live = new Set<string>(),
  headroom = OK,
}: {
  alerts?: TriageAlert[];
  live?: ReadonlySet<string> | 'unreadable';
  headroom?: HeadroomResult;
} = {}) => {
  const tagAlerts = jest.fn().mockResolvedValue(undefined);
  const ports: SweepPorts = {
    readHeadroom: async () => headroom,
    fetchAlerts: async () => alerts,
    listLiveExecutionIds: async () => (live === 'unreadable' ? undefined : live),
    tagAlerts,
  };
  const run = () =>
    planSweep(ports, {
      now: NOW,
      budgetPerHour: 600,
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
      alerts: [...makeAlerts(4), makeAlert({ timestamp: NOW - 48 * HOUR_MS })],
    });

    const { numbers } = await run();

    expect(numbers).toEqual(
      expect.objectContaining({
        pendingAlerts: 4,
        staleAlerts: 1,
        plannedBatches: 1,
        plannedAlerts: 4,
        sweepBudget: 100,
      })
    );
  });

  it('returns alerts older than the look-back for stale tagging instead of dropping them', async () => {
    const old = makeAlert({ timestamp: NOW - 48 * HOUR_MS });
    const { run } = setup({ alerts: [old] });

    expect((await run()).staleAlertIds).toEqual([old.id]);
  });

  it('marks a reclaimed alert stale when it aged out of the look-back while claimed', async () => {
    const old = makeAlert({ timestamp: NOW - 48 * HOUR_MS, tags: ['az:triage_pending'] });
    const { run } = setup({ alerts: [old] });

    const plan = await run();

    expect(plan.reclaimAlertIds).toEqual([old.id]);
    expect(plan.staleAlertIds).toEqual([old.id]);
    expect(plan.batches).toEqual([]);
  });
});
