/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalVerdict } from '@kbn/significant-events-schema';
import {
  MAX_CLASSIFIED_ROWS,
  classifyBatch,
  type ClassifyBatchParams,
} from './classify_detections';
import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';
import type { ProbeResult } from './run_probe';

const STORED_QUERY = 'FROM $.a | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';

const detectionRow = (ruleUuid: string) => [
  ruleUuid,
  { detection_id: `${ruleUuid}-detection`, rule_uuid: ruleUuid },
  70,
  1,
  false,
];

const membership = (
  verdict: SignalVerdict,
  esqlQuery: string | undefined = STORED_QUERY
): LiveRuleMembership => ({ eventId: 'event-1', status: 'active', verdict, esqlQuery });

const probeResult = (status: ProbeResult['status'], hasRows: boolean): ProbeResult => ({
  status,
  hasRows,
  durationMs: 7,
});

const membersOf = (entries: Record<string, LiveRuleMembership[]>) =>
  new Map(Object.entries(entries));

const batchParams = (overrides: Partial<ClassifyBatchParams> = {}): ClassifyBatchParams => ({
  rows: [],
  shadowMode: false,
  probeConcurrency: 5,
  findLiveMembers: jest.fn(async () => new Map()),
  probe: jest.fn(async () => probeResult('ok', true)),
  ...overrides,
});

describe('classifyBatch', () => {
  it('does nothing for an empty batch', async () => {
    const findLiveMembers = jest.fn(async () => new Map());

    const output = await classifyBatch(batchParams({ findLiveMembers }));

    expect(findLiveMembers).not.toHaveBeenCalled();
    expect(output).toMatchObject({
      rows: [],
      decisions: [],
      skipped_rule_uuids: [],
      skipped_count: 0,
      needs_agent_count: 0,
    });
  });

  it('sends a rule that is in no live series to the agent without probing', async () => {
    const probe = jest.fn(async () => probeResult('ok', true));
    const rows = [detectionRow('rule-A')];

    const output = await classifyBatch(batchParams({ rows, probe }));

    expect(probe).not.toHaveBeenCalled();
    expect(output.rows).toEqual(rows);
    expect(output.decisions).toEqual([
      {
        rule_uuid: 'rule-A',
        detection_id: 'rule-A-detection',
        decision: 'needs_agent',
        reason: 'not_live_member',
      },
    ]);
  });

  it('drops skipped rows and lists their rules in enforce mode', async () => {
    const rows = [detectionRow('rule-A'), detectionRow('rule-B'), detectionRow('rule-C')];
    const probe = jest.fn(async (query?: string) => probeResult('ok', query === STORED_QUERY));
    const findLiveMembers = jest.fn(async () =>
      membersOf({
        'rule-A': [membership('confirms')],
        'rule-B': [membership('refutes')],
      })
    );

    const output = await classifyBatch(batchParams({ rows, probe, findLiveMembers }));

    expect(
      output.decisions.map(({ rule_uuid: id, decision, reason }) => [id, decision, reason])
    ).toEqual([
      ['rule-A', 'skip', 'still_breaching'],
      ['rule-B', 'needs_agent', 'possible_rebreach'],
      ['rule-C', 'needs_agent', 'not_live_member'],
    ]);
    expect(output.rows).toEqual([rows[1], rows[2]]);
    expect(output.skipped_rule_uuids).toEqual(['rule-A']);
    expect(output.skipped_count).toBe(1);
    expect(output.needs_agent_count).toBe(2);
    expect(output.reason_counts).toEqual({
      still_breaching: 1,
      possible_rebreach: 1,
      not_live_member: 1,
    });
    expect(output.probe_status_counts).toEqual({ ok: 2 });
  });

  it('keeps every row and skips nothing in shadow mode, but still records the decisions', async () => {
    const rows = [detectionRow('rule-A')];
    const findLiveMembers = jest.fn(async () => membersOf({ 'rule-A': [membership('confirms')] }));

    const output = await classifyBatch(batchParams({ rows, shadowMode: true, findLiveMembers }));

    expect(output.rows).toEqual(rows);
    expect(output.skipped_rule_uuids).toEqual([]);
    expect(output.shadow_mode).toBe(true);
    expect(output.skipped_count).toBe(1);
    expect(output.decisions[0]).toMatchObject({ rule_uuid: 'rule-A', decision: 'skip' });
  });

  it('does not probe a rule with an unjudged member', async () => {
    const probe = jest.fn(async () => probeResult('ok', true));
    const findLiveMembers = jest.fn(async () =>
      membersOf({ 'rule-A': [membership('confirms'), membership('inconclusive')] })
    );

    const output = await classifyBatch(
      batchParams({ rows: [detectionRow('rule-A')], probe, findLiveMembers })
    );

    expect(probe).not.toHaveBeenCalled();
    expect(output.decisions[0]).toMatchObject({
      decision: 'needs_agent',
      reason: 'unjudged_member',
    });
  });

  it('probes a rule once, with the first stored query, however many live series it is in', async () => {
    const probe = jest.fn(async () => probeResult('ok', true));
    const findLiveMembers = jest.fn(async () =>
      membersOf({
        'rule-A': [
          { ...membership('confirms'), esqlQuery: undefined },
          membership('confirms', 'FROM $.second'),
        ],
      })
    );

    await classifyBatch(batchParams({ rows: [detectionRow('rule-A')], probe, findLiveMembers }));

    expect(probe).toHaveBeenCalledTimes(1);
    expect(probe).toHaveBeenCalledWith('FROM $.second');
  });

  it('sends the detection to the agent when the probe fails, and reports the status', async () => {
    const probe = jest.fn(async () => probeResult('timeout', false));
    const findLiveMembers = jest.fn(async () => membersOf({ 'rule-A': [membership('confirms')] }));

    const output = await classifyBatch(
      batchParams({ rows: [detectionRow('rule-A')], probe, findLiveMembers })
    );

    expect(output.decisions[0]).toMatchObject({
      decision: 'needs_agent',
      reason: 'probe_timeout',
      probe_status: 'timeout',
      probe_duration_ms: 7,
    });
    expect(output.probe_status_counts).toEqual({ timeout: 1 });
  });

  it('never runs more probes at once than the concurrency cap', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const probe = jest.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return probeResult('ok', true);
    });
    const ruleIds = ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => `rule-${id}`);
    const findLiveMembers = jest.fn(async () =>
      membersOf(Object.fromEntries(ruleIds.map((id) => [id, [membership('confirms')]])))
    );

    await classifyBatch(
      batchParams({ rows: ruleIds.map(detectionRow), probe, findLiveMembers, probeConcurrency: 2 })
    );

    expect(probe).toHaveBeenCalledTimes(6);
    expect(maxInFlight).toBe(2);
  });

  it('classifies at most MAX_CLASSIFIED_ROWS rows and keeps the rest for the agent', async () => {
    const ruleIds = Array.from({ length: MAX_CLASSIFIED_ROWS + 1 }, (_, i) => `rule-${i}`);
    const rows = ruleIds.map(detectionRow);
    const probe = jest.fn(async () => probeResult('ok', true));
    const findLiveMembers = jest.fn(async (requested: string[]) =>
      membersOf(Object.fromEntries(requested.map((id) => [id, [membership('confirms')]])))
    );

    const output = await classifyBatch(batchParams({ rows, probe, findLiveMembers }));

    expect(findLiveMembers.mock.calls[0][0]).toHaveLength(MAX_CLASSIFIED_ROWS);
    expect(probe).toHaveBeenCalledTimes(MAX_CLASSIFIED_ROWS);
    expect(output.decisions.at(-1)).toMatchObject({
      rule_uuid: `rule-${MAX_CLASSIFIED_ROWS}`,
      decision: 'needs_agent',
      reason: 'over_cap',
    });
    expect(output.rows).toEqual([rows[MAX_CLASSIFIED_ROWS]]);
  });

  it('keeps a row it cannot read, without a decision', async () => {
    const unreadable = [null, {}];
    const rows = [unreadable, detectionRow('rule-A')];

    const output = await classifyBatch(batchParams({ rows }));

    expect(output.rows).toEqual(rows);
    expect(output.decisions.map(({ rule_uuid: id }) => id)).toEqual(['rule-A']);
  });
});
