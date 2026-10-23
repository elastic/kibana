/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  detectionSkipSchema,
  type BaselineObservation,
  type SignalVerdict,
} from '@kbn/significant-events-schema';
import {
  MAX_CLASSIFIED_ROWS,
  classifyBatch,
  classifyDetectionsStepDefinition,
  type ClassifyBatchParams,
  type ClassifyDetectionsOutput,
} from './classify_detections';
import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';
import type { ProbeResult } from './run_probe';

const COLUMNS = ['rule_uuid', '_source', 'score', 'recent_detection_count', 'flaky_probe'];
const STORED_QUERY = 'FROM $.a | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';

const NOW = Date.parse('2026-10-19T12:00:00.000Z');
const HOUR_MS = 3_600_000;

const detectionRow = (ruleUuid: string, sourceId?: string) => [
  ruleUuid,
  {
    detection_id: `${ruleUuid}-detection`,
    rule_uuid: ruleUuid,
    ...(sourceId ? { source_id: sourceId } : {}),
  },
  70,
  1,
  false,
];

const membership = (
  verdict: SignalVerdict,
  esqlQuery: string | undefined = STORED_QUERY
): LiveRuleMembership => ({
  eventId: 'event-1',
  status: 'active',
  verdict,
  esqlQuery,
  evidenceFound: verdict === 'confirms',
  createdAt: new Date(NOW - HOUR_MS).toISOString(),
  verifiedAt: undefined,
  sourceIds: ['logs.checkout'],
  eventTitle: 'Checkout — request failures',
});

const probeResult = (status: ProbeResult['status'], hasRows: boolean): ProbeResult => ({
  status,
  hasRows,
  durationMs: 7,
});

const membersOf = (entries: Record<string, LiveRuleMembership[]>) =>
  new Map(Object.entries(entries));

type BatchOverrides = Partial<ClassifyBatchParams> & {
  findLiveMembers?: (ruleUuids: string[]) => Promise<Map<string, LiveRuleMembership[]>>;
};

const batchParams = ({
  findLiveMembers = async () => new Map(),
  ...overrides
}: BatchOverrides = {}): ClassifyBatchParams => ({
  rows: [],
  columns: COLUMNS,
  maxSkipAgeMs: 24 * HOUR_MS,
  probeWindowMinutes: 20,
  now: NOW,
  probeConcurrency: 5,
  findLiveMemberships: findLiveMembers,
  probe: jest.fn(async () => probeResult('ok', true)),
  observe: jest.fn(async () => undefined),
  ...overrides,
});

/** What the classifier decided per rule, read from what it skips and what it hands the agent. */
const decided = (output: ClassifyDetectionsOutput) => ({
  ...Object.fromEntries(
    output.skips.map(({ rule_uuid: id, skip }) => [id, { decision: 'skip', ...skip }])
  ),
  ...Object.fromEntries(
    output.batch.flatMap(({ rule_uuid: id, classifier }) =>
      id && classifier ? [[id, { decision: 'needs_agent', ...classifier }]] : []
    )
  ),
});

describe('classifyBatch', () => {
  it('does nothing for an empty batch', async () => {
    const output = await classifyBatch(batchParams());

    expect(output).toMatchObject({
      row_count: 0,
      batch: [],
      skipped_rule_uuids: [],
      skipped_count: 0,
      needs_agent_count: 0,
    });
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

    expect(decided(output)).toMatchObject({
      'rule-A': { decision: 'skip', reason: 'still_breaching' },
      'rule-B': { decision: 'needs_agent', reason: 'state_changed' },
      'rule-C': { decision: 'needs_agent', reason: 'not_live_member' },
    });
    expect(output.batch.map(({ rule_uuid: id }) => id)).toEqual(['rule-B', 'rule-C']);
    expect(output.row_count).toBe(2);
    expect(output.skipped_rule_uuids).toEqual(['rule-A']);
    expect(output.skipped_count).toBe(1);
    expect(output.needs_agent_count).toBe(2);
    expect(output.reason_counts).toEqual({
      still_breaching: 1,
      state_changed: 1,
      not_live_member: 1,
    });
    expect(output.probe_status_counts).toEqual({ ok: 2 });
  });

  describe('the escalations that withdraw a skip', () => {
    it('sends a skippable detection to the agent when its series is older than the limit', async () => {
      const old = {
        ...membership('confirms'),
        createdAt: new Date(NOW - 25 * HOUR_MS).toISOString(),
      };
      const findLiveMembers = jest.fn(async () => membersOf({ 'rule-A': [old] }));

      const output = await classifyBatch(
        batchParams({ rows: [detectionRow('rule-A')], findLiveMembers })
      );

      expect(output.skipped_count).toBe(0);
      expect(decided(output)['rule-A']).toMatchObject({
        decision: 'needs_agent',
        reason: 'series_too_old',
      });
    });

    it('sends a skippable detection to the agent when its series names no event, which a skip needs', async () => {
      const unnamed = { ...membership('confirms'), eventId: undefined };
      const findLiveMembers = jest.fn(async () => membersOf({ 'rule-A': [unnamed] }));

      const output = await classifyBatch(
        batchParams({ rows: [detectionRow('rule-A')], findLiveMembers })
      );

      expect(output.skipped_count).toBe(0);
      expect(output.skips).toEqual([]);
      expect(decided(output)['rule-A']).toMatchObject({
        decision: 'needs_agent',
        reason: 'not_live_member',
      });
    });

    it('sends a member to the agent when another rule joins its series for the same source', async () => {
      const findLiveMembers = jest.fn(async () =>
        membersOf({ 'rule-A': [membership('confirms')], 'rule-B': [] })
      );

      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A', 'logs.checkout'), detectionRow('rule-B', 'logs.checkout')],
          findLiveMembers,
        })
      );

      expect(decided(output)).toMatchObject({
        'rule-A': { reason: 'member_joining' },
        'rule-B': { reason: 'not_live_member' },
      });
      expect(output.skipped_count).toBe(0);
    });

    it('does not treat members of different live series on one source as joining each other', async () => {
      const findLiveMembers = jest.fn(async () =>
        membersOf({
          'rule-A': [{ ...membership('confirms'), eventId: 'event-1' }],
          'rule-B': [{ ...membership('confirms'), eventId: 'event-2' }],
        })
      );

      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A', 'logs.checkout'), detectionRow('rule-B', 'logs.checkout')],
          findLiveMembers,
        })
      );

      expect(decided(output)).toMatchObject({
        'rule-A': { decision: 'skip' },
        'rule-B': { decision: 'skip' },
      });
    });

    it('does not treat a rule on another source as joining', async () => {
      const findLiveMembers = jest.fn(async () =>
        membersOf({ 'rule-A': [membership('confirms')] })
      );

      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A', 'logs.checkout'), detectionRow('rule-B', 'logs.other')],
          findLiveMembers,
        })
      );

      expect(decided(output)['rule-A']).toMatchObject({
        decision: 'skip',
        reason: 'still_breaching',
      });
    });
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

      const output = await classifyBatch(batchParams({ rows, findLiveMembers, probe }));

      expect(output.batch[0].classifier).toMatchObject({
        reason: 'state_changed',
        probe_status: 'ok',
        live_events: [{ event_id: 'event-1', status: 'active', stored_verdict: 'confirms' }],
      });
      expect(output.batch[1].classifier).toEqual({
        reason: 'not_live_member',
        live_events: [],
      });
    });
  });

  describe('baseline observation', () => {
    const observation: BaselineObservation = {
      decision: 'above_normal',
      value: 9,
      samples: 60,
      median: 5,
      threshold: 8,
    };
    const confirmsA = () => jest.fn(async () => membersOf({ 'rule-A': [membership('confirms')] }));

    it('records the observation on the decision', async () => {
      const observe = jest.fn(async () => ({ ...observation, decision: 'background' as const }));

      const output = await classifyBatch(
        batchParams({ rows: [detectionRow('rule-A')], findLiveMembers: confirmsA(), observe })
      );

      expect(observe).toHaveBeenCalledWith(STORED_QUERY);
      expect(decided(output)['rule-A']).toMatchObject({
        decision: 'skip',
        baseline: { decision: 'background' },
      });
    });

    it("withdraws a skip when the match count is above the rule's own normal", async () => {
      const observe = jest.fn(async () => observation);

      const output = await classifyBatch(
        batchParams({ rows: [detectionRow('rule-A')], findLiveMembers: confirmsA(), observe })
      );

      expect(decided(output)['rule-A']).toMatchObject({
        decision: 'needs_agent',
        reason: 'above_normal',
        baseline: observation,
      });
    });

    it('does not observe a rule it does not probe, or when there is no observer', async () => {
      const observe = jest.fn(async () => observation);

      await classifyBatch(batchParams({ rows: [detectionRow('rule-A')], observe }));
      const output = await classifyBatch(
        batchParams({ rows: [detectionRow('rule-A')], findLiveMembers: confirmsA() })
      );

      expect(observe).not.toHaveBeenCalled();
      expect(decided(output)['rule-A']).not.toHaveProperty('baseline');
    });
  });

  it('fails open when live series use different stored queries', async () => {
    const probe = jest.fn(async () => probeResult('ok', true));
    const findLiveMembers = jest.fn(async () =>
      membersOf({
        'rule-A': [
          { ...membership('confirms'), esqlQuery: undefined },
          membership('confirms', 'FROM $.second'),
        ],
      })
    );

    const output = await classifyBatch(
      batchParams({ rows: [detectionRow('rule-A')], probe, findLiveMembers })
    );

    expect(probe).not.toHaveBeenCalled();
    expect(decided(output)['rule-A']).toMatchObject({
      decision: 'needs_agent',
      reason: 'probe_unavailable',
    });
  });

  it('sends the detection to the agent when the probe fails, and reports the status', async () => {
    const probe = jest.fn(async () => probeResult('timeout', false));
    const findLiveMembers = jest.fn(async () => membersOf({ 'rule-A': [membership('confirms')] }));

    const output = await classifyBatch(
      batchParams({ rows: [detectionRow('rule-A')], probe, findLiveMembers })
    );

    expect(decided(output)['rule-A']).toMatchObject({
      decision: 'needs_agent',
      reason: 'probe_unavailable',
      probe_status: 'timeout',
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
      batchParams({
        rows: ruleIds.map((id) => detectionRow(id)),
        probe,
        findLiveMembers,
        probeConcurrency: 2,
      })
    );

    expect(probe).toHaveBeenCalledTimes(6);
    expect(maxInFlight).toBe(2);
  });

  it('classifies at most MAX_CLASSIFIED_ROWS rows and keeps the rest for the agent', async () => {
    const ruleIds = Array.from({ length: MAX_CLASSIFIED_ROWS + 1 }, (_, i) => `rule-${i}`);
    const rows = ruleIds.map((id) => detectionRow(id));
    const probe = jest.fn(async () => probeResult('ok', true));
    const findLiveMembers = jest.fn(async (requested: string[]) =>
      membersOf(Object.fromEntries(requested.map((id) => [id, [membership('confirms')]])))
    );

    const output = await classifyBatch(batchParams({ rows, probe, findLiveMembers }));

    expect(findLiveMembers.mock.calls[0][0]).toHaveLength(MAX_CLASSIFIED_ROWS);
    expect(probe).toHaveBeenCalledTimes(MAX_CLASSIFIED_ROWS);
    expect(decided(output)[`rule-${MAX_CLASSIFIED_ROWS}`]).toMatchObject({
      decision: 'needs_agent',
      reason: 'over_cap',
    });
    expect(output.batch.map(({ rule_uuid: id }) => id)).toEqual([`rule-${MAX_CLASSIFIED_ROWS}`]);
  });

  describe('the flaky_probe flag', () => {
    const flakyRow = [...detectionRow('rule-A').slice(0, 4), true];
    it('sends a flaky probe to the agent instead of skipping it', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [flakyRow],
          findLiveMembers: async () => membersOf({ 'rule-A': [membership('confirms')] }),
        })
      );
      expect(output.batch[0]).toMatchObject({
        flaky_probe: true,
        classifier: { reason: 'flaky_probe' },
      });
      expect(output.skipped_count).toBe(0);
    });
  });

  describe('skipped_detection_ids, what a skipped rule is stamped up to', () => {
    const skippable = () => jest.fn(async () => membersOf({ 'rule-A': [membership('confirms')] }));

    it('lists the detections it skipped, so a newer one it never saw is not stamped', async () => {
      const output = await classifyBatch(
        batchParams({
          rows: [detectionRow('rule-A'), detectionRow('rule-B')],
          findLiveMembers: skippable(),
        })
      );

      expect(output.skipped_detection_ids).toEqual(['rule-A-detection']);
    });

    it('records on each skip what it saw, in a shape the marker route accepts', async () => {
      const output = await classifyBatch(
        batchParams({ rows: [detectionRow('rule-A')], findLiveMembers: skippable() })
      );

      expect(output.skips).toEqual([
        {
          rule_uuid: 'rule-A',
          skip: {
            reason: 'still_breaching',
            probe_status: 'ok',
            probe_has_rows: true,
            probe_window_minutes: 20,
            event_id: 'event-1',
            event_title: 'Checkout — request failures',
            stored_verdict: 'confirms',
          },
        },
      ]);
      const route = detectionSkipSchema.omit({ checked_at: true }).strict();
      expect(route.safeParse(output.skips[0].skip).success).toBe(true);
    });
  });

  describe('the age of the verdict a skip rests on', () => {
    const aged = (overrides: Partial<LiveRuleMembership>) =>
      membersOf({ 'rule-A': [{ ...membership('confirms'), ...overrides }] });
    const decide = async (memberships: Map<string, LiveRuleMembership[]>) =>
      decided(
        await classifyBatch(
          batchParams({ rows: [detectionRow('rule-A')], findLiveMembers: async () => memberships })
        )
      )['rule-A'];

    it('keeps the skip when a fresh verdict sits on an old series', async () => {
      const decision = await decide(
        aged({
          createdAt: new Date(NOW - 72 * HOUR_MS).toISOString(),
          verifiedAt: new Date(NOW - HOUR_MS).toISOString(),
        })
      );

      expect(decision).toMatchObject({ decision: 'skip', reason: 'still_breaching' });
    });

    it('sends it to the agent when an old verdict sits on a new series', async () => {
      const decision = await decide(
        aged({
          createdAt: new Date(NOW - HOUR_MS).toISOString(),
          verifiedAt: new Date(NOW - 48 * HOUR_MS).toISOString(),
        })
      );

      expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'series_too_old' });
    });

    it.each([
      ['in the future', () => new Date(NOW + 48 * HOUR_MS).toISOString()],
      ['unreadable', () => 'not a date'],
    ])('does not trust a verdict time that is %s: the series age decides', async (_name, time) => {
      const decision = await decide(
        aged({ createdAt: new Date(NOW - 48 * HOUR_MS).toISOString(), verifiedAt: time() })
      );

      expect(decision).toMatchObject({ decision: 'needs_agent', reason: 'series_too_old' });
    });
  });

  it('keeps a row it cannot read, without a decision', async () => {
    const unreadable = [null, {}];
    const rows = [unreadable, detectionRow('rule-A')];

    const output = await classifyBatch(batchParams({ rows }));

    expect(output.batch).toHaveLength(2);
    expect(Object.keys(decided(output))).toEqual(['rule-A']);
  });
});

describe('classifyDetectionsStepDefinition', () => {
  const settings = {
    columns: COLUMNS,
    space_id: 'default',
    probe_window_minutes: 60,
    probe_timeout_ms: 8_000,
    probe_concurrency: 5,
    budget_ms: 20_000,
    max_skip_age_hours: 24,
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
    ['max_skip_age_hours below 1', { max_skip_age_hours: 0 }],
    ['max_skip_age_hours above 720', { max_skip_age_hours: 721 }],
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
    expect(decided(output)).toMatchObject({
      'rule-A': { decision: 'skip', reason: 'still_breaching', probe_status: 'ok' },
    });
    expect(output.batch).toEqual([]);
    expect(output.skipped_rule_uuids).toEqual(['rule-A']);
    const probeRequest = query.mock.calls
      .map(([request]) => request as { query: string; params?: unknown })
      .find((request) => request.query.includes('LIMIT 1'));
    expect(probeRequest?.query).toBe(`${STORED_QUERY}\n| LIMIT 1`);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('classifyDetections'));
  });

  it('runs the bucketed baseline query once', async () => {
    const { definition } = createDefinition();
    const query = jest.fn(async (request: { query: string }) =>
      request.query.includes('.rule-events')
        ? membersResponse
        : { columns: [{ name: 'x', type: 'keyword' }], values: [] }
    );

    const output = await runHandler(
      definition,
      { ...settings, rows: [detectionRow('rule-A')] },
      { esql: { query } }
    );

    const bucketed = query.mock.calls.filter(([request]) => request.query.includes('BUCKET'));
    expect(bucketed).toHaveLength(1);
    expect(decided(output)['rule-A'].baseline).toMatchObject({ samples: 60 });
  });

  it('treats a missing rows input as an empty batch', async () => {
    const { definition } = createDefinition();
    const query = jest.fn();

    expect(definition.inputSchema.safeParse(settings).success).toBe(true);
    const output = await runHandler(definition, settings, { esql: { query } });

    expect(query).not.toHaveBeenCalled();
    expect(output).toMatchObject({ batch: [], row_count: 0 });
  });
});
