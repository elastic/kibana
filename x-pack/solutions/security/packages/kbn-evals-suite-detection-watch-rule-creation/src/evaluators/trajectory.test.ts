/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleCreationResult } from '../rule_creation_client';
import { DRAFT_STEP_ID, RULE_CREATION_SKILL_ID, RULE_CREATION_TOOL_ID } from '../constants';
import {
  createTrajectoryEvaluators,
  createTrajectoryFetcher,
  scoreCallCount,
  scoreCallOrder,
} from './trajectory';

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

const SKILL = 'load_skill';
const CREATE = RULE_CREATION_TOOL_ID;
const PREVIEW = 'security.run_rule_preview';
const LABS = 'security.security_labs_search';
const LIST_INDICES = 'platform.core.list_indices';
const GEN_ESQL = 'platform.core.generate_esql';
const ATTACH_READ = 'attachments.read';

const AGENT_TRACE = 'agent-trace-1';
const COLS = [
  { name: 'span_id', type: 'keyword' },
  { name: 'trace_id', type: 'keyword' },
  { name: 'attributes.gen_ai.tool.name', type: 'keyword' },
  { name: 'attributes.gen_ai.tool.call.arguments', type: 'keyword' },
];
const skillArgs = (skill: string) => JSON.stringify({ skill });
/** One row per name, each its own span; `spanIds` overrides to simulate re-indexed copies. */
const rows = (names: Array<string | null>, spanIds?: string[], skill = RULE_CREATION_SKILL_ID) => ({
  columns: COLS,
  values: names.map((n, i) => [
    spanIds?.[i] ?? `span-${i}`,
    AGENT_TRACE,
    n,
    n === SKILL ? skillArgs(skill) : null,
  ]),
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
  createTrajectoryEvaluators({ traceEsClient: client, log, ...noWait, maxPolls });

const evaluateAll = async (client: EsClient, output: RuleCreationResult, maxPolls?: number) =>
  Promise.all(
    evaluators(client, maxPolls).map((e) =>
      e.evaluate({ input: {}, output, expected: {}, metadata: undefined } as never)
    )
  );

/** Builds a settled trajectory; `load_skill` loads RULE_CREATION_SKILL_ID unless told otherwise, `null` = unrecorded. */
const settled = (names: string[], skill: string | null = RULE_CREATION_SKILL_ID) => ({
  available: true as const,
  calls: names.map((name) => (name === SKILL ? { name, skill: skill ?? undefined } : { name })),
  agentTraceId: AGENT_TRACE,
  joinedOn: 'workflow trace id',
  settled: true,
});

describe('createTrajectoryFetcher', () => {
  it('asks for TOOL spans ordered by time and keeps only the tool name and arguments', async () => {
    const { client, query } = esReturning([CREATE]);
    await fetcher(client)(result());
    const q = query.mock.calls[0][0].query as string;
    expect(q).toContain('attributes.elastic.inference.span.kind == "TOOL"');
    expect(q).toContain('attributes.gen_ai.tool.call.id IS NOT NULL');
    expect(q).toContain('SORT @timestamp ASC');
    expect(q).toContain(
      'KEEP span_id, trace_id, attributes.gen_ai.tool.name, attributes.gen_ai.tool.call.arguments'
    );
  });

  it('drops rows with no tool name', async () => {
    const { client } = esReturning([null, CREATE, null]);
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, calls: [{ name: CREATE }] });
  });

  it('reads the loaded skill off load_skill arguments and nothing else', async () => {
    const { client } = esReturning([SKILL, CREATE]);
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({
      calls: [{ name: SKILL, skill: RULE_CREATION_SKILL_ID }, { name: CREATE }],
    });
  });

  it('leaves the skill undefined when arguments are absent or malformed', async () => {
    const { client } = esWith(() => ({
      columns: COLS,
      values: [
        ['a', AGENT_TRACE, SKILL, null],
        ['b', AGENT_TRACE, SKILL, 'not json'],
      ],
    }));
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ calls: [{ name: SKILL }, { name: SKILL }] });
  });

  it('counts a span once even when it is indexed into two data streams', async () => {
    const twice = [CREATE, CREATE, PREVIEW, PREVIEW];
    const { client } = esWith(() => rows(twice, ['a', 'a', 'b', 'b']));
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ calls: [{ name: CREATE }, { name: PREVIEW }] });
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
    const byPoll: Record<number, string[]> = { 1: [SKILL], 2: [SKILL, LABS, CREATE] };
    const { client, query } = esWith((_q, call) => rows(byPoll[call] ?? [SKILL, LABS, CREATE]));
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, settled: true });
    expect((t as { calls: Array<{ name: string }> }).calls.map((c) => c.name)).toEqual([
      SKILL,
      LABS,
      CREATE,
    ]);
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('does not treat two same-sized reads with different sequences as settled', async () => {
    const byPoll: Record<number, string[]> = { 1: [SKILL, LABS], 2: [SKILL, CREATE] };
    const { client, query } = esWith((_q, call) => rows(byPoll[call] ?? [SKILL, CREATE]));
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, settled: true });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('does not treat reads from different join keys as settled', async () => {
    const { client, query } = esWith((q, call) =>
      call === 1 && q.includes('trace.id') ? rows([]) : rows([SKILL, CREATE])
    );
    const t = await fetcher(client)(result());
    expect(t).toMatchObject({ available: true, settled: true, joinedOn: 'workflow trace id' });
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('reports an unsettled trajectory when the span count keeps growing', async () => {
    const { client } = esWith((_q, call) => rows(Array(call).fill(CREATE)));
    const t = await fetcher(client, { maxPolls: 3 })(result());
    expect(t).toMatchObject({ available: true, settled: false });
  });

  it('resolves each run once and shares it across evaluators', async () => {
    const { client, query } = esReturning([SKILL, CREATE]);
    await evaluateAll(client, result());
    // One settled read is two polls; two evaluators must not double that.
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe('createTrajectoryEvaluators', () => {
  it('scores a skill-conformant run 1 on each named series and names the agent trace', async () => {
    const { client } = esReturning([SKILL, LABS, CREATE, PREVIEW, ATTACH_READ]);
    expect(evaluators(client).map((e) => e.name)).toEqual([
      'Trajectory: Call Count',
      'Trajectory: Call Order',
    ]);
    const results = await evaluateAll(client, result());
    expect(results.map((r) => r.score)).toEqual([1, 1]);
    for (const r of results) {
      expect(r.metadata).toMatchObject({
        agentTraceId: AGENT_TRACE,
        toolNames: [SKILL, LABS, CREATE, PREVIEW, ATTACH_READ],
      });
    }
  });

  it('scores null with label unavailable on every series when spans are unreachable', async () => {
    const { client } = esReturning([]);
    for (const r of await evaluateAll(client, result())) {
      expect(r.score).toBeNull();
      expect(r.label).toBe('unavailable');
    }
  });

  it('scores null, not a number, when the span set never settled', async () => {
    const { client } = esWith((_q, call) => rows(Array(call).fill(SKILL)));
    for (const r of await evaluateAll(client, result(), 2)) {
      expect(r.score).toBeNull();
      expect(r.label).toBe('potentially_incomplete');
      expect(r.metadata).toMatchObject({ incomplete: true, agentTraceId: AGENT_TRACE });
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

describe('scoreCallOrder', () => {
  it('accepts skill → research → one draft → preview/attachments', () => {
    const r = scoreCallOrder(settled([SKILL, LABS, CREATE, PREVIEW, ATTACH_READ]));
    expect(r.score).toBe(1);
    expect(r.metadata).toMatchObject({
      loadedSkill: RULE_CREATION_SKILL_ID,
      drafts: 1,
      violations: [],
    });
  });

  it('accepts the minimal path: skill then draft', () => {
    expect(scoreCallOrder(settled([SKILL, CREATE])).score).toBe(1);
  });

  it('accepts the skill given as a path, as long as it is the right skill', () => {
    expect(
      scoreCallOrder(settled([SKILL, CREATE], `skill://${RULE_CREATION_SKILL_ID}`)).score
    ).toBe(1);
  });

  it('fails when the wrong skill was loaded', () => {
    const r = scoreCallOrder(settled([SKILL, CREATE], 'threat-hunting'));
    expect(r.score).toBe(0);
    expect(r.metadata.violations).toEqual([
      `loaded skill "threat-hunting" instead of ${RULE_CREATION_SKILL_ID}`,
    ]);
  });

  it('fails, and says why, when the loaded skill is not recorded on the span', () => {
    const r = scoreCallOrder(settled([SKILL, CREATE], null));
    expect(r.score).toBe(0);
    expect(r.metadata.violations).toEqual([expect.stringContaining('includeToolDetails')]);
  });

  it('fails a draft made without loading a skill first', () => {
    expect(scoreCallOrder(settled([CREATE])).metadata.violations).toEqual([
      'did not load a skill before anything else',
    ]);
    expect(scoreCallOrder(settled([CREATE, SKILL])).score).toBe(0);
  });

  it('fails research done before the skill was loaded', () => {
    const r = scoreCallOrder(settled([LABS, SKILL, CREATE]));
    expect(r.score).toBe(0);
    expect(r.metadata.violations).toEqual(['did not load a skill before anything else']);
  });

  it('fails a preview or attachment edit before the draft exists', () => {
    const r = scoreCallOrder(settled([SKILL, PREVIEW, CREATE]));
    expect(r.score).toBe(0);
    expect(r.metadata.finishedBeforeDrafting).toEqual([PREVIEW]);
    expect(r.explanation).toContain('before drafting');
  });

  it('accepts generate_esql after a preview, which the skill prescribes for zero-alert previews', () => {
    const r = scoreCallOrder(settled([SKILL, LABS, CREATE, PREVIEW, GEN_ESQL, ATTACH_READ]));
    expect(r.score).toBe(1);
    expect(r.metadata.exploredAfterDraft).toEqual([]);
  });

  it('still flags generate_esql after the draft when no preview came first', () => {
    const r = scoreCallOrder(settled([SKILL, CREATE, GEN_ESQL]));
    expect(r.score).toBe(0);
    expect(r.metadata.exploredAfterDraft).toEqual([GEN_ESQL]);
  });

  it('fails a run that drafted more than once', () => {
    const r = scoreCallOrder(settled([SKILL, CREATE, CREATE]));
    expect(r.score).toBe(0);
    expect(r.metadata.drafts).toBe(2);
  });

  it('fails research after the draft, and names what was explored', () => {
    const r = scoreCallOrder(
      settled([SKILL, CREATE, LIST_INDICES, LIST_INDICES, CREATE, ATTACH_READ])
    );
    expect(r.score).toBe(0);
    expect(r.metadata.exploredAfterDraft).toEqual([LIST_INDICES, LIST_INDICES]);
    expect(r.explanation).toContain('drafted 2 times');
    expect(r.explanation).toContain(LIST_INDICES);
  });

  it('flags a skill reload after drafting', () => {
    const r = scoreCallOrder(settled([SKILL, CREATE, SKILL, ATTACH_READ]));
    expect(r.score).toBe(0);
    expect(r.metadata.exploredAfterDraft).toEqual([SKILL]);
  });

  it('flags internal exploratory tools after drafting, not just registry tools', () => {
    const r = scoreCallOrder(settled([SKILL, CREATE, 'read_file', 'bash', ATTACH_READ]));
    expect(r.score).toBe(0);
    expect(r.metadata.exploredAfterDraft).toEqual(['read_file', 'bash']);
  });

  it('fails a run that never drafted', () => {
    const r = scoreCallOrder(settled([SKILL, LABS]));
    expect(r.score).toBe(0);
    expect(r.metadata.violations).toEqual(['never drafted a rule']);
  });
});
