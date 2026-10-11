/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus } from '@kbn/workflows';
import { PROPOSAL_APPROVE_URL, PROPOSAL_DISMISS_URL } from '@kbn/proposals-common';
import { CoverageChain } from './coverage_chain';
import { RuleCreationClient } from './rule_creation_client';

jest.mock('./coverage_chain');
const esClient = {} as EsClient;
beforeEach(() => {
  jest.mocked(CoverageChain.prototype.start).mockResolvedValue({
    workflowExecutionId: 'exec-1',
    investigationId: 'investigation',
  });
});

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
const gatedStack = ({
  gateStatuses = [ExecutionStatus.WAITING_FOR_INPUT],
}: { gateStatuses?: ExecutionStatus[] } = {}) => {
  const calls: Call[] = [];
  let decided = false;
  let gateLookups = 0;
  const fetch = jest.fn(async (url: string, opts: Omit<Call, 'url'> = {}) => {
    calls.push({ url, ...opts });
    if (url === '/api/agent_builder/conversations') return {};
    if (url.endsWith('/run')) return { workflowExecutionId: 'exec-1' };
    if (url === '/internal/proposals') {
      return { proposals: decided ? [] : [{ id: 'prop-1' }] };
    }
    if (url === '/internal/proposals/prop-1' && (opts.method ?? 'GET') === 'GET') {
      return { id: 'prop-1', workflowExecutionId: 'gate-1' };
    }
    if (url === '/api/workflows/executions/gate-1') {
      gateLookups += 1;
      const status = gateStatuses[Math.min(gateLookups - 1, gateStatuses.length - 1)];
      return { status, stepExecutions: [] };
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
  it('fails on workflow errors instead of passing an empty draft to evaluators', async () => {
    const fetch = jest.fn(async () => ({
      status: ExecutionStatus.FAILED,
      error: {
        message: 'Service account inheritance requires a parent executing as a service account.',
      },
    })) as unknown as HttpHandler;
    await expect(
      new RuleCreationClient(fetch, log, esClient).run({ input: INPUT, ...fast })
    ).rejects.toThrow('Service account inheritance requires a parent');
  });

  it('uses the creation child and investigation opened by the production coverage chain', async () => {
    const { fetch, calls } = gatedStack();
    const result = await new RuleCreationClient(fetch, log, esClient).run({
      input: INPUT,
      ...fast,
    });
    expect(CoverageChain.prototype.start).toHaveBeenCalledWith(INPUT, expect.any(Number), 1);
    expect(result.investigationId).toBe('investigation');
    expect(result.workflowExecutionId).toBe('exec-1');
    expect(calls.some((call) => call.url.endsWith('/run'))).toBe(false);
  });

  it('reports pendingApproval with the proposal id while the run is parked on the gate', async () => {
    const { fetch, calls } = gatedStack();
    const result = await new RuleCreationClient(fetch, log, esClient).run({
      input: INPUT,
      ...fast,
    });

    expect(result.pendingApproval).toBe(true);
    expect(result.proposalId).toBe('prop-1');
    const list = calls.find((c) => c.url === '/internal/proposals');
    expect(list!.query).toMatchObject({
      status: 'pending',
      conversationId: result.investigationId,
    });
  });

  it('approves through the proposals approve route and waits for completion', async () => {
    const { fetch, calls } = gatedStack();
    const client = new RuleCreationClient(fetch, log, esClient);
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
    const client = new RuleCreationClient(fetch, log, esClient);
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

  it('waits for the gate execution to park before sending the decision', async () => {
    const { fetch, calls } = gatedStack({
      gateStatuses: [
        ExecutionStatus.RUNNING,
        ExecutionStatus.RUNNING,
        ExecutionStatus.WAITING_FOR_INPUT,
      ],
    });
    const client = new RuleCreationClient(fetch, log, esClient);
    const result = await client.run({ input: INPUT, ...fast });

    await client.respond({
      workflowExecutionId: result.workflowExecutionId,
      proposalId: result.proposalId!,
      approved: false,
      ...fast,
    });

    const urls = calls.map((c) => c.url);
    const lastGateRead = urls.lastIndexOf('/api/workflows/executions/gate-1');
    const dismissAt = urls.indexOf(PROPOSAL_DISMISS_URL.replace('{id}', 'prop-1'));
    expect(urls.filter((u) => u === '/api/workflows/executions/gate-1')).toHaveLength(3);
    expect(dismissAt).toBeGreaterThan(lastGateRead);
  });

  it('never sends the decision when the gate never parks', async () => {
    const { fetch, calls } = gatedStack({ gateStatuses: [ExecutionStatus.RUNNING] });
    const client = new RuleCreationClient(fetch, log, esClient);
    const result = await client.run({ input: INPUT, ...fast });

    await expect(
      client.respond({
        workflowExecutionId: result.workflowExecutionId,
        proposalId: result.proposalId!,
        approved: false,
        ...fast,
        gateWaitMs: 50,
      })
    ).rejects.toThrow(/did not reach waiting_for_input/);
    expect(calls.some((c) => c.url === PROPOSAL_DISMISS_URL.replace('{id}', 'prop-1'))).toBe(false);
  });

  it('fails fast when the gate execution is already terminal', async () => {
    const { fetch } = gatedStack({ gateStatuses: [ExecutionStatus.COMPLETED] });
    const client = new RuleCreationClient(fetch, log, esClient);
    const result = await client.run({ input: INPUT, ...fast });

    await expect(
      client.respond({
        workflowExecutionId: result.workflowExecutionId,
        proposalId: result.proposalId!,
        approved: true,
        ...fast,
      })
    ).rejects.toThrow(/already completed/);
  });

  it('deletes the investigations it created on cleanup', async () => {
    const { fetch, calls } = gatedStack();
    const client = new RuleCreationClient(fetch, log, esClient);
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
