/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SignalVerdict } from '@kbn/significant-events-schema';
import {
  MAX_CLASSIFIED_ROWS,
  classifyBatch,
  classifyDetectionsStepDefinition,
  type ClassifyBatchParams,
} from './classify_detections';
import type { BaselineObservation } from './baseline';
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
      row_count: 0,
      batch: [],
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
    expect(output.row_count).toBe(2);
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

  describe('the batch the agent reads', () => {
    const rowOf = (ruleUuid: string) => [
      ruleUuid,
      { detection_id: `${ruleUuid}-detection`, rule_uuid: ruleUuid, rule_name: `Rule ${ruleUuid}` },
      70,
      2,
      false,
    ];

    it('lists the detections the agent receives by field name, in row order', async () => {
      const rows = [rowOf('rule-A'), rowOf('rule-B'), rowOf('rule-C')];
      const findLiveMembers = jest.fn(async () =>
        membersOf({ 'rule-A': [membership('confirms')] })
      );

      const output = await classifyBatch(batchParams({ rows, findLiveMembers }));

      expect(output.batch.map(({ rule_uuid: id }) => id)).toEqual(['rule-B', 'rule-C']);
      expect(output.batch[0]).toMatchObject({
        detection_id: 'rule-B-detection',
        rule_name: 'Rule rule-B',
        recent_detection_count: 2,
        flaky_probe: false,
      });
    });

    it('gives each one why it reached the agent, and the events its rule is in, when enforcing', async () => {
      const rows = [rowOf('rule-A'), rowOf('rule-B')];
      const findLiveMembers = jest.fn(async () =>
        membersOf({
          'rule-A': [{ ...membership('confirms'), eventId: 'event-1', status: 'active' }],
        })
      );
      const probe = jest.fn(async () => probeResult('ok', false));

      const output = await classifyBatch(
        batchParams({ rows, findLiveMembers, probe, shadowMode: false })
      );

      expect(output.batch[0].classifier).toMatchObject({
        reason: 'possible_recovery',
        probe_status: 'ok',
        live_events: [{ event_id: 'event-1', status: 'active', stored_verdict: 'confirms' }],
      });
      expect(output.batch[1].classifier).toEqual({
        reason: 'not_live_member',
        live_events: [],
      });
    });

    it('gives the agent no hint while it only records, so its judgement stays unprompted', async () => {
      const rows = [rowOf('rule-A')];
      const findLiveMembers = jest.fn(async () =>
        membersOf({ 'rule-A': [membership('confirms')] })
      );

      const output = await classifyBatch(batchParams({ rows, findLiveMembers, shadowMode: true }));

      expect(output.batch).toHaveLength(1);
      expect(output.batch[0]).not.toHaveProperty('classifier');
    });

    it('reads cells by the given column names', async () => {
      const rows = [[{ detection_id: 'd-1', rule_uuid: 'rule-A' }, 'rule-A', 5]];

      const output = await classifyBatch(
        batchParams({ rows, columns: ['_source', 'rule_uuid', 'recent_detection_count'] })
      );

      expect(output.batch[0]).toMatchObject({ rule_uuid: 'rule-A', recent_detection_count: 5 });
    });
  });

  it('keeps every row and skips nothing in shadow mode, but still records the decisions', async () => {
    const rows = [detectionRow('rule-A')];
    const findLiveMembers = jest.fn(async () => membersOf({ 'rule-A': [membership('confirms')] }));

    const output = await classifyBatch(batchParams({ rows, shadowMode: true, findLiveMembers }));

    expect(output.rows).toEqual(rows);
    expect(output.row_count).toBe(1);
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

  describe('shadow baseline observation', () => {
    const observation: BaselineObservation = {
      decision: 'above_normal',
      value: 9,
      samples: 60,
      median: 5,
      threshold: 8,
    };
    const confirmsA = () => jest.fn(async () => membersOf({ 'rule-A': [membership('confirms')] }));

    it('records the observation on the decision without changing the decision', async () => {
      const observe = jest.fn(async () => observation);

      const output = await classifyBatch(
        batchParams({ rows: [detectionRow('rule-A')], findLiveMembers: confirmsA(), observe })
      );

      expect(observe).toHaveBeenCalledWith(STORED_QUERY);
      expect(output.decisions[0]).toMatchObject({ decision: 'skip', baseline: observation });
    });

    it('does not observe a rule it does not probe, or when there is no observer', async () => {
      const observe = jest.fn(async () => observation);

      await classifyBatch(batchParams({ rows: [detectionRow('rule-A')], observe }));
      const output = await classifyBatch(
        batchParams({ rows: [detectionRow('rule-A')], findLiveMembers: confirmsA() })
      );

      expect(observe).not.toHaveBeenCalled();
      expect(output.decisions[0]).not.toHaveProperty('baseline');
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

describe('classifyDetectionsStepDefinition', () => {
  const settings = {
    space_id: 'default',
    shadow_mode: false,
    probe_window_minutes: 60,
    probe_timeout_ms: 8_000,
    probe_concurrency: 5,
    budget_ms: 20_000,
  };

  const createDefinition = () => {
    const logger = loggerMock.create();
    return { definition: classifyDetectionsStepDefinition({ logger }), logger };
  };

  const membersResponse = {
    columns: [
      { name: '_source', type: 'object' },
      { name: 'data_json', type: 'keyword' },
    ],
    values: [
      [
        { group_hash: 'group-1', alert: { status: 'active' }, severity: 'high' },
        JSON.stringify({
          event_id: 'event-1',
          title: 'Checkout errors',
          summary: 'Checkout is failing',
          source_ids: ['logs.checkout'],
          confidence: 0.8,
          signals: [
            {
              type: 'detection',
              source_id: 'logs.checkout',
              description: 'Observed rows',
              verdict: 'confirms',
              metadata: { rule_uuid: 'rule-A' },
              evidence: { esql_query: STORED_QUERY, result: 'found' },
            },
          ],
        }),
      ],
    ],
  };

  const context = (input: unknown, esClient: unknown) =>
    ({
      input,
      rawInput: input,
      contextManager: { getScopedEsClient: jest.fn(() => esClient) },
      abortSignal: new AbortController().signal,
    } as never);

  const runHandler = async (
    definition: ReturnType<typeof createDefinition>['definition'],
    input: unknown,
    esClient: unknown
  ) => {
    const { output } = await definition.handler(context(input, esClient));
    if (!output) throw new Error('The step returned no output');
    return output;
  };

  it.each([
    ['probe_concurrency below 1', { probe_concurrency: 0 }],
    ['probe_concurrency above 10', { probe_concurrency: 11 }],
    ['probe_window_minutes below 15', { probe_window_minutes: 14 }],
    ['probe_window_minutes above 360', { probe_window_minutes: 361 }],
    ['probe_timeout_ms below 1000', { probe_timeout_ms: 999 }],
    ['probe_timeout_ms above 30000', { probe_timeout_ms: 30_001 }],
    ['budget_ms below 2000', { budget_ms: 1_999 }],
    ['budget_ms above 60000', { budget_ms: 60_001 }],
  ])('rejects %s', (_name, override) => {
    const { definition } = createDefinition();

    expect(definition.inputSchema.safeParse({ ...settings, rows: [], ...override }).success).toBe(
      false
    );
    expect(definition.inputSchema.safeParse({ ...settings, rows: [] }).success).toBe(true);
  });

  it('classifies through the scoped ES client, probes the stored query and logs once', async () => {
    const { definition, logger } = createDefinition();
    const query = jest.fn(async (request: { query: string }) =>
      request.query.includes('.rule-events')
        ? membersResponse
        : { columns: [{ name: 'x', type: 'keyword' }], values: [['row']] }
    );
    const input = { ...settings, rows: [detectionRow('rule-A')] };

    const output = await runHandler(definition, input, { esql: { query } });

    expect(definition.outputSchema.safeParse(output).success).toBe(true);
    expect(output.decisions).toMatchObject([
      { rule_uuid: 'rule-A', decision: 'skip', reason: 'still_breaching', probe_status: 'ok' },
    ]);
    expect(output.rows).toEqual([]);
    expect(output.skipped_rule_uuids).toEqual(['rule-A']);
    const probeRequest = query.mock.calls
      .map(([request]) => request as { query: string; params?: unknown })
      .find((request) => request.query.includes('LIMIT 1'));
    expect(probeRequest?.query).toBe(`${STORED_QUERY}\n| LIMIT 1`);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('classifyDetections'));
  });

  it.each([
    ['shadow mode', true, 1],
    ['enforce mode', false, 0],
  ])('runs the bucketed baseline query only in %s', async (_name, shadowMode, expected) => {
    const { definition } = createDefinition();
    const query = jest.fn(async (request: { query: string }) =>
      request.query.includes('.rule-events')
        ? membersResponse
        : { columns: [{ name: 'x', type: 'keyword' }], values: [] }
    );

    const output = await runHandler(
      definition,
      { ...settings, shadow_mode: shadowMode, rows: [detectionRow('rule-A')] },
      { esql: { query } }
    );

    const bucketed = query.mock.calls.filter(([request]) => request.query.includes('BUCKET'));
    expect(bucketed).toHaveLength(expected);
    if (shadowMode) {
      expect(output.decisions[0].baseline).toMatchObject({ samples: 60 });
    } else {
      expect(output.decisions[0].baseline).toBeUndefined();
    }
  });

  it('treats a missing rows input as an empty batch', async () => {
    const { definition } = createDefinition();
    const query = jest.fn();

    expect(definition.inputSchema.safeParse(settings).success).toBe(true);
    const output = await runHandler(definition, settings, { esql: { query } });

    expect(query).not.toHaveBeenCalled();
    expect(output).toMatchObject({ rows: [], row_count: 0, decisions: [] });
  });

  it('issues no queries for an empty batch', async () => {
    const { definition } = createDefinition();
    const query = jest.fn();

    const output = await runHandler(definition, { ...settings, rows: [] }, { esql: { query } });

    expect(query).not.toHaveBeenCalled();
    expect(output.decisions).toEqual([]);
  });
});
