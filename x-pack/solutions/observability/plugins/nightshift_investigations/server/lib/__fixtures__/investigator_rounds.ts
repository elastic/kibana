/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationToolCall } from '../../decision_trees/accessed_trees';

/**
 * A completed investigator round as the Agent Optimize workflow hands it to the optimize steps:
 * the hook's tool calls and results, plus the persisted round steps the memory step reads back.
 * These are hand-written in the shape of real rounds; replace them with recorded rounds once the
 * eval fixtures exist.
 */
export interface InvestigatorRoundFixture {
  name: string;
  prompt: string;
  response: string;
  toolCalls: InvestigationToolCall[];
  toolResults: Array<{ tool_call_id: string; results: unknown[] }>;
  steps: Array<Record<string, unknown>>;
}

const LONG_LOG_LINES = Array.from(
  { length: 60 },
  (_, i) =>
    `2026-10-11T14:02:${String(i).padStart(
      2,
      '0'
    )}Z checkout ERROR redis timeout after 500ms key=cart:${1000 + i}`
).join('\n');

const checkoutCalls: InvestigationToolCall[] = [
  {
    tool_id: 'nightshift_sandbox_view_file',
    tool_call_id: 'call-1',
    params: { file_path: '/workspace/cortex/INDEX.md' },
  },
  {
    tool_id: 'platform.streams.investigation_progress_report',
    tool_call_id: 'call-2',
    params: { step: 'triage', summary: 'Loaded Cortex; checking checkout errors.' },
  },
  {
    tool_id: 'nightshift_sandbox_bash',
    tool_call_id: 'call-3',
    params: {
      command:
        'esql "FROM logs-* | WHERE service.name == \\"checkout\\" AND log.level == \\"error\\" | STATS c = COUNT() BY message | SORT c DESC | LIMIT 5"',
    },
  },
  {
    tool_id: 'nightshift_sandbox_bash',
    tool_call_id: 'call-4',
    params: { command: 'curl -s "$CONNECTOR_CONFIG_URL/metrics-redis*/_search?size=0"' },
  },
  {
    tool_id: 'nightshift_sandbox_view_file',
    tool_call_id: 'call-5',
    params: { file_path: '/workspace/cortex/services/redis.md' },
  },
  // A call whose result never arrived; shaping must keep it without results.
  {
    tool_id: 'nightshift_sandbox_bash',
    tool_call_id: 'call-6',
    params: {
      command: 'esql "FROM traces-* | STATS p95 = PERCENTILE(transaction.duration.us, 95)"',
    },
  },
];

const checkoutResults = [
  {
    tool_call_id: 'call-1',
    results: [{ type: 'other', data: { text: '# Cortex index\n- redis (established, 3x)' } }],
  },
  { tool_call_id: 'call-2', results: [{ type: 'other', data: { ok: true } }] },
  {
    tool_call_id: 'call-3',
    results: [{ type: 'other', data: { stdout: LONG_LOG_LINES, exit_code: 0 } }],
  },
  {
    tool_call_id: 'call-4',
    results: [
      {
        type: 'other',
        data: { stdout: '{"evicted_keys": 4210, "used_memory_pct": 98}', exit_code: 0 },
      },
    ],
  },
  {
    tool_call_id: 'call-5',
    results: [{ type: 'other', data: { text: '# redis\nCart cache. maxmemory 2gb.' } }],
  },
];

const paymentCalls: InvestigationToolCall[] = [
  {
    tool_id: 'platform.streams.investigation_progress_report',
    tool_call_id: 'p-1',
    params: { step: 'triage' },
  },
  {
    tool_id: 'nightshift_sandbox_bash',
    tool_call_id: 'p-2',
    params: { command: 'esql "FROM logs-* | WHERE service.name == \\"payment\\" | LIMIT 20"' },
  },
  // Some rounds report calls without a tool id; they are not sandbox calls.
  { tool_call_id: 'p-3', params: { note: 'missing tool id' } },
  {
    tool_id: 'nightshift_sandbox_write_file',
    tool_call_id: 'p-4',
    params: { file_path: '/workspace/notes.md', content: 'payment 503s start 14:10' },
  },
  {
    tool_id: 'nightshift_sandbox_bash',
    tool_call_id: 'p-5',
    params: { command: 'curl -s "$CONNECTOR_CONFIG_URL/_cat/indices/traces-*?v"' },
  },
];

const paymentResults = [
  {
    tool_call_id: 'p-2',
    results: [
      {
        type: 'other',
        data: { stdout: 'payment 503 upstream fraud-check unavailable', exit_code: 0 },
      },
    ],
  },
  { tool_call_id: 'p-4', results: [{ type: 'other', data: { ok: true } }] },
  {
    tool_call_id: 'p-5',
    results: [{ type: 'error', data: { message: 'connection reset by peer' } }],
  },
];

const toSteps = (
  calls: InvestigationToolCall[],
  results: Array<{ tool_call_id: string; results: unknown[] }>,
  notes: Record<string, string>
): Array<Record<string, unknown>> =>
  calls.flatMap((call) => {
    const note = call.tool_call_id ? notes[call.tool_call_id] : undefined;
    const callResults = results.find(({ tool_call_id: id }) => id === call.tool_call_id)?.results;
    return [
      ...(note ? [{ type: 'reasoning', reasoning: note }] : []),
      {
        type: 'tool_call',
        tool_id: call.tool_id,
        tool_call_id: call.tool_call_id,
        params: call.params,
        ...(callResults ? { results: callResults } : {}),
      },
    ];
  });

export const INVESTIGATOR_ROUNDS: InvestigatorRoundFixture[] = [
  {
    name: 'checkout latency traced to redis evictions',
    prompt: 'Investigate the checkout latency alert (p95 > 2s since 14:00 UTC).',
    response:
      'Root cause: Redis evicting cart keys at 98% memory; checkout times out on cache misses. Informed by Cortex page redis.',
    toolCalls: checkoutCalls,
    toolResults: checkoutResults,
    steps: toSteps(checkoutCalls, checkoutResults, {
      'call-3': 'Check checkout errors before looking at dependencies.',
      'call-5': 'Cortex has a redis page; compare its limits with current usage.',
    }),
  },
  {
    name: 'payment 503s from an unavailable fraud-check dependency',
    prompt: 'Why is payment returning 503?',
    response:
      'payment 503s come from fraud-check being unavailable since 14:10; traces index listing failed.',
    toolCalls: paymentCalls,
    toolResults: paymentResults,
    steps: toSteps(paymentCalls, paymentResults, {
      'p-2': 'Start from payment logs.',
    }),
  },
];
