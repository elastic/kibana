/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectionSkipSchema } from '@kbn/significant-events-schema';
import { BREACH_WINDOW_MINUTES, classifyBatch } from './classify_batch';
import { MAX_CLASSIFIED_ROWS } from './classify_decide_row';
import {
  breachedMinutesAgo,
  hoursAgo,
  detectionRow,
  heldRow,
  membership,
  membersOf,
  batchParams,
  decided,
  agentBatchOf,
} from './classify_test_helpers';

describe('classifyBatch', () => {
  it('drops skipped rows and lists their rules in enforce mode', async () => {
    const rows = [detectionRow('rule-A'), detectionRow('rule-B'), detectionRow('rule-C')];
    const findLiveMembers = jest.fn(async () =>
      membersOf({ 'rule-A': [membership('confirms')], 'rule-B': [membership('refutes')] })
    );

    const output = await classifyBatch(batchParams({ rows, findLiveMembers }));

    expect(decided(output)).toMatchObject({
      'rule-A': { decision: 'skip', reason: 'still_breaching' },
      'rule-B': {
        decision: 'needs_agent',
        reason: 'state_changed',
        rule_breached: true,
        live_events: [{ event_id: 'event-1', status: 'active', stored_verdict: 'refutes' }],
      },
      'rule-C': { decision: 'needs_agent', reason: 'not_live_member', live_events: [] },
    });
    expect(agentBatchOf(output)).toEqual(['rule-B', 'rule-C']);
    expect(output.row_count).toBe(2);
    expect(output.skipped_rule_uuids).toEqual(['rule-A']);
    expect(output.skipped_count).toBe(1);
    expect(output.needs_agent_count).toBe(2);
    expect(output.reason_counts).toEqual({
      still_breaching: 1,
      state_changed: 1,
      not_live_member: 1,
    });
  });

  describe('what the batch keeps per rule and per row', () => {
    const refuting = async () => membersOf({ 'rule-A': [membership('refutes')] });

    it("reads a rule's review from its last row", async () => {
      const recent = heldRow('rule-A', { reviewedAt: hoursAgo(1) });
      const old = heldRow('rule-A', { reviewedAt: hoursAgo(10) });

      // A held-back change stays held only while the rule's review is inside the review window.
      const recentLast = await classifyBatch(
        batchParams({ rows: [old, recent], findLiveMembers: refuting })
      );
      const oldLast = await classifyBatch(
        batchParams({ rows: [recent, old], findLiveMembers: refuting })
      );

      expect(recentLast.held_back_count).toBe(2);
      expect(recentLast.batch).toEqual([]);
      expect(oldLast.held_back_count).toBe(0);
      expect(agentBatchOf(oldLast)).toEqual(['rule-A', 'rule-A']);
    });

    it('clears a rule review when its last row has no review timestamp', async () => {
      const reviewed = heldRow('rule-A', { reviewedAt: hoursAgo(1) });
      const unreviewed = heldRow('rule-A');

      const output = await classifyBatch(
        batchParams({ rows: [reviewed, unreviewed], findLiveMembers: refuting })
      );

      expect(output.held_back_count).toBe(0);
      expect(agentBatchOf(output)).toEqual(['rule-A', 'rule-A']);
    });

    it('hands a row with no rule on untouched, or holds it back, and never counts it', async () => {
      const output = await classifyBatch(
        batchParams({ rows: [detectionRow(''), heldRow(''), detectionRow('rule-B')] })
      );

      expect(output.batch.map(({ rule_uuid: id }) => id)).toEqual(['', 'rule-B']);
      expect(output.batch[0].classifier).toBeUndefined();
      expect(output.held_back_count).toBe(1);
      expect(output.reason_counts).toEqual({ not_live_member: 1 });
      expect(output.needs_agent_count).toBe(1);
    });

    it('keeps the order of the rows in the batch, the skips and the stamped detections', async () => {
      const findLiveMembers = async () =>
        membersOf({
          'rule-A': [membership('confirms')],
          'rule-B': [membership('refutes')],
          'rule-C': [membership('confirms')],
          'rule-D': [membership('refutes')],
        });

      const output = await classifyBatch(
        batchParams({
          rows: [
            detectionRow('rule-D'),
            detectionRow('rule-C'),
            detectionRow('rule-B'),
            detectionRow('rule-A'),
          ],
          findLiveMembers,
        })
      );

      expect(agentBatchOf(output)).toEqual(['rule-D', 'rule-B']);
      expect(output.skips.map(({ rule_uuid: id }) => id)).toEqual(['rule-C', 'rule-A']);
      expect(output.skipped_rule_uuids).toEqual(['rule-C', 'rule-A']);
      expect(output.skipped_detection_ids).toEqual(['rule-C-detection', 'rule-A-detection']);
    });
  });

  it('classifies at most MAX_CLASSIFIED_ROWS rows and keeps the rest for the agent', async () => {
    const ruleIds = Array.from({ length: MAX_CLASSIFIED_ROWS + 1 }, (_, i) => `rule-${i}`);
    const findRecentBreaches = jest.fn(breachedMinutesAgo(1));
    const findLiveMembers = jest.fn(async (requested: string[]) =>
      membersOf(Object.fromEntries(requested.map((id) => [id, [membership('confirms')]])))
    );

    const output = await classifyBatch(
      batchParams({
        rows: ruleIds.map((id) => detectionRow(id)),
        findLiveMembers,
        findRecentBreaches,
      })
    );

    expect(findLiveMembers.mock.calls[0][0]).toHaveLength(MAX_CLASSIFIED_ROWS);
    expect(findRecentBreaches.mock.calls[0][0]).toHaveLength(MAX_CLASSIFIED_ROWS);
    expect(decided(output)[`rule-${MAX_CLASSIFIED_ROWS}`]).toMatchObject({
      decision: 'needs_agent',
      reason: 'over_cap',
    });
    expect(agentBatchOf(output)).toEqual([`rule-${MAX_CLASSIFIED_ROWS}`]);
  });

  it('stamps a skipped rule only up to the detection it judged, with what it saw in the marker', async () => {
    const output = await classifyBatch(
      batchParams({
        rows: [detectionRow('rule-A'), detectionRow('rule-B')],
        findLiveMembers: async () => membersOf({ 'rule-A': [membership('confirms')] }),
      })
    );

    expect(output.skipped_detection_ids).toEqual(['rule-A-detection']);
    expect(output.skips).toEqual([
      {
        rule_uuid: 'rule-A',
        skip: {
          reason: 'still_breaching',
          rule_breached: true,
          breach_window_minutes: BREACH_WINDOW_MINUTES,
          event_id: 'event-1',
          event_title: 'Checkout — request failures',
          stored_verdict: 'confirms',
        },
      },
    ]);
    const route = detectionSkipSchema.omit({ checked_at: true }).strict();
    expect(route.safeParse(output.skips[0].skip).success).toBe(true);
  });

  it('keeps a row it cannot read, without a decision', async () => {
    const output = await classifyBatch(batchParams({ rows: [[null, {}], detectionRow('rule-A')] }));

    expect(output.batch).toHaveLength(2);
    expect(Object.keys(decided(output))).toEqual(['rule-A']);
  });
});
