/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus } from '@kbn/workflows';
import { PROPOSAL_APPROVE_URL, PROPOSAL_DISMISS_URL } from '@kbn/proposals-common';
import { RuleCreationClient } from './rule_creation_client';

const log = { info: jest.fn(), debug: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const INPUT = { technique: 'T1078', gap_description: 'g', evidence: 'e', confidence: 0.9 };

interface Call {
  url: string;
  method?: string;
  query?: Record<string, unknown>;
  body?: string;
}

const draftStep = {
  stepId: 'draft_creation',
  output: { structured_output: { rule: { name: 'r', query: 'FROM x' } } },
};

/** A stack where the run parks at the proposal gate until the proposal is decided. */
const gatedStack = () => {
  const calls: Call[] = [];
  let decided = false;
  const fetch = jest.fn(async (url: string, opts: Omit<Call, 'url'> = {}) => {
    calls.push({ url, ...opts });
    if (url === '/api/agent_builder/conversations') return {};
    if (url.endsWith('/run')) return { workflowExecutionId: 'exec-1' };
    if (url === '/internal/proposals') {
      return { proposals: decided ? [] : [{ id: 'prop-1' }] };
    }
    if (url.startsWith('/internal/proposals/')) {
      decided = true;
      return {};
    }
    if (url.startsWith('/api/workflows/executions/') && !url.endsWith('/cancel')) {
      return {
        status: decided ? ExecutionStatus.COMPLETED : ExecutionStatus.WAITING_FOR_CHILD,
        stepExecutions: [draftStep],
        traceId: 't',
      };
    }
    return {};
  }) as unknown as HttpHandler;
  return { fetch, calls };
};

const fast = { pollIntervalMs: 1, maxWaitMs: 2_000 };

describe('RuleCreationClient proposal gate', () => {
  it('creates an investigation and passes it to the workflow as investigation_id', async () => {
    const { fetch, calls } = gatedStack();
    const result = await new RuleCreationClient(fetch, log).run({ input: INPUT, ...fast });

    const created = calls.find((c) => c.url === '/api/agent_builder/conversations');
    const run = calls.find((c) => c.url.endsWith('/run'));
    const conversationId = JSON.parse(created!.body!).conversation_id;
    expect(JSON.parse(run!.body!).inputs.investigation_id).toBe(conversationId);
    expect(result.investigationId).toBe(conversationId);
  });

  it('reports pendingApproval with the proposal id while the run is parked on the gate', async () => {
    const { fetch, calls } = gatedStack();
    const result = await new RuleCreationClient(fetch, log).run({ input: INPUT, ...fast });

    expect(result.pendingApproval).toBe(true);
    expect(result.proposalId).toBe('prop-1');
    const list = calls.find((c) => c.url === '/internal/proposals');
    expect(list!.query).toMatchObject({ status: 'pending', origin: 'alertzero' });
  });

  it('approves through the proposals approve route and waits for completion', async () => {
    const { fetch, calls } = gatedStack();
    const client = new RuleCreationClient(fetch, log);
    const result = await client.run({ input: INPUT, ...fast });

    const execution = await client.respond({
      workflowExecutionId: result.workflowExecutionId,
      proposalId: result.proposalId!,
      approved: true,
      ...fast,
    });

    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(calls.some((c) => c.url === PROPOSAL_APPROVE_URL.replace('{id}', 'prop-1'))).toBe(true);
  });

  it('dismisses through the proposals dismiss route when rejecting', async () => {
    const { fetch, calls } = gatedStack();
    const client = new RuleCreationClient(fetch, log);
    const result = await client.run({ input: INPUT, ...fast });

    await client.respond({
      workflowExecutionId: result.workflowExecutionId,
      proposalId: result.proposalId!,
      approved: false,
      ...fast,
    });

    const dismiss = calls.find((c) => c.url === PROPOSAL_DISMISS_URL.replace('{id}', 'prop-1'));
    expect(dismiss).toBeDefined();
    expect(JSON.parse(dismiss!.body!)).toEqual({ dismissReason: 'no_reason' });
  });

  it('deletes the investigations it created on cleanup', async () => {
    const { fetch, calls } = gatedStack();
    const client = new RuleCreationClient(fetch, log);
    const result = await client.run({ input: INPUT, ...fast });
    await client.cancelPending();

    expect(
      calls.some(
        (c) =>
          c.method === 'DELETE' &&
          c.url === `/api/agent_builder/conversations/${result.investigationId}`
      )
    ).toBe(true);
  });
});
