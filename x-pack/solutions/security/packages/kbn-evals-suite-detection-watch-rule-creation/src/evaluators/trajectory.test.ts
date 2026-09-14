/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { internalTools, platformCoreTools } from '@kbn/agent-builder-common/tools';
import type { RuleCreationResult } from '../rule_creation_client';
import {
  DRAFT_STEP_ID,
  RULE_CREATION_TOOL_ID,
  RULE_PREVIEW_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  TRAJECTORY_MAX_TOOL_CALLS,
} from '../constants';
import {
  createTrajectoryEvaluators,
  createTrajectoryFetcher,
  scoreCallCount,
  scoreCallOrder,
  scoreKnownTools,
} from './trajectory';

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

const NAME_COL = [{ name: 'attributes.gen_ai.tool.name', type: 'keyword' }];
const rows = (names: Array<string | null>) => ({
  columns: NAME_COL,
  values: names.map((n) => [n]),
});
const probe = (n: number) => ({ columns: [{ name: 'tool_spans', type: 'long' }], values: [[n]] });

/** Handler receives the query text and the 1-based count of queries so far, to script polls. */
const esWith = (handler: (query: string, call: number) => unknown) => {
  let calls = 0;
  const query = jest.fn(async ({ query: q }: { query: string }) => handler(q, ++calls));
  return { client: { esql: { query } } as unknown as EsClient, query };
};

/** Every join returns the same rows; the probe query returns `cluster` spans. */
const esReturning = (names: Array<string | null>, cluster = 0) =>
  esWith((q) => (q.includes('STATS tool_spans') ? probe(cluster) : rows(names)));

const result = (over: Partial<RuleCreationResult> = {}): RuleCreationResult =>
  ({
    rule: { name: 'r' },
    pendingApproval: false,
    traceId: 'trace-1',
    workflowExecutionId: 'exec-1',
    stepExecutions: [{ stepId: DRAFT_STEP_ID, output: { conversation_id: 'conv-1' } }],
    ...over,
  } as unknown as RuleCreationResult);

const noWait = { settleMs: 0, sleep: async () => {} };

const fetcher = (client: EsClient, opts: { maxPolls?: number } = {}) =>
  createTrajectoryFetcher({ traceEsClient: client, log, ...noWait, ...opts });

const evaluateAll = async (client: EsClient, output: RuleCreationResult) =>
  Promise.all(
    createTrajectoryEvaluators({ traceEsClient: client, log, ...noWait }).map((e) =>
      e.evaluate({ input: {}, output, expected: {}, metadata: undefined } as never)
    )
  );

const CREATE = RULE_CREATION_TOOL_ID;
const PREVIEW = RULE_PREVIEW_TOOL_ID;
const LABS = SECURITY_LABS_SEARCH_TOOL_ID;
const GEN_ESQL = platformCoreTools.generateEsql;
const INTERNAL = internalTools.loadSkill;

const settled = (toolNames: string[]) => ({
  available: true as const,
  toolNames,
  joinedOn: 'workflow trace id',
  settled: true,
});

describe('createTrajectoryFetcher', () => {
  it('asks for TOOL spans ordered by time and keeps only the tool name', async () => {
    const { client, query } = esReturning([CREATE]);
    await fetcher(client)(result());
    const q = query.mock.calls[0][0].query as string;
    expect(q).toContain('attributes.elastic.inference.span.kind == "TOOL"');
    expect(q).toContain('SORT @timestamp ASC');
    expect(q).toContain('KEEP attributes.gen_ai.tool.name');
    expect(q).toContain('trace.id == "trace-1"');
  });

  it('drops rows with no tool name', async () => {
    const { client } = esReturning([null, CREATE, null]);
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, toolNames: [CREATE] });
  });

  it('falls back to the conversation id when the trace join reaches nothing', async () => {
    const { client } = esWith((q) => (q.includes('trace.id') ? rows([]) : rows([CREATE])));
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, joinedOn: 'gen_ai.conversation.id' });
  });

  it('is unavailable when the run carries no join keys', async () => {
    const { client, query } = esReturning([CREATE]);
    const t = await fetcher(client)(result({ traceId: undefined, stepExecutions: [] as never }));
    expect(t).toMatchObject({ available: false });
    expect(query).not.toHaveBeenCalled();
  });

  it('is unavailable — never zero — when no join key reaches spans, and says why', async () => {
    const { client } = esReturning([], 57);
    const t = await fetcher(client)(result());
    expect(t.available).toBe(false);
    if (!t.available) {
      expect(t.explanation).toContain('57');
      expect(t.explanation).toContain('attribute drift');
    }
  });

  it('keeps polling until two consecutive reads agree, so a mid-flush export is not scored short', async () => {
    // Batch exporter is still flushing: 1 span, then 3, then 3.
    const byPoll: Record<number, string[]> = { 1: [CREATE], 2: [LABS, CREATE, PREVIEW] };
    const { client, query } = esWith((_q, call) => rows(byPoll[call] ?? [LABS, CREATE, PREVIEW]));
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, settled: true, toolNames: [LABS, CREATE, PREVIEW] });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('reports an unsettled trajectory when the span count keeps growing', async () => {
    const { client } = esWith((_q, call) => rows(Array(call).fill(CREATE)));
    const t = await fetcher(client, { maxPolls: 3 })(result());
    expect(t).toMatchObject({ available: true, settled: false });
  });

  it('resolves each run once and shares it across the three evaluators', async () => {
    const { client, query } = esReturning([CREATE]);
    const evaluators = createTrajectoryEvaluators({ traceEsClient: client, log, ...noWait });
    const output = result();
    for (const e of evaluators) {
      await e.evaluate({ input: {}, output, expected: {}, metadata: undefined } as never);
    }
    // One settled read = two polls. Three evaluators must not triple that.
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe('createTrajectoryEvaluators', () => {
  it('emits three independently named series', () => {
    const { client } = esReturning([CREATE]);
    const names = createTrajectoryEvaluators({ traceEsClient: client, log }).map((e) => e.name);
    expect(names).toEqual([
      'Trajectory: Call Count',
      'Trajectory: Call Order',
      'Trajectory: Known Tools',
    ]);
  });

  it('scores a skill-conformant run 1 on every series', async () => {
    const { client } = esReturning([LABS, INTERNAL, CREATE, PREVIEW]);
    const scores = (await evaluateAll(client, result())).map((r) => r.score);
    expect(scores).toEqual([1, 1, 1]);
  });

  it('scores null with label unavailable on every series when spans are unreachable', async () => {
    const { client } = esReturning([]);
    for (const r of await evaluateAll(client, result())) {
      expect(r.score).toBeNull();
      expect(r.label).toBe('unavailable');
    }
  });

  it('labels every series potentially_incomplete when the span set never settled', async () => {
    const { client } = esWith((_q, call) => rows(Array(call).fill(CREATE)));
    const results = await Promise.all(
      createTrajectoryEvaluators({ traceEsClient: client, log, ...noWait, maxPolls: 2 }).map((e) =>
        e.evaluate({ input: {}, output: result(), expected: {}, metadata: undefined } as never)
      )
    );
    for (const r of results) {
      expect(r.label).toBe('potentially_incomplete');
      expect((r.metadata as Record<string, unknown>).incomplete).toBe(true);
    }
  });
});

describe('scoreCallCount', () => {
  it('is 1 at or below the bound', () => {
    expect(scoreCallCount(settled([CREATE])).score).toBe(1);
    expect(scoreCallCount(settled(Array(TRAJECTORY_MAX_TOOL_CALLS).fill(CREATE))).score).toBe(1);
  });

  it('decays linearly past the bound and reaches 0 at twice the bound', () => {
    const half = scoreCallCount(settled(Array(TRAJECTORY_MAX_TOOL_CALLS * 1.5).fill(CREATE)));
    expect(half.score).toBeCloseTo(0.5);
    expect(scoreCallCount(settled(Array(TRAJECTORY_MAX_TOOL_CALLS * 2).fill(CREATE))).score).toBe(
      0
    );
  });
});

describe('scoreCallOrder', () => {
  it('is 1 when preview follows create', () => {
    expect(scoreCallOrder(settled([CREATE, PREVIEW]))).toMatchObject({
      score: 1,
      metadata: { checked: 1, violations: [] },
    });
  });

  it('is 0 when preview precedes create', () => {
    expect(scoreCallOrder(settled([PREVIEW, CREATE]))).toMatchObject({
      score: 0,
      metadata: { violations: [[CREATE, PREVIEW]] },
    });
  });

  it('judges on first occurrences, so a premature preview is not excused by a later one', () => {
    expect(scoreCallOrder(settled([PREVIEW, CREATE, PREVIEW])).score).toBe(0);
  });

  it('is vacuously 1, and says so, when no constraint applies', () => {
    const r = scoreCallOrder(settled([CREATE]));
    expect(r.score).toBe(1);
    expect(r.metadata.checked).toBe(0);
    expect(r.explanation).toContain('no precedence constraint');
  });

  it('does not require generate_esql before create — create builds its own ES|QL', () => {
    expect(scoreCallOrder(settled([CREATE, PREVIEW, GEN_ESQL])).score).toBe(1);
  });
});

describe('scoreKnownTools', () => {
  it('accepts every skill registry tool and Agent Builder internal tools', () => {
    const r = scoreKnownTools(settled([LABS, GEN_ESQL, INTERNAL, CREATE, PREVIEW]));
    expect(r.score).toBe(1);
    expect(r.metadata).toMatchObject({ internal: [INTERNAL], unknown: [] });
  });

  it('does not treat privacy-anonymized "custom" spans as hallucinated', () => {
    const r = scoreKnownTools(settled([CREATE, 'custom']));
    expect(r.score).toBe(1);
    expect(r.metadata.anonymized).toEqual(['custom']);
    expect(r.explanation).toContain('anonymized');
  });

  it('penalizes proportionally and names the unreachable tools', () => {
    const r = scoreKnownTools(settled([CREATE, 'made_up_tool', 'made_up_tool', PREVIEW]));
    expect(r.score).toBe(0.5);
    expect(r.metadata.unknown).toEqual(['made_up_tool', 'made_up_tool']);
    expect(r.explanation).toContain('made_up_tool');
  });
});
