/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyBatch } from './classify_batch';
import { type LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';
import {
  hoursAgo,
  detectionRow,
  heldRow,
  membership,
  verdictBy,
  membersOf,
  batchParams,
  decided,
  agentBatchOf,
  classifyRule,
  noBreaches,
} from './classify_test_helpers';

describe('classifyBatch', () => {
  describe('a run with nothing that shows a change', () => {
    const stale = () => [verdictBy('confirms', undefined)];
    const live = (entries: Record<string, LiveRuleMembership[]>) => async () => membersOf(entries);

    it('holds a detection that goes to the agent only because its series is old', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A')],
          findLiveMembers: live({ 'rule-A': stale() }),
        })
      );

      expect(output.batch).toEqual([]);
      expect(output.row_count).toBe(0);
      expect(output.needs_agent_count).toBe(0);
      expect(output.held_back_count).toBe(1);
      expect(output.held_reason_counts).toEqual({ series_too_old: 1 });
      expect(output.skipped_rule_uuids).toEqual([]);
    });

    it.each([
      [
        'a member has no verdict',
        { 'rule-A': [membership('off_topic')] },
        [detectionRow('rule-A')],
        1,
      ],
      [
        'another rule is joining its event',
        { 'rule-A': [membership('confirms')], 'rule-B': [] },
        [
          detectionRow('rule-A', { sourceId: 'logs.checkout' }),
          // Flaky, so the joining rule is a waiting reason too: nothing in the run is a change, and
          // both rows wait. Without `member_joining` the member is the change and neither waits.
          detectionRow('rule-B', { sourceId: 'logs.checkout', flaky: true }),
        ],
        2,
      ],
      ['its rule is flaky and in no live event', {}, [detectionRow('rule-A', { flaky: true })], 1],
    ])(
      'holds a detection that goes to the agent only because %s',
      async (_name, entries, rows, held) => {
        const output = await classifyBatch(batchParams({ rows, findLiveMembers: live(entries) }));

        expect(output.batch).toEqual([]);
        expect(output.held_back_count).toBe(held);
      }
    );

    it.each([
      ['a state change', { 'rule-B': [membership('refutes')] }],
      ['a rule in no live event', {}],
    ])('sends it with a detection that shows %s', async (_name, entries) => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A'), detectionRow('rule-B')],
          findLiveMembers: live({ 'rule-A': stale(), ...entries }),
        })
      );

      expect(agentBatchOf(output)).toEqual(['rule-A', 'rule-B']);
      expect(output.held_back_count).toBe(0);
    });

    it('sends it with a row it cannot read', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A'), detectionRow('')],
          findLiveMembers: live({ 'rule-A': stale() }),
        })
      );

      expect(output.row_count).toBe(2);
      expect(output.held_back_count).toBe(0);
    });

    it.each([
      ['has waited the window', hoursAgo(5), ['rule-A']],
      ['is still inside it', hoursAgo(3), []],
      ['has no readable time', 'not a time', ['rule-A']],
    ])('a waiting detection that %s', async (_name, detectedAt, expected) => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A', { detectedAt })],
          findLiveMembers: live({ 'rule-A': stale() }),
        })
      );

      expect(agentBatchOf(output)).toEqual(expected);
    });

    it.each([
      ['older than the window', hoursAgo(5), ['rule-A']],
      ['inside the window', hoursAgo(3), []],
    ])(
      'a rule that keeps firing waits from its oldest unprocessed detection, which is %s',
      async (_name, oldestUnprocessed, expected) => {
        const output = await classifyBatch(
          batchParams({
            rows: [detectionRow('rule-A', { oldestUnprocessed })],
            findLiveMembers: live({ 'rule-A': stale() }),
          })
        );

        expect(agentBatchOf(output)).toEqual(expected);
      }
    );

    it('releases a waiting detection with no readable oldest unprocessed time, however new it is', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A', { oldestUnprocessed: null })],
          findLiveMembers: live({ 'rule-A': stale() }),
        })
      );

      expect(agentBatchOf(output)).toEqual(['rule-A']);
    });

    it('releases every waiting detection when one of them has waited the window', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A'), detectionRow('rule-B', { detectedAt: hoursAgo(5) })],
          findLiveMembers: live({ 'rule-A': stale(), 'rule-B': stale() }),
        })
      );

      expect(agentBatchOf(output)).toEqual(['rule-A', 'rule-B']);
    });
  });

  describe('the batch limit', () => {
    const stale = () => [verdictBy('confirms', undefined)];
    const live = (entries: Record<string, LiveRuleMembership[]>) => async () => membersOf(entries);

    it.each([1, 2, 3])(
      'hands the agent a change before waiting detections that rank higher, at a limit of %s',
      async (batchMax) => {
        // Three waiting rows rank ahead of the change. rule-D is in no live event, so it is a change.
        const output = await classifyBatch(
          batchParams({
            batchMax,
            rows: [
              detectionRow('rule-A'),
              detectionRow('rule-B'),
              detectionRow('rule-C'),
              detectionRow('rule-D'),
            ],
            findLiveMembers: live({ 'rule-A': stale(), 'rule-B': stale(), 'rule-C': stale() }),
          })
        );

        expect(agentBatchOf(output)).toContain('rule-D');
        expect(output.row_count).toBe(batchMax);
        expect(output.held_back_count).toBe(4 - batchMax);
        expect(output.held_reason_counts).toEqual({ batch_cap: 4 - batchMax });
      }
    );

    it.each([
      ['has waited out the hold', hoursAgo(5), ['rule-A']],
      ['is still inside the hold', hoursAgo(1), ['rule-B']],
    ])(
      'ranks a waiting detection that %s by its score, not behind the changes',
      async (_name, oldestUnprocessed, expected) => {
        // rule-A waits (its series is old) and ranks first; rule-B is in no live event, a change.
        const output = await classifyBatch(
          batchParams({
            batchMax: 1,
            rows: [detectionRow('rule-A', { oldestUnprocessed }), detectionRow('rule-B')],
            findLiveMembers: live({ 'rule-A': stale() }),
          })
        );

        expect(agentBatchOf(output)).toEqual(expected);
      }
    );

    it('keeps the rows past the limit pending, unstamped', async () => {
      const output = await classifyBatch(
        batchParams({
          batchMax: 1,
          rows: [detectionRow('rule-A'), detectionRow('rule-B')],
          findLiveMembers: live({}),
        })
      );

      expect(agentBatchOf(output)).toEqual(['rule-A']);
      expect(output.held_back_count).toBe(1);
      expect(output.skipped_rule_uuids).toEqual([]);
    });

    it('still skips rows past the limit whose live event holds, so the queue drains', async () => {
      const output = await classifyBatch(
        batchParams({
          batchMax: 1,
          rows: [detectionRow('rule-A'), detectionRow('rule-B')],
          findLiveMembers: live({ 'rule-B': [verdictBy('confirms', hoursAgo(1))] }),
        })
      );

      expect(agentBatchOf(output)).toEqual(['rule-A']);
      expect(output.skipped_rule_uuids).toEqual(['rule-B']);
    });
  });

  describe('detections the flaky-rule gate held back', () => {
    it('skips a held-back rule whose live event still holds, so its backlog is stamped', async () => {
      const { output, decision } = await classifyRule({ heldBack: true });

      expect(decision).toMatchObject({ decision: 'skip', reason: 'still_breaching' });
      expect(output.skipped_rule_uuids).toEqual(['rule-A']);
      expect(output.skipped_detection_ids).toEqual(['rule-A-detection']);
      expect(output.held_back_count).toBe(0);
    });

    it('lets a held-back change through once per review window, and holds the rest', async () => {
      const findLiveMembers = async () =>
        membersOf({ 'rule-A': [membership('refutes')], 'rule-B': [membership('confirms')] });

      // rule-A contradicts its verdict (a change); rule-C is in no live event (uncertain).
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-B'), heldRow('rule-A'), heldRow('rule-C')],
          findLiveMembers,
        })
      );
      // The same change, but the agent reviewed rule-A an hour ago: it is flapping, so held.
      const reviewed = await classifyBatch(
        batchParams({ rows: [heldRow('rule-A', { reviewedAt: hoursAgo(1) })], findLiveMembers })
      );

      expect(agentBatchOf(output)).toEqual(['rule-A']);
      expect(decided(output)['rule-A']).toMatchObject({ reason: 'state_changed' });
      expect(output.held_back_count).toBe(1);
      expect(output.skipped_rule_uuids).toEqual(['rule-B']);
      expect(reviewed.batch).toEqual([]);
      expect(reviewed.held_back_count).toBe(1);
    });

    it('does not hold a change back on a review dated in the future', async () => {
      const { output } = await classifyRule({
        memberships: [membership('refutes')],
        heldBack: true,
        reviewedAt: hoursAgo(-1),
      });

      expect(agentBatchOf(output)).toEqual(['rule-A']);
    });

    it.each([
      ['a review that covers it and is inside the window holds it', hoursAgo(1), undefined, true],
      ['a review that came after the detection does not hold it', hoursAgo(1), hoursAgo(2), false],
      ['a review outside the window does not hold it', hoursAgo(5), undefined, false],
    ])('a held-back change: %s', async (_name, reviewedAt, detectedAt, isHeld) => {
      const { output } = await classifyRule({
        memberships: [membership('refutes')],
        heldBack: true,
        reviewedAt,
        detectedAt,
      });

      expect(output.held_back_count).toBe(isHeld ? 1 : 0);
      expect(agentBatchOf(output)).toEqual(isHeld ? [] : ['rule-A']);
    });

    it('keeps a held-back row held when it is routed for any reason but a change', async () => {
      const { output } = await classifyRule({
        memberships: [verdictBy('confirms', hoursAgo(30))],
        heldBack: true,
      });

      expect(output.held_back_count).toBe(1);
      expect(output.batch).toEqual([]);
    });

    it('holds back a row it cannot read instead of sending it to the agent', async () => {
      const output = await classifyBatch(batchParams({ rows: [[null, {}, 70, 1, false, true]] }));

      expect(output.batch).toEqual([]);
      expect(output.held_back_count).toBe(1);
    });

    it('does not let a held-back detection withdraw the skip of a rule in the series it would join', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A'), heldRow('rule-B', { sourceId: 'logs.checkout' })],
          findLiveMembers: async () => membersOf({ 'rule-A': [membership('confirms')] }),
        })
      );

      expect(decided(output)['rule-A']).toMatchObject({ decision: 'skip' });
      expect(output.held_back_count).toBe(1);
    });
  });

  describe('a flaky probe', () => {
    const flakyRow = (ruleUuid: string) => detectionRow(ruleUuid, { flaky: true });

    it('sends a flaky rule in no live event to the agent as a flaky probe', async () => {
      const output = await classifyBatch(
        batchParams({ rows: [flakyRow('rule-A')], reviewFreshMs: 0 })
      );

      expect(output.batch[0]).toMatchObject({
        flaky_probe: true,
        classifier: { reason: 'flaky_probe' },
      });
      expect(output.skipped_count).toBe(0);
      expect(output.flaky_live_reason_counts).toEqual({});
    });

    it('skips a flaky rule whose live event still holds, so its detections are stamped', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [flakyRow('rule-A')],
          findLiveMembers: async () => membersOf({ 'rule-A': [membership('confirms')] }),
        })
      );

      expect(output.batch).toEqual([]);
      expect(output.skipped_detection_ids).toEqual(['rule-A-detection']);
      expect(decided(output)['rule-A']).toMatchObject({ decision: 'skip' });
      expect(decided(output)['rule-A']).toMatchObject({ reason: 'still_breaching' });
      expect(output.flaky_live_reason_counts).toEqual({ still_breaching: 1 });
    });

    it('sends a changed flaky rule in a live event to the agent with its own reason', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [flakyRow('rule-A')],
          findLiveMembers: async () => membersOf({ 'rule-A': [membership('confirms')] }),
          findRecentBreaches: noBreaches,
        })
      );

      expect(output.batch[0]).toMatchObject({
        flaky_probe: true,
        classifier: { reason: 'state_changed' },
      });
      expect(output.flaky_live_reason_counts).toEqual({ state_changed: 1 });
    });
  });
});
