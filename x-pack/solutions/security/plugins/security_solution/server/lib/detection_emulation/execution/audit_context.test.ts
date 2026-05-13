/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/agent-builder-server/runner/runner';
import { buildAgentBuilderActor, isAgentBuilderActor } from './audit_context';

const makeRunContext = (
  overrides: Partial<RunContext> = {},
  stack: RunContext['stack'] = []
): RunContext => ({
  runId: 'run-default',
  stack,
  ...overrides,
});

describe('buildAgentBuilderActor', () => {
  it('always returns kind: "agent-builder"', () => {
    const actor = buildAgentBuilderActor(makeRunContext(), 'tc-1');
    expect(actor.kind).toBe('agent-builder');
  });

  it('captures runId from runContext.runId', () => {
    const actor = buildAgentBuilderActor(makeRunContext({ runId: 'run-42' }), 'tc-1');
    expect(actor.runId).toBe('run-42');
  });

  it('captures toolCallId from the explicit argument', () => {
    const actor = buildAgentBuilderActor(makeRunContext(), 'tc-99');
    expect(actor.toolCallId).toBe('tc-99');
  });

  it('leaves toolCallId undefined when none is provided', () => {
    const actor = buildAgentBuilderActor(makeRunContext(), undefined);
    expect(actor.toolCallId).toBeUndefined();
  });

  it('pulls conversationId/executionId from the closest agent stack entry', () => {
    const ctx = makeRunContext({}, [
      { type: 'agent', agentId: 'agent-outer', conversationId: 'conv-outer' },
      { type: 'tool', toolId: 'tool-1' },
      {
        type: 'agent',
        agentId: 'agent-inner',
        conversationId: 'conv-inner',
        executionId: 'exec-inner',
      },
      { type: 'tool', toolId: 'tool-2' },
    ]);
    const actor = buildAgentBuilderActor(ctx, 'tc-1');
    expect(actor.conversationId).toBe('conv-inner');
    expect(actor.executionId).toBe('exec-inner');
  });

  it('returns undefined IDs when no agent entry is present in the stack', () => {
    const ctx = makeRunContext({}, [{ type: 'tool', toolId: 'tool-1' }]);
    const actor = buildAgentBuilderActor(ctx, 'tc-1');
    expect(actor.conversationId).toBeUndefined();
    expect(actor.executionId).toBeUndefined();
  });
});

describe('isAgentBuilderActor', () => {
  it('returns true when kind === "agent-builder"', () => {
    expect(isAgentBuilderActor({ kind: 'agent-builder' })).toBe(true);
  });

  it('returns false when kind === "user"', () => {
    expect(isAgentBuilderActor({ kind: 'user' })).toBe(false);
  });
});
