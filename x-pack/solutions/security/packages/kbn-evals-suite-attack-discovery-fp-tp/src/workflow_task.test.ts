/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TerminalExecutionStatuses, type WorkflowStepExecutionDto } from '@kbn/workflows';
import {
  normalizeVerdictLabel,
  readAgentVerdict,
  readWorkflowOutput,
  runAttackDiscoveryWorkflow,
} from './workflow_task';

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
    const verdict = { verdict: 'false_positive', summary_markdown: 's', confidence: 0.9 };
    const steps = [
      agentStep({ output: null }),
      agentStep({ output: { structured_output: { verdict } } }),
    ];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });

  it('falls back to structured_output.verdicts[0]', () => {
    const verdict = { verdict: 'true_positive' };
    const steps = [agentStep({ output: { structured_output: { verdicts: [verdict] } } })];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });

  it('returns undefined when no agent step produced output', () => {
    expect(readAgentVerdict([agentStep({ output: null })])).toBeUndefined();
  });

  it('matches agent steps by stepId fallback when stepType is omitted', () => {
    const verdict = { verdict: 'inconclusive' };
    const steps = [agentStep({ stepType: undefined, output: { structured_output: { verdict } } })];
    expect(readAgentVerdict(steps)).toEqual(verdict);
  });
});

describe('readWorkflowOutput + normalizeVerdictLabel', () => {
  it('prefers the workflow output verdict, falling back to the agent structured output', () => {
    const execution = {
      output: {
        verdict: 'true_positive',
        summary_markdown: 's',
        analysis_execution_id: 'child-1',
      },
      stepExecutions: [
        agentStep({ output: { structured_output: { verdict: { verdict: 'false_positive' } } } }),
      ],
    } as never;

    const workflowOutput = readWorkflowOutput(execution as never);
    expect(workflowOutput?.verdict).toBe('true_positive');
    expect(normalizeVerdictLabel({ workflowOutput })).toBe('true_positive');
    expect(normalizeVerdictLabel({ verdict: { verdict: 'false_positive' } })).toBe(
      'false_positive'
    );
  });

  it('normalizes agent-level verdict/label/classification aliases', () => {
    expect(normalizeVerdictLabel({ verdict: { verdict: 'inconclusive' } })).toBe('inconclusive');
    expect(normalizeVerdictLabel({ verdict: { label: 'inconclusive' } })).toBe('inconclusive');
    expect(normalizeVerdictLabel({ verdict: { classification: 'true_positive' } })).toBe(
      'true_positive'
    );
    expect(normalizeVerdictLabel({})).toBeUndefined();
  });
});

describe('runAttackDiscoveryWorkflow', () => {
  const completedExecution = {
    status: 'completed',
    traceId: 'trace-1',
    output: {
      verdict: 'false_positive',
      summary_markdown: 'not a real attack',
      analysis_execution_id: 'child-9',
    },
    stepExecutions: [
      agentStep({
        output: {
          structured_output: {
            verdict: {
              verdict: 'false_positive',
              summary_markdown: 'not a real attack',
              confidence: 0.8,
            },
          },
        },
      }),
    ],
  };

  it('runs the fp-tp workflow, polls to terminal, and returns the verdict', async () => {
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

    expect(result.workflowOutput?.verdict).toBe('false_positive');
    expect(result.workflowOutput?.analysis_execution_id).toBe('child-9');
    expect(result.verdict?.confidence).toBe(0.8);
    expect(result.executionId).toBe('exec-1');
    expect(result.executionStatus).toBe('completed');
    expect(calls[0].url).toBe(
      '/api/workflows/workflow/system-security-attack-discovery-fp-tp-analysis/run'
    );
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
    expect(result.workflowOutput).toBeUndefined();
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
