/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleCreationResult } from '../rule_creation_client';
import { DRAFT_STEP_ID, RULE_CREATION_TOOL_ID } from '../constants';
import {
  armTraceEvaluators,
  assertToolSpansReachable,
  createToolRoutingEvaluator,
  extractConversationId,
  toolSpanJoinClauses,
} from './tool_routing';

const log = {
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

const esWith = (
  handler: (query: string) => {
    columns: Array<{ name: string; type: string }>;
    values: Array<Array<number | string | null>>;
  }
) =>
  ({
    esql: { query: jest.fn(async ({ query }: { query: string }) => handler(query)) },
  } as unknown as EsClient);

const counts = (tool: number, required: number) => ({
  columns: [
    { name: 'tool_calls', type: 'long' },
    { name: 'required_tool_calls', type: 'long' },
  ],
  values: [[tool, required]] as Array<Array<number | string | null>>,
});

const spans = (n: number) => ({
  columns: [{ name: 'tool_spans', type: 'long' }],
  values: [[n]] as Array<Array<number | string | null>>,
});

const result = (over: Partial<RuleCreationResult> = {}): RuleCreationResult =>
  ({
    rule: { name: 'r' },
    pendingApproval: false,
    traceId: 'trace-1',
    workflowExecutionId: 'exec-1',
    stepExecutions: [{ stepId: DRAFT_STEP_ID, output: { conversation_id: 'conv-1' } }],
    ...over,
  } as unknown as RuleCreationResult);

const evaluateWith = (client: EsClient, output: RuleCreationResult) =>
  createToolRoutingEvaluator({ traceEsClient: client, log }).evaluate({
    input: {},
    output,
    expected: {},
    metadata: undefined,
  } as never);

describe('extractConversationId', () => {
  it('reads the draft step conversation id', () => {
    expect(extractConversationId(result())).toBe('conv-1');
  });

  it('returns undefined when the draft step persisted none', () => {
    expect(
      extractConversationId(
        result({ stepExecutions: [{ stepId: DRAFT_STEP_ID, output: {} }] as never })
      )
    ).toBeUndefined();
  });
});

describe('toolSpanJoinClauses', () => {
  it('tries the workflow trace id before the conversation id', () => {
    const names = toolSpanJoinClauses({ traceId: 't', conversationId: 'c' }).map((c) => c.name);
    expect(names).toEqual(['workflow trace id', 'gen_ai.conversation.id']);
  });

  it('omits keys that are absent', () => {
    expect(toolSpanJoinClauses({ conversationId: 'c' })).toHaveLength(1);
    expect(toolSpanJoinClauses({})).toHaveLength(0);
  });

  it('matches the conversation id both raw and in the hashed form spans are exported with', () => {
    // Agent Builder hashes gen_ai.conversation.id on export unless
    // agentBuilder:tracing:includeRealIds is on. The hash is hardcoded (sha256, first 16 hex)
    // so this fails if the join stops hashing, rather than agreeing with whatever it computes.
    const [clause] = toolSpanJoinClauses({
      conversationId: '3f2b9a10-1111-4c2d-9e8f-0123456789ab',
    });
    expect(clause.where).toBe(
      'attributes.gen_ai.conversation.id IN ("3f2b9a10-1111-4c2d-9e8f-0123456789ab", "6eef11fb8dd0b621")'
    );
  });
});

describe('createToolRoutingEvaluator', () => {
  it('scores 1 when the required tool was called on the workflow trace', async () => {
    const res = await evaluateWith(
      esWith(() => counts(3, 1)),
      result()
    );
    expect(res.score).toBe(1);
    expect(res.explanation).toContain('workflow trace id');
  });

  it('scores 0 when tool spans exist but none are the required tool', async () => {
    const res = await evaluateWith(
      esWith(() => counts(4, 0)),
      result()
    );
    expect(res.score).toBe(0);
  });

  it('falls back to the conversation id when the trace join finds nothing', async () => {
    const client = esWith((q) => (q.includes('trace.id') ? counts(0, 0) : counts(2, 1)));
    const res = await evaluateWith(client, result());
    expect(res.score).toBe(1);
    expect(res.explanation).toContain('gen_ai.conversation.id');
  });

  it('never scores 0 when NO tool spans are reachable — that is unmeasured, not failure', async () => {
    const client = esWith((q) => (q.includes('STATS tool_spans') ? spans(0) : counts(0, 0)));
    const res = await evaluateWith(client, result());
    expect(res.score).toBeNull();
    expect(res.label).toBe('unavailable');
    expect(res.explanation).toContain('NO TOOL spans at all');
  });

  it('diagnoses attribute drift when the cluster has spans that do not match', async () => {
    const client = esWith((q) => (q.includes('STATS tool_spans') ? spans(57) : counts(0, 0)));
    const res = await evaluateWith(client, result());
    expect(res.score).toBeNull();
    expect(res.explanation).toContain('57');
    expect(res.explanation).toContain('attribute drift');
  });

  it('is unavailable when the run carries no join keys at all', async () => {
    const res = await evaluateWith(
      esWith(() => counts(9, 9)),
      result({ traceId: undefined, stepExecutions: [] as never })
    );
    expect(res.score).toBeNull();
  });

  it('queries for the tool id the workflow prompt names', async () => {
    const seen: string[] = [];
    const client = esWith((q) => {
      seen.push(q);
      return counts(1, 1);
    });
    await evaluateWith(client, result());
    expect(seen[0]).toContain(RULE_CREATION_TOOL_ID);
  });
});

describe('assertToolSpansReachable', () => {
  const quick = { timeoutMs: 30, pollIntervalMs: 5 };
  it('passes when spans are reachable on the first key', async () => {
    await expect(
      assertToolSpansReachable({ traceEsClient: esWith(() => spans(4)), probe: result(), log })
    ).resolves.toBe('reachable');
  });

  it('passes when only the conversation-id key reaches spans', async () => {
    const client = esWith((q) => (q.includes('trace.id') ? spans(0) : spans(2)));
    await expect(
      assertToolSpansReachable({ traceEsClient: client, probe: result(), log })
    ).resolves.toBe('reachable');
  });

  it('THROWS when no key reaches a span — arming evaluators here would be dishonest', async () => {
    await expect(
      assertToolSpansReachable({
        traceEsClient: esWith(() => spans(0)),
        probe: result(),
        log,
        ...quick,
      })
    ).rejects.toThrow(/No agent TOOL spans are reachable/);
  });

  it('waits for late spans: passes when they land after several empty polls', async () => {
    let polls = 0;
    const client = esWith(() => spans(++polls > 6 ? 3 : 0));
    await expect(
      assertToolSpansReachable({
        traceEsClient: client,
        probe: result(),
        log,
        timeoutMs: 2_000,
        pollIntervalMs: 1,
      })
    ).resolves.toBe('reachable');
    expect(polls).toBeGreaterThan(6);
  });

  it('keeps polling until the deadline before failing, and fails with the same error', async () => {
    const client = esWith(() => spans(0));
    const started = Date.now();
    await expect(
      assertToolSpansReachable({
        traceEsClient: client,
        probe: result(),
        log,
        timeoutMs: 120,
        pollIntervalMs: 20,
      })
    ).rejects.toThrow(/No agent TOOL spans are reachable.*waited 120ms/s);
    expect(Date.now() - started).toBeGreaterThanOrEqual(80);
    // two join keys per round, several rounds
    expect((client.esql.query as jest.Mock).mock.calls.length).toBeGreaterThan(4);
  });

  it('fails after the wait for a trace id that matches no span (mutation probe)', async () => {
    // The fake only knows trace-1 / conv-1; a non-existent id must stay red after the wait.
    const client = esWith((q) =>
      q.includes('trace-1') || q.includes('conv-1') ? spans(2) : spans(0)
    );
    await expect(
      assertToolSpansReachable({
        traceEsClient: client,
        probe: result({ traceId: 'does-not-exist', stepExecutions: [] } as never),
        log,
        ...quick,
      })
    ).rejects.toThrow(/No agent TOOL spans are reachable/);
  });

  it('reports skipped (not reachable) when the quality gate declined the probe', async () => {
    const client = esWith(() => spans(0));
    await expect(
      assertToolSpansReachable({
        traceEsClient: client,
        probe: result({ skipped: true } as never),
        log,
      })
    ).resolves.toBe('skipped');
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('declined'));
  });

  it('demands the SAME span predicate the evaluators score on, not just TOOL kind', async () => {
    // Inner-tool spans are TOOL-kind with no call id; accepting them would arm evaluators
    // that then score N/A on every example.
    const queries: string[] = [];
    const client = esWith((q) => {
      queries.push(q);
      return spans(3);
    });
    await assertToolSpansReachable({ traceEsClient: client, probe: result(), log });
    expect(queries[0]).toContain('attributes.gen_ai.tool.call.id IS NOT NULL');
  });

  it('THROWS when the only reachable spans carry no tool.call.id', async () => {
    // Inner-tool spans only: TOOL kind matches, the call-id filter does not.
    const client = esWith((q) =>
      q.includes('attributes.gen_ai.tool.call.id IS NOT NULL') ? spans(0) : spans(7)
    );
    await expect(
      assertToolSpansReachable({
        traceEsClient: client,
        probe: result(),
        log,
        ...quick,
      })
    ).rejects.toThrow(/No agent TOOL spans are reachable/);
  });
});

describe('armTraceEvaluators', () => {
  const quick = { timeoutMs: 30, pollIntervalMs: 5 };
  const declined = result({ skipped: true, skipReason: 'low evidence' } as never);

  it('returns the first probe whose spans are reachable', async () => {
    const runProbe = jest.fn(async () => result());
    await expect(
      armTraceEvaluators({
        inputs: ['a', 'b'],
        runProbe,
        traceEsClient: esWith(() => spans(2)),
        log,
        ...quick,
      })
    ).resolves.toMatchObject({ traceId: 'trace-1' });
    expect(runProbe).toHaveBeenCalledTimes(1);
  });

  it('re-probes with the next gap when the first is declined', async () => {
    const runProbe = jest.fn().mockResolvedValueOnce(declined).mockResolvedValueOnce(result());
    await armTraceEvaluators({
      inputs: ['a', 'b'],
      runProbe,
      traceEsClient: esWith(() => spans(2)),
      log,
      ...quick,
    });
    expect(runProbe).toHaveBeenNthCalledWith(1, 'a');
    expect(runProbe).toHaveBeenNthCalledWith(2, 'b');
  });

  it('THROWS when every probe is declined — never reports evaluators armed', async () => {
    const runProbe = jest.fn(async () => declined);
    await expect(
      armTraceEvaluators({
        inputs: ['a', 'b'],
        runProbe,
        traceEsClient: esWith(() => spans(0)),
        log,
        ...quick,
      })
    ).rejects.toThrow(/trace reachability probes were declined/);
    expect(runProbe).toHaveBeenCalledTimes(2);
  });

  it('still fails on a non-skipped probe with zero spans', async () => {
    await expect(
      armTraceEvaluators({
        inputs: ['a', 'b'],
        runProbe: async () => result(),
        traceEsClient: esWith(() => spans(0)),
        log,
        ...quick,
      })
    ).rejects.toThrow(/No agent TOOL spans are reachable/);
  });
});
