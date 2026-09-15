/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { RuleCreationResult } from '../rule_creation_client';
import { DRAFT_STEP_ID, RULE_CREATION_TOOL_ID } from '../constants';
import {
  createTrajectoryEvaluators,
  createTrajectoryFetcher,
  scoreCallCount,
  scoreKnownTools,
} from './trajectory';

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

const CREATE = RULE_CREATION_TOOL_ID;
const PREVIEW = 'security.run_rule_preview';
const LABS = 'security.security_labs_search';
const INTERNAL = internalTools.loadSkill;
// Stand-in for the ids GET /api/agent_builder/tools returns on the stack under test.
const KNOWN = new Set([CREATE, PREVIEW, LABS]);

const AGENT_TRACE = 'agent-trace-1';
const COLS = [
  { name: 'span_id', type: 'keyword' },
  { name: 'trace_id', type: 'keyword' },
  { name: 'attributes.gen_ai.tool.name', type: 'keyword' },
];
/** One row per name, each its own span; `spanIds` overrides to simulate re-indexed copies. */
const rows = (names: Array<string | null>, spanIds?: string[]) => ({
  columns: COLS,
  values: names.map((n, i) => [spanIds?.[i] ?? `span-${i}`, AGENT_TRACE, n]),
});
const esWith = (handler: (query: string, call: number) => unknown) => {
  let calls = 0;
  const query = jest.fn(async ({ query: q }: { query: string }) => handler(q, ++calls));
  return { client: { esql: { query } } as unknown as EsClient, query };
};

const esReturning = (names: Array<string | null>) => esWith(() => rows(names));

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

const evaluators = (client: EsClient, maxPolls?: number) =>
  createTrajectoryEvaluators({
    traceEsClient: client,
    log,
    knownToolIds: KNOWN,
    ...noWait,
    maxPolls,
  });

const evaluateAll = async (client: EsClient, output: RuleCreationResult, maxPolls?: number) =>
  Promise.all(
    evaluators(client, maxPolls).map((e) =>
      e.evaluate({ input: {}, output, expected: {}, metadata: undefined } as never)
    )
  );

const settled = (toolNames: string[]) => ({
  available: true as const,
  toolNames,
  agentTraceId: AGENT_TRACE,
  joinedOn: 'workflow trace id',
  settled: true,
});

describe('createTrajectoryFetcher', () => {
  it('asks for TOOL spans ordered by time and keeps only the tool name', async () => {
    const { client, query } = esReturning([CREATE]);
    await fetcher(client)(result());
    const q = query.mock.calls[0][0].query as string;
    expect(q).toContain('attributes.elastic.inference.span.kind == "TOOL"');
    expect(q).toContain('attributes.gen_ai.tool.call.id IS NOT NULL');
    expect(q).toContain('SORT @timestamp ASC');
    expect(q).toContain('KEEP span_id, trace_id, attributes.gen_ai.tool.name');
  });

  it('drops rows with no tool name', async () => {
    const { client } = esReturning([null, CREATE, null]);
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, toolNames: [CREATE] });
  });

  it('counts a span once even when it is indexed into two data streams', async () => {
    const twice = [CREATE, CREATE, PREVIEW, PREVIEW];
    const { client } = esReturning(twice);
    // Same span ids repeated = the agent_builder.otel and generic.otel copies of one call.
    (client.esql.query as jest.Mock).mockImplementation(async () =>
      rows(twice, ['a', 'a', 'b', 'b'])
    );
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, toolNames: [CREATE, PREVIEW] });
  });

  it("reports the agent's own trace id, which is not the workflow's", async () => {
    const { client } = esReturning([CREATE]);
    const t = await fetcher(client)(result({ traceId: 'workflow-trace' }));
    expect(t).toMatchObject({ available: true, agentTraceId: AGENT_TRACE });
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

  it('is unavailable — never zero — when no join key reaches spans', async () => {
    const { client } = esReturning([]);
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: false });
  });

  it('keeps polling until two consecutive reads agree, so a mid-flush export is not scored short', async () => {
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

  it('resolves each run once and shares it across evaluators', async () => {
    const { client, query } = esReturning([CREATE]);
    await evaluateAll(client, result());
    // One settled read is two polls; two evaluators must not double that.
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe('createTrajectoryEvaluators', () => {
  it('scores a skill-conformant run 1 on each named series and names the agent trace', async () => {
    const { client } = esReturning([LABS, INTERNAL, CREATE, PREVIEW]);
    expect(evaluators(client).map((e) => e.name)).toEqual([
      'Trajectory: Call Count',
      'Trajectory: Known Tools',
    ]);
    const results = await evaluateAll(client, result());
    expect(results.map((r) => r.score)).toEqual([1, 1]);
    for (const r of results) {
      expect((r.metadata as Record<string, unknown>).agentTraceId).toBe(AGENT_TRACE);
    }
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
    for (const r of await evaluateAll(client, result(), 2)) {
      expect(r.label).toBe('potentially_incomplete');
      expect((r.metadata as Record<string, unknown>).incomplete).toBe(true);
    }
  });
});

describe('scoreCallCount', () => {
  it('is 1 up to the bound of 8 and 0 past it', () => {
    expect(scoreCallCount(settled([CREATE])).score).toBe(1);
    expect(scoreCallCount(settled(Array(8).fill(CREATE))).score).toBe(1);
    expect(scoreCallCount(settled(Array(9).fill(CREATE))).score).toBe(0);
  });
});

describe('scoreKnownTools', () => {
  const score = scoreKnownTools(KNOWN);

  it('accepts the registered tools it was given and Agent Builder internal tools', () => {
    const r = score(settled([LABS, INTERNAL, CREATE, PREVIEW]));
    expect(r.score).toBe(1);
    expect(r.metadata).toMatchObject({ internal: [INTERNAL], unknown: [] });
  });

  it('does not treat privacy-anonymized "custom" spans as hallucinated', () => {
    const r = score(settled([CREATE, 'custom']));
    expect(r.score).toBe(1);
    expect(r.metadata.anonymized).toEqual(['custom']);
  });

  it('penalizes proportionally and names the unreachable tools', () => {
    const r = score(settled([CREATE, 'made_up_tool', 'made_up_tool', PREVIEW]));
    expect(r.score).toBe(0.5);
    expect(r.metadata.unknown).toEqual(['made_up_tool', 'made_up_tool']);
    expect(r.explanation).toContain('made_up_tool');
  });
});
