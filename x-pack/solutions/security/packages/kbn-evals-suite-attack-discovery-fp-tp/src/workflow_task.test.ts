/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TerminalExecutionStatuses, type WorkflowStepExecutionDto } from '@kbn/workflows';
import { readAgentVerdict, runAttackDiscoveryWorkflow } from './workflow_task';

const agentStep = (overrides: Partial<WorkflowStepExecutionDto>): WorkflowStepExecutionDto =>
  ({
    stepId: 'runAgent_step',
    stepType: 'ai.agent',
    output: null,
    status: 'completed',
    ...overrides,
  } as WorkflowStepExecutionDto);

describe('readAgentVerdict', () => {
  it('extracts a verdict from structured_output.verdict', () => {
    const verdict = { label: 'false_positive', summary_markdown: 's' };
    const steps = [
      agentStep({ output: null }),
      agentStep({ output: { structured_output: { verdict } } }),
    ];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });

  it('falls back to structured_output.verdicts[0]', () => {
    const verdict = { classification: 'true_positive' };
    const steps = [agentStep({ output: { structured_output: { verdicts: [verdict] } } })];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });

  it('returns undefined when no agent step produced output', () => {
    expect(readAgentVerdict([agentStep({ output: null })])).toBeUndefined();
  });

  it('matches agent steps by stepId fallback when stepType is omitted', () => {
    const verdict = { label: 'inconclusive' };
    const steps = [agentStep({ stepType: undefined, output: { structured_output: { verdict } } })];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });
});

describe('runAttackDiscoveryWorkflow', () => {
  const completedExecution = {
    status: 'completed',
    traceId: 'trace-1',
    stepExecutions: [
      agentStep({ output: { structured_output: { verdict: { label: 'false_positive' } } } }),
    ],
  };

  it('runs the workflow, polls to terminal, and returns the verdict', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetch = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (init?.method === 'POST') {
        return { workflowExecutionId: 'exec-1' };
      }
      return completedExecution;
    }) as never;

    const log = { info: jest.fn(), warning: jest.fn() } as never;
    const result = await runAttackDiscoveryWorkflow({ fetch, log, payload: { caseId: 'c1' } });

    expect(result.verdict).toEqual({ label: 'false_positive' });
    expect(result.executionId).toBe('exec-1');
    expect(result.executionStatus).toBe('completed');
    expect(calls[0].url).toBe('/api/workflows/workflow/system-security-attack-discovery/run');
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[1].url).toBe('/api/workflows/executions/exec-1');
  });

  it('returns an undefined verdict (no throw) when the workflow failed', async () => {
    const fetch = (async (url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? { workflowExecutionId: 'exec-2' }
        : { status: 'failed', stepExecutions: [] }) as never;
    const log = { info: jest.fn(), warning: jest.fn() } as never;

    const result = await runAttackDiscoveryWorkflow({ fetch, log, payload: {} });
    expect(result.verdict).toBeUndefined();
    expect(result.executionStatus).toBe('failed');
  });

  it('warns (no throw) when polling exceeds the deadline', async () => {
    const fetch = (async (url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? { workflowExecutionId: 'exec-3' }
        : { status: 'running', stepExecutions: [] }) as never;
    const log: { info: jest.Mock; warning: jest.Mock } = {
      info: jest.fn(),
      warning: jest.fn(),
    };

    const result = await runAttackDiscoveryWorkflow({
      fetch,
      log: log as never,
      payload: {},
      maxWaitMs: 10,
      pollIntervalMs: 1,
    });
    expect(TerminalExecutionStatuses.includes(result.executionStatus)).toBe(false);
    expect(log.warning).toHaveBeenCalled();
  });
});
