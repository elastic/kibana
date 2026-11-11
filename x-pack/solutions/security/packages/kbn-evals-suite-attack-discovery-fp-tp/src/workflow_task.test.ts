/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { readAgentToolCallsFromTraces } from '@kbn/security-evals-workflow-traces';
import { ToolingLog } from '@kbn/tooling-log';
import {
  ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import type { FpTpSeededEvidence } from './world';
import type { FpTpSeededIds } from './workflow_task';
import { readAnalysisOutput, runFpTpAnalysisWorkflow, toOutcome } from './workflow_task';

jest.mock('@kbn/security-evals-workflow-traces', () => ({
  ...jest.requireActual('@kbn/security-evals-workflow-traces'),
  readAgentToolCallsFromTraces: jest.fn().mockResolvedValue({ toolCallIds: [], unavailable: true }),
}));

const output = {
  attack_discovery_id: 'ad-1',
  investigation_id: 'inv-1',
  workflow_id: 'wf-1',
  payload: { verdict: 'false_positive', summary_markdown: 'A summary' },
  checks: [],
  claims: {},
};

const execution = (overrides: Partial<WorkflowExecutionDto>): WorkflowExecutionDto =>
  ({
    id: 'exec-1',
    status: ExecutionStatus.COMPLETED,
    stepExecutions: [],
    error: null,
    ...overrides,
  } as WorkflowExecutionDto);

const outputStep = (overrides: Partial<WorkflowStepExecutionDto>): WorkflowStepExecutionDto =>
  ({ output, ...overrides } as WorkflowStepExecutionDto);

const seededIds: FpTpSeededIds = {
  attackDiscoveryId: 'ad-1',
  alertIds: ['a1'],
  entityIds: [],
  eventIds: [],
};

const seededEvidence: FpTpSeededEvidence = {
  alerts: [{ id: 'a1', source: { host: { name: 'wks-1' } } }],
  entities: [],
  events: [],
};

const mockFetch = (records: WorkflowExecutionDto[]): HttpHandler => {
  let poll = 0;
  return jest.fn(async (path: string) => {
    if (path.endsWith('/run')) {
      return { workflowExecutionId: 'exec-1' };
    }
    if (path.endsWith('/cancel')) {
      return undefined;
    }
    const record = records[Math.min(poll, records.length - 1)];
    poll += 1;
    return record;
  }) as unknown as HttpHandler;
};

const run = (fetch: HttpHandler, maxWaitMs = 60_000) =>
  runFpTpAnalysisWorkflow({
    fetch,
    log: new ToolingLog(),
    workflowId: 'wf-1',
    attackDiscoveryId: 'ad-1',
    investigationId: 'inv-1',
    seededIds,
    seededEvidence,
    maxWaitMs,
    cancelWaitMs: 0,
    pollIntervalMs: 0,
  });

const cancelCalls = (fetch: HttpHandler) =>
  (fetch as unknown as jest.Mock).mock.calls.filter(([path]) => String(path).endsWith('/cancel'));

describe('readAnalysisOutput', () => {
  it('returns the output from the execution context', () => {
    expect(readAnalysisOutput(execution({ context: { output } }))).toEqual(output);
  });

  it('returns the workflow.output step output when the context has none', () => {
    expect(
      readAnalysisOutput(
        execution({
          stepExecutions: [outputStep({ stepId: 'emit_result', stepType: 'workflow.output' })],
        })
      )
    ).toEqual(output);
  });

  it('returns undefined when the run produced no output', () => {
    expect(readAnalysisOutput(execution({}))).toBeUndefined();
  });
});

describe('toOutcome', () => {
  it('returns the verdict for a completed run', () => {
    expect(toOutcome(execution({}), output)).toBe('false_positive');
  });

  it.each([ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT, ExecutionStatus.RUNNING])(
    'returns failed for a %s run',
    (status) => {
      expect(toOutcome(execution({ status }), output)).toBe('failed');
    }
  );

  it('returns undefined for a completed run with an unsupported verdict', () => {
    expect(toOutcome(execution({}), { payload: { verdict: 'failed' } })).toBeUndefined();
  });
});

describe('runFpTpAnalysisWorkflow', () => {
  it('returns the verdict outcome for a completed record', async () => {
    const fetch = mockFetch([
      execution({ status: ExecutionStatus.RUNNING }),
      execution({ context: { output } }),
    ]);
    expect((await run(fetch)).outcome).toBe('false_positive');
  });

  it('returns the echoed attack id for a completed record', async () => {
    const fetch = mockFetch([execution({ context: { output } })]);
    expect((await run(fetch)).attackDiscoveryIdEcho).toBe('ad-1');
  });

  it('returns failed for a failed record', async () => {
    const fetch = mockFetch([
      execution({ status: ExecutionStatus.FAILED, error: { type: 'Error', message: 'boom' } }),
    ]);
    expect((await run(fetch)).outcome).toBe('failed');
  });

  it('returns no payload for a failed record', async () => {
    const fetch = mockFetch([execution({ status: ExecutionStatus.FAILED })]);
    expect((await run(fetch)).payload).toBeUndefined();
  });

  it('returns failed when the run is not terminal by the deadline', async () => {
    const fetch = mockFetch([execution({ status: ExecutionStatus.RUNNING })]);
    expect((await run(fetch, 0)).outcome).toBe('failed');
  });

  it('returns after cancelling a run that is not terminal by the deadline', async () => {
    const fetch = mockFetch([execution({ status: ExecutionStatus.RUNNING })]);
    await run(fetch, 0);
    expect(cancelCalls(fetch).map(([path]) => path)).toEqual([
      '/api/workflows/executions/exec-1/cancel',
    ]);
  });

  it('returns without cancelling a run that is terminal by the deadline', async () => {
    const fetch = mockFetch([execution({ context: { output } })]);
    await run(fetch);
    expect(cancelCalls(fetch)).toEqual([]);
  });

  describe('when reading the execution fails', () => {
    const failingFetch = (): HttpHandler =>
      jest.fn(async (path: string) => {
        if (path.endsWith('/run')) {
          return { workflowExecutionId: 'exec-1' };
        }
        if (path.endsWith('/cancel')) {
          return undefined;
        }
        throw new Error('read failed');
      }) as unknown as HttpHandler;

    it('rethrows the read error', async () => {
      await expect(run(failingFetch())).rejects.toThrow('read failed');
    });

    it('returns the conversation ids from the record read after cancelling', async () => {
      let reads = 0;
      const fetch = jest.fn(async (path: string) => {
        if (path.endsWith('/run')) {
          return { workflowExecutionId: 'exec-1' };
        }
        if (path.endsWith('/cancel')) {
          return undefined;
        }
        reads += 1;
        if (reads === 1) {
          throw new Error('read failed');
        }
        return execution({
          status: ExecutionStatus.CANCELLED,
          stepExecutions: [
            outputStep({
              stepId: 'analyze',
              stepType: 'ai.agent',
              output: { conversation_id: 'c1' },
            }),
          ],
        });
      }) as unknown as HttpHandler;
      const onFailedReadConversationIds = jest.fn();

      await runFpTpAnalysisWorkflow({
        fetch,
        log: new ToolingLog(),
        workflowId: 'wf-1',
        attackDiscoveryId: 'ad-1',
        investigationId: 'inv-1',
        seededIds,
        seededEvidence,
        cancelWaitMs: 0,
        pollIntervalMs: 0,
        onFailedReadConversationIds,
      }).catch(() => undefined);

      expect(onFailedReadConversationIds).toHaveBeenCalledWith(['c1']);
    });

    it('cancels the run before rethrowing', async () => {
      const fetch = failingFetch();
      await run(fetch).catch(() => undefined);
      expect(cancelCalls(fetch).map(([path]) => path)).toEqual([
        '/api/workflows/executions/exec-1/cancel',
      ]);
    });
  });

  it('returns failed when an overrun completes while being cancelled', async () => {
    const fetch = mockFetch([
      execution({ status: ExecutionStatus.RUNNING }),
      execution({ context: { output } }),
    ]);
    expect((await run(fetch, 0)).outcome).toBe('failed');
  });

  it('returns the conversation ids from the record read after cancelling', async () => {
    const fetch = mockFetch([
      execution({ status: ExecutionStatus.RUNNING }),
      execution({
        status: ExecutionStatus.CANCELLED,
        stepExecutions: [
          outputStep({
            stepId: 'analyze',
            stepType: 'ai.agent',
            output: { conversation_id: 'c1' },
          }),
        ],
      }),
    ]);
    expect((await run(fetch, 0)).agentConversationIds).toEqual(['c1']);
  });

  it('returns the seeded ids unchanged', async () => {
    const fetch = mockFetch([execution({ context: { output } })]);
    expect((await run(fetch)).seededIds).toEqual(seededIds);
  });

  it('returns the seeded facts unchanged', async () => {
    const fetch = mockFetch([execution({ context: { output } })]);
    expect((await run(fetch)).seededEvidence).toEqual(seededEvidence);
  });

  it('returns the conversation ids the agent steps created', async () => {
    const fetch = mockFetch([
      execution({
        context: { output },
        stepExecutions: [
          outputStep({
            stepId: 'analyze',
            stepType: 'ai.agent',
            output: { conversation_id: 'c1' },
          }),
        ],
      }),
    ]);
    expect((await run(fetch)).agentConversationIds).toEqual(['c1']);
  });

  it('returns tool calls without excluding any tool', async () => {
    const fetch = mockFetch([execution({ context: { output } })]);
    await run(fetch);
    expect(readAgentToolCallsFromTraces).toHaveBeenLastCalledWith(
      expect.objectContaining({ excludeToolIds: [] })
    );
  });
});
