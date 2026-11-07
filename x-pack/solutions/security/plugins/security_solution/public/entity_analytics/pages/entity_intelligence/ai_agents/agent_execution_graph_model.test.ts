/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAgentExecutionGraph } from './agent_execution_graph_model';
import type { AgentInvocation, AgentToolCall } from './types';

const invocation: AgentInvocation = {
  id: 'trace:agent',
  traceId: 'trace',
  spanId: 'agent',
  timestamp: '2026-10-12T12:00:00Z',
  outcome: 'success',
  source: { index: 'index', id: 'agent' },
};
const call = (id: string, overrides: Partial<AgentToolCall> = {}): AgentToolCall => ({
  id,
  traceId: 'trace',
  spanId: id,
  invocationSpanId: 'agent',
  timestamp: invocation.timestamp,
  outcome: 'success',
  source: { index: 'index', id },
  toolName: 'execute_esql',
  nameRedacted: false,
  ...overrides,
});

it('groups real tool calls and preserves all recorded outcomes', () => {
  const model = buildAgentExecutionGraph(invocation, [
    call('one'),
    call('two', { outcome: 'failure' }),
    call('three', { outcome: 'unknown' }),
  ]);
  expect(model.callCount).toBe(3);
  expect(model.tools).toHaveLength(1);
  expect(model.tools[0]).toMatchObject({ successes: 1, failures: 1, unknowns: 1 });
});

it('excludes different traces and nearest-agent ancestors and deduplicates source calls', () => {
  const matching = call('matching');
  const model = buildAgentExecutionGraph(invocation, [
    matching,
    matching,
    call('other-trace', { traceId: 'other' }),
    call('child-agent', { invocationSpanId: 'child' }),
  ]);
  expect(model.callCount).toBe(1);
  expect(model.tools[0].calls).toEqual([matching]);
});

it('does not collapse privacy-withheld names into one asserted tool identity', () => {
  const model = buildAgentExecutionGraph(invocation, [
    call('one', { toolName: 'custom', nameRedacted: true }),
    call('two', { toolName: 'custom', nameRedacted: true }),
  ]);
  expect(model.tools).toHaveLength(2);
  expect(model.tools.every((tool) => tool.calls.length === 1)).toBe(true);
});

it('bounds the canvas and reports omitted tool groups without losing the full call count', () => {
  const model = buildAgentExecutionGraph(
    invocation,
    Array.from({ length: 12 }, (_, index) => call(`call-${index}`, { toolName: `tool-${index}` }))
  );
  expect(model.tools).toHaveLength(6);
  expect(model.omittedTools).toBe(6);
  expect(model.callCount).toBe(12);
  expect(model.width).toBeLessThan(1120);
  expect(model.height).toBeLessThan(460);
});
