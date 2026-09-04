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
  it('passes when spans are reachable on the first key', async () => {
    await expect(
      assertToolSpansReachable({ traceEsClient: esWith(() => spans(4)), probe: result(), log })
    ).resolves.toBeUndefined();
  });

  it('passes when only the conversation-id key reaches spans', async () => {
    const client = esWith((q) => (q.includes('trace.id') ? spans(0) : spans(2)));
    await expect(
      assertToolSpansReachable({ traceEsClient: client, probe: result(), log })
    ).resolves.toBeUndefined();
  });

  it('THROWS when no key reaches a span — arming evaluators here would be dishonest', async () => {
    await expect(
      assertToolSpansReachable({ traceEsClient: esWith(() => spans(0)), probe: result(), log })
    ).rejects.toThrow(/No agent TOOL spans are reachable/);
  });

  it('skips the check when the quality gate declined the probe', async () => {
    const client = esWith(() => spans(0));
    await expect(
      assertToolSpansReachable({
        traceEsClient: client,
        probe: result({ skipped: true } as never),
        log,
      })
    ).resolves.toBeUndefined();
  });
});
