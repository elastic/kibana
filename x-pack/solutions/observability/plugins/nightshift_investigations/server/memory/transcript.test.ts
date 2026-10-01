/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SET_HYPOTHESES_TOOL_ID } from '@kbn/agentic-investigations-plugin/common';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import {
  isEvidenceCall,
  readsSeededKnowledge,
  renderMemoryTranscript,
  stepsFromRound,
  stepsFromToolCalls,
  type TranscriptStep,
} from './transcript';

const tool = (
  toolId: string,
  params: Record<string, unknown>,
  resultText?: string,
  isError = false
): TranscriptStep => ({ kind: 'tool', toolId, params, resultText, isError });

const render = (investigation?: TranscriptStep[], toolCalls = [] as never[]) =>
  renderMemoryTranscript({
    task: 'why is checkout slow?',
    answer: 'Redis evictions.',
    investigation,
    toolCalls,
  });

describe('renderMemoryTranscript', () => {
  it('orders the task, the investigation, then the final answer', () => {
    const text = render([tool('nightshift_sandbox_bash', { command: 'esql "FROM x"' }, 'rows: 3')]);
    const at = ['## User task', '## Investigation', '## Final answer'].map((h) => text.indexOf(h));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  it('shows each evidence call with its result, in order, with agent notes between', () => {
    const text = render([
      { kind: 'reasoning', text: 'Check the cart cache first.' },
      tool(
        'nightshift_sandbox_bash',
        { command: 'curl $URL/_cat/indices' },
        'green open metrics-redis'
      ),
      tool(
        'nightshift_sandbox_bash',
        { command: 'curl $URL/metrics-redis/_search' },
        'evicted_keys: 4210'
      ),
    ]);
    expect(text).toContain('1. Agent note: Check the cart cache first.');
    expect(text).toContain('2. nightshift_sandbox_bash: curl $URL/_cat/indices');
    expect(text).toContain('Result: green open metrics-redis');
    expect(text).toContain('Result: evicted_keys: 4210');
    expect(text.indexOf('_cat/indices')).toBeLessThan(text.indexOf('metrics-redis/_search'));
  });

  it('marks failed calls as errors', () => {
    const text = render([
      tool(
        'nightshift_sandbox_bash',
        { command: 'curl $URL' },
        'HTTP 401 unable to authenticate',
        true
      ),
    ]);
    expect(text).toContain('ERROR: HTTP 401 unable to authenticate');
    expect(text).not.toContain('Result: HTTP 401');
  });

  it('shows every tool call, including reads of stored knowledge and progress reports', () => {
    const text = render([
      tool(
        'nightshift_sandbox_view_file',
        { file_path: '/workspace/memories/checkout-redis-evictions.md' },
        'MEMORY-BODY'
      ),
      tool('platform.streams.investigation_progress_report', { summary: 'STATUS-UPDATE' }, '{}'),
      tool('nightshift_sandbox_bash', { command: 'curl $URL/_cluster/health' }, 'status: green'),
    ]);
    expect(text).toContain('1. nightshift_sandbox_view_file');
    expect(text).toContain('checkout-redis-evictions.md');
    expect(text).toContain('Result: MEMORY-BODY');
    expect(text).toContain('2. platform.streams.investigation_progress_report');
    expect(text).toContain('STATUS-UPDATE');
    expect(text).toContain('3. nightshift_sandbox_bash: curl $URL/_cluster/health');
    expect(text).not.toContain('Loaded from prior context');
  });

  it('says so when a round made no tool calls', () => {
    expect(render([])).toContain('## Investigation\n(no tool calls)');
  });

  it('shrinks result excerpts before dropping steps when over budget', () => {
    const big = 'x'.repeat(5_000);
    const steps = Array.from({ length: 40 }, (_, i) =>
      tool('nightshift_sandbox_bash', { command: `q${i}` }, big)
    );
    const text = render(steps);
    expect(text.length).toBeLessThan(60_000);
    // Every call is still listed even though the excerpts had to shrink.
    expect(text).toContain('40. nightshift_sandbox_bash: q39');
    expect(text).not.toContain('steps omitted');
  });

  it('states how many later steps it dropped when even bare calls do not fit', () => {
    const steps = Array.from({ length: 2_000 }, (_, i) =>
      tool('nightshift_sandbox_bash', { command: `command-${i} ${'y'.repeat(400)}` }, 'r')
    );
    expect(render(steps)).toMatch(/\(\d+ later steps omitted\)/);
  });

  it('falls back to parameters only, and says results are unavailable', () => {
    const text = render(undefined, [
      { tool_id: 'nightshift_sandbox_bash', params: { command: 'ls' } },
    ] as never);
    expect(text).toContain('## Tool calls (parameters only; results unavailable)');
    expect(text).toContain('nightshift_sandbox_bash');
    expect(text).not.toContain('## Investigation');
  });

  it('lists every call in the fallback, without a per-call "not available" line', () => {
    const text = render(undefined, [
      {
        tool_id: 'nightshift_sandbox_view_file',
        params: { file_path: '/workspace/memories/a.md' },
      },
      {
        tool_id: 'nightshift_sandbox_bash',
        params: { command: 'curl -sS http://x/_cluster/health' },
      },
    ] as never);
    expect(text).toContain(
      '1. nightshift_sandbox_view_file: {"file_path":"/workspace/memories/a.md"}'
    );
    expect(text).toContain('2. nightshift_sandbox_bash: curl -sS http://x/_cluster/health');
    expect(text).not.toContain('not available');
  });
});

describe('stepsFromRound', () => {
  it('keeps reasoning and tool calls in order and reads results from text, stdout, and errors', () => {
    const steps = stepsFromRound([
      { type: 'pre_execution_workflow' },
      { type: 'reasoning', reasoning: 'plan' },
      {
        type: 'tool_call',
        tool_id: 'nightshift_sandbox_view_file',
        params: { file_path: '/a' },
        results: [{ type: 'other', data: { text: 'file body' } }],
      },
      {
        type: 'tool_call',
        tool_id: 'nightshift_sandbox_bash',
        params: { command: 'ls' },
        results: [{ type: 'other', data: { stdout: 'out', stderr: 'warn' } }],
      },
      {
        type: 'tool_call',
        tool_id: 'nightshift_sandbox_bash',
        params: { command: 'bad' },
        results: [{ type: 'error', data: { message: 'exit 22' } }],
      },
      { type: 'tool_call', tool_id: 'x', params: {} },
    ]);
    expect(steps).toEqual([
      { kind: 'reasoning', text: 'plan' },
      {
        kind: 'tool',
        toolId: 'nightshift_sandbox_view_file',
        params: { file_path: '/a' },
        resultText: 'file body',
        isError: false,
      },
      {
        kind: 'tool',
        toolId: 'nightshift_sandbox_bash',
        params: { command: 'ls' },
        resultText: 'out\nwarn',
        isError: false,
      },
      {
        kind: 'tool',
        toolId: 'nightshift_sandbox_bash',
        params: { command: 'bad' },
        resultText: 'exit 22',
        isError: true,
      },
      { kind: 'tool', toolId: 'x', params: {}, resultText: undefined, isError: false },
    ]);
  });
});

describe('stepsFromToolCalls', () => {
  it('returns nothing when no call carries results', () => {
    expect(
      stepsFromToolCalls([{ tool_id: 'nightshift_sandbox_bash', params: { command: 'ls' } }])
    ).toBeUndefined();
  });

  it('shows each call with its results, and marks calls without results', () => {
    expect(
      stepsFromToolCalls([
        {
          tool_id: 'nightshift_sandbox_bash',
          tool_call_id: 'tc-1',
          params: { command: 'esql' },
          results: [{ type: 'other', data: { stdout: 'pool exhausted' } }],
        },
        { tool_id: 'nightshift_sandbox_bash', tool_call_id: 'tc-2', params: { command: 'ls' } },
      ])
    ).toEqual([
      {
        kind: 'tool',
        toolId: 'nightshift_sandbox_bash',
        params: { command: 'esql' },
        resultText: 'pool exhausted',
        isError: false,
      },
      {
        kind: 'tool',
        toolId: 'nightshift_sandbox_bash',
        params: { command: 'ls' },
        resultText: undefined,
        isError: false,
      },
    ]);
  });
});

describe('readsSeededKnowledge', () => {
  it.each([
    [SANDBOX_VIEW_FILE_TOOL_ID, { file_path: '/workspace/cortex/topics/checkout.md' }],
    [SANDBOX_VIEW_FILE_TOOL_ID, { file_path: 'decision-trees/checkout-redis-lag.md' }],
    ['nightshift_sandbox_bash', { command: 'cat /workspace/cortex/INDEX.md' }],
    ['nightshift_sandbox_bash', { command: 'grep -r redis cortex/ decision-trees/' }],
    ['nightshift_sandbox_bash', { command: 'ls /workspace/decision-trees' }],
    ['nightshift_sandbox_bash', { command: 'cat /workspace/elastic.md' }],
    [SANDBOX_VIEW_FILE_TOOL_ID, { file_path: 'connectors.md' }],
    ['read_file', { path: '/workspace/decision-trees/decision_tree_checkout-redis-lag.md' }],
  ])('matches %s %j', (toolId, params) => {
    expect(readsSeededKnowledge(toolId, params)).toBe(true);
  });

  it.each([
    [SANDBOX_VIEW_FILE_TOOL_ID, { file_path: '/workspace/memories/checkout-redis.md' }],
    [SANDBOX_VIEW_FILE_TOOL_ID, { file_path: '/workspace/cortex-notes.md' }],
    [
      'nightshift_sandbox_bash',
      { command: 'esql "FROM traces-* | WHERE service.name == \\"cortex\\""' },
    ],
    ['nightshift_sandbox_bash', { command: 'cat /workspace/elastic.mdx' }],
  ])('does not match %s %j', (toolId, params) => {
    expect(readsSeededKnowledge(toolId, params)).toBe(false);
  });
});

describe('renderMemoryTranscript with evidenceOnly', () => {
  const investigation = [
    tool(
      SANDBOX_VIEW_FILE_TOOL_ID,
      { file_path: '/workspace/cortex/topics/checkout.md' },
      'CORTEX_PAGE'
    ),
    tool('nightshift_sandbox_bash', { command: 'cat /workspace/decision-trees/x.md' }, 'TREE_BODY'),
    tool(SET_HYPOTHESES_TOOL_ID, { hypotheses: [{ candidate: 'PROGRESS_SUMMARY' }] }, 'ok'),
    tool('nightshift_sandbox_bash', { command: 'esql "FROM metrics-redis*"' }, 'evicted_keys=4210'),
  ];

  it('drops seeded reads and recorded findings with their results, keeping the other calls', () => {
    const text = renderMemoryTranscript({
      task: 't',
      investigation,
      toolCalls: [],
      evidenceOnly: true,
    });
    expect(text).not.toContain('CORTEX_PAGE');
    expect(text).not.toContain('TREE_BODY');
    expect(text).not.toContain('PROGRESS_SUMMARY');
    expect(text).toContain('1. nightshift_sandbox_bash: esql "FROM metrics-redis*"');
    expect(text).toContain('Result: evicted_keys=4210');
  });

  it('keeps seeded reads by default', () => {
    const text = renderMemoryTranscript({ task: 't', investigation, toolCalls: [] });
    expect(text).toContain('CORTEX_PAGE');
    expect(text).toContain('TREE_BODY');
    expect(text).toContain('PROGRESS_SUMMARY');
  });
});

describe('isEvidenceCall', () => {
  it.each([
    ['write_todos', { todos: [] }],
    ['list_files', { path: '/skills' }],
    ['load_skill', { name: 'x' }],
    ['nightshift_sandbox_write_file', { file_path: 'notes.md', content: 'x' }],
    ['nightshift_sandbox_str_replace', { file_path: 'notes.md', old_str: 'a', new_str: 'b' }],
  ])('drops %s', (toolId, params) => {
    expect(isEvidenceCall(toolId, params)).toBe(false);
  });

  it.each([
    ['nightshift_sandbox_bash', { command: 'esql "FROM traces-*"' }],
    [SANDBOX_VIEW_FILE_TOOL_ID, { file_path: '/workspace/memories/a.md' }],
    ['observability.get_traces', { service: 'checkout' }],
    ['run_subagent', { task: 'x' }],
  ])('keeps %s', (toolId, params) => {
    expect(isEvidenceCall(toolId, params)).toBe(true);
  });
});
