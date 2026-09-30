/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hydratedContextPath,
  renderMemoryTranscript,
  stepsFromRound,
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

  it('collapses loads of prior context onto one line and leaves out their content', () => {
    const text = render([
      tool(
        'nightshift_sandbox_view_file',
        { file_path: '/workspace/elastic.md' },
        'ELASTIC-DOC-BODY'
      ),
      tool(
        'nightshift_sandbox_view_file',
        { file_path: '/workspace/memories/checkout-redis-evictions.md' },
        'MEMORY-BODY'
      ),
      tool(
        'nightshift_sandbox_bash',
        { command: 'cat /workspace/cortex/README.md' },
        'CORTEX-BODY'
      ),
      tool('nightshift_sandbox_bash', { command: 'curl $URL/_cluster/health' }, 'status: green'),
    ]);
    expect(text).toContain(
      'Loaded from prior context (already known, not new evidence): /workspace/elastic.md, /workspace/memories/checkout-redis-evictions.md, /workspace/cortex/README.md'
    );
    expect(text).not.toMatch(/ELASTIC-DOC-BODY|MEMORY-BODY|CORTEX-BODY/);
    expect(text).toContain('1. nightshift_sandbox_bash: curl $URL/_cluster/health');
  });

  it('keeps reads of files that are not prior context', () => {
    const text = render([
      tool('nightshift_sandbox_view_file', { file_path: '/workspace/scratch/out.json' }, 'SCRATCH'),
    ]);
    expect(text).toContain('nightshift_sandbox_view_file');
    expect(text).toContain('Result: SCRATCH');
  });

  it("drops the agent's progress reports", () => {
    const text = render([
      tool('platform.streams.investigation_progress_report', { summary: 'STATUS-UPDATE' }, '{}'),
      tool('nightshift_sandbox_bash', { command: 'ls /tmp' }, 'a b'),
    ]);
    expect(text).not.toContain('STATUS-UPDATE');
    expect(text).toContain('nightshift_sandbox_bash');
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
});

describe('hydratedContextPath', () => {
  it.each([
    [
      'nightshift_sandbox_view_file',
      { file_path: '/workspace/decision-trees/monitors.md' },
      '/workspace/decision-trees/monitors.md',
    ],
    [
      'nightshift_sandbox_view_file',
      { file_path: '/workspace/connectors.md' },
      '/workspace/connectors.md',
    ],
    [
      'nightshift_sandbox_bash',
      { command: 'cat /workspace/connectors.md' },
      '/workspace/connectors.md',
    ],
    ['nightshift_sandbox_bash', { command: 'ls /workspace/memories' }, '/workspace/memories'],
  ])('%s %j reads prior context', (toolId, params, expected) => {
    expect(hydratedContextPath(toolId, params)).toBe(expected);
  });

  it.each([
    ['nightshift_sandbox_view_file', { file_path: '/workspace/scratch/a.md' }],
    ['nightshift_sandbox_bash', { command: 'curl $URL/_search' }],
    ['nightshift_sandbox_bash', { command: 'cat /workspace/memories/a.md | curl -d @- $URL' }],
    ['nightshift_sandbox_write_file', { file_path: '/workspace/memories/a.md' }],
  ])('%s %j is not a plain read of prior context', (toolId, params) => {
    expect(hydratedContextPath(toolId, params)).toBeUndefined();
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
